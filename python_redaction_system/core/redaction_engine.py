"""
Redaction engine that combines rule-based and Presidio-based redaction.
"""

import re
import logging
import json
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any, Set, Union
from enum import Enum
from pathlib import Path

from python_redaction_system.core.rule_manager import RuleManager
from python_redaction_system.core.presidio_engine import PresidioRedactionEngine

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Set up audit logging
AUDIT_LOG_DIR = Path("logs")
AUDIT_LOG_DIR.mkdir(exist_ok=True)
AUDIT_LOG_FILE = AUDIT_LOG_DIR / "redaction_audit.log"

class RedactionMethod(Enum):
    """Enum for different redaction methods."""
    PRESIDIO = "presidio"
    RULE_BASED = "rule_based"
    BASIC = "basic"

class RedactionEngine:
    """
    Main redaction engine that combines rule-based and Presidio-based redaction.
    Implements fallback mechanisms for reliability.
    """

    # Entity type mapping from Presidio to our categories
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
            rule_manager: Optional RuleManager instance to use. If not provided,
                        a new instance will be created.
        """
        self.rule_manager = rule_manager if rule_manager is not None else RuleManager()
        self.presidio_engine = None
        self.use_nlp = False  # Start with NLP disabled until we verify it works
        self.sensitivity_level = "medium"  # Default sensitivity level
        self.available_methods = set()
        
        # Initialize available redaction methods
        self._initialize_redaction_methods()
        
        # Set up audit logging
        self._setup_audit_logging()
    
    def _setup_audit_logging(self) -> None:
        """Set up audit logging for redaction operations."""
        self.audit_logger = logging.getLogger("redaction_audit")
        self.audit_logger.setLevel(logging.INFO)
        
        # Create file handler for audit logs
        file_handler = logging.FileHandler(AUDIT_LOG_FILE)
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s - %(levelname)s - %(message)s'
        ))
        self.audit_logger.addHandler(file_handler)
    
    def _log_audit(self, operation: str, details: Dict[str, Any]) -> None:
        """
        Log audit information about redaction operations.
        
        Args:
            operation: The type of operation performed
            details: Dictionary containing operation details
        """
        audit_entry = {
            "timestamp": datetime.now().isoformat(),
            "operation": operation,
            "sensitivity_level": self.sensitivity_level,
            "details": details
        }
        self.audit_logger.info(json.dumps(audit_entry))
    
    def _validate_redaction(self, original_text: str, redacted_text: str) -> bool:
        """
        Simple validation to check that redaction didn't completely fail.
        
        Args:
            original_text: The original text before redaction
            redacted_text: The text after redaction
            
        Returns:
            bool: True if validation passes, False otherwise
        """
        # Check that text wasn't completely erased and has expected redaction markers
        if not redacted_text:
            return False
            
        # Check for basic redaction markers
        expected_markers = ['[PII:', '[FINANCIAL:', '[CREDENTIALS:', '[PHI:', '[WORKPLACE:', '[LOCATIONS:']
        if original_text != redacted_text and not any(marker in redacted_text for marker in expected_markers):
            return False
            
        return True
    
    def _initialize_redaction_methods(self) -> None:
        """Initialize available redaction methods with fallbacks."""
        # Try to initialize Presidio first
        try:
            import sys
            if sys.version_info >= (3, 13):
                logger.warning("Presidio analyzer is not compatible with Python 3.13+. Falling back to rule-based redaction.")
                raise ImportError("Presidio analyzer is not compatible with Python 3.13+")
                
            self.presidio_engine = PresidioRedactionEngine()
            self.use_nlp = True
            self.available_methods.add(RedactionMethod.PRESIDIO)
            logger.info("Successfully initialized Presidio engine")
        except ImportError as e:
            logger.warning(f"Failed to import Presidio components: {str(e)}")
            self.presidio_engine = None
            self.use_nlp = False
        except Exception as e:
            logger.warning(f"Failed to initialize Presidio engine: {str(e)}")
            self.presidio_engine = None
            self.use_nlp = False
        
        # Rule-based redaction is always available
        self.available_methods.add(RedactionMethod.RULE_BASED)
        logger.info("Rule-based redaction initialized")
        
        # Basic redaction is always available as a last resort
        self.available_methods.add(RedactionMethod.BASIC)
        logger.info("Basic redaction initialized")
    
    def _get_redaction_methods(self, preferred_method: Optional[RedactionMethod] = None) -> List[RedactionMethod]:
        """
        Get ordered list of redaction methods to try, based on availability and preference.
        
        Args:
            preferred_method: Optional preferred method to try first.
            
        Returns:
            List of redaction methods in order of preference.
        """
        methods = []
        
        # Add preferred method if available
        if preferred_method and preferred_method in self.available_methods:
            methods.append(preferred_method)
        
        # Add remaining available methods
        for method in RedactionMethod:
            if method not in methods and method in self.available_methods:
                methods.append(method)
        
        return methods
    
    def set_sensitivity(self, level: str) -> None:
        """
        Set the sensitivity level for redaction.
        
        Args:
            level: One of 'low', 'medium', or 'high'.
            
        Raises:
            ValueError: If the sensitivity level is invalid.
        """
        if level not in ["low", "medium", "high"]:
            raise ValueError("Sensitivity level must be 'low', 'medium', or 'high'")
        self.sensitivity_level = level
        self.rule_manager.set_sensitivity(level)

    def redact_text(self, text: str, categories: Optional[List[str]] = None, 
                   preferred_method: Optional[RedactionMethod] = None) -> Tuple[str, Dict[str, int]]:
        """
        Redact sensitive information from text using available methods.
        
        This method tries different redaction approaches in order until one succeeds.
        If a method fails, it automatically falls back to simpler methods.
        
        Args:
            text: The input text to redact
            categories: Optional list of categories to redact. If None, all categories are used
            preferred_method: Optional preferred redaction method to try first
            
        Returns:
            A tuple containing (redacted_text, statistics)
        """
        if not text:
            return "", {}
            
        # Default to all categories if none specified
        if categories is None:
            categories = ["PII", "FINANCIAL", "CREDENTIALS", "PHI", "WORKPLACE", "LOCATIONS"]
        
        # Log the start of redaction operation
        self._log_audit("redaction_start", {
            "text_length": len(text),
            "categories": categories,
            "preferred_method": preferred_method.value if preferred_method else None
        })
        
        # Get ordered list of methods to try
        methods = self._get_redaction_methods(preferred_method)
        logger.info(f"Attempting redaction with methods: {[m.value for m in methods]}")
        
        # Try each method in order until one succeeds
        last_error = None
        for method in methods:
            try:
                logger.info(f"Trying redaction method: {method.value}")
                
                if method == RedactionMethod.PRESIDIO:
                    redacted_text, stats = self._redact_with_presidio(text, categories)
                elif method == RedactionMethod.RULE_BASED:
                    redacted_text, stats = self._redact_with_rules(text, categories)
                else:  # Basic fallback
                    redacted_text, stats = self._redact_basic(text, categories)
                
                # Simple validation to make sure redaction worked
                if self._validate_redaction(text, redacted_text):
                    logger.info(f"Successfully redacted with {method.value}")
                    
                    # Log completion
                    self._log_audit("redaction_complete", {
                        "method": method.value,
                        "stats": stats
                    })
                    
                    return redacted_text, stats
                else:
                    logger.warning(f"Validation failed for {method.value} redaction")
                    continue
                    
            except Exception as e:
                logger.error(f"Error with {method.value} redaction: {str(e)}")
                last_error = e
                continue
        
        # If all methods failed, log and return original text to prevent data loss
        logger.error("All redaction methods failed")
        if last_error:
            logger.error(f"Last error: {str(last_error)}")
            
        self._log_audit("redaction_failed", {
            "error": str(last_error) if last_error else "Unknown error"
        })
        
        # Return original text rather than raising an exception
        return text, {}
    
    def _redact_with_presidio(self, text: str, categories: List[str]) -> Tuple[str, Dict[str, int]]:
        """
        Use Presidio to redact text. 
        
        Handles potential issues with Presidio processing by adding appropriate
        error checks.
        
        Args:
            text: The text to redact
            categories: Categories to redact
            
        Returns:
            Tuple of (redacted_text, statistics)
            
        Raises:
            Exception: If Presidio processing fails
        """
        if not self.presidio_engine:
            raise RuntimeError("Presidio engine not initialized")
            
        # Let the specialized Presidio engine handle text processing
        # It will handle chunking large texts internally
        return self.presidio_engine.redact_text(text, categories)
    
    def _redact_with_rules(self, text: str, categories: List[str]) -> Tuple[str, Dict[str, int]]:
        """
        Use rule-based redaction for text.
        
        Args:
            text: The text to redact
            categories: Categories to redact
            
        Returns:
            Tuple of (redacted_text, statistics)
        """
        # Get rules for selected categories
        rules = self.rule_manager.get_rules_for_categories(categories)
        
        # Redact text based on rules
        redacted_text = text
        stats = {}
        
        for category, category_rules in rules.items():
            for rule_name, pattern in category_rules.items():
                try:
                    # Count matches before redaction
                    matches = len(re.findall(pattern, redacted_text))
                    if matches > 0:
                        # Apply redaction
                        replacement = f"[{category}:{rule_name}]"
                        redacted_text = re.sub(pattern, replacement, redacted_text)
                        stats[category] = stats.get(category, 0) + matches
                except re.error as e:
                    logger.warning(f"Invalid regex pattern {pattern}: {str(e)}")
                except Exception as e:
                    logger.warning(f"Error applying rule {rule_name}: {str(e)}")
        
        return redacted_text, stats
    
    def _redact_basic(self, text: str, categories: List[str]) -> Tuple[str, Dict[str, int]]:
        """
        Use basic pattern matching for redaction as a last resort.
        
        Args:
            text: The text to redact
            categories: Categories to redact
            
        Returns:
            Tuple of (redacted_text, statistics)
        """
        # Extremely simple patterns that are unlikely to cause performance issues
        basic_patterns = {
            "PII": [
                (r'\b\d{3}-\d{2}-\d{4}\b', "[PII:SSN]"),  # SSN
                (r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b', "[PII:EMAIL]"),  # Email
                (r'\b[A-Z][a-z]+\s+[A-Z][a-z]+\b', "[PII:NAME]"),  # Simple name pattern
            ],
            "FINANCIAL": [
                (r'\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b', "[FINANCIAL:CREDIT_CARD]"),  # Credit card
                (r'\b\$\d+(?:\.\d{2})?\b', "[FINANCIAL:AMOUNT]"),  # Dollar amount
            ],
            "CREDENTIALS": [
                (r'\b(?:password|passwd|pwd)[\s:=]+\S+\b', "[CREDENTIALS:PASSWORD]"),  # Password
                (r'\b(?:username|user|uid)[\s:=]+\S+\b', "[CREDENTIALS:USERNAME]"),  # Username
                (r'\b(?:api[_\s-]*key|token)[\s:=]+\S+\b', "[CREDENTIALS:API_KEY]"),  # API key
            ]
        }
        
        redacted_text = text
        stats = {}
        
        # Only apply patterns for requested categories
        for category in categories:
            if category in basic_patterns:
                for pattern, replacement in basic_patterns[category]:
                    try:
                        # Count matches
                        matches = len(re.findall(pattern, redacted_text))
                        if matches > 0:
                            # Apply redaction
                            redacted_text = re.sub(pattern, replacement, redacted_text)
                            stats[category] = stats.get(category, 0) + matches
                    except Exception as e:
                        logger.warning(f"Error applying basic pattern {pattern}: {str(e)}")
        
        return redacted_text, stats
        
    def analyze_text(self, text: str) -> Dict[str, List[str]]:
        """
        Analyze text to find sensitive information without redacting it.
        
        Args:
            text: The text to analyze
            
        Returns:
            Dictionary mapping categories to lists of detected sensitive items
        """
        if not text:
            return {}
            
        # Use all available categories for analysis
        categories = self.rule_manager.get_all_categories()
        
        # Get rules for all categories
        rules = self.rule_manager.get_rules_for_categories(categories)
        
        # Analysis results
        results = {}
        
        # Apply rules to find matches
        for category, category_rules in rules.items():
            category_matches = []
            for rule_name, pattern in category_rules.items():
                try:
                    # Find all matches
                    matches = re.findall(pattern, text)
                    if matches:
                        category_matches.extend(matches)
                except re.error as e:
                    logger.warning(f"Invalid regex pattern {pattern}: {str(e)}")
                except Exception as e:
                    logger.warning(f"Error analyzing with rule {rule_name}: {str(e)}")
            
            # Add category to results if matches were found
            if category_matches:
                results[category] = category_matches
        
        # Also try Presidio engine if available
        if self.presidio_engine and self.use_nlp:
            try:
                presidio_results = self.presidio_engine.analyze_text(text)
                # Merge with rule-based results
                for category, matches in presidio_results.items():
                    if category in results:
                        results[category].extend(matches)
                    else:
                        results[category] = matches
            except Exception as e:
                logger.warning(f"Error during Presidio analysis: {str(e)}")
        
        return results