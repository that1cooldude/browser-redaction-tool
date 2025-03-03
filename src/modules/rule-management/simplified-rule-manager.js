/**
 * Simplified Rule Manager Module
 * 
 * This module provides a streamlined approach to redaction with:
 * 1. Pre-configured categories of sensitive data
 * 2. Simple custom word/phrase addition
 * 3. Configurable sensitivity level
 */

// Predefined redaction categories with rules
const REDACTION_CATEGORIES = {
  personal: {
    name: 'Personal Information',
    description: 'Names, emails, phone numbers, etc.',
    rules: [
      {
        id: 'email',
        name: 'Email Addresses',
        regex: '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b',
        replacementType: 'fixed',
        replacement: '[EMAIL]',
        sensitivity: 'basic' // This rule is active at all sensitivity levels
      },
      {
        id: 'phone',
        name: 'Phone Numbers',
        regex: '\\b(\\+?1[-\\s]?)?(\\(?[0-9]{3}\\)?[-\\s]?)?[0-9]{3}[-\\s]?[0-9]{4}\\b',
        replacementType: 'fixed',
        replacement: '[PHONE]',
        sensitivity: 'basic'
      },
      {
        id: 'name',
        name: 'Person Names',
        regex: '\\b[A-Z][a-z]+\\s+[A-Z][a-z]+\\b',
        replacementType: 'fixed',
        replacement: '[NAME]',
        sensitivity: 'moderate'
      },
      {
        id: 'address',
        name: 'Street Addresses',
        regex: '\\b\\d+\\s+[A-Za-z0-9\\s,]+\\b(?:Avenue|Lane|Road|Boulevard|Drive|Street|Ave|Dr|Rd|Blvd|Ln|St)\\.?\\b',
        replacementType: 'fixed',
        replacement: '[ADDRESS]',
        sensitivity: 'moderate'
      }
    ],
    defaultEnabled: true
  },
  
  financial: {
    name: 'Financial Information',
    description: 'Credit cards, account numbers, etc.',
    rules: [
      {
        id: 'ssn',
        name: 'Social Security Numbers',
        regex: '\\b[0-9]{3}[-\\s]?[0-9]{2}[-\\s]?[0-9]{4}\\b',
        replacementType: 'character',
        replacementChar: 'X',
        sensitivity: 'basic'
      },
      {
        id: 'credit_card',
        name: 'Credit Card Numbers',
        regex: '\\b(?:[0-9]{4}[-\\s]?){3}[0-9]{4}\\b',
        replacementType: 'format-preserving',
        sensitivity: 'basic'
      },
      {
        id: 'bank_account',
        name: 'Bank Account Numbers',
        regex: '\\b[0-9]{6,17}\\b',
        replacementType: 'character',
        replacementChar: 'X',
        sensitivity: 'moderate'
      }
    ],
    defaultEnabled: true
  },
  
  technical: {
    name: 'Technical Information',
    description: 'IP addresses, URLs, file paths',
    rules: [
      {
        id: 'ip',
        name: 'IP Addresses',
        regex: '\\b(?:[0-9]{1,3}\\.){3}[0-9]{1,3}\\b',
        replacementType: 'fixed',
        replacement: '[IP_ADDRESS]',
        sensitivity: 'moderate'
      },
      {
        id: 'url',
        name: 'Website URLs',
        regex: '\\b(?:https?://|www\\.)[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b(?:[-a-zA-Z0-9()@:%_\\+.~#?&//=]*)',
        replacementType: 'fixed',
        replacement: '[URL]',
        sensitivity: 'moderate'
      },
      {
        id: 'file_path',
        name: 'File Paths',
        regex: '\\b(?:[A-Za-z]:\\\\|/(?:home|usr|var|etc|opt|tmp)/)(?:[\\w\\-./\\\\]+)\\b',
        replacementType: 'fixed',
        replacement: '[FILE_PATH]',
        sensitivity: 'high'
      }
    ],
    defaultEnabled: true
  },
  
  dates: {
    name: 'Dates and Times',
    description: 'Dates, times, and timestamps',
    rules: [
      {
        id: 'date',
        name: 'Dates',
        regex: '\\b(?:[0-9]{1,2}[-/\\s][0-9]{1,2}[-/\\s][0-9]{2,4}|[A-Za-z]{3,9}\\s[0-9]{1,2},?\\s[0-9]{2,4})\\b',
        replacementType: 'fixed',
        replacement: '[DATE]',
        sensitivity: 'high'
      }
    ],
    defaultEnabled: true
  },
  
  government: {
    name: 'Government Information',
    description: 'Agency names, IDs, etc.',
    rules: [
      {
        id: 'agency',
        name: 'Agency Names',
        regex: '\\b(?:Department of|U\\.S\\.|United States|Federal|National|Office of|Bureau of|Agency for)\\s+[A-Z][\\w\\s]+\\b',
        replacementType: 'fixed',
        replacement: '[AGENCY]',
        sensitivity: 'high'
      }
    ],
    defaultEnabled: true
  }
};

// Sensitivity levels configuration
const SENSITIVITY_LEVELS = {
  basic: {
    name: 'Basic Protection',
    description: 'Redacts only the most sensitive information (SSNs, credit cards, emails, phones)',
    value: 1
  },
  moderate: {
    name: 'Moderate Protection',
    description: 'Redacts personally identifiable information and moderate sensitivity data',
    value: 2
  },
  high: {
    name: 'High Protection',
    description: 'Redacts most potentially sensitive information',
    value: 3
  },
  maximum: {
    name: 'Maximum Protection',
    description: 'Redacts all potential sensitive information including custom terms',
    value: 4
  }
};

/**
 * Simplified Rule Manager class for handling redaction rules
 */
class SimplifiedRuleManager {
  /**
   * Initialize the rule manager
   */
  constructor() {
    this.categories = REDACTION_CATEGORIES;
    this.sensitivityLevels = SENSITIVITY_LEVELS;
    this.customTerms = [];
    this.sensitivityLevel = 'moderate'; // Default sensitivity
    this.enabledCategories = this.getDefaultEnabledCategories();
    
    this.loadSettingsFromStorage();
  }
  
  /**
   * Get categories that are enabled by default
   */
  getDefaultEnabledCategories() {
    // Return all categories by default
    return Object.keys(this.categories);
  }
  
  /**
   * Load settings from local storage
   */
  loadSettingsFromStorage() {
    try {
      // Load enabled categories
      const savedCategories = localStorage.getItem('redactionCategories');
      if (savedCategories) {
        this.enabledCategories = JSON.parse(savedCategories);
      }
      
      // Load custom terms
      const savedTerms = localStorage.getItem('redactionCustomTerms');
      if (savedTerms) {
        this.customTerms = JSON.parse(savedTerms);
      }
      
      // Load sensitivity level
      const savedSensitivity = localStorage.getItem('redactionSensitivity');
      if (savedSensitivity) {
        this.sensitivityLevel = savedSensitivity;
      }
    } catch (error) {
      console.error('Failed to load redaction settings from storage:', error);
      // Reset to defaults
      this.enabledCategories = this.getDefaultEnabledCategories();
      this.customTerms = [];
      this.sensitivityLevel = 'moderate';
    }
  }
  
  /**
   * Save settings to local storage
   */
  saveSettingsToStorage() {
    try {
      localStorage.setItem('redactionCategories', JSON.stringify(this.enabledCategories));
      localStorage.setItem('redactionCustomTerms', JSON.stringify(this.customTerms));
      localStorage.setItem('redactionSensitivity', this.sensitivityLevel);
    } catch (error) {
      console.error('Failed to save redaction settings to storage:', error);
    }
  }
  
  /**
   * Enable a category of redaction rules
   * @param {string} categoryId - Category to enable
   * @returns {boolean} - Success flag
   */
  enableCategory(categoryId) {
    if (!this.categories[categoryId]) {
      return false;
    }
    
    if (!this.enabledCategories.includes(categoryId)) {
      this.enabledCategories.push(categoryId);
      this.saveSettingsToStorage();
    }
    
    return true;
  }
  
  /**
   * Disable a category of redaction rules
   * @param {string} categoryId - Category to disable
   * @returns {boolean} - Success flag
   */
  disableCategory(categoryId) {
    if (!this.categories[categoryId]) {
      return false;
    }
    
    const index = this.enabledCategories.indexOf(categoryId);
    if (index !== -1) {
      this.enabledCategories.splice(index, 1);
      this.saveSettingsToStorage();
    }
    
    return true;
  }
  
  /**
   * Enable a specific template within a category
   * @param {string} templateId - Template ID to enable
   * @param {string} categoryId - Category that contains the template
   * @returns {boolean} - Success flag
   */
  enableTemplate(templateId, categoryId) {
    // We'll treat templates as always enabled for simplicity
    // In a real implementation, you would track enabled/disabled templates
    
    // Make sure category is enabled if any template in it is enabled
    if (!this.enabledCategories.includes(categoryId)) {
      this.enabledCategories.push(categoryId);
      this.saveSettingsToStorage();
    }
    
    return true;
  }
  
  /**
   * Disable a specific template within a category
   * @param {string} templateId - Template ID to disable
   * @param {string} categoryId - Category that contains the template
   * @returns {boolean} - Success flag
   */
  disableTemplate(templateId, categoryId) {
    // We'll treat templates as always enabled for simplicity
    // In a real implementation, you would track enabled/disabled templates
    // This is just a stub method to match the UI functionality
    
    return true;
  }
  
  /**
   * Set the sensitivity level
   * @param {string} level - Sensitivity level ('basic', 'moderate', 'high', 'maximum')
   * @returns {boolean} - Success flag
   */
  setSensitivityLevel(level) {
    if (!this.sensitivityLevels[level]) {
      return false;
    }
    
    this.sensitivityLevel = level;
    this.saveSettingsToStorage();
    return true;
  }
  
  /**
   * Add a custom term to redact
   * @param {string} term - Custom term to redact
   * @param {string} replacement - Text to replace with (optional)
   * @returns {Object} - Result with success flag and message
   */
  addCustomTerm(term, replacement = '[REDACTED]') {
    if (!term || term.trim() === '') {
      return { success: false, error: 'Term cannot be empty' };
    }
    
    // Check for duplicate
    if (this.customTerms.some(t => t.term === term)) {
      return { success: false, error: 'This term is already in your custom list' };
    }
    
    const newTerm = {
      id: `custom-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      term: term,
      replacement: replacement,
      created: new Date().toISOString()
    };
    
    this.customTerms.push(newTerm);
    this.saveSettingsToStorage();
    
    return { 
      success: true, 
      termId: newTerm.id, 
      message: `Custom term "${term}" added successfully` 
    };
  }
  
  /**
   * Remove a custom term
   * @param {string} termId - ID of the term to remove
   * @returns {Object} - Result with success flag and message
   */
  removeCustomTerm(termId) {
    const index = this.customTerms.findIndex(term => term.id === termId);
    if (index === -1) {
      return { success: false, error: 'Term not found' };
    }
    
    const termText = this.customTerms[index].term;
    this.customTerms.splice(index, 1);
    this.saveSettingsToStorage();
    
    return { 
      success: true, 
      message: `Custom term "${termText}" removed successfully` 
    };
  }
  
  /**
   * Get all active redaction rules based on current settings
   * @returns {Array} - Array of redaction rules
   */
  getActiveRules() {
    const sensitivityValue = this.sensitivityLevels[this.sensitivityLevel].value;
    const rules = [];
    
    // Get rules from enabled categories that meet the sensitivity threshold
    for (const categoryId of this.enabledCategories) {
      const category = this.categories[categoryId];
      if (!category) continue;
      
      for (const rule of category.rules) {
        const ruleSensitivityValue = this.sensitivityLevels[rule.sensitivity]?.value || 0;
        
        // Only include rules that meet or are below the current sensitivity level
        if (ruleSensitivityValue <= sensitivityValue) {
          // Create a proper rule object compatible with the redaction engine
          rules.push({
            id: `${categoryId}-${rule.id}`,
            name: rule.name,
            regex: rule.regex,
            replacementType: rule.replacementType,
            replacement: rule.replacement || `[${rule.name.toUpperCase()}]`,
            replacementChar: rule.replacementChar || 'X',
            description: `From ${category.name} category`,
            priority: rule.sensitivity === 'basic' ? 1 : 2,
            enabled: true,
            created: new Date().toISOString()
          });
        }
      }
    }
    
    // Add custom terms if sensitivity is high enough
    if (sensitivityValue >= this.sensitivityLevels.moderate.value) {
      for (const term of this.customTerms) {
        rules.push({
          id: term.id,
          name: `Custom: ${term.term}`,
          pattern: term.term,
          regex: null, // Use exact match instead of regex
          replacementType: 'fixed',
          replacement: term.replacement,
          description: 'Custom term',
          priority: 3, // Custom terms have higher priority
          enabled: true,
          created: term.created
        });
      }
    }
    
    return rules;
  }
  
  /**
   * Get all available categories
   * @returns {Array} - Array of category objects with enabled status
   */
  getAllCategories() {
    return Object.keys(this.categories).map(id => ({
      id,
      ...this.categories[id],
      enabled: true // Default all categories to enabled
    }));
  }
  
  /**
   * Get all sensitivity levels
   * @returns {Object} - Object containing sensitivity levels
   */
  getSensitivityLevels() {
    return { ...this.sensitivityLevels };
  }
  
  /**
   * Get current sensitivity level
   * @returns {Object} - Current sensitivity level object
   */
  getCurrentSensitivity() {
    return { 
      id: this.sensitivityLevel,
      ...this.sensitivityLevels[this.sensitivityLevel]
    };
  }
  
  /**
   * Get all custom terms
   * @returns {Array} - Array of custom terms
   */
  getCustomTerms() {
    return [...this.customTerms];
  }
  
  /**
   * Reset all settings to defaults
   */
  resetToDefaults() {
    this.enabledCategories = this.getDefaultEnabledCategories();
    this.customTerms = [];
    this.sensitivityLevel = 'moderate';
    this.saveSettingsToStorage();
    
    return { 
      success: true, 
      message: 'Redaction settings reset to defaults'
    };
  }
}

export { SimplifiedRuleManager, REDACTION_CATEGORIES, SENSITIVITY_LEVELS };