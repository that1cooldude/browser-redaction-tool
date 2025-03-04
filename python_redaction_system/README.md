# Python Text Redaction System

A comprehensive text redaction system designed to sanitize sensitive information before sending text to Large Language Models (LLMs).

## Features

- **Powerful Redaction Engine**: Preset rules for common sensitive information (PII, PHI, etc.)
- **User-Friendly Interface**: Simple PyQt6-based UI with sensitivity controls
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
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install core dependencies
pip install PyQt6==6.5.3 regex==2023.10.3 cryptography==41.0.5 pyyaml==6.0.1 pyinstaller==6.12.0

# Optional: Install spaCy for enhanced NLP-based entity detection
# Note: The application works without spaCy, but NLP features will be disabled
pip install spacy
python -m spacy download en_core_web_sm
```

## Usage

```bash
# Run the application
python -m python_redaction_system.main
```

## Project Structure

```
python_redaction_system/
├── core/                # Core redaction engine
│   ├── __init__.py
│   ├── redaction_engine.py
│   └── rule_manager.py
├── ui/                  # PyQt6 user interface
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

## Optional Components

- **spaCy NLP**: Enhances entity recognition but application functions without it
- **SQLite3**: Built into Python's standard library, no separate installation needed

## License

MIT License

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.