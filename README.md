# Python Text Redaction System

A comprehensive text redaction system designed to sanitize sensitive information before sending text to Large Language Models (LLMs).

## Features

- **Powerful Redaction Engine**: Preset rules for common sensitive information (PII, PHI, etc.)
- **User-Friendly Interface**: Simple PySide6-based UI with sensitivity controls
- **Custom Term Management**: Add custom terms without requiring regex knowledge
- **Secure Storage**: Encrypted storage of custom terms and configuration
- **Multiple Export Options**: Export redacted text in various formats (text, JSON)
- **Compliance Ready**: Built with government security standards in mind
- **Robust Processing**: Handles large documents with automatic chunking and error recovery

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/prompt-redaction-tool.git
cd prompt-redaction-tool

# Create a virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

## Usage

There are several ways to run the application:

### Method 1: Run as Module (Recommended)
```bash
# From the project root directory (prompt-redaction-tool):
python -m python_redaction_system.main
```

### Method 2: Set PYTHONPATH Environment Variable
```bash
# On macOS/Linux:
cd /path/to/prompt-redaction-tool
PYTHONPATH=$PWD venv/bin/python python_redaction_system/main.py

# On Windows (Command Prompt):
cd C:\path\to\prompt-redaction-tool
set PYTHONPATH=%CD%
venv\Scripts\python python_redaction_system\main.py

# On Windows (PowerShell):
cd C:\path\to\prompt-redaction-tool
$env:PYTHONPATH = $PWD
.\venv\Scripts\python .\python_redaction_system\main.py
```

### Method 3: Use the Launcher Script
```bash
# From the project root directory (prompt-redaction-tool):
python run.py
```

### Method 4: Install in Development Mode
```bash
# From the project root directory (prompt-redaction-tool):
pip install -e .
# Then run from anywhere:
python -m python_redaction_system.main
```

## Processing Large Documents

The application is designed to handle documents of various sizes while maintaining stability and preventing crashes:

- Documents larger than 100KB are automatically processed in smaller chunks by paragraph
- Very large single paragraphs may be split into multiple pieces for processing
- The system prioritizes stability and data preservation over processing speed
- For optimal performance, consider breaking extremely large documents (>1MB) into smaller files before processing

### Redaction Method Fallbacks

The application implements a robust fallback system:

1. **Microsoft Presidio** (Primary): Advanced entity recognition for comprehensive redaction
2. **Rule-Based Redaction** (Fallback): Customizable regex patterns for sensitive information detection
3. **Basic Pattern Matching** (Last Resort): Simple pattern matching to catch common sensitive information

This tiered approach ensures the application remains functional even when more sophisticated methods encounter issues.

## Project Structure

```
prompt-redaction-tool/
├── venv/               # Virtual environment
├── python_redaction_system/
│   ├── core/            # Core redaction engine
│   │   ├── __init__.py
│   │   ├── redaction_engine.py
│   │   ├── presidio_engine.py
│   │   └── rule_manager.py
│   ├── ui/              # PySide6 user interface
│   │   ├── __init__.py
│   │   ├── main_window.py
│   │   └── components/
│   ├── storage/         # Data storage module
│   │   ├── __init__.py
│   │   ├── database.py
│   │   └── custom_terms.py
│   ├── config/          # Configuration module
│   │   ├── __init__.py
│   │   ├── settings.py
│   │   └── defaults.py
│   ├── tests/           # Test suite
│   │   ├── test_redaction.py
│   │   └── test_ui.py
│   └── main.py          # Application entry point
├── run.py              # Launcher script
└── requirements.txt    # Project dependencies
```

## Security Considerations

- All sensitive data is encrypted using AES-256
- Follows NIST guidelines for data protection
- Implements secure data disposal practices
- Graceful handling of oversized documents with automatic chunking
- Fallback mechanisms ensure no data loss during processing errors
- Comprehensive logging for audit and troubleshooting purposes

## Platform Compatibility

The application is designed to work across all major platforms:

### Windows
- Application data stored in `%APPDATA%\TextRedactionSystem\`
- High-DPI support enabled by default
- All file paths use Windows-style separators automatically

### macOS
- Application data stored in `~/Library/Application Support/TextRedactionSystem/`
- Native look and feel with macOS-specific UI enhancements

### Linux
- Application data stored in `~/.local/share/TextRedactionSystem/`
- Adapts to various desktop environments

## Required and Optional Components

### Required Components
- **PySide6**: UI framework (explicitly installed via requirements.txt)
- **SQLite3**: Database for storing terms and settings (included with Python's standard library, no separate installation needed)
- **cryptography**: Used for secure storage of sensitive data
- **regex**: Enhanced regular expression support
- **pyyaml**: Configuration file parsing
- **presidio-analyzer/anonymizer**: Microsoft's PII detection and anonymization libraries (version 2.2.0+)

## Cross-Platform Notes

When developing or running on Windows:
- Use PySide6 instead of PyQt6 for better compatibility
- Enable high DPI scaling for modern displays
- Use Windows-specific UI adjustments for better performance

## Recent Updates

### Version 2.1.0 (March 2025)
- **Improved Stability**: Fixed crashes related to Microsoft Presidio 2.2+ updates
- **Enhanced Large Document Handling**: Added intelligent text chunking to prevent memory issues
- **Robust Error Recovery**: Implemented graceful fallbacks between redaction methods
- **Data Preservation**: New safeguards prevent content loss during processing errors
- **Dependency Streamlining**: Removed optional dependencies to improve compatibility with Python 3.13+

### Version 2.0.0 (January 2025)
- **Microsoft Presidio Integration**: Added advanced entity recognition capabilities
- **Expanded Redaction Categories**: Added support for PHI, financial, and workplace information
- **Improved UI**: Redesigned interface with better user feedback
- **Custom Terms Manager**: Enhanced management of user-defined redaction terms

## Troubleshooting

If you encounter any issues:

1. **Application Crashes**: Check logs in the `logs/` directory for details
2. **Processing Large Files**: Try increasing the chunk size by editing `MAX_TEXT_SIZE` in configuration
3. **Missing Redactions**: Adjust sensitivity level or add custom terms for specific content types
4. **Slow Performance**: Consider preprocessing large files into smaller chunks

## License

MIT License

## Contributing

Contributions are welcome! Here's how you can contribute to the project:

1. **Fork the repository**
   - Create your own fork of the code
   - Clone your fork locally

2. **Create a new branch**
   - Create a branch with a descriptive name (feature/fix/enhancement)
   - Make your changes in this branch

3. **Set up development environment**
   ```bash
   # Clone the repository
   git clone https://github.com/yourusername/prompt-redaction-tool.git
   cd prompt-redaction-tool
   
   # Create a virtual environment
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   
   # Install in development mode
   pip install -e .
   ```

4. **Run tests to make sure everything works**
   ```bash
   # Run the basic test script
   python test_redaction.py
   
   # Run the test suite
   pytest python_redaction_system/tests/
   ```

5. **Submit a Pull Request**
   - Push your changes to your fork
   - Submit a pull request from your branch to the main repository
   - Provide a clear description of the changes and any testing done

### Development Guidelines

- Follow PEP 8 style guidelines
- Include docstrings for all new functions and classes
- Add tests for new functionality
- Update the README if needed with new features or changed behavior
- Make sure all tests pass before submitting a pull request

### Code Review Process

The project maintainer(s) will review your pull request and provide feedback. Changes may be requested before the pull request is accepted.
