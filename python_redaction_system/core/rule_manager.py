"""
Rule manager for handling redaction rules and categories.
"""

import re
from typing import Dict, List, Optional, Set

from storage.custom_terms import CustomTermsManager


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
        
        # Comprehensive preset redaction rules with multiple pattern variants
        self._preset_rules = {
            "PII": {
                # Social Security Numbers - multiple formats
                "SSN_HYPHENATED": r"\b\d{3}-\d{2}-\d{4}\b",
                "SSN_SPACED": r"\b\d{3}\s+\d{2}\s+\d{4}\b",
                "SSN_DOTTED": r"\b\d{3}\.\d{2}\.\d{4}\b",
                "SSN_CONTINUOUS": r"(?<!\d)\d{9}(?!\d)",
                "SSN_MASKED": r"\b(?:[xX*]{3,5}|[xX*]{3}[-.\s][xX*]{2}[-.\s][xX*]{4}|\d{3}[-.\s][xX*]{2}[-.\s]\d{4}|\d{3}[-.\s]\d{2}[-.\s][xX*]{4})[^\d]\b",
                "SSN_WITH_CONTEXT": r"(?i)\b(?:SSN|social security|social security number|tax\s+id)[\s#:_-]*\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b",
                
                # Names with common titles and full name patterns
                "NAME_WITH_TITLE": r"\b(?:Mr\.|Mrs\.|Ms\.|Miss|Dr\.|Prof\.|Sir|Madam|Lady)\.?\s+[A-Z][a-z]+(?:\s+(?:[A-Z]\.?|[A-Z][a-z]+))*\s+[A-Z][a-z]+\b",
                "FULL_NAME": r"\b[A-Z][a-z]+(?:\s+(?:[A-Z]\.?|[A-Z][a-z]+))*\s+[A-Z][a-z]+\b",
                
                # Phone Numbers - multiple formats, with and without context
                "PHONE_US_STANDARD": r"\b(?:\+?1[-.\s]?)?(?:\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}\b",
                "PHONE_INTERNATIONAL": r"\b\+\d{1,3}[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}\b",
                "PHONE_WITH_EXTENSION": r"\b(?:\+?1[-.\s]?)?(?:\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}(?:[-.\s]?(?:ext|x|ext\.)\s?\d{1,5})?\b",
                "PHONE_WITH_CONTEXT": r"(?i)(?:(?:cell|phone|mobile|tel|telephone|contact)(?:\s+(?:number|#|no|num))?[:.\s-]+)?\b(?:\+?1[-.\s]?)?(?:\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}\b",
                
                # Email Addresses - comprehensive pattern
                "EMAIL": r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b",
                "EMAIL_WITH_CONTEXT": r"(?i)(?:email|e-mail|mail)(?:\s+(?:address|id))?[:.\s-]+\s*\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b",
                
                # Date of Birth - multiple formats
                "DOB_STANDARD": r"\b(?:0?[1-9]|1[0-2])/(?:0?[1-9]|[12]\d|3[01])/(?:19|20)\d{2}\b",
                "DOB_INTERNATIONAL": r"\b(?:0?[1-9]|[12]\d|3[01])[-./](?:0?[1-9]|1[0-2])[-./](?:19|20)\d{2}\b",
                "DOB_WRITTEN": r"\b(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[.,]?\s+(?:0?[1-9]|[12]\d|3[01])(?:st|nd|rd|th)?,?\s+(?:19|20)\d{2}\b",
                "DOB_WITH_CONTEXT": r"(?i)\b(?:born|birth|dob|date\s+of\s+birth|birthdate)[\s:]+(?:0?[1-9]|1[0-2])/(?:0?[1-9]|[12]\d|3[01])/(?:19|20)\d{2}\b",
                "AGE": r"(?i)\b(?:age|aged)[\s:]?\d{1,3}(?:\s+years?\s+old)?\b",
                
                # Driver's License - multiple state formats
                "DL_GENERIC": r"\b[A-Z]{1,2}[-\s]?\d{4,8}\b",
                "DL_ALPHANUMERIC": r"\b[A-Z]\d{3,7}|[A-Z]{2}\d{2,6}|[A-Z]{1,2}-\d{3,7}|\d{3,7}[A-Z]{1,2}\b",
                "DL_WITH_CONTEXT": r"(?i)\b(?:driver'?s?|driving)?\s*(?:license|lic\.?|DL)(?:\s+(?:number|no\.?|#))?\s*[:.\s-]*(?:[A-Z0-9]{1,4}[-.\s]?){1,5}[A-Z0-9]{1,4}\b",
                
                # Passport Numbers
                "PASSPORT_US": r"\b[A-Z]\d{8}\b",
                "PASSPORT_GENERIC": r"\b[A-Z0-9]{5,9}\b",
                "PASSPORT_WITH_CONTEXT": r"(?i)\b(?:passport|travel\s+document)(?:\s+(?:number|no\.?|#))?\s*[:.\s-]*[A-Z0-9]{5,9}\b",
                
                # Tax Identification Numbers - multiple formats
                "TAX_ID_EIN": r"\b\d{2}-\d{7}\b",
                "TAX_ID_ITIN": r"\b9\d{2}[-\s]?[78]\d[-\s]?\d{4}\b",
                "TAX_ID_WITH_CONTEXT": r"(?i)\b(?:tax|taxpayer|employer|EIN|TIN|ITIN)(?:\s+(?:id|identification|number|no\.?|#))?\s*[:.\s-]*\d{2}[-\s]?\d{7}\b",
            },
            "PHI": {
                # Medical Record Numbers - multiple formats
                "MRN": r"\b(?:MRN|Medical Record Number|Patient ID|Patient Number)[:.\s-]*\d{1,10}\b",
                "MRN_NUMERIC": r"\b\d{6,10}\b",
                "MRN_ALPHANUMERIC": r"\b[A-Z]{1,3}\d{5,9}\b",
                
                # Health Plan & Insurance IDs
                "HEALTH_ID": r"\b(?:HIC|Health Insurance Claim Number|Group Number|Member ID|Insurance ID)[:.\s-]*[A-Z0-9]{6,12}\b",
                "HEALTH_PLAN_ID": r"\b[A-Z]{1,5}\d{6,12}\b",
                "MEDICARE_ID": r"\b\d{1,4}[-\s]?[A-Z]{1,2}[-\s]?\d{1,5}\b",
                "MEDICAID_ID": r"\b[A-Z]{1,2}[-\s]?\d{6,12}\b",
                
                # Medical Device Identifiers
                "DEVICE_ID": r"\b(?:Device ID|Serial Number|Implant ID)[:.\s-]*[A-Z0-9-]{6,20}\b",
                
                # Biometric Identifiers
                "BIOMETRIC_ID": r"\b(?:Biometric|Fingerprint|Retinal|DNA)(?:\s+ID)?[:.\s-]*[A-Z0-9-]{4,20}\b",
                
                # Medical Conditions and Diagnoses
                "DIAGNOSIS": r"\b(?:diagnosed with|diagnosis of|suffers from|experiencing|history of|presents with)(?:[\s:]+[A-Za-z0-9',\(\)\-\s]{5,50}(?:\.|\band\b|,|\bor\b|$))+",
                "ICD_CODE": r"\b(?:ICD-10|ICD10)[:.\s-]*[A-Z]\d{2}(?:\.\d{1,2})?\b",
                "DISEASE_NAMES": r"\b(?:cancer|diabetes|asthma|hypertension|depression|anxiety|schizophrenia|bipolar disorder|hepatitis|HIV|AIDS|COVID\-19|alzheimer's|COPD|stroke|heart disease|arthritis)\b",
                
                # Lab Results and Measurements
                "LAB_RESULTS": r"\b(?:WBC|RBC|Hgb|Hct|BUN|Cr|Na|K|Cl|CO2|Glucose|A1C|TSH|PSA|ALT|AST)[:.\s]*(?:(?:(?:<|>|<=|>=)?[-+]?\d+(?:\.\d+)?(?:\s*(?:mg\/dL|mmol\/L|g\/dL|%|U\/L|mmHg|ng\/dL|um)))|\b(?:positive|negative|normal|abnormal|elevated|decreased)\b)",
            },
            "FINANCIAL": {
                # Credit Card Numbers - multiple formats
                "CREDIT_CARD_16": r"\b(?:\d{4}[-\s]?){3}\d{4}\b",
                "CREDIT_CARD_AMEX": r"\b\d{4}[-\s]?\d{6}[-\s]?\d{5}\b",
                "CREDIT_CARD_PREFIXED": r"\b(?:visa|mastercard|amex|american express|discover)(?:\s+card)?(?:\s+ending in)?\s+(?:\d{4}[-\s]?){0,3}\d{4}\b",
                "CREDIT_CARD_MASKED": r"\b(?:[xX*]{4,12}[-\s]?\d{4}|[xX*]{4}[-\s]?(?:[xX*]{4}[-\s]?){0,2}\d{4})\b",
                
                # Bank Account Numbers
                "BANK_ACCOUNT": r"\b(?:account|acct|checking|savings)[\s#:_-]*\d{8,17}\b",
                "ACCOUNT_WITH_TRANSIT": r"\b\d{9,12}[-\s]\d{8,17}\b",
                "IBAN": r"\b[A-Z]{2}\d{2}[-\s]?(?:\d{4}[-\s]?){3,5}\d{0,4}\b",
                
                # Routing Numbers
                "ROUTING_NUMBER": r"\b(?:routing|RTN|ABA)[\s#:_-]*\d{9}\b",
                "ROUTING_FORMATTED": r"\b\d{3}[-\s]?\d{3}[-\s]?\d{3}\b",
                
                # Financial Identifiers
                "INVESTMENT_ACCOUNT": r"\b(?:brokerage|investment|portfolio|401k|IRA)[\s#:_-]*\d{6,12}\b",
                "TAX_FILING_STATUS": r"\b(?:single|married filing jointly|married filing separately|head of household|qualifying widow(?:er)?)\b",
                
                # Cryptocurrency
                "CRYPTO_WALLET": r"\b(?:bitcoin|ethereum|wallet|BTC|ETH)[\s#:_-]*[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b",
                "CRYPTO_TRANSACTION": r"\b0x[a-fA-F0-9]{64}\b",
                
                # Financial Metrics
                "SALARY": r"\b(?:salary|income|compensation|earning|pay)[\s#:_-]*[$£€¥]?\s*\d{1,3}(?:,\d{3})*(?:\.\d{2})?(?:\s*(?:k|thousand|million|m|billion|b))?\b",
                "NET_WORTH": r"\b(?:net worth|assets|wealth|portfolio value)[\s#:_-]*[$£€¥]?\s*\d{1,3}(?:,\d{3})*(?:\.\d{2})?(?:\s*(?:k|thousand|million|m|billion|b))?\b",
            },
            "LOCATIONS": {
                # Street Addresses - multiple formats
                "ADDRESS_US": r"\b\d{1,6}(?:\s+\d{1,6}(?:st|nd|rd|th))?(?:\s+[A-Z][a-zA-Z\.\s]+){1,5}(?:street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr|court|ct|plaza|plz|terrace|ter|place|pl|square|sq)\b",
                "ADDRESS_UNIT": r"\b\d{1,6}(?:\s+\d{1,6}(?:st|nd|rd|th))?(?:\s+[A-Z][a-zA-Z\.\s]+){1,5}(?:street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr|court|ct|plaza|plz|terrace|ter|place|pl|square|sq)(?:\s+(?:apt|apartment|unit|suite|ste|#)\.?\s*[a-zA-Z0-9-]+)?\b",
                "ADDRESS_PO_BOX": r"\bP\.?O\.?\s*Box\s+\d{1,6}\b",
                "ADDRESS_WITH_CITY": r"\b\d{1,6}(?:\s+\d{1,6}(?:st|nd|rd|th))?(?:\s+[A-Z][a-zA-Z\.\s]+){1,5}(?:street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr|court|ct|plaza|plz|terrace|ter|place|pl|square|sq)(?:\s+(?:apt|apartment|unit|suite|ste|#)\.?\s*[a-zA-Z0-9-]+)?,?\s+[A-Z][a-zA-Z\.\s]+,\s+[A-Z]{2}\s+\d{5}(?:-\d{4})?\b",
                "ADDRESS_ABBREVIATED": r"\b\d{1,6}\s+[A-Z][a-zA-Z0-9\.\s]+\b",
                
                # Zip/Postal Codes - multiple countries
                "ZIP_US": r"\b\d{5}(?:-\d{4})?\b",
                "ZIP_CANADA": r"\b[A-Z]\d[A-Z]\s*\d[A-Z]\d\b",
                "ZIP_UK": r"\b[A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2}\b",
                "ZIP_WITH_CONTEXT": r"(?i)\b(?:zip|postal|post)(?:\s+(?:code|#))?\s*[:.\s-]*(?:\d{5}(?:-\d{4})?|[A-Z]\d[A-Z]\s*\d[A-Z]\d|[A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2})\b",
                
                # GPS Coordinates
                "GPS_DECIMAL": r"\b[-+]?\d{1,3}\.\d+,\s*[-+]?\d{1,3}\.\d+\b",
                "GPS_DMS": r"\b\d{1,3}°\s*\d{1,2}['′](?:\s*\d{1,2}(?:\.?\d+)?[\"″])?\s*[NSEW],?\s*\d{1,3}°\s*\d{1,2}['′](?:\s*\d{1,2}(?:\.?\d+)?[\"″])?\s*[NSEW]\b",
                "GPS_WITH_CONTEXT": r"(?i)\b(?:GPS|coordinates|latitude|longitude|lat|long|position|location)[:.\s-]*\(?[-+]?\d{1,3}\.\d+,\s*[-+]?\d{1,3}\.\d+\)?\b",
                
                # Places
                "CITY_STATE": r"\b[A-Z][a-zA-Z\.\s-]{2,25},\s*[A-Z]{2}\b",
                "CITY_COUNTRY": r"\b[A-Z][a-zA-Z\.\s-]{2,25},\s*[A-Z][a-zA-Z\.\s-]{2,25}\b",
                "LANDMARK": r"\b(?:the |)[A-Z][a-zA-Z0-9\.\s-]+(?:Building|Tower|Bridge|Stadium|Park|Museum|Airport|Hospital|School|University|College|Mall|Center|Centre)\b",
            },
            "CREDENTIALS": {
                # Username Patterns
                "USERNAME": r"\b(?:username|user|login|account)[:.\s-]*[a-zA-Z0-9._-]{3,30}\b",
                "USERNAME_WITH_DOMAIN": r"\b[a-zA-Z0-9._-]{3,30}@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b",
                
                # Password Patterns
                "PASSWORD": r"\b(?:password|pwd|passcode)[:.\s=-]*[A-Za-z0-9!@#$%^&*()_+=-]{6,30}\b",
                "PASSWORD_MASKED": r"\b(?:password|pwd|passcode)[:.\s=-]*[*•●\-x]{3,30}\b",
                
                # API/Auth Keys and Tokens
                "API_KEY": r"\b[A-Za-z0-9_-]{10,40}\b",
                "API_KEY_WITH_PREFIX": r"\b(?:api[_-]?key|auth[_-]?token|access[_-]?token|bearer)[:.\s=-]*[A-Za-z0-9_.-]{10,100}\b",
                "JWT": r"\b[A-Za-z0-9_-]{10,30}\.[A-Za-z0-9_-]{10,60}\.[A-Za-z0-9_-]{10,50}\b",
                "OAUTH_TOKEN": r"\b(?:oauth|access|refresh)[_-]?token[:.\s=-]*[A-Za-z0-9_.-]{10,100}\b",
                
                # Multi-factor and Temporary Access
                "MFA_CODE": r"\b(?:mfa|2fa|otp|verification)[:.\s-]*\d{4,8}\b",
                "ACCESS_CODE": r"\b(?:access|security|auth|authorization)[:.\s-]*code[:.\s-]*[A-Za-z0-9]{4,12}\b",
                
                # URLs with potential credentials
                "CREDENTIALS_URL": r"\b(?:https?://)[a-zA-Z0-9._-]+:[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b",
                "DATABASE_CONNECTION": r"\b(?:jdbc|mysql|postgresql|mongodb|redis|odbc)[:.\s-]*//[a-zA-Z0-9._-]+:[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?::\d{1,5})?/[a-zA-Z0-9_-]+\b",
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