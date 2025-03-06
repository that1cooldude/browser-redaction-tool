"""
Main window for the PySide6-based redaction system UI.
"""

from typing import Dict, List, Optional, Tuple, Any
import re
import platform

from PySide6.QtCore import Qt, Slot
from PySide6.QtGui import QPalette, QColor, QTextCharFormat, QTextCursor, QFont
from PySide6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QTextEdit, QPushButton, QLabel, QComboBox, QGroupBox, QSplitter,
    QCheckBox, QTabWidget, QFileDialog, QMessageBox, QProgressBar
)

from python_redaction_system.core.redaction_engine import RedactionEngine
from python_redaction_system.storage.custom_terms import CustomTermsManager
from python_redaction_system.config.settings import SettingsManager


class MainWindow(QMainWindow):
    """
    Main application window for the redaction system.
    """

    def __init__(self, redaction_engine: Optional[RedactionEngine] = None,
                 settings_manager: Optional[SettingsManager] = None):
        """
        Initialize the main window.
        
        Args:
            redaction_engine: An instance of RedactionEngine. If None, a new instance will be created.
            settings_manager: An instance of SettingsManager. If None, a new instance will be created.
        """
        super().__init__()
        
        # Initialize components
        self.redaction_engine = redaction_engine or RedactionEngine()
        self.settings_manager = settings_manager or SettingsManager()
        
        # Remove preview timer initialization
        
        # Statistics for redactions
        self.redaction_stats = {}
        
        # Set up UI
        self.setWindowTitle("Text Redaction System")
        
        # Set Windows-specific window size and font
        if platform.system() == "Windows":
            self.resize(1200, 900)  # Slightly larger default size for Windows
            self.setFont(QFont('Segoe UI', 9))
        else:
            self.resize(1000, 800)
        
        self._create_ui()
        self._load_settings()
        
        # Set minimum window size
        self.setMinimumSize(800, 600)
        
        # Center the window on screen
        self.center_window()
    
    def center_window(self):
        """Center the window on the screen."""
        screen = QApplication.primaryScreen().geometry()
        window_size = self.geometry()
        x = (screen.width() - window_size.width()) // 2
        y = (screen.height() - window_size.height()) // 2
        self.move(x, y)
    
    def _create_ui(self) -> None:
        """Create the main UI layout and components."""
        # Central widget and main layout
        central_widget = QWidget()
        main_layout = QVBoxLayout(central_widget)
        
        # Create tab widget for different sections
        tab_widget = QTabWidget()
        main_layout.addWidget(tab_widget)
        
        # Tab 1: Text Redaction
        redaction_tab = QWidget()
        tab_widget.addTab(redaction_tab, "Text Redaction")
        self._create_redaction_tab(redaction_tab)
        
        # Tab 2: Rule Management
        rule_tab = QWidget()
        tab_widget.addTab(rule_tab, "Rule Management")
        self._create_rule_management_tab(rule_tab)
        
        # Status bar
        self.statusBar().showMessage("Ready")
        
        self.setCentralWidget(central_widget)
    
    def _create_redaction_tab(self, tab_widget: QWidget) -> None:
        """
        Create the text redaction tab.
        
        Args:
            tab_widget: The widget to add components to.
        """
        layout = QVBoxLayout(tab_widget)
        
        # Main splitter for split view
        self.main_splitter = QSplitter(Qt.Orientation.Vertical)
        layout.addWidget(self.main_splitter)
        
        # Top part - input and controls
        top_widget = QWidget()
        top_layout = QVBoxLayout(top_widget)
        
        # Input section
        input_group = QGroupBox("Input Text")
        input_layout = QVBoxLayout(input_group)
        
        self.text_input = QTextEdit()
        self.text_input.setPlaceholderText("Enter or paste text to redact...")
        # Remove the real-time preview connection
        input_layout.addWidget(self.text_input)
        
        # Button row
        button_layout = QHBoxLayout()
        
        self.load_file_button = QPushButton("Load from File")
        self.load_file_button.clicked.connect(self._load_from_file)
        button_layout.addWidget(self.load_file_button)
        
        self.clear_input_button = QPushButton("Clear Input")
        self.clear_input_button.clicked.connect(self._clear_input)
        button_layout.addWidget(self.clear_input_button)
        
        # Remove the real-time preview checkbox completely
        
        # Split view toggle
        self.split_view_checkbox = QCheckBox("Split View")
        self.split_view_checkbox.setChecked(False)
        self.split_view_checkbox.stateChanged.connect(self._toggle_split_view)
        button_layout.addWidget(self.split_view_checkbox)
        
        input_layout.addLayout(button_layout)
        top_layout.addWidget(input_group)
        
        # Control section
        control_group = QGroupBox("Redaction Controls")
        control_layout = QHBoxLayout(control_group)
        
        # Sensitivity selector
        sensitivity_layout = QVBoxLayout()
        sensitivity_layout.addWidget(QLabel("Sensitivity Level:"))
        self.sensitivity_combo = QComboBox()
        self.sensitivity_combo.addItems(["Low", "Medium", "High"])
        self.sensitivity_combo.setCurrentText("Medium")
        self.sensitivity_combo.currentTextChanged.connect(
            lambda text: self.redaction_engine.set_sensitivity(text.lower())
        )
        sensitivity_layout.addWidget(self.sensitivity_combo)
        control_layout.addLayout(sensitivity_layout)
        
        # Category selection
        category_layout = QVBoxLayout()
        category_layout.addWidget(QLabel("Categories to Apply:"))
        self.category_checkboxes = {}
        category_widget = QWidget()
        checkbox_layout = QVBoxLayout(category_widget)
        
        # Categories will be loaded later
        for category in self.redaction_engine.rule_manager.get_all_categories():
            checkbox = QCheckBox(category)
            checkbox.setChecked(True)
            # Remove preview connection from checkboxes
            checkbox_layout.addWidget(checkbox)
            self.category_checkboxes[category] = checkbox
        
        category_layout.addWidget(category_widget)
        control_layout.addLayout(category_layout)
        
        # Redact button
        redact_layout = QVBoxLayout()
        redact_layout.addStretch()
        self.redact_button = QPushButton("Redact Text")
        self.redact_button.setMinimumHeight(50)
        self.redact_button.clicked.connect(self._redact_text)
        redact_layout.addWidget(self.redact_button)
        
        # Add option to use NLP - only enable if NLP is available
        self.use_nlp_checkbox = QCheckBox("Use NLP Detection")
        self.use_nlp_checkbox.setChecked(self.redaction_engine.use_nlp)
        self.use_nlp_checkbox.setEnabled(self.redaction_engine.use_nlp)
        if not self.redaction_engine.use_nlp:
            self.use_nlp_checkbox.setToolTip("NLP features are not available. Install spaCy to enable this feature.")
        redact_layout.addWidget(self.use_nlp_checkbox)
        
        control_layout.addLayout(redact_layout)
        
        top_layout.addWidget(control_group)
        
        # Statistics section (initially hidden, will be shown after redaction)
        self.stats_group = QGroupBox("Redaction Statistics")
        stats_layout = QVBoxLayout(self.stats_group)
        
        self.stats_label = QLabel("No redactions performed yet.")
        stats_layout.addWidget(self.stats_label)
        
        # Progress bar for each category
        self.stats_progress_bars = {}
        self.stats_count_labels = {}
        self.stats_category_layout = QVBoxLayout()
        stats_layout.addLayout(self.stats_category_layout)
        
        top_layout.addWidget(self.stats_group)
        
        # Bottom part - split view for output
        self.output_splitter = QSplitter(Qt.Orientation.Horizontal)
        
        # Output section
        output_group = QGroupBox("Redacted Output")
        output_layout = QVBoxLayout(output_group)
        
        self.text_output = QTextEdit()
        self.text_output.setReadOnly(True)
        self.text_output.setPlaceholderText("Redacted text will appear here...")
        output_layout.addWidget(self.text_output)
        
        # Output buttons
        output_button_layout = QHBoxLayout()
        
        self.copy_output_button = QPushButton("Copy to Clipboard")
        self.copy_output_button.clicked.connect(
            lambda: QApplication.clipboard().setText(self.text_output.toPlainText())
        )
        output_button_layout.addWidget(self.copy_output_button)
        
        self.save_output_button = QPushButton("Save to File")
        self.save_output_button.clicked.connect(self._save_to_file)
        output_button_layout.addWidget(self.save_output_button)
        
        # Highlight option for output
        self.highlight_checkbox = QCheckBox("Highlight Redactions")
        self.highlight_checkbox.setChecked(True)
        # Remove preview connection
        output_button_layout.addWidget(self.highlight_checkbox)
        
        output_layout.addLayout(output_button_layout)
        
        # Original text view for split mode (initially not added to layout)
        self.original_view_group = QGroupBox("Original Text")
        original_view_layout = QVBoxLayout(self.original_view_group)
        
        self.original_view = QTextEdit()
        self.original_view.setReadOnly(True)
        self.original_view.setPlaceholderText("Original text will appear here in split view mode...")
        original_view_layout.addWidget(self.original_view)
        
        # Add widgets to the output splitter
        self.output_splitter.addWidget(output_group)
        # Original view is not added initially
        
        # Add widgets to main splitter
        self.main_splitter.addWidget(top_widget)
        self.main_splitter.addWidget(self.output_splitter)
        
        # Set initial splitter sizes
        self.main_splitter.setSizes([500, 500])
        
        # Initially hide the stats group
        self.stats_group.setVisible(False)
    
    def _create_rule_management_tab(self, tab_widget: QWidget) -> None:
        """
        Create the rule management tab.
        
        Args:
            tab_widget: The widget to add components to.
        """
        from PySide6.QtCore import QSortFilterProxyModel, QAbstractTableModel, Qt, QModelIndex
        from PySide6.QtGui import QFont
        from PySide6.QtWidgets import (QTableView, QHeaderView, QSplitter, QFormLayout, 
                                    QComboBox, QLineEdit, QGroupBox, QRadioButton,
                                    QButtonGroup, QPushButton, QFileDialog, QMessageBox,
                                    QInputDialog, QScrollArea)
        
        layout = QVBoxLayout(tab_widget)
        
        # Create a horizontal splitter for rules table and form
        splitter = QSplitter(Qt.Orientation.Horizontal)
        layout.addWidget(splitter)
        
        # Left side: Rules table with search
        left_widget = QWidget()
        left_layout = QVBoxLayout(left_widget)
        
        # Search box for filtering rules
        search_layout = QHBoxLayout()
        search_layout.addWidget(QLabel("Search Rules:"))
        self.rule_search = QLineEdit()
        self.rule_search.setPlaceholderText("Enter search terms...")
        search_layout.addWidget(self.rule_search)
        left_layout.addLayout(search_layout)
        
        # Rules table
        self.rules_table = QTableView()
        self.rules_table.setSelectionBehavior(QTableView.SelectionBehavior.SelectRows)
        self.rules_table.setAlternatingRowColors(True)
        
        # Rule table model - inner class
        class RuleTableModel(QAbstractTableModel):
            def __init__(self, parent, rule_manager):
                super().__init__(parent)
                self.rule_manager = rule_manager
                self.categories = rule_manager.get_all_categories()
                self.rules_data = []
                self._refresh_data()
                
            def _refresh_data(self):
                self.rules_data = []
                for category in self.categories:
                    rules = self.rule_manager.get_rules_for_category(category)
                    for rule_name, pattern in rules.items():
                        self.rules_data.append({
                            "category": category,
                            "name": rule_name,
                            "pattern": pattern,
                            "is_custom": rule_name not in self.rule_manager._preset_rules.get(category, {})
                        })
                self.layoutChanged.emit()
                
            def rowCount(self, parent=QModelIndex()):
                return len(self.rules_data)
                
            def columnCount(self, parent=QModelIndex()):
                return 4  # Category, Name, Pattern, Is Custom
                
            def data(self, index, role=Qt.ItemDataRole.DisplayRole):
                if not index.isValid() or index.row() >= len(self.rules_data):
                    return None
                    
                rule = self.rules_data[index.row()]
                
                if role == Qt.ItemDataRole.DisplayRole:
                    if index.column() == 0:
                        return rule["category"]
                    elif index.column() == 1:
                        return rule["name"]
                    elif index.column() == 2:
                        return rule["pattern"]
                    elif index.column() == 3:
                        return "Custom" if rule["is_custom"] else "Built-in"
                
                elif role == Qt.ItemDataRole.FontRole:
                    font = QFont()
                    if rule["is_custom"]:
                        font.setBold(True)
                    return font
                    
                return None
                
            def headerData(self, section, orientation, role=Qt.ItemDataRole.DisplayRole):
                if role == Qt.ItemDataRole.DisplayRole and orientation == Qt.Orientation.Horizontal:
                    headers = ["Category", "Rule Name", "Pattern", "Type"]
                    return headers[section]
                return None
                
            def refresh(self):
                self.categories = self.rule_manager.get_all_categories()
                self._refresh_data()
        
        # Create filter proxy model for search
        self.rules_model = RuleTableModel(self, self.redaction_engine.rule_manager)
        self.rules_proxy_model = QSortFilterProxyModel()
        self.rules_proxy_model.setSourceModel(self.rules_model)
        self.rules_proxy_model.setFilterCaseSensitivity(Qt.CaseSensitivity.CaseInsensitive)
        self.rules_proxy_model.setFilterKeyColumn(-1)  # Search all columns
        
        self.rules_table.setModel(self.rules_proxy_model)
        
        # Connect search box to filter model
        self.rule_search.textChanged.connect(self.rules_proxy_model.setFilterFixedString)
        
        # Set column stretching
        self.rules_table.horizontalHeader().setSectionResizeMode(0, QHeaderView.ResizeMode.ResizeToContents)
        self.rules_table.horizontalHeader().setSectionResizeMode(1, QHeaderView.ResizeMode.ResizeToContents)
        self.rules_table.horizontalHeader().setSectionResizeMode(2, QHeaderView.ResizeMode.Stretch)
        self.rules_table.horizontalHeader().setSectionResizeMode(3, QHeaderView.ResizeMode.ResizeToContents)
        
        left_layout.addWidget(self.rules_table)
        
        # Buttons for table operations
        table_buttons_layout = QHBoxLayout()
        
        self.delete_rule_button = QPushButton("Delete Selected Rule")
        self.delete_rule_button.clicked.connect(self._delete_selected_rule)
        table_buttons_layout.addWidget(self.delete_rule_button)
        
        self.import_rules_button = QPushButton("Import Rules")
        self.import_rules_button.clicked.connect(self._import_rules)
        table_buttons_layout.addWidget(self.import_rules_button)
        
        self.export_rules_button = QPushButton("Export Rules")
        self.export_rules_button.clicked.connect(self._export_rules)
        table_buttons_layout.addWidget(self.export_rules_button)
        
        left_layout.addLayout(table_buttons_layout)
        
        # Right side: Form for creating/editing rules
        right_widget = QScrollArea()
        right_widget.setWidgetResizable(True)
        form_container = QWidget()
        right_layout = QVBoxLayout(form_container)
        right_widget.setWidget(form_container)
        
        # Rule creation form
        rule_form_group = QGroupBox("Create New Rule")
        rule_form_layout = QFormLayout(rule_form_group)
        
        # Category dropdown
        self.category_combo = QComboBox()
        self.category_combo.setEditable(True)
        self.category_combo.setInsertPolicy(QComboBox.InsertPolicy.InsertAlphabetically)
        self._refresh_category_combo()
        rule_form_layout.addRow("Category:", self.category_combo)
        
        # Rule name field
        self.rule_name_edit = QLineEdit()
        self.rule_name_edit.setPlaceholderText("Enter a descriptive name for this rule")
        rule_form_layout.addRow("Rule Name:", self.rule_name_edit)
        
        # Pattern type selector
        pattern_type_group = QGroupBox("Pattern Type")
        pattern_type_layout = QVBoxLayout(pattern_type_group)
        
        self.pattern_type_group = QButtonGroup(self)
        self.plain_text_radio = QRadioButton("Plain Text (auto-convert to regex)")
        self.regex_radio = QRadioButton("Regular Expression")
        self.pattern_type_group.addButton(self.plain_text_radio, 0)
        self.pattern_type_group.addButton(self.regex_radio, 1)
        self.plain_text_radio.setChecked(True)
        
        pattern_type_layout.addWidget(self.plain_text_radio)
        pattern_type_layout.addWidget(self.regex_radio)
        rule_form_layout.addRow(pattern_type_group)
        
        # Pattern entry
        self.pattern_edit = QTextEdit()
        self.pattern_edit.setPlaceholderText("Enter pattern to match...")
        self.pattern_edit.setAcceptRichText(False)
        self.pattern_edit.setMaximumHeight(100)
        rule_form_layout.addRow("Pattern:", self.pattern_edit)
        
        # Pattern help text
        help_label = QLabel("For plain text, enter the exact text to redact. Special characters will be handled automatically.\n"
                         "For regex, use standard regular expression syntax (e.g., \\b\\d{3}-\\d{2}-\\d{4}\\b for SSN).")
        help_label.setWordWrap(True)
        rule_form_layout.addRow(help_label)
        
        # Add rule button
        self.add_rule_button = QPushButton("Add Rule")
        self.add_rule_button.clicked.connect(self._add_rule)
        rule_form_layout.addRow(self.add_rule_button)
        
        right_layout.addWidget(rule_form_group)
        
        # Rule testing section
        test_group = QGroupBox("Test Rule")
        test_layout = QVBoxLayout(test_group)
        
        # Sample text for testing
        test_layout.addWidget(QLabel("Sample Text:"))
        self.test_text_edit = QTextEdit()
        self.test_text_edit.setPlaceholderText("Enter sample text to test your rule against...")
        test_layout.addWidget(self.test_text_edit)
        
        # Test results
        test_layout.addWidget(QLabel("Test Results:"))
        self.test_results_edit = QTextEdit()
        self.test_results_edit.setReadOnly(True)
        self.test_results_edit.setPlaceholderText("Results will appear here...")
        test_layout.addWidget(self.test_results_edit)
        
        # Test button
        self.test_rule_button = QPushButton("Test Pattern")
        self.test_rule_button.clicked.connect(self._test_rule)
        test_layout.addWidget(self.test_rule_button)
        
        right_layout.addWidget(test_group)
        
        # Add both sides to splitter
        splitter.addWidget(left_widget)
        splitter.addWidget(right_widget)
        splitter.setSizes([400, 400])  # Set initial sizes
    
    def _refresh_category_combo(self) -> None:
        """Refresh the category dropdown with current categories."""
        current_text = self.category_combo.currentText() if self.category_combo.count() > 0 else ""
        
        self.category_combo.clear()
        self.category_combo.addItems(self.redaction_engine.rule_manager.get_all_categories())
        
        # Add "Create New Category..." option
        self.category_combo.addItem("-- Create New Category --")
        
        # Restore previous selection if it exists
        if current_text:
            index = self.category_combo.findText(current_text)
            if index >= 0:
                self.category_combo.setCurrentIndex(index)
        
        # Connect category combo box signal
        try:
            self.category_combo.currentIndexChanged.disconnect()
        except TypeError:
            # Signal was not connected or already disconnected
            pass
        self.category_combo.currentIndexChanged.connect(self._handle_category_selection)
    
    def _handle_category_selection(self, index: int) -> None:
        """Handle selection in the category dropdown."""
        if self.category_combo.currentText() == "-- Create New Category --":
            # Prompt for new category name
            new_category, ok = QInputDialog.getText(
                self, "New Category", "Enter name for new category:"
            )
            
            if ok and new_category:
                # Add the new category to the combo box
                self.category_combo.removeItem(index)
                self.category_combo.addItem(new_category)
                self.category_combo.addItem("-- Create New Category --")
                new_index = self.category_combo.findText(new_category)
                self.category_combo.setCurrentIndex(new_index)
            else:
                # User canceled, reset to the first item
                self.category_combo.setCurrentIndex(0)
    
    def _add_rule(self) -> None:
        """Add a new rule from the form."""
        category = self.category_combo.currentText()
        rule_name = self.rule_name_edit.text().strip()
        pattern_text = self.pattern_edit.toPlainText().strip()
        is_regex = self.regex_radio.isChecked()
        
        # Validate inputs
        if not category or category == "-- Create New Category --":
            QMessageBox.warning(self, "Validation Error", "Please select or create a category.")
            return
        
        if not rule_name:
            QMessageBox.warning(self, "Validation Error", "Please enter a name for the rule.")
            return
        
        if not pattern_text:
            QMessageBox.warning(self, "Validation Error", "Please enter a pattern.")
            return
        
        # Convert plain text to regex if needed
        import re
        if not is_regex:
            # Escape special regex characters
            pattern = re.escape(pattern_text)
        else:
            pattern = pattern_text
            
            # Validate regex
            try:
                re.compile(pattern)
            except re.error as e:
                QMessageBox.critical(self, "Invalid Regex", f"The regular expression is invalid: {str(e)}")
                return
        
        # Add the rule
        try:
            # Make sure custom terms manager is initialized
            if not self.redaction_engine.rule_manager.custom_terms_manager:
                from python_redaction_system.storage.custom_terms import CustomTermsManager
                from python_redaction_system.storage.database import DatabaseManager
                
                db_manager = DatabaseManager()
                custom_terms_manager = CustomTermsManager(db_manager)
                self.redaction_engine.rule_manager.custom_terms_manager = custom_terms_manager
            
            # Add the rule
            self.redaction_engine.rule_manager.add_custom_rule(category, rule_name, pattern)
            
            # Refresh the table
            self.rules_model.refresh()
            
            # Clear the form
            self.rule_name_edit.clear()
            self.pattern_edit.clear()
            
            # Update status
            self.statusBar().showMessage(f"Rule '{rule_name}' added to category '{category}'.")
            
        except Exception as e:
            QMessageBox.critical(self, "Error", f"Error adding rule: {str(e)}")
    
    def _delete_selected_rule(self) -> None:
        """Delete the selected rule from the table."""
        # Get the selected row
        selected_indexes = self.rules_table.selectedIndexes()
        if not selected_indexes:
            QMessageBox.information(self, "Selection Required", "Please select a rule to delete.")
            return
        
        # Get the rule data from the selected row
        proxy_index = selected_indexes[0]
        source_index = self.rules_proxy_model.mapToSource(proxy_index)
        row = source_index.row()
        
        rule_data = self.rules_model.rules_data[row]
        category = rule_data["category"]
        rule_name = rule_data["name"]
        is_custom = rule_data["is_custom"]
        
        # Confirm deletion
        if not is_custom:
            QMessageBox.warning(self, "Cannot Delete", "Built-in rules cannot be deleted.")
            return
        
        confirm = QMessageBox.question(
            self, "Confirm Deletion", 
            f"Are you sure you want to delete the rule '{rule_name}' from category '{category}'?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
        )
        
        if confirm == QMessageBox.StandardButton.Yes:
            try:
                # Delete the rule
                self.redaction_engine.rule_manager.remove_custom_rule(category, rule_name)
                
                # Refresh the table
                self.rules_model.refresh()
                
                # Update status
                self.statusBar().showMessage(f"Rule '{rule_name}' deleted.")
                
            except Exception as e:
                QMessageBox.critical(self, "Error", f"Error deleting rule: {str(e)}")
    
    def _test_rule(self) -> None:
        """Test the current pattern against the sample text."""
        pattern_text = self.pattern_edit.toPlainText().strip()
        test_text = self.test_text_edit.toPlainText()
        is_regex = self.regex_radio.isChecked()
        
        if not pattern_text:
            QMessageBox.warning(self, "Validation Error", "Please enter a pattern to test.")
            return
        
        if not test_text:
            QMessageBox.warning(self, "Validation Error", "Please enter sample text to test against.")
            return
        
        # Convert plain text to regex if needed
        import re
        if not is_regex:
            # Escape special regex characters
            pattern = re.escape(pattern_text)
        else:
            pattern = pattern_text
        
        # Test the pattern
        try:
            regex = re.compile(pattern)
            matches = regex.findall(test_text)
            
            # Highlight matches in the test text
            highlighted_text = test_text
            for match in matches:
                # If match is a tuple (from capturing groups), use the whole match
                if isinstance(match, tuple):
                    match = match[0]
                
                # Highlight by replacing with HTML
                highlighted_text = highlighted_text.replace(
                    match, f'<span style="background-color: yellow; color: black;">{match}</span>'
                )
            
            # Display results
            if matches:
                result_text = f"<h3>Found {len(matches)} matches:</h3>"
                result_text += "<ul>"
                for i, match in enumerate(matches, 1):
                    if isinstance(match, tuple):  # Handle capturing groups
                        match = match[0]
                    result_text += f"<li>Match {i}: '{match}'</li>"
                result_text += "</ul><h3>Highlighted Text:</h3>"
                result_text += highlighted_text
            else:
                result_text = "<h3>No matches found in the sample text.</h3>"
            
            self.test_results_edit.setHtml(result_text)
            
        except re.error as e:
            self.test_results_edit.setHtml(f"<h3>Error in regular expression:</h3><p>{str(e)}</p>")
    
    def _import_rules(self) -> None:
        """Import rules from a JSON file."""
        file_path, _ = QFileDialog.getOpenFileName(
            self, "Import Rules", "", "JSON Files (*.json);;All Files (*)"
        )
        
        if not file_path:
            return
        
        try:
            import json
            
            with open(file_path, 'r') as f:
                rules_data = json.load(f)
            
            # Validate the structure
            if not isinstance(rules_data, dict):
                raise ValueError("Invalid rule file format. Expected a JSON object.")
            
            # Import the rules
            if not self.redaction_engine.rule_manager.custom_terms_manager:
                from python_redaction_system.storage.custom_terms import CustomTermsManager
                from python_redaction_system.storage.database import DatabaseManager
                
                db_manager = DatabaseManager()
                custom_terms_manager = CustomTermsManager(db_manager)
                self.redaction_engine.rule_manager.custom_terms_manager = custom_terms_manager
            
            # Add each rule
            for category, rules in rules_data.items():
                for rule_name, pattern in rules.items():
                    self.redaction_engine.rule_manager.add_custom_rule(category, rule_name, pattern)
            
            # Refresh the table
            self.rules_model.refresh()
            
            # Refresh the category combo box
            self._refresh_category_combo()
            
            # Update status
            self.statusBar().showMessage(f"Rules imported from {file_path}")
            
        except Exception as e:
            QMessageBox.critical(self, "Import Error", f"Error importing rules: {str(e)}")
    
    def _export_rules(self) -> None:
        """Export custom rules to a JSON file."""
        file_path, _ = QFileDialog.getSaveFileName(
            self, "Export Rules", "", "JSON Files (*.json);;All Files (*)"
        )
        
        if not file_path:
            return
        
        try:
            # Get custom rules
            if not self.redaction_engine.rule_manager.custom_terms_manager:
                QMessageBox.information(self, "No Custom Rules", "There are no custom rules to export.")
                return
            
            custom_terms = self.redaction_engine.rule_manager.custom_terms_manager.export_terms()
            
            # Export to JSON
            import json
            with open(file_path, 'w') as f:
                json.dump(custom_terms, f, indent=4)
            
            # Update status
            self.statusBar().showMessage(f"Rules exported to {file_path}")
            
        except Exception as e:
            QMessageBox.critical(self, "Export Error", f"Error exporting rules: {str(e)}")
    
    def _load_settings(self) -> None:
        """Load application settings."""
        # Would load settings from the settings manager
        pass
    
    # Remove the _schedule_preview method completely
    
    def _update_preview(self) -> None:
        """Update the preview with current redaction settings."""
        input_text = self.text_input.toPlainText()
        if not input_text:
            self.text_output.clear()
            if self.split_view_checkbox.isChecked():
                self.original_view.clear()
            self.stats_group.setVisible(False)
            return
        
        # Get selected categories
        selected_categories = [
            category for category, checkbox in self.category_checkboxes.items()
            if checkbox.isChecked()
        ]
        
        if not selected_categories:
            self.text_output.setPlainText("No categories selected for redaction.")
            return
        
        # Perform redaction
        try:
            # Update the original view if split mode is enabled
            if self.split_view_checkbox.isChecked():
                self.original_view.setPlainText(input_text)
            
            # Check if NLP should be used
            use_nlp = self.use_nlp_checkbox.isChecked() and self.redaction_engine.use_nlp
            
            try:
                # Perform the redaction
                redacted_text, stats = self.redaction_engine.redact_text(
                    input_text, selected_categories, use_nlp=use_nlp
                )
            except Exception as e:
                # Fallback to rule-based redaction if NLP fails
                if use_nlp:
                    self.statusBar().showMessage(f"NLP redaction failed, falling back to rules: {str(e)}")
                    use_nlp = False
                    redacted_text, stats = self.redaction_engine.redact_text(
                        input_text, selected_categories, use_nlp=False
                    )
                else:
                    # If not using NLP and still failing, re-raise
                    raise
            
            # Store stats for displaying
            self.redaction_stats = stats
            
            # Apply highlighting if enabled
            if self.highlight_checkbox.isChecked():
                # Use HTML with colored redaction markers
                colored_text = redacted_text
                
                # Define colors for different categories
                category_colors = {
                    "PII": "#ff5555",       # Red
                    "PHI": "#5555ff",       # Blue
                    "FINANCIAL": "#55aa55", # Green
                    "CREDENTIALS": "#aa55aa", # Purple
                    "LOCATIONS": "#aaaa55"  # Yellow
                }
                
                # Replace redaction markers with colored spans
                for category in selected_categories:
                    color = category_colors.get(category, "#aaaaaa")  # Default to gray
                    # Pattern to match category markers like [PII:SSN]
                    pattern = f'\\[{category}:[^\\]]+\\]'
                    
                    # Replace with colored versions
                    colored_matches = []
                    for match in re.finditer(pattern, colored_text):
                        marker = match.group(0)
                        # Replace with HTML
                        colored_match = f'<span style="background-color: {color}; color: white;">{marker}</span>'
                        colored_matches.append((marker, colored_match))
                    
                    # Apply replacements from longest to shortest to avoid issues
                    colored_matches.sort(key=lambda x: len(x[0]), reverse=True)
                    for original, colored in colored_matches:
                        colored_text = colored_text.replace(original, colored)
                
                # Display with HTML formatting
                self.text_output.setHtml(colored_text)
            else:
                # Just use plain text
                self.text_output.setPlainText(redacted_text)
            
            # Update statistics display
            self._update_statistics(stats)
            
        except Exception as e:
            self.text_output.setPlainText(f"Error during preview: {str(e)}")
    
    def _update_statistics(self, stats: Dict[str, int]) -> None:
        """Update the statistics display with redaction counts."""
        if not stats:
            self.stats_group.setVisible(False)
            return
            
        # Show the stats group
        self.stats_group.setVisible(True)
        
        # Calculate total redactions
        total_redactions = sum(stats.values())
        
        if total_redactions == 0:
            self.stats_label.setText("No redactions performed.")
            for widget in self.stats_progress_bars.values():
                widget.setVisible(False)
            for widget in self.stats_count_labels.values():
                widget.setVisible(False)
            return
            
        # Update the summary label
        self.stats_label.setText(f"Total redactions: {total_redactions}")
        
        # Clear existing progress bars if categories changed
        if set(stats.keys()) != set(self.stats_progress_bars.keys()):
            # Clear existing widgets
            for i in reversed(range(self.stats_category_layout.count())): 
                self.stats_category_layout.itemAt(i).widget().setParent(None)
            
            # Reset dictionaries
            self.stats_progress_bars = {}
            self.stats_count_labels = {}
            
            # Create new widgets for each category
            for category in stats.keys():
                category_layout = QHBoxLayout()
                
                # Category label
                label = QLabel(f"{category}:")
                label.setMinimumWidth(100)
                category_layout.addWidget(label)
                
                # Progress bar
                progress_bar = QProgressBar()
                progress_bar.setTextVisible(False)
                category_layout.addWidget(progress_bar)
                self.stats_progress_bars[category] = progress_bar
                
                # Count label
                count_label = QLabel("0")
                count_label.setMinimumWidth(50)
                category_layout.addWidget(count_label)
                self.stats_count_labels[category] = count_label
                
                self.stats_category_layout.addLayout(category_layout)
        
        # Update progress bars
        max_count = max(stats.values()) if stats else 0
        for category, count in stats.items():
            if category in self.stats_progress_bars:
                progress_bar = self.stats_progress_bars[category]
                if max_count > 0:
                    progress_bar.setMaximum(max_count)
                    progress_bar.setValue(count)
                else:
                    progress_bar.setMaximum(1)
                    progress_bar.setValue(0)
                
                # Set color based on category
                palette = QPalette()
                color = {
                    "PII": QColor(255, 85, 85),       # Red
                    "PHI": QColor(85, 85, 255),       # Blue
                    "FINANCIAL": QColor(85, 170, 85), # Green
                    "CREDENTIALS": QColor(170, 85, 170), # Purple
                    "LOCATIONS": QColor(170, 170, 85)  # Yellow
                }.get(category, QColor(170, 170, 170))  # Default to gray
                
                palette.setColor(QPalette.ColorRole.Highlight, color)
                progress_bar.setPalette(palette)
                
            if category in self.stats_count_labels:
                count_label = self.stats_count_labels[category]
                count_label.setText(str(count))
    
    # Remove the _handle_sensitivity_change method
    
    def _toggle_split_view(self, state: int) -> None:
        """Toggle between normal and split view modes."""
        if state == Qt.CheckState.Checked.value:
            # Add original view to splitter if not already there
            if self.output_splitter.count() == 1:
                self.output_splitter.addWidget(self.original_view_group)
                self.output_splitter.setSizes([400, 400])
            
            # Update original text view with current input
            self.original_view.setPlainText(self.text_input.toPlainText())
        else:
            # Remove original view from splitter
            if self.output_splitter.count() > 1:
                self.original_view_group.setParent(None)
    
    def _clear_input(self) -> None:
        """Clear input text and reset preview."""
        self.text_input.clear()
        self.text_output.clear()
        if self.split_view_checkbox.isChecked():
            self.original_view.clear()
        self.stats_group.setVisible(False)
    
    def _redact_text(self) -> None:
        """Redact the input text and display the result."""
        input_text = self.text_input.toPlainText()
        if not input_text:
            QMessageBox.warning(self, "Warning", "No text to redact.")
            return
        
        # Get selected categories
        selected_categories = [
            category for category, checkbox in self.category_checkboxes.items()
            if checkbox.isChecked()
        ]
        
        if not selected_categories:
            QMessageBox.warning(self, "Warning", "No categories selected for redaction.")
            return
        
        # Perform redaction
        try:
            # Show original text in split view if enabled
            if self.split_view_checkbox.isChecked():
                self.original_view.setPlainText(input_text)
            
            # Check if NLP should be used
            use_nlp = self.use_nlp_checkbox.isChecked()
            
            redacted_text, stats = self.redaction_engine.redact_text(
                input_text, selected_categories, use_nlp=use_nlp
            )
            
            # Apply highlighting if enabled
            if self.highlight_checkbox.isChecked():
                # Use highlighting but apply it directly here instead of calling preview
                colored_text = redacted_text
                
                # Define colors for different categories
                category_colors = {
                    "PII": "#ff5555",       # Red
                    "PHI": "#5555ff",       # Blue
                    "FINANCIAL": "#55aa55", # Green
                    "CREDENTIALS": "#aa55aa", # Purple
                    "LOCATIONS": "#aaaa55"  # Yellow
                }
                
                # Replace redaction markers with colored spans
                for category in selected_categories:
                    color = category_colors.get(category, "#aaaaaa")  # Default to gray
                    # Pattern to match category markers like [PII:SSN]
                    pattern = f'\\[{category}:[^\\]]+\\]'
                    
                    # Replace with colored versions
                    colored_matches = []
                    for match in re.finditer(pattern, colored_text):
                        marker = match.group(0)
                        # Replace with HTML
                        colored_match = f'<span style="background-color: {color}; color: white;">{marker}</span>'
                        colored_matches.append((marker, colored_match))
                    
                    # Apply replacements from longest to shortest to avoid issues
                    colored_matches.sort(key=lambda x: len(x[0]), reverse=True)
                    for original, colored in colored_matches:
                        colored_text = colored_text.replace(original, colored)
                
                # Display with HTML formatting
                self.text_output.setHtml(colored_text)
            else:
                # Just use plain text
                self.text_output.setPlainText(redacted_text)
            
            # Update statistics
            self._update_statistics(stats)
            
            # Show stats in status bar
            total_redactions = sum(stats.values())
            self.statusBar().showMessage(f"Redaction complete: {total_redactions} items redacted.")
        except Exception as e:
            QMessageBox.critical(self, "Error", f"Error during redaction: {str(e)}")
    
    def _load_from_file(self) -> None:
        """Load text from a file."""
        file_path, _ = QFileDialog.getOpenFileName(
            self, "Open Text File", "", "Text Files (*.txt);;All Files (*)"
        )
        
        if file_path:
            try:
                with open(file_path, 'r', encoding='utf-8') as file:
                    self.text_input.setPlainText(file.read())
                self.statusBar().showMessage(f"Loaded text from {file_path}")
            except Exception as e:
                QMessageBox.critical(self, "Error", f"Error loading file: {str(e)}")
    
    def _save_to_file(self) -> None:
        """Save redacted text to a file."""
        output_text = self.text_output.toPlainText()
        if not output_text:
            QMessageBox.warning(self, "Warning", "No redacted text to save.")
            return
        
        file_path, _ = QFileDialog.getSaveFileName(
            self, "Save Redacted Text", "", "Text Files (*.txt);;All Files (*)"
        )
        
        if file_path:
            try:
                with open(file_path, 'w', encoding='utf-8') as file:
                    file.write(output_text)
                self.statusBar().showMessage(f"Saved redacted text to {file_path}")
            except Exception as e:
                QMessageBox.critical(self, "Error", f"Error saving file: {str(e)}")