/**
 * Tests for file utility functions
 */

import { 
  isSupportedFileType, 
  getFileExtension,
  formatFileSize 
} from '../src/utils/file-utils.js';

describe('File Utilities', () => {
  describe('isSupportedFileType', () => {
    test('should return true for supported file types', () => {
      // Create mock file objects
      const pdfFile = { type: 'application/pdf' };
      const jpegFile = { type: 'image/jpeg' };
      const txtFile = { type: 'text/plain' };
      const docxFile = { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
      
      // Test each file type
      expect(isSupportedFileType(pdfFile)).toBe(true);
      expect(isSupportedFileType(jpegFile)).toBe(true);
      expect(isSupportedFileType(txtFile)).toBe(true);
      expect(isSupportedFileType(docxFile)).toBe(true);
    });
    
    test('should return false for unsupported file types', () => {
      // Create mock file objects
      const htmlFile = { type: 'text/html' };
      const exeFile = { type: 'application/x-msdownload' };
      const unknownFile = { type: 'unknown/type' };
      
      // Test each file type
      expect(isSupportedFileType(htmlFile)).toBe(false);
      expect(isSupportedFileType(exeFile)).toBe(false);
      expect(isSupportedFileType(unknownFile)).toBe(false);
    });
    
    test('should handle null or undefined file types', () => {
      // Create mock file objects
      const nullTypeFile = { type: null };
      const undefinedTypeFile = { type: undefined };
      const emptyTypeFile = { type: '' };
      
      // Test each file type
      expect(isSupportedFileType(nullTypeFile)).toBe(false);
      expect(isSupportedFileType(undefinedTypeFile)).toBe(false);
      expect(isSupportedFileType(emptyTypeFile)).toBe(false);
    });
  });
  
  describe('getFileExtension', () => {
    test('should extract extension correctly', () => {
      // Create mock file objects
      const pdfFile = { name: 'document.pdf' };
      const jpegFile = { name: 'image.jpeg' };
      const txtFile = { name: 'text.txt' };
      const docxFile = { name: 'word.docx' };
      
      // Test each file
      expect(getFileExtension(pdfFile)).toBe('pdf');
      expect(getFileExtension(jpegFile)).toBe('jpeg');
      expect(getFileExtension(txtFile)).toBe('txt');
      expect(getFileExtension(docxFile)).toBe('docx');
    });
    
    test('should handle filenames with multiple dots', () => {
      // Create mock file objects
      const multiDotFile = { name: 'document.backup.pdf' };
      const versionedFile = { name: 'file.v1.2.3.txt' };
      
      // Test each file
      expect(getFileExtension(multiDotFile)).toBe('pdf');
      expect(getFileExtension(versionedFile)).toBe('txt');
    });
    
    test('should handle filenames without extension', () => {
      // Create mock file objects
      const noExtFile = { name: 'document' };
      const dotEndFile = { name: 'strange.' };
      
      // Test each file
      expect(getFileExtension(noExtFile)).toBe('document');
      expect(getFileExtension(dotEndFile)).toBe('');
    });
    
    test('should handle uppercase extensions and convert to lowercase', () => {
      // Create mock file objects
      const upperFile = { name: 'document.PDF' };
      const mixedFile = { name: 'image.JpEg' };
      
      // Test each file
      expect(getFileExtension(upperFile)).toBe('pdf');
      expect(getFileExtension(mixedFile)).toBe('jpeg');
    });
  });
  
  describe('formatFileSize', () => {
    test('should format bytes correctly', () => {
      // Test byte values
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(1)).toBe('1 Bytes');
      expect(formatFileSize(512)).toBe('512 Bytes');
      expect(formatFileSize(1023)).toBe('1023 Bytes');
    });
    
    test('should format kilobytes correctly', () => {
      // Test kilobyte values
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(10240)).toBe('10 KB');
      expect(formatFileSize(1048575)).toBe('1024 KB');  // Just under 1MB
    });
    
    test('should format megabytes correctly', () => {
      // Test megabyte values
      expect(formatFileSize(1048576)).toBe('1 MB');  // Exactly 1MB
      expect(formatFileSize(1572864)).toBe('1.5 MB');
      expect(formatFileSize(10485760)).toBe('10 MB');
    });
    
    test('should format gigabytes correctly', () => {
      // Test gigabyte values
      expect(formatFileSize(1073741824)).toBe('1 GB');  // Exactly 1GB
      expect(formatFileSize(1610612736)).toBe('1.5 GB');
      expect(formatFileSize(10737418240)).toBe('10 GB');
    });
    
    test('should format terabytes correctly', () => {
      // Test terabyte values
      expect(formatFileSize(1099511627776)).toBe('1 TB');  // Exactly 1TB
      expect(formatFileSize(1649267441664)).toBe('1.5 TB');
    });
    
    test('should handle non-number inputs', () => {
      // Test invalid inputs - behavior depends on implementation
      // If implementation ensures numbers, these tests may not be needed
      expect(() => formatFileSize('1024')).not.toThrow();
      expect(() => formatFileSize(null)).not.toThrow();
      expect(() => formatFileSize(undefined)).not.toThrow();
    });
  });
});