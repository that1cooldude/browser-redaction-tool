# Python Text Redaction System

A comprehensive text redaction system designed to sanitize sensitive information before sending text to Large Language Models (LLMs).

## Features

- **Powerful Redaction Engine**: Preset rules for common sensitive information (PII, PHI, etc.)
- **User-Friendly Interface**: Simple PySide6-based UI with sensitivity controls
- **Custom Term Management**: Add custom terms without requiring regex knowledge
- **Secure Storage**: Encrypted storage of custom terms and configuration
- **Multiple Export Options**: Export redacted text in various formats (text, JSON)
- **Compliance Ready**: Built with government security standards in mind

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/python-redaction-system.git
cd python-redaction-system

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
# From the project root directory:
python -m python_redaction_system.main
```

### Method 2: Set PYTHONPATH Environment Variable
```bash
# On macOS/Linux:
cd /path/to/python-redaction-system
PYTHONPATH=$PWD venv/bin/python python_redaction_system/main.py

# On Windows (Command Prompt):
cd C:\path\to\python-redaction-system
set PYTHONPATH=%CD%
venv\Scripts\python python_redaction_system\main.py

# On Windows (PowerShell):
cd C:\path\to\python-redaction-system
$env:PYTHONPATH = $PWD
.\venv\Scripts\python .\python_redaction_system\main.py
```

### Method 3: Use the Launcher Script
```bash
# From the project root directory:
python run.py
```

### Method 4: Install in Development Mode
```bash
# From the project root directory:
pip install -e .
# Then run from anywhere:
python -m python_redaction_system.main
```

## Project Structure

```
python_redaction_system/
├── core/                # Core redaction engine
│   ├── __init__.py
│   ├── redaction_engine.py
│   └── rule_manager.py
├── ui/                  # PySide6 user interface
│   ├── __init__.py
│   ├── main_window.py
│   └── components/
├── storage/             # Data storage module
│   ├── __init__.py
│   ├── database.py
│   └── custom_terms.py
├── config/              # Configuration module
│   ├── __init__.py
│   ├── settings.py
│   └── defaults.py
├── tests/               # Test suite
│   ├── test_redaction.py
│   └── test_ui.py
├── main.py              # Application entry point
└── requirements.txt     # Project dependencies
```

## Security Considerations

- All sensitive data is encrypted using AES-256
- Follows NIST guidelines for data protection
- Implements secure data disposal practices

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

### Optional Components
- **spaCy**: Enhances entity recognition with NLP capabilities (application functions without it, but with reduced features)

## Cross-Platform Notes

When developing or running on Windows:
- Use PySide6 instead of PyQt6 for better compatibility
- Enable high DPI scaling for modern displays
- Use Windows-specific UI adjustments for better performance

## License

MIT License

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.