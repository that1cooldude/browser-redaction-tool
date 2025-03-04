"""
Core redaction engine that handles the redaction of sensitive information.
"""

import re
import warnings
import logging
import functools
from typing import Dict, List, Optional, Tuple, Any, Set, Union

from core.rule_manager import RuleManager
from core.semantic_redaction import SemanticRedactionEngine
from config.defaults import NLP_SETTINGS

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global cache for NLP models
_NLP_MODEL_CACHE = {}


class RedactionEngine:
    """
    Main redaction engine that handles the redaction of sensitive information
    from text using predefined and custom rules, with optional NLP-based entity detection.
    """
    
    # Track which rules matched in the most recent redaction
    _last_rule_matches = {}

    # Entity type mapping from spaCy to our categories
    ENTITY_TYPE_MAPPING = {
        # Person names map to PII
        "PERSON": "PII",
        # Organizations
        "ORG": "PII",
        # Locations map to LOCATIONS
        "GPE": "LOCATIONS",  # Countries, cities, states
        "LOC": "LOCATIONS",  # Non-GPE locations, mountain ranges, bodies of water
        "FAC": "LOCATIONS",  # Buildings, airports, highways, bridges, etc.
        # Financial entities
        "MONEY": "FINANCIAL",
        # Dates and times can contain sensitive information
        "DATE": "PII",
        # Miscellaneous entities that might be sensitive
        "NORP": "PII",  # Nationalities or religious or political groups
        "EVENT": "PII",  # Named events like battles, wars, sports events
        "WORK_OF_ART": "PII",  # Titles of books, songs, etc.
        "LAW": "PII",  # Named legal documents 
        # Numeric entities that might be sensitive
        "CARDINAL": "PII",  # Numerals that don't fall under another type
        "ORDINAL": "PII",  # "first", "second", etc.
        "QUANTITY": "PII",  # Measurements, as of weight or distance
        "PERCENT": "FINANCIAL",  # Percentage
    }

    def __init__(self, rule_manager: Optional[RuleManager] = None):
        """
        Initialize the redaction engine.
        
        Args:
            rule_manager: An instance of RuleManager. If None, a new instance will be created.
        """
        self.rule_manager = rule_manager or RuleManager()
        self.sensitivity_level = "medium"  # Default sensitivity level
        
        # NLP settings
        self.use_nlp = NLP_SETTINGS.get("use_ner", True)
        self.nlp_model_name = NLP_SETTINGS.get("spacy_model", "en_core_web_sm")
        self.ner_confidence = NLP_SETTINGS.get("ner_confidence_threshold", 0.85)
        self.nlp = None
        
        # Initialize semantic redaction engine
        try:
            self.semantic_engine = SemanticRedactionEngine()
        except Exception as e:
            warnings.warn(f"Could not initialize semantic redaction engine: {str(e)}")
            self.semantic_engine = None
        
        # Document handling settings
        self.use_pseudonyms = True  # Use fake data instead of [REDACTED] markers
        self.preserve_context = True  # Preserve document flow and context
        
        # Try to load spaCy if use_nlp is enabled, but make it optional
        self.nlp = None  # Default to None to indicate spaCy is not available
        if self.use_nlp:
            try:
                self._load_nlp_model()
            except Exception as e:
                warnings.warn(f"Could not initialize NLP features: {str(e)}")
                self.use_nlp = False
    
    def _load_nlp_model(self) -> None:
        """
        Load the spaCy NLP model with caching for performance.
        """
        global _NLP_MODEL_CACHE
        
        if self.nlp_model_name in _NLP_MODEL_CACHE:
            self.nlp = _NLP_MODEL_CACHE[self.nlp_model_name]
            logger.info(f"Using cached NLP model {self.nlp_model_name}")
            return
        
        try:
            import spacy
            import importlib
            
            # Check if the model is installed
            try:
                # Try to import the model directly
                model_module = importlib.import_module(self.nlp_model_name)
                self.nlp = model_module.load()
            except (ImportError, AttributeError):
                # If direct import fails, load using spacy.load()
                self.nlp = spacy.load(self.nlp_model_name)
            
            # Cache the model for future use
            _NLP_MODEL_CACHE[self.nlp_model_name] = self.nlp
            logger.info(f"Successfully loaded NLP model {self.nlp_model_name}")
            
        except ImportError:
            warnings.warn(
                f"spaCy library not installed. NLP-based entity detection will be disabled. "
                f"Install spaCy with: pip install spacy"
            )
            self.use_nlp = False
        except OSError:
            warnings.warn(
                f"spaCy model {self.nlp_model_name} not found. NLP-based entity detection will be disabled. "
                f"Download the model with: python -m spacy download {self.nlp_model_name}"
            )
            self.use_nlp = False
        except Exception as e:
            warnings.warn(f"Error loading spaCy model: {str(e)}. NLP-based entity detection will be disabled.")
            self.use_nlp = False

    def set_sensitivity(self, level: str) -> None:
        """
        Set the sensitivity level for redaction.
        
        Args:
            level: Sensitivity level ('low', 'medium', 'high')
        """
        if level not in ["low", "medium", "high"]:
            raise ValueError("Sensitivity level must be 'low', 'medium', or 'high'")
        self.sensitivity_level = level
    
    def detect_entities(self, text: str) -> Dict[str, List[Tuple[str, float, str]]]:
        """
        Use spaCy's named entity recognition to identify potential sensitive information.
        
        Args:
            text: Input text to analyze.
            
        Returns:
            A dictionary mapping category names (from our system) to lists of 
            tuples (entity_text, confidence_score, entity_type) representing detected entities.
        """
        if not self.use_nlp or self.nlp is None:
            return {}
        
        try:
            # Process the text with spaCy
            doc = self.nlp(text)
            
            # Organize entities by our categories
            entities_by_category: Dict[str, List[Tuple[str, float, str]]] = {}
            
            for ent in doc.ents:
                # Get the confidence score
                confidence = getattr(ent, 'score', 1.0)  # Default to 1.0 if score not available
                
                # Skip entities below confidence threshold
                if confidence < self.ner_confidence:
                    continue
                
                # Map spaCy entity type to our category system
                category = self.ENTITY_TYPE_MAPPING.get(ent.label_, None)
                if category is None:
                    continue  # Skip entities that don't map to our categories
                
                # Add entity to the appropriate category
                if category not in entities_by_category:
                    entities_by_category[category] = []
                
                entities_by_category[category].append((ent.text, confidence, ent.label_))
            
            return entities_by_category
            
        except Exception as e:
            logger.warning(f"Error in NLP entity detection: {str(e)}")
            return {}
    
    def entities_to_patterns(self, entities_by_category: Dict[str, List[Tuple[str, float, str]]]) -> Dict[str, Dict[str, str]]:
        """
        Convert detected entities to regex patterns for redaction.
        
        Args:
            entities_by_category: Output from detect_entities().
            
        Returns:
            A dictionary mapping category names to dictionaries of {rule_name: pattern}.
        """
        patterns_by_category: Dict[str, Dict[str, str]] = {}
        
        for category, entities in entities_by_category.items():
            if category not in patterns_by_category:
                patterns_by_category[category] = {}
                
            for i, (entity_text, confidence, entity_type) in enumerate(entities):
                # Create a safe pattern by escaping special regex characters
                pattern = re.escape(entity_text)
                
                # Word boundaries for more precise matching
                pattern = r'\b' + pattern + r'\b'
                
                # Create a unique rule name
                rule_name = f"NLP_{entity_type}_{i+1}"
                
                patterns_by_category[category][rule_name] = pattern
        
        return patterns_by_category
    
    def highlight_potential_pii(self, text: str) -> Tuple[str, Dict[str, List[str]]]:
        """
        Highlight potential sensitive information without redacting it.
        
        Args:
            text: Input text to analyze.
            
        Returns:
            A tuple of (highlighted_text, entities_found) where entities_found
            is a dictionary mapping category names to lists of found entities.
        """
        if not self.use_nlp or self.nlp is None:
            return text, {}
        
        # Detect entities
        entities_by_category = self.detect_entities(text)
        
        # Prepare result dict with entity texts
        entities_found: Dict[str, List[str]] = {}
        for category, entities in entities_by_category.items():
            entities_found[category] = [entity[0] for entity in entities]
        
        # Add rule-based findings if available
        rule_findings = self.analyze_text(text)
        for category, findings in rule_findings.items():
            if category in entities_found:
                # Add only new findings
                entities_found[category].extend([f for f in findings if f not in entities_found[category]])
            else:
                entities_found[category] = findings
        
        # Create a highlighted version
        highlighted_text = text
        
        # Sort entities by length (descending) to handle overlapping entities correctly
        all_entities = []
        for category, entity_list in entities_found.items():
            for entity in entity_list:
                all_entities.append((entity, category))
        
        all_entities.sort(key=lambda x: len(x[0]), reverse=True)
        
        # Apply HTML highlighting
        for entity, category in all_entities:
            # Don't highlight empty strings
            if not entity:
                continue
                
            # Apply a color based on category
            color = {
                "PII": "red",
                "PHI": "purple",
                "FINANCIAL": "green",
                "LOCATIONS": "blue",
                "CREDENTIALS": "brown"
            }.get(category, "orange")
            
            # Replace with highlighted version
            highlighted_text = highlighted_text.replace(
                entity,
                f'<span style="background-color: {color}; color: white;">{entity} ({category})</span>'
            )
        
        return highlighted_text, entities_found
    
    def redact_text(self, text: str, categories: Optional[List[str]] = None, use_nlp: bool = True, 
                  use_pseudonyms: Optional[bool] = None, preserve_context: Optional[bool] = None) -> Tuple[str, Dict[str, int]]:
        """
        Redact sensitive information from the input text based on selected categories.
        
        Args:
            text: Input text to redact.
            categories: List of categories to apply (e.g., ["PII", "PHI"]).
                        If None, all available categories will be applied.
            use_nlp: Whether to use NLP-based entity detection in addition to rule-based redaction.
            use_pseudonyms: Whether to use generated fake data instead of generic markers.
                           If None, uses the instance default setting.
            preserve_context: Whether to preserve document flow and context.
                             If None, uses the instance default setting.
        
        Returns:
            A tuple of (redacted_text, redaction_stats) where redaction_stats is a 
            dictionary with category names as keys and the number of redactions as values.
        """
        if categories is None:
            # Get all categories based on sensitivity level
            categories = self.rule_manager.get_categories_for_sensitivity(self.sensitivity_level)
        
        # Use instance defaults if not specified
        use_pseudonyms = self.use_pseudonyms if use_pseudonyms is None else use_pseudonyms
        preserve_context = self.preserve_context if preserve_context is None else preserve_context
        
        # Track redaction statistics
        redaction_stats = {category: 0 for category in categories}
        
        # Reset rule match tracking
        self._last_rule_matches = {}
        
        # Collect all entities to redact (for semantic redaction)
        all_detected_entities = {}
        
        # Apply NLP-based detection if enabled
        if use_nlp and self.use_nlp and self.nlp is not None:
            try:
                # Detect entities
                entities_by_category = self.detect_entities(text)
                
                # Filter by selected categories
                filtered_entities = {cat: ents for cat, ents in entities_by_category.items() if cat in categories}
                
                # Process entities for semantic redaction
                for category, entities in filtered_entities.items():
                    if category not in all_detected_entities:
                        all_detected_entities[category] = []
                    
                    for entity_text, confidence, entity_type in entities:
                        # Skip if entity is empty or just whitespace
                        if not entity_text or entity_text.isspace():
                            continue
                            
                        all_detected_entities[category].append((entity_text, entity_type))
                        redaction_stats[category] += 1
                
            except Exception as e:
                logger.warning(f"Error in NLP-based detection: {str(e)}")
                # Continue with rule-based redaction
        
        # Apply rule-based detection - now with more careful handling of overlapping matches
        detected_spans = set()  # Track character spans to avoid duplicate matches
        
        for category in categories:
            rules = self.rule_manager.get_rules_for_category(category)
            
            if category not in all_detected_entities:
                all_detected_entities[category] = []
            
            for rule_name, pattern in rules.items():
                try:
                    # Use re.finditer to get match positions for overlap checking
                    for match in re.finditer(pattern, text):
                        # Extract the matched text
                        if match.groups():
                            # If there are capture groups, use the first one
                            match_text = match.group(1)
                            match_span = match.span(1)
                        else:
                            # Otherwise use the entire match
                            match_text = match.group(0)
                            match_span = match.span(0)
                        
                        # Skip if the match is empty or just whitespace
                        if not match_text or match_text.isspace():
                            continue
                            
                        # Check if this match overlaps with an existing match
                        overlap = False
                        spans_to_remove = []
                        
                        for start, end in detected_spans:
                            # Check for any overlap between spans
                            if (match_span[0] <= end and match_span[1] >= start):
                                # If there's overlap, only replace this match if it's longer
                                if (match_span[1] - match_span[0]) <= (end - start):
                                    overlap = True
                                    break
                                else:
                                    # Mark the smaller span for removal
                                    spans_to_remove.append((start, end))
                        
                        # Remove any spans that should be replaced (outside the iteration loop)
                        for span in spans_to_remove:
                            detected_spans.remove(span)
                                    
                        if not overlap:
                            # Add this match to our tracking sets
                            detected_spans.add(match_span)
                            all_detected_entities[category].append((match_text, rule_name))
                            redaction_stats[category] += 1
                            
                            # Track which rules matched for statistics
                            self._last_rule_matches[rule_name] = self._last_rule_matches.get(rule_name, 0) + 1
                except Exception as e:
                    logger.warning(f"Error processing pattern '{rule_name}': {str(e)}")
                    continue
        
        # Perform redaction with context preservation if requested
        if preserve_context and self.semantic_engine is not None:
            redacted_text = self.semantic_engine.redact_text_with_context(
                text, all_detected_entities, use_pseudonyms=use_pseudonyms
            )
        else:
            # Enhanced pattern-based redaction with better overlap handling
            redacted_text = list(text)  # Convert to list for character-by-character replacement
            
            # Sort matches by position to ensure proper replacement order
            span_to_replacement = {}
            
            # Process all detected entities
            for category, entity_list in all_detected_entities.items():
                for entity_text, entity_type in entity_list:
                    # Generate replacement text
                    if use_pseudonyms and self.semantic_engine is not None:
                        replacement = self.semantic_engine.entity_tracker.get_replacement(
                            category, entity_text, entity_type
                        )
                    else:
                        replacement = f"[{category}:{entity_type}]"
                    
                    # Find all occurrences of this entity in the text
                    start_pos = 0
                    while True:
                        pos = text.find(entity_text, start_pos)
                        if pos == -1:
                            break
                            
                        end_pos = pos + len(entity_text)
                        span = (pos, end_pos)
                        
                        # Check if this span overlaps with an already-replaced span
                        overlap = False
                        spans_to_remove = []
                        
                        for existing_span in span_to_replacement.keys():
                            if span[0] < existing_span[1] and span[1] > existing_span[0]:
                                # If there's overlap, prefer the longer replacement
                                if (span[1] - span[0]) > (existing_span[1] - existing_span[0]):
                                    # Mark smaller span for removal
                                    spans_to_remove.append(existing_span)
                                else:
                                    overlap = True
                                    break
                                    
                        # Remove any spans that should be replaced (outside the iteration loop)
                        for to_remove in spans_to_remove:
                            span_to_replacement.pop(to_remove)
                                    
                        if not overlap:
                            span_to_replacement[span] = replacement
                            
                        start_pos = end_pos
            
            # Apply replacements in order (from end to beginning to maintain positions)
            sorted_spans = sorted(span_to_replacement.keys(), reverse=True)
            for span in sorted_spans:
                start, end = span
                replacement = span_to_replacement[span]
                
                # Replace the characters in the list
                redacted_text[start:end] = list(replacement)
            
            # Convert back to string
            redacted_text = ''.join(redacted_text)
        
        return redacted_text, redaction_stats
    
    def get_rule_statistics(self) -> List[Tuple[str, int]]:
        """
        Get statistics on which rules matched in the most recent redaction.
        
        Returns:
            A list of tuples (rule_name, count) sorted by count in descending order.
        """
        # Sort the rules by number of matches
        sorted_rules = sorted(
            self._last_rule_matches.items(), 
            key=lambda x: x[1], 
            reverse=True
        )
        return sorted_rules or []  # Return empty list if no rules matched
    
    def analyze_text(self, text: str) -> Dict[str, List[str]]:
        """
        Analyze text to identify potential sensitive information without redacting.
        
        Args:
            text: Input text to analyze.
        
        Returns:
            A dictionary mapping category names to lists of found sensitive information.
        """
        results = {}
        all_categories = self.rule_manager.get_all_categories()
        
        for category in all_categories:
            rules = self.rule_manager.get_rules_for_category(category)
            category_matches = []
            
            for rule_name, pattern in rules.items():
                matches = re.findall(pattern, text)
                if matches:
                    category_matches.extend(matches)
            
            if category_matches:
                results[category] = category_matches
        
        return results