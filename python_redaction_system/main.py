"""
Main entry point for the Python text redaction system.
"""

import sys
import traceback
from typing import Optional

from PyQt6.QtWidgets import QApplication, QMessageBox

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


def main():
    """Main entry point for the application."""
    # Set up global exception handler
    sys.excepthook = handle_exception
    
    # Initialize application
    app = QApplication(sys.argv)
    app.setApplicationName("Text Redaction System")
    app.setOrganizationName("Government Security Agency")
    
    # Initialize components
    settings_manager = SettingsManager()
    db_manager = DatabaseManager(settings_manager)
    custom_terms_manager = CustomTermsManager(db_manager)
    rule_manager = RuleManager(custom_terms_manager)
    redaction_engine = RedactionEngine(rule_manager)
    
    # Create and show the main window
    main_window = MainWindow(redaction_engine, settings_manager)
    main_window.show()
    
    # Start the event loop
    sys.exit(app.exec())


if __name__ == "__main__":
    main()