/**
 * Tests for rule management functionality
 */

import { RuleManager, RULE_TEMPLATES } from '../src/modules/rule-management/rule-manager.js';

// Mock localStorage for testing
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();

// Replace global localStorage with mock
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('Rule Manager', () => {
  let ruleManager;
  
  beforeEach(() => {
    // Clear localStorage mock before each test
    localStorageMock.clear();
    
    // Create a new rule manager instance
    ruleManager = new RuleManager();
  });
  
  test('should initialize with empty rules if no saved rules', () => {
    expect(ruleManager.getAllRules()).toEqual([]);
    expect(localStorageMock.getItem).toHaveBeenCalledWith('redactionRules');
  });
  
  test('should load rules from localStorage on initialization', () => {
    // Set up localStorage mock with test data
    const testRules = [
      { id: 'rule1', name: 'Test Rule 1', pattern: 'test', replacementType: 'fixed', replacement: '[TEST]' }
    ];
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(testRules));
    
    // Create rule manager that should load the test rules
    const manager = new RuleManager();
    
    // Check rules were loaded
    expect(manager.getAllRules()).toEqual(testRules);
  });
  
  test('should add a new rule', () => {
    const newRule = {
      name: 'New Rule',
      pattern: 'confidential',
      replacementType: 'fixed',
      replacement: '[REDACTED]'
    };
    
    const result = ruleManager.addRule(newRule);
    
    // Check result
    expect(result.success).toBe(true);
    expect(result.message).toContain('added successfully');
    
    // Check rule was added
    const rules = ruleManager.getAllRules();
    expect(rules.length).toBe(1);
    expect(rules[0].name).toBe('New Rule');
    
    // Check rule has an ID
    expect(rules[0].id).toBeDefined();
    expect(rules[0].id).toContain('rule-');
    
    // Check localStorage was updated
    expect(localStorageMock.setItem).toHaveBeenCalledWith('redactionRules', expect.any(String));
  });
  
  test('should not add rule with duplicate name', () => {
    // Add first rule
    ruleManager.addRule({
      name: 'Duplicate Rule',
      pattern: 'test',
      replacementType: 'fixed',
      replacement: '[TEST]'
    });
    
    // Try to add duplicate
    const result = ruleManager.addRule({
      name: 'Duplicate Rule',
      pattern: 'different',
      replacementType: 'fixed',
      replacement: '[DIFFERENT]'
    });
    
    // Check result
    expect(result.success).toBe(false);
    expect(result.error).toContain('already exists');
    
    // Check only one rule exists
    expect(ruleManager.getAllRules().length).toBe(1);
  });
  
  test('should update an existing rule', () => {
    // Add rule
    const addResult = ruleManager.addRule({
      name: 'Rule to Update',
      pattern: 'old pattern',
      replacementType: 'fixed',
      replacement: '[OLD]'
    });
    
    const ruleId = addResult.ruleId;
    
    // Update rule
    const updateResult = ruleManager.updateRule(ruleId, {
      name: 'Updated Rule',
      pattern: 'new pattern',
      replacementType: 'fixed',
      replacement: '[NEW]'
    });
    
    // Check result
    expect(updateResult.success).toBe(true);
    expect(updateResult.message).toContain('updated successfully');
    
    // Check rule was updated
    const rule = ruleManager.getRuleById(ruleId);
    expect(rule.name).toBe('Updated Rule');
    expect(rule.pattern).toBe('new pattern');
    expect(rule.replacement).toBe('[NEW]');
    
    // Check localStorage was updated
    expect(localStorageMock.setItem).toHaveBeenCalledTimes(2); // Add and update
  });
  
  test('should handle updating non-existent rule', () => {
    const result = ruleManager.updateRule('non-existent-id', {
      name: 'Will Fail',
      pattern: 'test',
      replacementType: 'fixed',
      replacement: '[TEST]'
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });
  
  test('should delete a rule', () => {
    // Add rule
    const addResult = ruleManager.addRule({
      name: 'Rule to Delete',
      pattern: 'delete me',
      replacementType: 'fixed',
      replacement: '[DELETED]'
    });
    
    const ruleId = addResult.ruleId;
    
    // Verify rule exists
    expect(ruleManager.getRuleById(ruleId)).toBeTruthy();
    
    // Delete rule
    const deleteResult = ruleManager.deleteRule(ruleId);
    
    // Check result
    expect(deleteResult.success).toBe(true);
    expect(deleteResult.message).toContain('deleted successfully');
    
    // Check rule was deleted
    expect(ruleManager.getRuleById(ruleId)).toBeNull();
    expect(ruleManager.getAllRules().length).toBe(0);
    
    // Check localStorage was updated
    expect(localStorageMock.setItem).toHaveBeenCalledTimes(2); // Add and delete
  });
  
  test('should handle deleting non-existent rule', () => {
    const result = ruleManager.deleteRule('non-existent-id');
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });
  
  test('should create rule from template', () => {
    // Create rule from template
    const result = ruleManager.createRuleFromTemplate('EMAIL');
    
    // Check result
    expect(result.success).toBe(true);
    expect(result.rule).toBeDefined();
    
    // Check rule properties match template
    expect(result.rule.name).toBe(RULE_TEMPLATES.EMAIL.name);
    expect(result.rule.regex).toBe(RULE_TEMPLATES.EMAIL.regex);
    expect(result.rule.replacementType).toBe(RULE_TEMPLATES.EMAIL.replacementType);
    
    // Check rule was added
    expect(ruleManager.getAllRules().length).toBe(1);
  });
  
  test('should handle creating rule from non-existent template', () => {
    const result = ruleManager.createRuleFromTemplate('NON_EXISTENT');
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Template not found');
  });
  
  test('should import rules from JSON', () => {
    // Create test rules to import
    const rulesToImport = [
      {
        name: 'Imported Rule 1',
        pattern: 'import1',
        replacementType: 'fixed',
        replacement: '[IMPORT1]'
      },
      {
        name: 'Imported Rule 2',
        regex: '\\d{4}-\\d{4}-\\d{4}-\\d{4}',
        replacementType: 'character',
        replacementChar: 'X'
      }
    ];
    
    // Import rules
    const result = ruleManager.importRules(JSON.stringify(rulesToImport));
    
    // Check result
    expect(result.success).toBe(true);
    expect(result.imported).toBe(2);
    expect(result.skipped).toBe(0);
    
    // Check rules were imported
    const rules = ruleManager.getAllRules();
    expect(rules.length).toBe(2);
    expect(rules[0].name).toBe('Imported Rule 1');
    expect(rules[1].name).toBe('Imported Rule 2');
    
    // Check localStorage was updated
    expect(localStorageMock.setItem).toHaveBeenCalledWith('redactionRules', expect.any(String));
  });
  
  test('should skip invalid rules during import', () => {
    // Create test rules to import, with one invalid
    const rulesToImport = [
      {
        name: 'Valid Rule',
        pattern: 'valid',
        replacementType: 'fixed',
        replacement: '[VALID]'
      },
      {
        name: 'Invalid Rule',
        replacementType: 'invalid-type' // Invalid replacement type
      }
    ];
    
    // Import rules
    const result = ruleManager.importRules(JSON.stringify(rulesToImport));
    
    // Check result
    expect(result.success).toBe(true);
    expect(result.imported).toBe(1); // Only the valid rule
    expect(result.skipped).toBe(1);  // The invalid rule
    
    // Check only valid rule was imported
    const rules = ruleManager.getAllRules();
    expect(rules.length).toBe(1);
    expect(rules[0].name).toBe('Valid Rule');
  });
  
  test('should export rules to JSON', () => {
    // Add test rules
    ruleManager.addRule({
      name: 'Rule 1',
      pattern: 'pattern1',
      replacementType: 'fixed',
      replacement: '[PATTERN1]'
    });
    
    ruleManager.addRule({
      name: 'Rule 2',
      regex: '\\d+',
      replacementType: 'character',
      replacementChar: '#'
    });
    
    // Export rules
    const exportedJson = ruleManager.exportRules();
    
    // Check exported JSON
    const parsed = JSON.parse(exportedJson);
    expect(parsed.length).toBe(2);
    expect(parsed[0].name).toBe('Rule 1');
    expect(parsed[1].name).toBe('Rule 2');
  });
});