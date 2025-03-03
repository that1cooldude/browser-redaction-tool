/**
 * Tests for validation utility functions
 */

import {
  validateRedactionRule,
  validateDocumentMetadata,
  isValidJson,
  validateExportConfig,
  validateSecuritySettings
} from '../src/utils/validation-utils.js';

describe('Validation Utilities', () => {
  describe('validateRedactionRule', () => {
    test('should validate a valid simple pattern rule', () => {
      const validRule = {
        name: 'Test Rule',
        pattern: 'confidential',
        replacementType: 'fixed',
        replacement: '[REDACTED]'
      };
      
      const result = validateRedactionRule(validRule);
      expect(result.valid).toBe(true);
    });
    
    test('should validate a valid regex rule', () => {
      const validRegexRule = {
        name: 'Email Rule',
        regex: '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b',
        replacementType: 'fixed',
        replacement: '[EMAIL]'
      };
      
      const result = validateRedactionRule(validRegexRule);
      expect(result.valid).toBe(true);
    });
    
    test('should require a rule name', () => {
      const missingNameRule = {
        pattern: 'confidential',
        replacementType: 'fixed',
        replacement: '[REDACTED]'
      };
      
      const result = validateRedactionRule(missingNameRule);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('name is required');
    });
    
    test('should require either pattern or regex', () => {
      const missingPatternRule = {
        name: 'Bad Rule',
        replacementType: 'fixed',
        replacement: '[REDACTED]'
      };
      
      const result = validateRedactionRule(missingPatternRule);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('pattern or regex is required');
    });
    
    test('should validate pattern is a non-empty string', () => {
      const emptyPatternRule = {
        name: 'Empty Pattern',
        pattern: '',
        replacementType: 'fixed',
        replacement: '[REDACTED]'
      };
      
      const result = validateRedactionRule(emptyPatternRule);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Pattern must be a non-empty string');
    });
    
    test('should validate regex syntax', () => {
      const invalidRegexRule = {
        name: 'Bad Regex',
        regex: '\\b[unclosed pattern',
        replacementType: 'fixed',
        replacement: '[REDACTED]'
      };
      
      const result = validateRedactionRule(invalidRegexRule);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid regular expression');
    });
    
    test('should validate replacement type', () => {
      const invalidTypeRule = {
        name: 'Bad Type',
        pattern: 'confidential',
        replacementType: 'invalid-type',
        replacement: '[REDACTED]'
      };
      
      const result = validateRedactionRule(invalidTypeRule);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid replacement type');
    });
    
    test('should require a replacement string for fixed replacement type', () => {
      const missingReplacementRule = {
        name: 'Fixed without replacement',
        pattern: 'confidential',
        replacementType: 'fixed'
      };
      
      const result = validateRedactionRule(missingReplacementRule);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Fixed replacement requires a replacement string');
    });
    
    test('should require a replacement character for character replacement type', () => {
      const missingCharRule = {
        name: 'Character without char',
        pattern: 'confidential',
        replacementType: 'character'
      };
      
      const result = validateRedactionRule(missingCharRule);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Character replacement requires a replacement character');
    });
  });

  describe('validateDocumentMetadata', () => {
    test('should validate valid document metadata', () => {
      const validMetadata = {
        title: 'Document Title',
        type: 'application/pdf',
        size: 1024
      };
      
      const result = validateDocumentMetadata(validMetadata);
      expect(result.valid).toBe(true);
    });
    
    test('should require a title', () => {
      const missingTitleMetadata = {
        type: 'application/pdf',
        size: 1024
      };
      
      const result = validateDocumentMetadata(missingTitleMetadata);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('title is required');
    });
    
    test('should require a type', () => {
      const missingTypeMetadata = {
        title: 'Document Title',
        size: 1024
      };
      
      const result = validateDocumentMetadata(missingTypeMetadata);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('type is required');
    });
    
    test('should require a valid size', () => {
      const invalidSizeMetadata = {
        title: 'Document Title',
        type: 'application/pdf',
        size: -1
      };
      
      const result = validateDocumentMetadata(invalidSizeMetadata);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Valid document size is required');
    });
  });

  describe('isValidJson', () => {
    test('should validate valid JSON strings', () => {
      expect(isValidJson('{}')).toBe(true);
      expect(isValidJson('{"name":"John","age":30}')).toBe(true);
      expect(isValidJson('["apple","banana","cherry"]')).toBe(true);
      expect(isValidJson('42')).toBe(true); // Numbers are valid JSON
      expect(isValidJson('"hello"')).toBe(true); // Strings are valid JSON
      expect(isValidJson('null')).toBe(true); // null is valid JSON
    });
    
    test('should reject invalid JSON strings', () => {
      expect(isValidJson('{')).toBe(false);
      expect(isValidJson('{"name":"John"')).toBe(false);
      expect(isValidJson('["apple","banana",')).toBe(false);
      expect(isValidJson('undefined')).toBe(false);
      expect(isValidJson('function(){}')).toBe(false);
    });
    
    test('should handle non-string inputs', () => {
      // If implementation strictly expects strings, these might throw or return false
      expect(() => isValidJson(undefined)).not.toThrow();
      expect(() => isValidJson(null)).not.toThrow();
      expect(() => isValidJson(42)).not.toThrow();
      expect(() => isValidJson({})).not.toThrow();
    });
  });

  describe('validateExportConfig', () => {
    test('should validate valid export configuration', () => {
      const validConfig = {
        format: 'pdf',
        includeAuditInfo: true
      };
      
      const result = validateExportConfig(validConfig);
      expect(result.valid).toBe(true);
    });
    
    test('should require a format', () => {
      const missingFormatConfig = {
        includeAuditInfo: true
      };
      
      const result = validateExportConfig(missingFormatConfig);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('format is required');
    });
    
    test('should validate supported formats', () => {
      const invalidFormatConfig = {
        format: 'invalid-format',
        includeAuditInfo: true
      };
      
      const result = validateExportConfig(invalidFormatConfig);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid export format');
    });
    
    test('should validate includeAuditInfo is a boolean when provided', () => {
      const invalidAuditConfig = {
        format: 'pdf',
        includeAuditInfo: 'yes' // Not a boolean
      };
      
      const result = validateExportConfig(invalidAuditConfig);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be a boolean');
    });
  });

  describe('validateSecuritySettings', () => {
    test('should validate valid security settings', () => {
      const validSettings = {
        encryptionEnabled: true,
        encryptionKey: 'securekey12345',
        redactionStrength: 'high'
      };
      
      const result = validateSecuritySettings(validSettings);
      expect(result.valid).toBe(true);
    });
    
    test('should validate encryptionEnabled is a boolean', () => {
      const invalidSettings = {
        encryptionEnabled: 'yes', // Not a boolean
        encryptionKey: 'securekey12345'
      };
      
      const result = validateSecuritySettings(invalidSettings);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be a boolean');
    });
    
    test('should require a encryption key when encryption is enabled', () => {
      const missingKeySettings = {
        encryptionEnabled: true
      };
      
      const result = validateSecuritySettings(missingKeySettings);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Encryption key must be');
    });
    
    test('should validate encryption key length', () => {
      const shortKeySettings = {
        encryptionEnabled: true,
        encryptionKey: 'short'
      };
      
      const result = validateSecuritySettings(shortKeySettings);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least 8 characters');
    });
    
    test('should validate redaction strength values', () => {
      const invalidStrengthSettings = {
        redactionStrength: 'ultra'
      };
      
      const result = validateSecuritySettings(invalidStrengthSettings);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid redaction strength');
    });
  });
});