"""
Tests for the semantic redaction module.
"""

import unittest
from python_redaction_system.core.semantic_redaction import EntityTracker, SemanticRedactionEngine


class TestEntityTracker(unittest.TestCase):
    """Test cases for the EntityTracker class."""
    
    def test_get_replacement(self):
        """Test that the same entity gets the same replacement consistently."""
        tracker = EntityTracker()
        
        # Test that the same entity gets the same replacement
        replacement1 = tracker.get_replacement("PII", "John Smith", "PERSON")
        replacement2 = tracker.get_replacement("PII", "John Smith", "PERSON")
        self.assertEqual(replacement1, replacement2)
        
        # Test that different entities get different replacements
        replacement3 = tracker.get_replacement("PII", "Jane Doe", "PERSON")
        self.assertNotEqual(replacement1, replacement3)
        
        # Test that same entity in different categories gets different replacements
        replacement4 = tracker.get_replacement("LOCATIONS", "John Smith", "LOCATION")
        self.assertNotEqual(replacement1, replacement4)
    
    def test_generate_person_name(self):
        """Test generation of person names."""
        tracker = EntityTracker()
        
        # Generate multiple names and check they're all unique
        names = set()
        for _ in range(10):
            name = tracker._generate_person_name()
            names.add(name)
            # Check that the name is in the expected format (FirstName LastName)
            self.assertRegex(name, r'^[A-Z][a-z]+ [A-Z][a-z]+(-\d+)?$')
        
        # Check that we generated 10 unique names
        self.assertEqual(len(names), 10)
    
    def test_generate_location_name(self):
        """Test generation of location names."""
        tracker = EntityTracker()
        
        # Generate multiple locations and check they're all unique
        locations = set()
        for _ in range(10):
            location = tracker._generate_location_name()
            locations.add(location)
        
        # Check that we generated 10 unique locations
        self.assertEqual(len(locations), 10)


class TestSemanticRedactionEngine(unittest.TestCase):
    """Test cases for the SemanticRedactionEngine class."""
    
    def test_redact_text_with_context(self):
        """Test redaction with context preservation."""
        engine = SemanticRedactionEngine()
        
        # Sample text with entities
        text = "John Smith works at Acme Corporation in New York City. His phone number is 555-123-4567."
        
        # Entities to redact
        entities = {
            "PII": [
                ("John Smith", "PERSON"),
                ("555-123-4567", "PHONE"),
                ("Acme Corporation", "ORG")
            ],
            "LOCATIONS": [
                ("New York City", "LOCATION")
            ]
        }
        
        # Redact with pseudonyms
        redacted_text = engine.redact_text_with_context(text, entities, use_pseudonyms=True)
        
        # Check that the original entities are not in the redacted text
        self.assertNotIn("John Smith", redacted_text)
        self.assertNotIn("Acme Corporation", redacted_text)
        self.assertNotIn("New York City", redacted_text)
        self.assertNotIn("555-123-4567", redacted_text)
        
        # Check that the text flow is preserved (still has the structure "X works at Y in Z")
        self.assertRegex(redacted_text, r'.+ works at .+ in .+\. .+ phone number is .+\.')
    
    def test_redact_without_pseudonyms(self):
        """Test redaction without pseudonyms (using standard markers)."""
        engine = SemanticRedactionEngine()
        
        # Sample text with entities
        text = "The patient John Smith has been diagnosed with hypertension."
        
        # Entities to redact
        entities = {
            "PII": [
                ("John Smith", "PERSON")
            ],
            "PHI": [
                ("hypertension", "DIAGNOSIS")
            ]
        }
        
        # Redact without pseudonyms
        redacted_text = engine.redact_text_with_context(text, entities, use_pseudonyms=False)
        
        # Check that the original entities are replaced with markers
        self.assertNotIn("John Smith", redacted_text)
        self.assertNotIn("hypertension", redacted_text)
        self.assertIn("[PII:PERSON]", redacted_text)
        self.assertIn("[PHI:DIAGNOSIS]", redacted_text)


if __name__ == '__main__':
    unittest.main()