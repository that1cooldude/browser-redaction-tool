"""
Rule manager for handling redaction rules and categories.
"""

import re
from typing import Dict, List, Optional, Set

from python_redaction_system.storage.custom_terms import CustomTermsManager


class RuleManager:
    """
    Manages redaction rules and their categories.
    """

    def __init__(self, custom_terms_manager: Optional[CustomTermsManager] = None):
        """
        Initialize the rule manager with preset rules.
        
        Args:
            custom_terms_manager: An instance of CustomTermsManager for custom rules.
                                 If None, built-in rules will be used.
        """
        self.custom_terms_manager = custom_terms_manager
        
        # Preset redaction rules (regex patterns)
        self._preset_rules = {
            "PII": {
                "SSN": r"\b\d{3}-\d{2}-\d{4}\b",  # Social Security Numbers
                "US_PHONE": r"\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b",  # US Phone Numbers
                "EMAIL": r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",  # Email Addresses
                "CREDIT_CARD": r"\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b",  # Credit Card Numbers
            },
            "PHI": {
                "MRN": r"\b(MRN|Medical Record Number):?\s*\d{6,10}\b",  # Medical Record Numbers
                "HEALTH_ID": r"\b(HIC|Health Insurance Claim Number):?\s*\w{6,12}\b",  # Health Insurance IDs
                "DIAGNOSIS": r"\b(diagnosed with|diagnosis of|suffers from)\s+\w+\s+\w+\b",  # Diagnostic information
            },
            "FINANCIAL": {
                "BANK_ACCOUNT": r"\b(account|acct)[\s#:_-]*\d{8,12}\b",  # Bank Account Numbers
                "ROUTING_NUMBER": r"\b(routing|RTN)[\s#:_-]*\d{9}\b",  # Bank Routing Numbers
            },
            "LOCATIONS": {
                "ADDRESS": r"\b\d{1,5}\s+[A-Za-z0-9\s]+\b(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr)\b",
                "ZIP_CODE": r"\b\d{5}(-\d{4})?\b",  # US ZIP Codes
                "GPS": r"\b\d{1,3}\.\d+,\s*-?\d{1,3}\.\d+\b",  # GPS Coordinates
            },
            "CREDENTIALS": {
                "PASSWORD": r"\b(password|pwd|passcode)[\s:=]*\w{6,20}\b",  # Passwords
                "API_KEY": r"\b[A-Za-z0-9_-]{20,40}\b",  # API Keys
            }
        }
        
        # Sensitivity categories mapping
        self._sensitivity_mapping = {
            "low": ["PII", "CREDENTIALS"],
            "medium": ["PII", "PHI", "CREDENTIALS", "FINANCIAL"],
            "high": ["PII", "PHI", "CREDENTIALS", "FINANCIAL", "LOCATIONS"]
        }
    
    def get_all_categories(self) -> List[str]:
        """
        Get all available categories of rules.
        
        Returns:
            A list of category names.
        """
        preset_categories = set(self._preset_rules.keys())
        
        # Add custom categories if custom terms manager is available
        custom_categories = set()
        if self.custom_terms_manager:
            custom_categories = set(self.custom_terms_manager.get_categories())
        
        return list(preset_categories.union(custom_categories))
    
    def get_categories_for_sensitivity(self, sensitivity_level: str) -> List[str]:
        """
        Get categories to apply based on sensitivity level.
        
        Args:
            sensitivity_level: One of 'low', 'medium', or 'high'.
        
        Returns:
            A list of category names.
        """
        if sensitivity_level not in self._sensitivity_mapping:
            raise ValueError(f"Invalid sensitivity level: {sensitivity_level}")
        
        return self._sensitivity_mapping[sensitivity_level]
    
    def get_rules_for_category(self, category: str) -> Dict[str, str]:
        """
        Get all rules for a specific category.
        
        Args:
            category: The category name.
        
        Returns:
            A dictionary mapping rule names to regex patterns.
        """
        # Start with preset rules
        rules = {}
        if category in self._preset_rules:
            rules.update(self._preset_rules[category])
        
        # Add custom rules if available
        if self.custom_terms_manager:
            custom_rules = self.custom_terms_manager.get_terms_for_category(category)
            if custom_rules:
                rules.update(custom_rules)
        
        return rules
    
    def add_custom_rule(self, category: str, rule_name: str, pattern: str) -> None:
        """
        Add a custom rule to the manager.
        
        Args:
            category: The category name.
            rule_name: The rule name.
            pattern: The regex pattern for the rule.
        
        Raises:
            ValueError: If the custom terms manager is not available.
        """
        if not self.custom_terms_manager:
            raise ValueError("Custom terms manager is not available")
        
        # Validate the regex pattern
        try:
            re.compile(pattern)
        except re.error:
            raise ValueError(f"Invalid regex pattern: {pattern}")
        
        self.custom_terms_manager.add_term(category, rule_name, pattern)
    
    def remove_custom_rule(self, category: str, rule_name: str) -> None:
        """
        Remove a custom rule from the manager.
        
        Args:
            category: The category name.
            rule_name: The rule name.
        
        Raises:
            ValueError: If the custom terms manager is not available.
        """
        if not self.custom_terms_manager:
            raise ValueError("Custom terms manager is not available")
        
        self.custom_terms_manager.remove_term(category, rule_name)