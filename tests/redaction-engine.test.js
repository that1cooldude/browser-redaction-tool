/**
 * Tests for redaction engine functionality
 */

import { createDefaultRule, redactDocument } from '../src/modules/redaction/redaction-engine.js';

// Mock Pyodide for testing
const mockPyodide = {
  runPython: jest.fn((code) => {
    // Simple mock for Python code execution
    return {
      toJs: () => ({
        redacted: {
          pages: [{ text: 'Redacted content' }]
        },
        applied_rules: [{ rule_id: 'rule1', rule_name: 'Test Rule', matches: 3 }],
        total_redactions: 3
      })
    };
  })
};

describe('Redaction Engine', () => {
  describe('createDefaultRule', () => {
    test('should create a rule with default values', () => {
      const rule = createDefaultRule();
      
      expect(rule).toMatchObject({
        name: 'New Rule',
        pattern: '',
        regex: null,
        replacementType: 'fixed',
        replacement: '[REDACTED]',
        replacementChar: 'X',
        priority: 1,
        enabled: true
      });
      
      // Check ID format
      expect(rule.id).toMatch(/^rule-\d+-\d+$/);
      
      // Check timestamp
      expect(rule.created).toBeDefined();
      expect(new Date(rule.created)).toBeInstanceOf(Date);
    });
    
    test('should accept custom name', () => {
      const customName = 'Custom Rule Name';
      const rule = createDefaultRule(customName);
      
      expect(rule.name).toBe(customName);
    });
  });
  
  describe('redactDocument', () => {
    // Mock document for testing
    const mockTextDocument = {
      id: 'doc-123',
      metadata: {
        extension: 'txt',
        name: 'test.txt'
      },
      content: {
        text: 'This document contains sensitive data like credit card 1234-5678-9012-3456 and ssn 123-45-6789.',
        lines: [
          'This document contains sensitive data like credit card 1234-5678-9012-3456 and ssn 123-45-6789.'
        ]
      }
    };
    
    const mockPdfDocument = {
      id: 'doc-456',
      metadata: {
        extension: 'pdf',
        name: 'test.pdf'
      },
      content: {
        pages: [
          {
            page_number: 1,
            text: 'Page 1 with credit card 1234-5678-9012-3456'
          },
          {
            page_number: 2,
            text: 'Page 2 with ssn 123-45-6789'
          }
        ],
        metadata: {
          title: 'Test PDF',
          page_count: 2
        }
      }
    };
    
    // Test rules
    const creditCardRule = {
      id: 'rule1',
      name: 'Credit Card',
      regex: '\\d{4}-\\d{4}-\\d{4}-\\d{4}',
      replacementType: 'character',
      replacementChar: 'X',
      enabled: true
    };
    
    const ssnRule = {
      id: 'rule2',
      name: 'SSN',
      regex: '\\d{3}-\\d{2}-\\d{4}',
      replacementType: 'fixed',
      replacement: '[SSN REDACTED]',
      enabled: true
    };
    
    test('should redact text document with multiple rules', async () => {
      const result = await redactDocument(mockTextDocument, [creditCardRule, ssnRule]);
      
      // Check result structure
      expect(result).toHaveProperty('documentId', 'doc-123');
      expect(result).toHaveProperty('original', mockTextDocument);
      expect(result).toHaveProperty('redacted');
      expect(result).toHaveProperty('statistics');
      expect(result).toHaveProperty('timestamp');
      
      // Check redacted content
      expect(result.redacted.text).toContain('XXXX-XXXX-XXXX-XXXX');
      expect(result.redacted.text).toContain('[SSN REDACTED]');
      
      // Check statistics
      expect(result.statistics.redactionCount).toBeGreaterThan(0);
      expect(result.statistics.appliedRules.length).toBe(2);
      expect(result.statistics.processingTime).toBeGreaterThan(0);
    });
    
    test('should redact PDF document using Python (via mock)', async () => {
      const result = await redactDocument(mockPdfDocument, [creditCardRule, ssnRule], mockPyodide);
      
      // Check result structure
      expect(result).toHaveProperty('documentId', 'doc-456');
      expect(result).toHaveProperty('original', mockPdfDocument);
      expect(result).toHaveProperty('redacted');
      expect(result).toHaveProperty('statistics');
      expect(result).toHaveProperty('timestamp');
      
      // Check Pyodide was used (Python code was executed)
      expect(mockPyodide.runPython).toHaveBeenCalled();
      
      // Check statistics from mocked Python result
      expect(result.statistics.redactionCount).toBe(3);
      expect(result.statistics.appliedRules.length).toBe(1);
      expect(result.statistics.appliedRules[0].ruleId).toBe('rule1');
    });
    
    test('should throw error for unsupported document type', async () => {
      const unsupportedDocument = {
        id: 'doc-789',
        metadata: {
          extension: 'unsupported',
          name: 'test.unsupported'
        },
        content: {
          text: 'Test content'
        }
      };
      
      await expect(redactDocument(unsupportedDocument, [creditCardRule])).rejects.toThrow(/Unsupported document type/);
    });
    
    test('should throw error for missing content', async () => {
      const invalidDocument = {
        id: 'doc-invalid',
        metadata: {
          extension: 'txt',
          name: 'invalid.txt'
        }
        // Missing content
      };
      
      await expect(redactDocument(invalidDocument, [creditCardRule])).rejects.toThrow(/missing content/);
    });
    
    test('should throw error for empty rules', async () => {
      await expect(redactDocument(mockTextDocument, [])).rejects.toThrow(/No redaction rules provided/);
    });
    
    test('should throw error for invalid rules', async () => {
      const invalidRule = {
        id: 'invalid-rule',
        name: 'Invalid Rule',
        // Missing pattern and regex
        replacementType: 'fixed',
        replacement: '[REDACTED]'
      };
      
      await expect(redactDocument(mockTextDocument, [invalidRule])).rejects.toThrow(/Invalid redaction rules/);
    });
  });
});