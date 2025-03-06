"""
Main entry point for the Python text redaction system.
"""

import sys
import os
import platform
import traceback
from typing import Optional

# Suppress Qt's IMK warnings on macOS
if platform.system() == "Darwin":  # Check if running on macOS
    os.environ['QT_MAC_WANTS_LAYER'] = '1'

from PySide6.QtWidgets import QApplication, QMessageBox
from PySide6.QtCore import Qt
from PySide6.QtGui import QFont

from python_redaction_system.core.redaction_engine import RedactionEngine
from python_redaction_system.core.rule_manager import RuleManager
from python_redaction_system.storage.custom_terms import CustomTermsManager
from python_redaction_system.storage.database import DatabaseManager
from python_redaction_system.config.settings import SettingsManager
from python_redaction_system.ui.main_window import MainWindow


def handle_exception(exc_type, exc_value, exc_traceback):
    """
    Handle uncaught exceptions globally.
    
    Args:
        exc_type: The exception type.
        exc_value: The exception value.
        exc_traceback: The exception traceback.
    """
    # Log the error
    error_msg = ''.join(traceback.format_exception(exc_type, exc_value, exc_traceback))
    print(f"Unhandled Exception: {error_msg}", file=sys.stderr)
    
    # Show error dialog
    if QApplication.instance():
        error_dialog = QMessageBox()
        error_dialog.setIcon(QMessageBox.Icon.Critical)
        error_dialog.setWindowTitle("Unexpected Error")
        error_dialog.setText("An unexpected error occurred. The application will now close.")
        error_dialog.setDetailedText(error_msg)
        error_dialog.exec()
    
    # Exit the application
    sys.exit(1)


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


def setup_windows_specifics(app: QApplication):
    """
    Set up Windows-specific UI configurations
    
    Args:
        app: The QApplication instance
    """
    if platform.system() == "Windows":
        # Enable high DPI scaling
        if hasattr(Qt, 'AA_EnableHighDpiScaling'):
            app.setAttribute(Qt.AA_EnableHighDpiScaling, True)
        if hasattr(Qt, 'AA_UseHighDpiPixmaps'):
            app.setAttribute(Qt.AA_UseHighDpiPixmaps, True)
        
        # Set Windows-specific font
        app.setFont(QFont('Segoe UI', 9))
        
        # Set Windows-specific style
        app.setStyle('Fusion')


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
    
    # Set up Windows-specific UI configurations
    setup_windows_specifics(app)
    
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