"""
Tests for the document processor module.
"""

import os
import tempfile
import unittest
from unittest.mock import patch, MagicMock

from python_redaction_system.core.document_processor import (
    DocumentProcessor,
    TextProcessor,
    PDFProcessor,
    DocxProcessor,
    HTMLProcessor,
    ImageProcessor
)


class TestDocumentProcessor(unittest.TestCase):
    """Test cases for the document processor module."""
    
    def test_get_processor_for_file(self):
        """Test the factory method to get the appropriate processor."""
        # Test for text files
        self.assertIsInstance(
            DocumentProcessor.get_processor_for_file("/path/to/file.txt"),
            TextProcessor
        )
        
        # Test for PDF files
        self.assertIsInstance(
            DocumentProcessor.get_processor_for_file("/path/to/file.pdf"),
            PDFProcessor
        )
        
        # Test for Word files
        self.assertIsInstance(
            DocumentProcessor.get_processor_for_file("/path/to/file.docx"),
            DocxProcessor
        )
        self.assertIsInstance(
            DocumentProcessor.get_processor_for_file("/path/to/file.doc"),
            DocxProcessor
        )
        
        # Test for HTML files
        self.assertIsInstance(
            DocumentProcessor.get_processor_for_file("/path/to/file.html"),
            HTMLProcessor
        )
        self.assertIsInstance(
            DocumentProcessor.get_processor_for_file("/path/to/file.htm"),
            HTMLProcessor
        )
        
        # Test for image files
        self.assertIsInstance(
            DocumentProcessor.get_processor_for_file("/path/to/file.jpg"),
            ImageProcessor
        )
        self.assertIsInstance(
            DocumentProcessor.get_processor_for_file("/path/to/file.png"),
            ImageProcessor
        )
        
        # Test for unknown file types (should default to TextProcessor)
        self.assertIsInstance(
            DocumentProcessor.get_processor_for_file("/path/to/file.unknown"),
            TextProcessor
        )
    
    def test_text_processor(self):
        """Test the text processor."""
        processor = TextProcessor()
        
        # Create a temporary file for testing
        with tempfile.NamedTemporaryFile(mode='w+', delete=False) as f:
            f.write("Test content")
            temp_file = f.name
        
        try:
            # Test text extraction
            text = processor.extract_text(temp_file)
            self.assertEqual(text, "Test content")
            
            # Test metadata extraction
            metadata = processor.get_metadata(temp_file)
            self.assertIn('filename', metadata)
            self.assertIn('size', metadata)
            self.assertEqual(os.path.basename(temp_file), metadata['filename'])
        finally:
            # Clean up the temporary file
            os.unlink(temp_file)
    
    @patch('python_redaction_system.core.document_processor.PyPDF2')
    def test_pdf_processor_with_mock(self, mock_pypdf2):
        """Test the PDF processor with mocked dependencies."""
        # Set up the mock
        mock_reader = MagicMock()
        mock_page = MagicMock()
        mock_page.extract_text.return_value = "Test PDF content"
        mock_reader.pages = [mock_page]
        mock_reader.metadata = {'Title': 'Test PDF', 'Author': 'Test Author'}
        mock_pypdf2.PdfReader.return_value = mock_reader
        
        processor = PDFProcessor()
        
        # Create a temporary file for testing
        with tempfile.NamedTemporaryFile(delete=False) as f:
            temp_file = f.name
        
        try:
            # Test text extraction
            text = processor.extract_text(temp_file)
            self.assertEqual(text, "Test PDF content\n\n")
            
            # Test metadata extraction
            metadata = processor.get_metadata(temp_file)
            self.assertIn('Title', metadata)
            self.assertEqual('Test PDF', metadata['Title'])
            self.assertIn('Author', metadata)
            self.assertEqual('Test Author', metadata['Author'])
        finally:
            # Clean up the temporary file
            os.unlink(temp_file)


if __name__ == '__main__':
    unittest.main()