# Testing Documentation

This document provides an overview of the testing approach for the browser redaction tool.

## Test Structure

The tests are organized into the following categories:

1. **Utility Function Tests**: Testing basic utility functions for file handling, validation, etc.
2. **Rule Management Tests**: Testing the rule creation, modification, and storage functionality.
3. **Redaction Engine Tests**: Testing the core redaction logic.
4. **UI Component Tests**: (To be implemented) Testing UI rendering and interactions.
5. **Integration Tests**: (To be implemented) Testing end-to-end workflows.

## Test Framework

The project uses Jest as the testing framework with the following setup:
- JSDOM for browser environment simulation
- Babel for ES module support
- Mock implementations for browser APIs like localStorage

## Running Tests

To run all tests:

```bash
npm test
```

To run a specific test file:

```bash
npm test -- tests/file-utils.test.js
```

To run tests with coverage:

```bash
npm test -- --coverage
```

## Current Test Coverage

### Utility Tests
- `file-utils.test.js`: Tests for file type validation, extension extraction, and file size formatting.
- `validation-utils.test.js`: Tests for validation of redaction rules, document metadata, JSON, export configurations, and security settings.

### Rule Management Tests
- `rule-manager.test.js`: Tests for adding, updating, deleting, importing, and exporting redaction rules.

### Redaction Tests
- `redaction-engine.test.js`: Tests for rule creation and document redaction functionality.

## Mock Implementations

The tests use several mock implementations:

1. **localStorage**: Mocked to simulate browser storage for rule persistence.
2. **Pyodide**: Mocked to simulate Python runtime for document processing.
3. **File objects**: Mocked to simulate browser File API.

## Test Data

Test data includes:
- Sample text documents with sensitive information
- Sample PDF structure
- Various redaction rules (credit card numbers, SSNs, etc.)
- Valid and invalid configurations

## Future Test Improvements

1. Implement UI component tests with interaction testing
2. Add end-to-end workflow tests
3. Increase test coverage for document processing
4. Add performance testing for large documents
5. Implement visual regression testing for redaction previews