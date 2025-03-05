"""
Main entry point for the Python text redaction system.

This module handles application startup, platform detection, and UI initialization
with appropriate fallback mechanisms for cross-platform compatibility.
"""

import sys
import os
import platform
import traceback
import importlib
from typing import Optional, Dict, Any

# Determine UI toolkit availability before importing specific modules
def check_ui_toolkit_availability() -> Dict[str, bool]:
    """
    Check which UI toolkits are available on the current system.
    
    Returns:
        Dictionary mapping toolkit names to availability status
    """
    toolkit_status = {
        "PyQt6": False,
        "PySide6": False,
        "PyQt5": False,
        "PySide2": False,
        "tkinter": False  # Fallback option
    }
    
    # Check PyQt6
    try:
        importlib.import_module("PyQt6.QtWidgets")
        toolkit_status["PyQt6"] = True
    except ImportError:
        pass
    
    # Check PySide6
    try:
        importlib.import_module("PySide6.QtWidgets")
        toolkit_status["PySide6"] = True
    except ImportError:
        pass
    
    # Check PyQt5
    try:
        importlib.import_module("PyQt5.QtWidgets")
        toolkit_status["PyQt5"] = True
    except ImportError:
        pass
    
    # Check PySide2
    try:
        importlib.import_module("PySide2.QtWidgets")
        toolkit_status["PySide2"] = True
    except ImportError:
        pass
    
    # Check tkinter
    try:
        importlib.import_module("tkinter")
        toolkit_status["tkinter"] = True
    except ImportError:
        pass
    
    return toolkit_status

# Select the best available UI toolkit
available_toolkits = check_ui_toolkit_availability()
selected_toolkit = None

# Define the order of preference
toolkit_preference = ["PyQt6", "PySide6", "PyQt5", "PySide2"]

# Try each toolkit in order of preference
for toolkit in toolkit_preference:
    if available_toolkits.get(toolkit, False):
        selected_toolkit = toolkit
        break

if selected_toolkit:
    print(f"Selected UI toolkit: {selected_toolkit}")
    # Set environment variable for UI factory to use
    os.environ["REDACTION_UI_TOOLKIT"] = selected_toolkit
else:
    print("No compatible UI toolkit found. Please install PyQt6, PySide6, PyQt5, or PySide2.")
    sys.exit(1)

# Now we can safely import our modules
if selected_toolkit == "PyQt6":
    from PyQt6.QtWidgets import QApplication, QMessageBox
elif selected_toolkit == "PySide6":
    from PySide6.QtWidgets import QApplication, QMessageBox
elif selected_toolkit == "PyQt5":
    from PyQt5.QtWidgets import QApplication, QMessageBox
elif selected_toolkit == "PySide2":
    from PySide2.QtWidgets import QApplication, QMessageBox

# Fix imports to use local modules
from core.redaction_engine import RedactionEngine
from core.rule_manager import RuleManager
from storage.custom_terms import CustomTermsManager
from storage.database import DatabaseManager
from config.settings import SettingsManager
from ui.main_window import MainWindow


def handle_exception(exc_type, exc_value, exc_traceback):
    """Global exception handler for unhandled exceptions."""
    error_msg = "".join(traceback.format_exception(exc_type, exc_value, exc_traceback))
    print(f"Unhandled Exception: {error_msg}", file=sys.stderr)
    
    if QApplication.instance():
        error_dialog = QMessageBox()
        error_dialog.setIcon(QMessageBox.Icon.Critical)
        error_dialog.setWindowTitle("Error")
        error_dialog.setText(str(exc_value))
        error_dialog.setDetailedText(error_msg)
        error_dialog.exec()
    else:
        # If Qt application doesn't exist, just print to stderr
        traceback.print_exception(exc_type, exc_value, exc_traceback)


def setup_platform_specifics():
    """
    Set up platform-specific configurations
    """
    system = platform.system()
    
    if system == "Windows":
        # Windows-specific settings
        os.environ["QT_AUTO_SCREEN_SCALE_FACTOR"] = "1"  # Enable high DPI scaling
        
        # Ensure app data directory exists
        app_data = os.path.join(os.environ.get("APPDATA", ""), "TextRedactionSystem")
        os.makedirs(app_data, exist_ok=True)
        
        # Set up Windows-specific configuration paths
        return {"data_dir": app_data}
        
    elif system == "Darwin":  # macOS
        # macOS-specific settings
        app_data = os.path.expanduser("~/Library/Application Support/TextRedactionSystem")
        os.makedirs(app_data, exist_ok=True)
        return {"data_dir": app_data}
        
    else:  # Linux and others
        # Linux-specific settings
        app_data = os.path.expanduser("~/.local/share/TextRedactionSystem")
        os.makedirs(app_data, exist_ok=True)
        return {"data_dir": app_data}

def main():
    """Main entry point for the application."""
    # Set up global exception handler
    sys.excepthook = handle_exception
    
    # Platform-specific setup
    platform_config = setup_platform_specifics()
    
    # Initialize application
    app = QApplication(sys.argv)
    app.setApplicationName("Text Redaction System")
    app.setOrganizationName("Government Security Agency")
    
    try:
        # Initialize components
        settings_manager = SettingsManager(config_path=os.path.join(platform_config["data_dir"], "settings.json"))
        db_manager = DatabaseManager(settings_manager)
        custom_terms_manager = CustomTermsManager(db_manager)
        rule_manager = RuleManager(custom_terms_manager)
        redaction_engine = RedactionEngine(rule_manager)
        
        # Create and show the main window
        main_window = MainWindow(redaction_engine, settings_manager)
        main_window.show()
        
        # Start the event loop
        sys.exit(app.exec())
    except Exception as e:
        # Show error dialog for startup errors
        error_msg = traceback.format_exc()
        print(f"Startup Error: {error_msg}", file=sys.stderr)
        
        error_dialog = QMessageBox()
        error_dialog.setIcon(QMessageBox.Icon.Critical)
        error_dialog.setWindowTitle("Startup Error")
        error_dialog.setText("An error occurred during application startup.")
        error_dialog.setDetailedText(error_msg)
        error_dialog.exec()
        sys.exit(1)


if __name__ == "__main__":
    main()