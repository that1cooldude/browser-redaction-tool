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
                "NAME": r"\b(?:Name|Full Name):\s*[A-Z][a-z]+(?:\s[A-Z][a-z]+)*\b",
                "DOB": r"\b(?:Date of Birth|DOB|Birth Date):\s*\d{1,2}/\d{1,2}/\d{2,4}\b",
                "SSN": r"\b(?:SSN|Social Security Number):\s*\d{3}[-]?\d{2}[-]?\d{4}\b",
                "EMAIL": r"\b(?:Email|E-mail|Email Address):\s*[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b",
                "PHONE": r"\b(?:Phone|Phone Number|Contact):\s*\(\d{3}\)\s?\d{3}-\d{4}\b",
                "DRIVER_LICENSE": r"\b(?:Driver's License|DL|License):\s*[A-Z]\d{7}\b",
                "PASSPORT": r"\b(?:Passport|Passport Number):\s*[A-Z]\d{8}\b",
                "ADDRESS": r"\b(?:Address|Home Address|Residence):\s*\d{1,5}\s+[A-Za-z0-9\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr)\b",
            },
            "FINANCIAL": {
                "CREDIT_CARD": r"\b(?:Credit Card|CC|Card Number):\s*\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b",
                "EXPIRATION_DATE": r"\b(?:Expiration|Exp|Expiry):\s*(0[1-9]|1[0-2])/([0-9]{2})\b",
                "CVV": r"\b(?:CVV|CVC|Security Code):\s*\d{3,4}\b",
                "BANK_ACCOUNT": r"\b(?:Bank Account|Account Number|Acct):\s*\d{8,12}\b",
                "ROUTING_NUMBER": r"\b(?:Routing Number|RTN|Routing):\s*0[0-9]{8}\b",
                "BITCOIN_WALLET": r"\b(?:Bitcoin|BTC|Wallet):\s*[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b",
            },
            "PHI": {
                "PATIENT_ID": r"\b(?:Patient ID|Patient Identifier):\s*PAT-\d{8}\b",
                "INSURANCE_POLICY": r"\b(?:Insurance Policy|Policy Number):\s*INS-\d{7}\b",
                "MEDICAL_RECORD": r"\b(?:Medical Record|MRN|Record Number):\s*MRN-\d{10}\b",
                "DIAGNOSIS": r"\b(?:Diagnosis|Condition):\s*[A-Za-z0-9\s]+\s?\([A-Z]\d{2}\.\d{1,2}\)\b",
                "MEDICATION": r"\b(?:Medication|Prescription|Rx):\s*[A-Za-z]+\s\d+\s?mg\s(twice|once|daily|weekly)\b",
            },
            "WORKPLACE": {
                "EMPLOYER": r"\b(?:Employer|Company|Organization):\s*[A-Za-z0-9\s]+(?:,\s?Inc\.?|Corporation|Corp\.|LLC|Ltd\.)\b",
                "EMPLOYEE_ID": r"\b(?:Employee ID|Emp ID|ID Number):\s*EMP-\d{5}\b",
                "WORK_EMAIL": r"\b(?:Work Email|Business Email|Corporate Email):\s*[A-Za-z0-9._%+-]+@(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,}\b",
                "SUPERVISOR": r"\b(?:Supervisor|Manager|Boss):\s*[A-Z][a-z]+(?:\s[A-Z][a-z]+)*\b",
                "SALARY": r"\b(?:Salary|Pay|Compensation):\s*\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?\s(?:annually|per year|/year)\b",
            },
            "CREDENTIALS": {
                "USERNAME": r"\b(?:Username|Login|Account):\s*[a-zA-Z0-9][a-zA-Z0-9._-]{2,19}\b",
                "PASSWORD": r"\b(?:Password|Pwd|Pass):\s*(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@#$%^&+=]{8,}\b",
                "API_KEY": r"\b(?:API Key|Secret Key|Key):\s*(?:sk|pk)_(?:test|live)_[A-Za-z0-9]{24,}\b",
                "WIFI_PASSWORD": r"\b(?:WiFi Password|WLAN Password|Network Key):\s*(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@#$%^&+=]{8,}\b",
            }
        }
        
        # Sensitivity categories mapping
        self._sensitivity_mapping = {
            "low": ["PII", "CREDENTIALS"],
            "medium": ["PII", "PHI", "CREDENTIALS", "WORKPLACE"],
            "high": ["PII", "PHI", "CREDENTIALS", "WORKPLACE", "FINANCIAL"]
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