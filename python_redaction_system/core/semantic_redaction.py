"""
Semantic redaction module that provides context-aware redaction capabilities.
"""

import re
import random
import string
import logging
from typing import Dict, List, Set, Tuple, Any, Optional, Union

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class EntityTracker:
    """
    Tracks and consistently replaces entities throughout a document.
    """
    
    def __init__(self):
        """Initialize the entity tracker."""
        # Map of original entity text to replacement text
        self.entity_map: Dict[str, Dict[str, str]] = {}
        
        # Dictionary of generated names for consistent replacement
        self.generated_names = {
            "PERSON": [],
            "LOCATION": [],
            "ORGANIZATION": []
        }
    
    def get_replacement(self, category: str, entity_text: str, entity_type: Optional[str] = None) -> str:
        """
        Get a consistent replacement for an entity.
        
        Args:
            category: The redaction category (e.g., "PII", "LOCATIONS").
            entity_text: The original entity text.
            entity_type: Optional specific entity type (e.g., "PERSON", "GPE").
            
        Returns:
            The replacement text for the entity.
        """
        # Initialize category in entity_map if not present
        if category not in self.entity_map:
            self.entity_map[category] = {}
        
        # If entity already has a replacement, use it
        if entity_text in self.entity_map[category]:
            return self.entity_map[category][entity_text]
        
        # Generate a new replacement based on entity type and category
        replacement = self._generate_replacement(category, entity_text, entity_type)
        
        # Store the replacement for future use
        self.entity_map[category][entity_text] = replacement
        
        return replacement
    
    def _generate_replacement(self, category: str, entity_text: str, entity_type: Optional[str] = None) -> str:
        """
        Generate a replacement for an entity based on its type.
        
        Args:
            category: The redaction category.
            entity_text: The original entity text.
            entity_type: The specific entity type.
            
        Returns:
            A generated replacement text.
        """
        if category == "PII" and entity_type == "PERSON":
            return self._generate_person_name()
        elif category == "LOCATIONS" or entity_type in ["GPE", "LOC", "FAC"]:
            return self._generate_location_name()
        elif category == "PII" and entity_type == "ORG":
            return self._generate_organization_name()
        elif category == "FINANCIAL" and "CREDIT_CARD" in entity_text:
            return self._generate_credit_card()
        elif category == "FINANCIAL" and any(term in entity_text.lower() for term in ["account", "acct"]):
            return f"ACCT-{self._generate_account_number()}"
        elif category == "PII" and any(term in entity_text.lower() for term in ["ssn", "social security"]):
            return f"SSN-REDACTED"
        elif category == "PHI" and any(term in entity_text.lower() for term in ["mrn", "medical record"]):
            return f"MRN-REDACTED"
        elif category == "PII" and any(term in entity_text.lower() for term in ["email", "@"]):
            return f"EMAIL-REDACTED"
        elif category == "PII" and any(term in entity_text.lower() for term in ["phone", "tel", "mobile"]):
            return f"PHONE-REDACTED"
        else:
            # Default redaction format
            return f"[{category}-REDACTED]"
    
    def _generate_person_name(self) -> str:
        """Generate a fake person name."""
        # List of common first names
        first_names = [
            "Alex", "Bailey", "Cameron", "Dakota", "Emerson", "Finley", "Jordan", "Morgan",
            "Parker", "Quinn", "Riley", "Sam", "Taylor", "Avery", "Casey", "Jamie", "Kendall"
        ]
        
        # List of common last names
        last_names = [
            "Smith", "Johnson", "Williams", "Jones", "Brown", "Davis", "Miller", "Wilson",
            "Anderson", "Thomas", "Jackson", "White", "Harris", "Martin", "Thompson"
        ]
        
        # Select a name that hasn't been used yet if possible
        unused_combinations = [(f, l) for f in first_names for l in last_names
                              if f"{f} {l}" not in self.generated_names["PERSON"]]
        
        if unused_combinations:
            first, last = random.choice(unused_combinations)
            full_name = f"{first} {last}"
            self.generated_names["PERSON"].append(full_name)
            return full_name
        else:
            # If all combinations used, add a random number to make it unique
            first = random.choice(first_names)
            last = random.choice(last_names)
            full_name = f"{first} {last}-{random.randint(1, 999)}"
            self.generated_names["PERSON"].append(full_name)
            return full_name
    
    def _generate_location_name(self) -> str:
        """Generate a fake location name."""
        # List of fictional city names
        city_names = [
            "Westfield", "Fairview", "Riverdale", "Springwood", "Lakeside", "Oakridge",
            "Pine Valley", "Meadowbrook", "Greenville", "Brookside", "Millfield", "Cedarville"
        ]
        
        # List of fictional street names
        street_names = [
            "Main St", "Maple Ave", "Oak Dr", "Cedar Ln", "Elm St", "Washington Ave",
            "Park Rd", "Highland Ave", "Sunset Blvd", "Lake View Dr", "Forest Ave"
        ]
        
        # List of states or regions
        states = [
            "North Region", "South Region", "East Region", "West Region",
            "Central Area", "Northeast Zone", "Southwest Territory"
        ]
        
        # Decide what type of location to generate
        location_type = random.choice(["address", "city", "region"])
        
        if location_type == "address":
            # Generate a random address
            number = random.randint(1, 9999)
            street = random.choice(street_names)
            city = random.choice(city_names)
            location = f"{number} {street}, {city}"
        elif location_type == "city":
            # Just return a city name
            location = random.choice(city_names)
        else:
            # Return a state/region name
            location = random.choice(states)
        
        # Check if this location has already been used
        if location in self.generated_names["LOCATION"]:
            location = f"{location}-{random.randint(1, 999)}"
        
        self.generated_names["LOCATION"].append(location)
        return location
    
    def _generate_organization_name(self) -> str:
        """Generate a fake organization name."""
        # List of fictional organization prefixes
        prefixes = [
            "Global", "National", "International", "United", "Advanced", "Technical",
            "Universal", "Dynamic", "Innovative", "Strategic", "Progressive", "Premier"
        ]
        
        # List of fictional organization core names
        cores = [
            "Solutions", "Systems", "Technologies", "Industries", "Enterprises",
            "Services", "Associates", "Partners", "Consulting", "Group", "Network"
        ]
        
        # List of fictional organization types
        types = [
            "Inc.", "Corp.", "LLC", "Ltd.", "Association", "Foundation", "Agency",
            "Company", "Organization", "Consortium", "Institute"
        ]
        
        # Decide on organization complexity
        complexity = random.choice(["simple", "complex"])
        
        if complexity == "simple":
            # Simple org name: [Core] [Type]
            org_name = f"{random.choice(cores)} {random.choice(types)}"
        else:
            # Complex org name: [Prefix] [Core] [Type]
            org_name = f"{random.choice(prefixes)} {random.choice(cores)} {random.choice(types)}"
        
        # Check if this organization has already been used
        if org_name in self.generated_names["ORGANIZATION"]:
            org_name = f"{org_name}-{random.randint(1, 999)}"
        
        self.generated_names["ORGANIZATION"].append(org_name)
        return org_name
    
    def _generate_credit_card(self) -> str:
        """Generate a fake credit card number placeholder."""
        return "XXXX-XXXX-XXXX-XXXX"
    
    def _generate_account_number(self) -> str:
        """Generate a fake account number."""
        return "".join(random.choices(string.digits, k=8))


class SemanticRedactionEngine:
    """
    Provides semantic, context-aware redaction capabilities.
    """
    
    def __init__(self):
        """Initialize the semantic redaction engine."""
        self.entity_tracker = EntityTracker()
        
        # Common sentence structures for context preservation
        self.sentence_structures = {
            "PERSON": {
                "subject": "[PERSON] is",
                "object": "with [PERSON]",
                "possessive": "[PERSON]'s"
            },
            "LOCATION": {
                "at_location": "at [LOCATION]",
                "from_location": "from [LOCATION]",
                "to_location": "to [LOCATION]"
            },
            "ORGANIZATION": {
                "at_org": "at [ORGANIZATION]",
                "with_org": "with [ORGANIZATION]",
                "org_possessive": "[ORGANIZATION]'s"
            }
        }
    
    def redact_text_with_context(self, text: str, entities: Dict[str, List[Tuple[str, str]]], 
                                use_pseudonyms: bool = True) -> str:
        """
        Redact text while preserving context and using consistent replacements.
        
        Args:
            text: The original text to redact.
            entities: Dictionary mapping category names to lists of (entity_text, entity_type) tuples.
            use_pseudonyms: Whether to use generated fake data instead of [REDACTED] markers.
            
        Returns:
            Redacted text with context preservation.
        """
        redacted_text = text
        
        # Sort entities by length (descending) to handle overlapping entities correctly
        all_entities = []
        for category, entity_list in entities.items():
            for entity_text, entity_type in entity_list:
                all_entities.append((entity_text, category, entity_type))
        
        all_entities.sort(key=lambda x: len(x[0]), reverse=True)
        
        # Process each entity for redaction
        for entity_text, category, entity_type in all_entities:
            if not entity_text:
                continue
            
            # Get consistent replacement
            if use_pseudonyms:
                replacement = self.entity_tracker.get_replacement(category, entity_text, entity_type)
            else:
                # Use standard redaction marker if pseudonyms not requested
                replacement = f"[{category}:{entity_type or 'UNKNOWN'}]"
            
            # Replace all occurrences of the entity in the text
            redacted_text = self._replace_with_context(redacted_text, entity_text, replacement, entity_type)
        
        return redacted_text
    
    def _replace_with_context(self, text: str, entity_text: str, replacement: str, entity_type: Optional[str]) -> str:
        """
        Replace an entity in text while preserving contextual structure.
        
        Args:
            text: The text to process.
            entity_text: The entity to replace.
            replacement: The replacement text.
            entity_type: The type of entity (e.g., "PERSON", "GPE").
            
        Returns:
            Text with entity replaced while preserving context.
        """
        # Special case for short entities to avoid partial matches
        if len(entity_text) <= 3:
            # Use word boundary for short entities
            pattern = r'\b' + re.escape(entity_text) + r'\b'
            return re.sub(pattern, replacement, text)
        
        # Standard replacement for longer entities
        return text.replace(entity_text, replacement)
    
    def pseudonymize_entities(self, entity_dict: Dict[str, List[str]]) -> Dict[str, Dict[str, str]]:
        """
        Generate consistent pseudonyms for entities.
        
        Args:
            entity_dict: Dictionary mapping categories to lists of entities.
            
        Returns:
            Dictionary mapping categories to {original: pseudonym} dictionaries.
        """
        result = {}
        
        for category, entities in entity_dict.items():
            result[category] = {}
            
            for entity in entities:
                # Map entity type based on category
                entity_type = None
                if category == "PII":
                    if '@' in entity:
                        entity_type = "EMAIL"
                    elif re.search(r'\d{3}[-.\s]?\d{3}[-.\s]?\d{4}', entity):
                        entity_type = "PHONE"
                    else:
                        entity_type = "PERSON"
                elif category == "LOCATIONS":
                    entity_type = "LOCATION"
                
                # Get replacement
                replacement = self.entity_tracker.get_replacement(category, entity, entity_type)
                result[category][entity] = replacement
        
        return result