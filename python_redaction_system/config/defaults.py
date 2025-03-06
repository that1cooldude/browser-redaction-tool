"""
Default configuration values for the redaction system.
"""

import os

# Default settings for the application
DEFAULT_SETTINGS = {
    # Database settings
    "database_path": os.path.expanduser("~/.redaction_system/redaction.db"),
    
    # UI settings
    "window_width": 1000,
    "window_height": 800,
    "default_sensitivity": "medium",
    "theme": "system",  # "light", "dark", or "system"
    
    # Redaction settings
    "default_categories": ["PII", "PHI", "CREDENTIALS"],
    "redaction_marker": "[REDACTED]",
    "show_category_in_redaction": True,  # If True, show "[PII:SSN]" instead of just "[REDACTED]"
    
    # Export settings
    "default_export_format": "text",  # "text", "json", "csv", etc.
    "default_export_path": os.path.expanduser("~/Documents"),
    
    # Security settings
    "log_redactions": True,
    "log_retention_days": 90,
    "audit_trail_enabled": True,
    
    # Advanced settings
    "max_file_size_mb": 10,  # Maximum file size for import in MB
    "parallel_processing": True,  # Use multiple cores for redaction
}

# Presidio and redaction engine settings
REDACTION_SETTINGS = {
    "use_presidio": True,
    "confidence_threshold": 0.85,
    "max_chunk_size": 100000,  # Maximum text chunk size for processing
}

# Security-related constants
SECURITY_CONSTANTS = {
    "encryption_algorithm": "AES-256",
    "hash_algorithm": "SHA-256",
    "pbkdf2_iterations": 100000,
}

# UI-related constants
UI_CONSTANTS = {
    "max_recent_files": 10,
    "max_undo_steps": 20,
    "auto_save_interval_sec": 300,  # 5 minutes
}

# Sensitivity levels and their associated categories
SENSITIVITY_LEVELS = {
    "low": ["PII", "CREDENTIALS"],
    "medium": ["PII", "PHI", "CREDENTIALS", "FINANCIAL"],
    "high": ["PII", "PHI", "CREDENTIALS", "FINANCIAL", "LOCATIONS"],
}