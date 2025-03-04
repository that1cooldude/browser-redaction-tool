"""
Settings manager for the redaction system.
"""

import os
import json
from typing import Any, Dict, Optional

from python_redaction_system.config.defaults import DEFAULT_SETTINGS


class SettingsManager:
    """
    Manages application settings with persistence.
    """

    def __init__(self, config_path: Optional[str] = None):
        """
        Initialize the settings manager.
        
        Args:
            config_path: Path to the settings file. If None, a default path will be used.
        """
        self.config_path = config_path or os.path.expanduser("~/.redaction_system/settings.json")
        self.settings = self._load_settings()
    
    def _load_settings(self) -> Dict[str, Any]:
        """
        Load settings from the settings file or use defaults if the file doesn't exist.
        
        Returns:
            A dictionary of settings.
        """
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(self.config_path), exist_ok=True)
        
        # Try to load settings from file
        try:
            if os.path.exists(self.config_path):
                with open(self.config_path, 'r') as f:
                    settings = json.load(f)
                    
                    # Merge with defaults to ensure all settings are present
                    merged_settings = DEFAULT_SETTINGS.copy()
                    merged_settings.update(settings)
                    return merged_settings
        except Exception:
            # If there's an error loading settings, use defaults
            pass
        
        # Use defaults and save them to the file
        self._save_settings(DEFAULT_SETTINGS)
        return DEFAULT_SETTINGS.copy()
    
    def _save_settings(self, settings: Dict[str, Any]) -> None:
        """
        Save settings to the settings file.
        
        Args:
            settings: A dictionary of settings to save.
        """
        try:
            with open(self.config_path, 'w') as f:
                json.dump(settings, f, indent=4)
        except Exception as e:
            print(f"Error saving settings: {e}")
    
    def get(self, key: str, default: Any = None) -> Any:
        """
        Get a setting value.
        
        Args:
            key: The setting key.
            default: The default value to return if the key doesn't exist.
        
        Returns:
            The setting value or the default.
        """
        return self.settings.get(key, default)
    
    def set(self, key: str, value: Any) -> None:
        """
        Set a setting value and save to disk.
        
        Args:
            key: The setting key.
            value: The setting value.
        """
        self.settings[key] = value
        self._save_settings(self.settings)
    
    def reset(self) -> None:
        """Reset settings to defaults."""
        self.settings = DEFAULT_SETTINGS.copy()
        self._save_settings(self.settings)