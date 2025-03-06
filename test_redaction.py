#!/usr/bin/env python3
"""
Test script to verify the redaction system works with the updated code.
Used for quick testing from command line.
"""

import logging
import sys
from python_redaction_system.core.rule_manager import RuleManager
from python_redaction_system.core.redaction_engine import RedactionEngine

# Configure logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

def test_redaction():
    """Test redaction functionality."""
    print(f"Running with Python {sys.version}")
    
    # Create redaction engine
    print("\nInitializing redaction engine...")
    rule_manager = RuleManager()
    engine = RedactionEngine(rule_manager)
    
    # Print available methods
    print(f"\nAvailable redaction methods: {[m.value for m in engine.available_methods]}")
    
    # Test sample text
    sample_text = """
    Hello, my name is John Smith and my email is john.smith@example.com.
    My phone number is (555) 123-4567 and my credit card is 4111-1111-1111-1111.
    I live at 123 Main St, New York, NY 10001.
    """
    
    print("\nOriginal text:")
    print(sample_text)
    
    # Try redaction
    print("\nRedacted text:")
    redacted_text, stats = engine.redact_text(sample_text)
    print(redacted_text)
    
    # Print stats
    print("\nRedaction statistics:")
    print(stats)
    
    # Try analysis
    print("\nText analysis:")
    analysis = engine.analyze_text(sample_text)
    for category, items in analysis.items():
        print(f"{category}: {items}")

if __name__ == "__main__":
    test_redaction() 