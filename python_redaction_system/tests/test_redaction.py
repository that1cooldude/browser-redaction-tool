"""
Tests for the redaction engine.
"""

import pytest

from python_redaction_system.core.redaction_engine import RedactionEngine
from python_redaction_system.core.rule_manager import RuleManager


class TestRedactionEngine:
    """Tests for the RedactionEngine class."""
    
    @pytest.fixture
    def engine(self):
        """Create a RedactionEngine instance for testing."""
        return RedactionEngine()
    
    def test_redaction_with_default_rules(self, engine):
        """Test that the redaction engine correctly redacts information with default rules."""
        # Sample text with sensitive information
        text = "My SSN is 123-45-6789 and my email is john.doe@example.com"
        
        # Redact with default rules
        redacted_text, stats = engine.redact_text(text, ["PII"])
        
        # Check that sensitive information is redacted
        assert "123-45-6789" not in redacted_text
        assert "john.doe@example.com" not in redacted_text
        assert "[PII:SSN]" in redacted_text
        assert "[PII:EMAIL]" in redacted_text
        
        # Check that stats are correct
        assert stats["PII"] == 2
    
    def test_sensitivity_levels(self, engine):
        """Test that different sensitivity levels apply different categories."""
        # Set sensitivity level
        engine.set_sensitivity("low")
        
        # Get categories for this sensitivity level
        categories = engine.rule_manager.get_categories_for_sensitivity("low")
        
        # Check that categories for 'low' sensitivity include PII
        assert "PII" in categories
        
        # Change sensitivity level
        engine.set_sensitivity("high")
        
        # Get categories for high sensitivity
        categories = engine.rule_manager.get_categories_for_sensitivity("high")
        
        # Check that more categories are included in 'high' sensitivity
        assert "PII" in categories
        assert "FINANCIAL" in categories
        assert "LOCATIONS" in categories
    
    def test_invalid_sensitivity_level(self, engine):
        """Test that an invalid sensitivity level raises an exception."""
        with pytest.raises(ValueError):
            engine.set_sensitivity("invalid")
    
    def test_text_analysis(self, engine):
        """Test the text analysis functionality."""
        # Sample text with sensitive information
        text = "Contact me at 555-123-4567 or through john.doe@example.com"
        
        # Analyze the text
        analysis = engine.analyze_text(text)
        
        # Check that analysis contains the sensitive information
        assert "PII" in analysis
        assert "555-123-4567" in str(analysis["PII"])
        assert "john.doe@example.com" in str(analysis["PII"])