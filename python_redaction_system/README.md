# Python Redaction System

## Introduction

The Python Redaction System is a comprehensive tool designed to identify and redact sensitive information from text and various document formats. The application is particularly useful for preparing text before input into AI systems, ensuring that personally identifiable information (PII), protected health information (PHI), financial data, credentials, and location information are properly handled.

Built with PyQt6, this cross-platform desktop application provides a user-friendly interface for configuring redaction rules, processing documents, and managing custom patterns for specific redaction needs.

## Core Features

### 1. Comprehensive Pattern Library

- **70+ Built-in Patterns**: Pre-configured regular expressions for common PII types including:
  - Names, addresses, phone numbers in various formats
  - Email addresses and social media handles
  - Government IDs (SSN, passport, driver's license)
  - Credit card numbers, account numbers, and financial identifiers
  - Dates of birth and other temporal identifiers
  - Healthcare information (MRN, provider identifiers)
  - International formats for various country-specific identifiers

- **Context-Aware Patterns**: Recognizes PII based on surrounding text, enhancing detection accuracy.

- **Category Organization**: Patterns are organized into categories:
  - PII (Personal Identifiable Information)
  - PHI (Protected Health Information)
  - FINANCIAL (Financial data)
  - CREDENTIALS (Login information)
  - LOCATIONS (Geographic information)

### 2. Advanced Redaction Engine

- **Smart Overlap Handling**: Prioritizes longer and more specific matches to prevent partial redactions.

- **NLP-Enhanced Detection**: Optional integration with spaCy for named entity recognition, identifying potential PII that doesn't match standard patterns.

- **Context Preservation**: Maintains document flow and readability while redacting sensitive information.

- **Pseudonymization**: Consistently replaces entities with realistic but fake data instead of generic markers.

- **Entity Tracking**: Ensures that the same entity is consistently replaced with the same pseudonym throughout a document.

- **Multi-format Support**: Processes text from various document types.

### 3. Document Processing

- **Multiple Format Support**:
  - Plain text (.txt)
  - PDF documents (.pdf)
  - Microsoft Word documents (.docx, .doc)
  - Excel spreadsheets (.xlsx, .xls)
  - PowerPoint presentations (.pptx, .ppt)
  - HTML content (.html, .htm)
  - Images with OCR (.jpg, .jpeg, .png, .bmp, .tiff, .gif)

- **Text Extraction**: Extracts readable text from all supported formats.

- **Metadata Handling**: Extracts and displays document metadata to provide context.

### 4. User Interface

- **Text Redaction Tab**: Primary interface for processing text and documents:
  - Text input area for direct pasting
  - File loading capabilities
  - Category selection with multiple options
  - Sensitivity level adjustment
  - Redaction options (NLP, pseudonyms, context preservation)
  - Split view option for comparing original and redacted text
  - Redaction statistics displaying counts by category

- **Rule Management Tab**: Interface for viewing and managing redaction rules:
  - Table listing all available rules with search functionality
  - Form for creating new custom rules
  - Pattern testing functionality
  - Import/export capabilities for sharing rules

- **Settings Tab**: Configuration options for the application:
  - Default saving location
  - Autosave settings
  - NLP model selection and confidence thresholds
  - Default redaction preferences

## Technical Architecture

### Core Components

1. **RedactionEngine** (`core/redaction_engine.py`):
   - Main engine responsible for identifying and redacting sensitive information
   - Manages sensitivity levels, NLP integration, and redaction statistics
   - Handles overlap detection and resolution
   - Tracks rule matches for analysis

2. **RuleManager** (`core/rule_manager.py`):
   - Manages the pattern library of regular expressions
   - Organizes patterns by category and sensitivity level
   - Handles addition and removal of custom rules
   - Provides filtering by category

3. **SemanticRedactionEngine** (`core/semantic_redaction.py`):
   - Provides context-aware redaction capabilities
   - Contains the EntityTracker for consistent entity replacement
   - Generates pseudonyms for different entity types
   - Ensures document flow is maintained

4. **DocumentProcessor** (`core/document_processor.py`):
   - Provides a hierarchy of document processors for different file types
   - Handles text extraction from various formats
   - Manages metadata extraction and processing
   - Gracefully handles missing dependencies

5. **MainWindow** (`ui/main_window.py`):
   - Implements the PyQt6 user interface
   - Manages all UI interactions and workflows
   - Provides visual feedback on redaction performance
   - Handles file operations and settings management

### Storage Components

1. **DatabaseManager** (`storage/database.py`):
   - Manages SQLite database interactions
   - Stores and retrieves custom redaction rules

2. **CustomTermsManager** (`storage/custom_terms.py`):
   - Manages custom redaction patterns
   - Handles import/export of custom rules
   - Provides interface between UI and database storage

### Configuration Components

1. **SettingsManager** (`config/settings.py`):
   - Manages application settings
   - Handles saving and loading configuration
   - Provides defaults for unset values

2. **Default Settings** (`config/defaults.py`):
   - Defines default values for application settings
   - Sets initial sensitivity levels and NLP parameters

## Workflow Details

### Text Redaction Process

1. **Input Phase**:
   - User enters text directly or loads from a supported document
   - Document processor extracts text and metadata
   - Text is presented for redaction

2. **Configuration Phase**:
   - User selects sensitivity level (low, medium, high)
   - User selects which categories to apply
   - User configures advanced options (NLP, pseudonyms, context preservation)

3. **Processing Phase**:
   - Text is processed by the redaction engine
   - If NLP is enabled, named entity recognition is performed
   - Rule-based patterns are applied
   - Overlapping matches are resolved
   - Entity tracking ensures consistent replacements

4. **Output Phase**:
   - Redacted text is presented
   - Statistics on redactions are displayed
   - User can copy to clipboard or save to file

### Rule Management Workflow

1. **Viewing Rules**:
   - User can view all available rules organized by category
   - Search functionality allows filtering rules
   - Built-in vs custom rules are visually distinguished

2. **Creating Custom Rules**:
   - User selects a category or creates a new one
   - User provides a descriptive rule name
   - User enters a pattern (plain text or regex)
   - Pattern is validated and added to the custom rules database

3. **Testing Rules**:
   - User can enter sample text
   - Pattern is applied to show matches
   - Visual highlighting shows what would be redacted

4. **Importing/Exporting Rules**:
   - User can export custom rules to a JSON file
   - User can import rules from a JSON file
   - Rules are validated during import

## Graceful Degradation and Error Handling

The system implements extensive error handling and graceful degradation:

1. **Optional Dependency Management**:
   - Each document processor checks for required libraries
   - Informative error messages guide users to install missing dependencies
   - System continues to function with reduced capabilities when dependencies are missing

2. **Exception Handling**:
   - Comprehensive try/except blocks for all external operations
   - User-friendly error messages in the UI
   - Detailed logging for troubleshooting

3. **NLP Fallback**:
   - Rule-based detection works even when NLP is unavailable
   - System automatically falls back to rule-based processing if NLP fails

## Security Considerations

1. **Local Processing Only**:
   - All redaction happens locally on the user's machine
   - No data is transmitted to external services
   - No cloud dependencies

2. **Data Protection**:
   - No storage of original documents or processed text
   - Optional in-memory processing only

3. **Comprehensive Pattern Coverage**:
   - Multiple patterns for each type of sensitive data
   - Regular updates to pattern library
   - Custom rule capabilities for organization-specific data

## Usage Examples

### Basic Text Redaction

1. Launch the application
2. Enter or paste text in the input area
3. Select desired categories (e.g., PII, FINANCIAL)
4. Set sensitivity level (Low, Medium, High)
5. Click "Redact Text"
6. Review the redacted output
7. Copy to clipboard or save to file

### Document Processing

1. Launch the application
2. Click "Load from File"
3. Select a supported document (PDF, Word, etc.)
4. Configure redaction settings
5. Click "Redact Text"
6. Review the redacted output with statistics
7. Save the redacted text to a file

### Custom Rule Creation

1. Navigate to the "Rule Management" tab
2. Select a category or create a new one
3. Enter a descriptive rule name
4. Choose between plain text or regex pattern type
5. Enter the pattern
6. Click "Add Rule"
7. Test the rule with sample text if desired

### Settings Configuration

1. Navigate to the "Settings" tab
2. Configure default save location
3. Enable/disable autosave
4. Select NLP model and confidence threshold
5. Set default sensitivity level
6. Configure default pseudonym and context preservation preferences
7. Click "Save Settings"

## Installation and Dependencies

### Basic Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/python-redaction-system.git
cd python-redaction-system

# Create a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Dependencies

Core dependencies:
- PyQt6: GUI framework
- regex: Advanced regular expression handling
- cryptography: Secure handling of sensitive data
- pyyaml: Configuration file parsing

Document processing dependencies:
- python-docx: Word document processing
- PyPDF2: PDF processing
- openpyxl: Excel spreadsheet processing
- python-pptx: PowerPoint presentation processing
- beautifulsoup4 and lxml: HTML processing
- pytesseract and Pillow: Image processing and OCR

Optional NLP dependencies:
- spaCy: Natural language processing
- spaCy language models (en_core_web_sm or similar)

### Running the Application

```bash
python python_redaction_system/main.py
```

## Platform Compatibility

The application is designed to work across all major platforms using an abstraction layer that automatically selects the appropriate UI toolkit for each platform:

### Windows
- Uses PySide6 by default (install with `pip install PySide6==6.5.3`)
- If you encounter a "module not found" error, you need to uncomment and install PySide6 in requirements.txt
- Application data stored in `%APPDATA%\TextRedactionSystem\`
- High-DPI support enabled by default
- All file paths use Windows-style separators automatically

### macOS
- Uses PyQt6 by default (install with `pip install PyQt6==6.5.3`)
- Application data stored in `~/Library/Application Support/TextRedactionSystem/`
- Native look and feel with macOS-specific UI enhancements

### Linux
- Uses PyQt6 by default (install with `pip install PyQt6==6.5.3`)
- Application data stored in `~/.local/share/TextRedactionSystem/`
- Adapts to various desktop environments

### UI Toolkit Fallbacks
The application will automatically try to use the following UI toolkits, in platform-specific order:
1. Primary toolkit for the platform (PySide6 for Windows, PyQt6 for macOS/Linux)
2. Alternative modern toolkit (PyQt6 for Windows, PySide6 for macOS/Linux)
3. Older fallback toolkits (PyQt5, PySide2)

Install the appropriate UI toolkit for your platform as noted in the requirements.txt file.

## Customization Options

### Adding New Pattern Categories

1. Extend the rule_manager.py file to include the new category
2. Add the category to the UI in main_window.py
3. Update the entity type mapping in redaction_engine.py if needed

### Implementing New Document Processors

1. Create a new subclass of DocumentProcessor in document_processor.py
2. Implement the extract_text and get_metadata methods
3. Update the get_processor_for_file method to recognize the new file type

### Enhancing Redaction Output

1. Modify the redaction format in redaction_engine.py
2. Update the highlighting in main_window.py if changing the marker format
3. Add new pseudonym generators in semantic_redaction.py

## Conclusion

The Python Redaction System is a powerful, flexible tool for handling sensitive information in text and documents. With its comprehensive pattern library, advanced redaction capabilities, multi-format support, and user-friendly interface, it provides a complete solution for preparing text for AI systems while protecting privacy and sensitive data.

The modular architecture allows for easy extension and customization, while the robust error handling ensures reliability even in challenging scenarios. Whether used for occasional redaction tasks or integrated into a regular document processing workflow, this system provides the capabilities needed to handle sensitive information with confidence.

## License

MIT License

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.