/**
 * Validation Utility Functions
 * 
 * This module provides utility functions for validating data throughout the application.
 */

/**
 * Validate redaction rule configuration
 * @param {Object} rule - The rule object to validate
 * @returns {Object} - Validation result with success flag and optional error message
 */
function validateRedactionRule(rule) {
  // Required fields
  if (!rule.name || !rule.name.trim()) {
    return { valid: false, error: 'Rule name is required' };
  }
  
  if (!rule.pattern && !rule.regex) {
    return { valid: false, error: 'Either pattern or regex is required' };
  }
  
  // Pattern must be a non-empty string if provided
  if (rule.pattern !== undefined && (typeof rule.pattern !== 'string' || !rule.pattern.trim())) {
    return { valid: false, error: 'Pattern must be a non-empty string' };
  }
  
  // Validate regex if provided
  if (rule.regex) {
    try {
      new RegExp(rule.regex);
    } catch (error) {
      return { valid: false, error: `Invalid regular expression: ${error.message}` };
    }
  }
  
  // Validate replacement type
  const validReplacementTypes = ['fixed', 'character', 'format-preserving'];
  if (!validReplacementTypes.includes(rule.replacementType)) {
    return { valid: false, error: 'Invalid replacement type' };
  }
  
  // Validate configuration based on replacement type
  if (rule.replacementType === 'fixed' && (!rule.replacement || typeof rule.replacement !== 'string')) {
    return { valid: false, error: 'Fixed replacement requires a replacement string' };
  }
  
  if (rule.replacementType === 'character' && (!rule.replacementChar || typeof rule.replacementChar !== 'string')) {
    return { valid: false, error: 'Character replacement requires a replacement character' };
  }
  
  return { valid: true };
}

/**
 * Validate document metadata
 * @param {Object} metadata - Document metadata to validate
 * @returns {Object} - Validation result with success flag and optional error message
 */
function validateDocumentMetadata(metadata) {
  if (!metadata.title || !metadata.title.trim()) {
    return { valid: false, error: 'Document title is required' };
  }
  
  if (!metadata.type || !metadata.type.trim()) {
    return { valid: false, error: 'Document type is required' };
  }
  
  if (!metadata.size || typeof metadata.size !== 'number' || metadata.size <= 0) {
    return { valid: false, error: 'Valid document size is required' };
  }
  
  return { valid: true };
}

/**
 * Check if a string is a valid JSON
 * @param {string} str - String to validate as JSON
 * @returns {boolean} - Whether the string is valid JSON
 */
function isValidJson(str) {
  try {
    JSON.parse(str);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Validate export configuration
 * @param {Object} config - Export configuration to validate
 * @returns {Object} - Validation result with success flag and optional error message
 */
function validateExportConfig(config) {
  if (!config.format || !config.format.trim()) {
    return { valid: false, error: 'Export format is required' };
  }
  
  const validFormats = ['pdf', 'text', 'image', 'json'];
  if (!validFormats.includes(config.format.toLowerCase())) {
    return { valid: false, error: 'Invalid export format' };
  }
  
  if (config.includeAuditInfo !== undefined && typeof config.includeAuditInfo !== 'boolean') {
    return { valid: false, error: 'Include audit info must be a boolean value' };
  }
  
  return { valid: true };
}

/**
 * Validate security settings
 * @param {Object} settings - Security settings to validate
 * @returns {Object} - Validation result with success flag and optional error message
 */
function validateSecuritySettings(settings) {
  if (settings.encryptionEnabled !== undefined && typeof settings.encryptionEnabled !== 'boolean') {
    return { valid: false, error: 'Encryption enabled must be a boolean value' };
  }
  
  if (settings.encryptionEnabled && (!settings.encryptionKey || typeof settings.encryptionKey !== 'string' || settings.encryptionKey.length < 8)) {
    return { valid: false, error: 'Encryption key must be at least 8 characters' };
  }
  
  if (settings.redactionStrength !== undefined) {
    const validStrengthValues = ['low', 'medium', 'high'];
    if (!validStrengthValues.includes(settings.redactionStrength)) {
      return { valid: false, error: 'Invalid redaction strength value' };
    }
  }
  
  return { valid: true };
}

export {
  validateRedactionRule,
  validateDocumentMetadata,
  isValidJson,
  validateExportConfig,
  validateSecuritySettings
};