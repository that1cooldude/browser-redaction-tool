"""
Presidio-based redaction engine for PII detection and redaction.
"""

import logging
import sys
from typing import Dict, List, Tuple, Optional

# Configure logging
logger = logging.getLogger(__name__)

# Maximum text size to process at once (100KB) to prevent memory issues
MAX_TEXT_SIZE = 100000

class PresidioRedactionEngine:
    """
    Redaction engine using Microsoft Presidio for PII detection and redaction.
    """
    
    def __init__(self):
        """Initialize the Presidio redaction engine."""
        try:
            # Check Python version first
            if sys.version_info >= (3, 13):
                logger.warning("Presidio analyzer is not compatible with Python 3.13+")
                raise ImportError("Presidio analyzer is not compatible with Python 3.13+")
                
            # Import Presidio components
            from presidio_analyzer import AnalyzerEngine
            from presidio_anonymizer import AnonymizerEngine
            from presidio_anonymizer.entities import OperatorConfig
            
            self.analyzer = AnalyzerEngine()
            self.anonymizer = AnonymizerEngine()
            self._setup_operators()
            logger.info("Successfully initialized Presidio engines")
            
        except ImportError as e:
            logger.error(f"Failed to import Presidio components: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Failed to initialize Presidio engines: {str(e)}")
            raise
    
    def _setup_operators(self):
        """Set up redaction operators for different entity types."""
        from presidio_anonymizer.entities import OperatorConfig
        
        # Define custom operators for different PII types
        self.operators = {
            "PERSON": OperatorConfig("replace", {"new_value": "[PII:NAME]"}),
            "EMAIL_ADDRESS": OperatorConfig("replace", {"new_value": "[PII:EMAIL]"}),
            "PHONE_NUMBER": OperatorConfig("replace", {"new_value": "[PII:PHONE]"}),
            "IBAN_CODE": OperatorConfig("replace", {"new_value": "[FINANCIAL:BANK_ACCOUNT]"}),
            "CREDIT_CARD": OperatorConfig("replace", {"new_value": "[FINANCIAL:CREDIT_CARD]"}),
            "CRYPTO": OperatorConfig("replace", {"new_value": "[FINANCIAL:BITCOIN_WALLET]"}),
            "DATE_TIME": OperatorConfig("replace", {"new_value": "[PII:DOB]"}),
            "NRP": OperatorConfig("replace", {"new_value": "[PII:SSN]"}),
            "LOCATION": OperatorConfig("replace", {"new_value": "[PII:ADDRESS]"}),
            "IP_ADDRESS": OperatorConfig("replace", {"new_value": "[CREDENTIALS:IP]"}),
            "USERNAME": OperatorConfig("replace", {"new_value": "[CREDENTIALS:USERNAME]"}),
            "PASSWORD": OperatorConfig("replace", {"new_value": "[CREDENTIALS:PASSWORD]"}),
            "KEY": OperatorConfig("replace", {"new_value": "[CREDENTIALS:API_KEY]"}),
            "URL": OperatorConfig("replace", {"new_value": "[CREDENTIALS:URL]"}),
            "DOMAIN_NAME": OperatorConfig("replace", {"new_value": "[CREDENTIALS:DOMAIN]"}),
            "MEDICAL_LICENSE": OperatorConfig("replace", {"new_value": "[PHI:MEDICAL_LICENSE]"}),
            "US_DRIVERS_LICENSE": OperatorConfig("replace", {"new_value": "[PII:DRIVER_LICENSE]"}),
            "US_PASSPORT": OperatorConfig("replace", {"new_value": "[PII:PASSPORT]"}),
            "US_BANK_NUMBER": OperatorConfig("replace", {"new_value": "[FINANCIAL:BANK_ACCOUNT]"}),
            "US_ROUTING_NUMBER": OperatorConfig("replace", {"new_value": "[FINANCIAL:ROUTING_NUMBER]"}),
            "US_SSN": OperatorConfig("replace", {"new_value": "[PII:SSN]"}),
            "US_ITIN": OperatorConfig("replace", {"new_value": "[PII:TAX_ID]"}),
            "US_DEA": OperatorConfig("replace", {"new_value": "[PHI:DEA_NUMBER]"}),
            "US_NPI": OperatorConfig("replace", {"new_value": "[PHI:NPI_NUMBER]"}),
            "US_HCPCS": OperatorConfig("replace", {"new_value": "[PHI:HCPCS_CODE]"}),
            "US_ICD10": OperatorConfig("replace", {"new_value": "[PHI:DIAGNOSIS]"}),
            "US_CPT": OperatorConfig("replace", {"new_value": "[PHI:CPT_CODE]"}),
            "US_NDC": OperatorConfig("replace", {"new_value": "[PHI:MEDICATION]"}),
            "US_EMPLOYER_ID": OperatorConfig("replace", {"new_value": "[WORKPLACE:EMPLOYER_ID]"}),
            "US_EMPLOYEE_ID": OperatorConfig("replace", {"new_value": "[WORKPLACE:EMPLOYEE_ID]"}),
            "US_SALARY": OperatorConfig("replace", {"new_value": "[WORKPLACE:SALARY]"}),
        }
    
    def redact_text(self, text: str, categories: Optional[List[str]] = None) -> Tuple[str, Dict[str, int]]:
        """
        Redact sensitive information from the input text using Presidio.
        For large texts, breaks input into smaller chunks to prevent crashes.
        
        Args:
            text: The input text to redact.
            categories: Optional list of categories to redact. If None, all categories will be redacted.
        
        Returns:
            A tuple containing (redacted_text, statistics).
            
        Raises:
            ValueError: If the text is empty or if no categories are available.
        """
        if not text:
            raise ValueError("Input text cannot be empty")
            
        if categories and not categories:
            raise ValueError("Categories list cannot be empty")
        
        try:
            # Simple check - if text is too large, break it into paragraphs
            if len(text) > MAX_TEXT_SIZE:
                logger.info(f"Large text detected ({len(text)} bytes), processing in chunks")
                
                # Split by paragraphs (simple approach)
                paragraphs = text.split("\n\n")
                
                # Process each paragraph separately and combine results
                redacted_chunks = []
                total_stats = {}
                
                for i, paragraph in enumerate(paragraphs):
                    # Skip empty paragraphs
                    if not paragraph.strip():
                        redacted_chunks.append(paragraph)
                        continue
                        
                    # Process large paragraphs in smaller pieces if needed
                    if len(paragraph) > MAX_TEXT_SIZE:
                        # Simple length-based splitting for very large paragraphs
                        for j in range(0, len(paragraph), MAX_TEXT_SIZE):
                            chunk = paragraph[j:j+MAX_TEXT_SIZE]
                            try:
                                chunk_result, chunk_stats = self._process_text(chunk, categories)
                                redacted_chunks.append(chunk_result)
                                
                                # Combine stats
                                for category, count in chunk_stats.items():
                                    total_stats[category] = total_stats.get(category, 0) + count
                            except Exception as e:
                                logger.error(f"Error processing text chunk: {str(e)}")
                                # On error, keep the original chunk to prevent data loss
                                redacted_chunks.append(chunk)
                    else:
                        # Process normal-sized paragraph
                        try:
                            redacted_paragraph, paragraph_stats = self._process_text(paragraph, categories)
                            redacted_chunks.append(redacted_paragraph)
                            
                            # Combine stats
                            for category, count in paragraph_stats.items():
                                total_stats[category] = total_stats.get(category, 0) + count
                        except Exception as e:
                            logger.error(f"Error processing paragraph: {str(e)}")
                            # On error, keep the original paragraph to prevent data loss
                            redacted_chunks.append(paragraph)
                
                # Combine all processed chunks
                result = "\n\n".join(redacted_chunks)
                return result, total_stats
            else:
                # Process text normally if it's not too large
                return self._process_text(text, categories)
                
        except Exception as e:
            logger.error(f"Error during Presidio redaction: {str(e)}")
            # Return original text on error to prevent data loss
            return text, {}
    
    def _process_text(self, text: str, categories: Optional[List[str]] = None) -> Tuple[str, Dict[str, int]]:
        """
        Process a single piece of text with Presidio.
        
        Args:
            text: Text to process
            categories: Optional list of categories to redact
            
        Returns:
            Tuple of (redacted_text, statistics)
        """
        # Analyze text for PII
        logger.debug(f"Analyzing text of length {len(text)}")
        results = self.analyzer.analyze(text=text, language="en")
        
        # Filter results by category if specified
        if categories:
            results = [
                result for result in results
                if self._get_category(result.entity_type) in categories
            ]
        
        # Prepare anonymization config
        anonymization_config = {
            result.entity_type: self.operators.get(result.entity_type, OperatorConfig("replace", {"new_value": f"[{self._get_category(result.entity_type)}:{result.entity_type}]"}))
            for result in results
        }
        
        # Anonymize text
        logger.debug(f"Anonymizing text with {len(results)} matches")
        anonymized_result = self.anonymizer.anonymize(
            text=text,
            analyzer_results=results,
            operators=anonymization_config
        )
        
        # Calculate statistics
        stats = {}
        for result in results:
            category = self._get_category(result.entity_type)
            stats[category] = stats.get(category, 0) + 1
        
        logger.info(f"Redaction completed. Found {len(results)} matches across {len(stats)} categories")
        return anonymized_result.text, stats
    
    def _get_category(self, entity_type: str) -> str:
        """
        Map Presidio entity types to our categories.
        
        Args:
            entity_type: The Presidio entity type
            
        Returns:
            The corresponding category in our system
        """
        category_mapping = {
            # PII
            "PERSON": "PII",
            "EMAIL_ADDRESS": "PII",
            "PHONE_NUMBER": "PII",
            "DATE_TIME": "PII",
            "NRP": "PII",
            "LOCATION": "PII",
            "US_DRIVERS_LICENSE": "PII",
            "US_PASSPORT": "PII",
            "US_SSN": "PII",
            "US_ITIN": "PII",
            
            # Financial
            "IBAN_CODE": "FINANCIAL",
            "CREDIT_CARD": "FINANCIAL",
            "CRYPTO": "FINANCIAL",
            "US_BANK_NUMBER": "FINANCIAL",
            "US_ROUTING_NUMBER": "FINANCIAL",
            
            # PHI
            "MEDICAL_LICENSE": "PHI",
            "US_DEA": "PHI",
            "US_NPI": "PHI",
            "US_HCPCS": "PHI",
            "US_ICD10": "PHI",
            "US_CPT": "PHI",
            "US_NDC": "PHI",
            
            # Credentials
            "IP_ADDRESS": "CREDENTIALS",
            "USERNAME": "CREDENTIALS",
            "PASSWORD": "CREDENTIALS",
            "KEY": "CREDENTIALS",
            "URL": "CREDENTIALS",
            "DOMAIN_NAME": "CREDENTIALS",
            
            # Workplace
            "US_EMPLOYER_ID": "WORKPLACE",
            "US_EMPLOYEE_ID": "WORKPLACE",
            "US_SALARY": "WORKPLACE",
        }
        
        category = category_mapping.get(entity_type, "PII")  # Default to PII if unknown
        return category
        
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
            
        try:
            # Analyze text for PII using Presidio Analyzer
            results = self.analyzer.analyze(text=text, language="en")
            
            # Group results by category
            categorized_results = {}
            
            for result in results:
                # Get our category for the entity type
                category = self._get_category(result.entity_type)
                
                # Extract the matched text
                match_text = text[result.start:result.end]
                
                # Add to the appropriate category
                if category not in categorized_results:
                    categorized_results[category] = []
                    
                categorized_results[category].append(match_text)
            
            return categorized_results
            
        except Exception as e:
            logger.error(f"Error during Presidio analysis: {str(e)}")
            return {}