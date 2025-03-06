#!/usr/bin/env python
"""
Launcher script for the Python Redaction System
"""
import os
import sys

# Add the current directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import and run the main function
from python_redaction_system.main import main

if __name__ == "__main__":
    main() 