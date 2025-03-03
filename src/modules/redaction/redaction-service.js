/**
 * Redaction Service Module
 * 
 * This module provides the interface for applying redaction rules and
 * managing the redaction process.
 */

import { redactDocument, redactBatch, analyzeDocument } from './redaction-engine.js';

/**
 * Initialize redaction service
 * @param {Object} appState - Application state
 * @returns {Object} - Redaction service methods
 */
function initRedactionService(appState) {
  // Store processing state
  const serviceState = {
    isProcessing: false,
    progress: 0,
    currentOperation: null,
    error: null,
    lastRedactionResult: null
  };
  
  /**
   * Apply redaction rules to the current document
   * @param {Array} rules - Redaction rules to apply
   * @param {Function} onProgress - Optional callback for progress updates
   * @returns {Promise<Object>} - Redaction results
   */
  async function applyRedaction(rules, onProgress) {
    try {
      // Check if we have a document
      if (!appState.currentDocument) {
        throw new Error('No document loaded. Please upload a document first.');
      }
      
      // Check if we have rules
      if (!Array.isArray(rules) || rules.length === 0) {
        throw new Error('No redaction rules provided. Please add at least one rule.');
      }
      
      // Update service state
      serviceState.isProcessing = true;
      serviceState.progress = 0;
      serviceState.currentOperation = 'Preparing document for redaction';
      serviceState.error = null;
      
      // Call progress callback
      if (typeof onProgress === 'function') {
        onProgress(0, 'Preparing document for redaction');
      }
      
      // Apply redaction rules
      serviceState.currentOperation = 'Applying redaction rules';
      updateProgress(30, 'Applying redaction rules', onProgress);
      
      const result = await redactDocument(
        appState.currentDocument, 
        rules,
        appState.pyodide
      );
      
      // Process results
      serviceState.currentOperation = 'Processing redaction results';
      updateProgress(70, 'Processing redaction results', onProgress);
      
      // Store result in app state
      appState.redactionResults = result;
      serviceState.lastRedactionResult = result;
      
      // Complete the operation
      serviceState.isProcessing = false;
      serviceState.progress = 100;
      serviceState.currentOperation = null;
      
      // Final progress update
      updateProgress(
        100, 
        `Redaction complete. ${result.statistics.redactionCount} items redacted.`,
        onProgress
      );
      
      return result;
    } catch (error) {
      console.error('Redaction error:', error);
      
      // Update service state
      serviceState.isProcessing = false;
      serviceState.progress = 0;
      serviceState.currentOperation = null;
      serviceState.error = error;
      
      // Call progress callback with error
      if (typeof onProgress === 'function') {
        onProgress(-1, `Error: ${error.message}`);
      }
      
      throw error;
    }
  }
  
  /**
   * Update progress and call progress callback
   * @param {number} progress - Progress percentage
   * @param {string} operation - Current operation description
   * @param {Function} onProgress - Progress callback
   */
  function updateProgress(progress, operation, onProgress) {
    serviceState.progress = progress;
    serviceState.currentOperation = operation;
    
    if (typeof onProgress === 'function') {
      onProgress(progress, operation);
    }
  }
  
  /**
   * Get the redacted version of the current document
   * @returns {Object|null} - Redacted document or null if no redaction has been applied
   */
  function getRedactedDocument() {
    if (!serviceState.lastRedactionResult) return null;
    
    return serviceState.lastRedactionResult.redacted;
  }
  
  /**
   * Get statistics from the last redaction operation
   * @returns {Object|null} - Redaction statistics or null if no redaction has been applied
   */
  function getRedactionStatistics() {
    if (!serviceState.lastRedactionResult) return null;
    
    return serviceState.lastRedactionResult.statistics;
  }
  
  /**
   * Get the service state
   * @returns {Object} - Current service state
   */
  function getServiceState() {
    return { ...serviceState };
  }
  
  /**
   * Check if text matches any redaction rules
   * @param {string} text - Text to check
   * @param {Array} rules - Redaction rules to check against
   * @returns {Array} - Matched rules
   */
  function checkTextAgainstRules(text, rules) {
    if (!text || !Array.isArray(rules) || rules.length === 0) {
      return [];
    }
    
    const matches = [];
    
    // Check each rule
    for (const rule of rules) {
      // Skip disabled rules
      if (rule.enabled === false) continue;
      
      let pattern;
      
      // Create pattern based on rule type
      if (rule.regex) {
        try {
          pattern = new RegExp(rule.regex, 'g');
        } catch (error) {
          console.error(`Invalid regex in rule "${rule.name}":`, error);
          continue;
        }
      } else if (rule.pattern) {
        // Escape special regex characters in pattern
        const escapedPattern = rule.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        pattern = new RegExp(escapedPattern, 'g');
      } else {
        console.error(`Rule "${rule.name}" has no pattern or regex`);
        continue;
      }
      
      // Test the pattern against the text
      const regex = new RegExp(pattern);
      if (regex.test(text)) {
        matches.push(rule);
      }
    }
    
    return matches;
  }
  
  /**
   * Apply redaction to a text string for preview
   * @param {string} text - Text to redact
   * @param {Array} rules - Redaction rules to apply
   * @returns {string} - Redacted text
   */
  function previewRedactedText(text, rules) {
    if (!text || !Array.isArray(rules) || rules.length === 0) {
      return text;
    }
    
    let redactedText = text;
    
    // Apply each rule
    for (const rule of rules) {
      // Skip disabled rules
      if (rule.enabled === false) continue;
      
      let pattern;
      
      // Create pattern based on rule type
      if (rule.regex) {
        try {
          pattern = new RegExp(rule.regex, 'g');
        } catch (error) {
          console.error(`Invalid regex in rule "${rule.name}":`, error);
          continue;
        }
      } else if (rule.pattern) {
        // Escape special regex characters in pattern
        const escapedPattern = rule.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        pattern = new RegExp(escapedPattern, 'g');
      } else {
        console.error(`Rule "${rule.name}" has no pattern or regex`);
        continue;
      }
      
      // Determine replacement text based on rule type
      let replacement;
      
      switch (rule.replacementType) {
        case 'fixed':
          replacement = rule.replacement || '[REDACTED]';
          break;
          
        case 'character':
          replacement = match => rule.replacementChar.repeat(match.length);
          break;
          
        case 'format-preserving':
          replacement = match => {
            let result = '';
            for (let i = 0; i < match.length; i++) {
              const char = match[i];
              if (/[0-9]/.test(char)) result += 'X';
              else if (/[a-z]/.test(char)) result += 'x';
              else if (/[A-Z]/.test(char)) result += 'X';
              else result += char;
            }
            return result;
          };
          break;
          
        default:
          replacement = '[REDACTED]';
      }
      
      // Apply redaction
      redactedText = redactedText.replace(pattern, replacement);
    }
    
    return redactedText;
  }
  
  /**
   * Analyze a document for sensitive information
   * @param {Object} document - The document to analyze
   * @returns {Promise<Object>} - Analysis results
   */
  async function analyzeSensitiveData(document) {
    try {
      if (!document) {
        throw new Error('No document provided for analysis');
      }
      
      // Update service state
      serviceState.isProcessing = true;
      serviceState.progress = 0;
      serviceState.currentOperation = 'Analyzing document for sensitive data';
      serviceState.error = null;
      
      // Perform analysis
      const result = await analyzeDocument(document, appState.pyodide);
      
      // Update service state
      serviceState.isProcessing = false;
      serviceState.progress = 100;
      serviceState.currentOperation = null;
      
      return result;
    } catch (error) {
      console.error('Error analyzing document:', error);
      
      // Update service state
      serviceState.isProcessing = false;
      serviceState.error = error;
      
      throw error;
    }
  }
  
  /**
   * Process multiple documents with the same redaction rules
   * @param {Array} documents - Documents to process
   * @param {Array} rules - Redaction rules to apply
   * @param {Function} onProgress - Optional callback for progress updates
   * @returns {Promise<Object>} - Batch processing results
   */
  async function processBatch(documents, rules, onProgress) {
    try {
      // Validate inputs
      if (!Array.isArray(documents) || documents.length === 0) {
        throw new Error('No documents provided for batch processing');
      }
      
      if (!Array.isArray(rules) || rules.length === 0) {
        throw new Error('No redaction rules provided for batch processing');
      }
      
      // Update service state
      serviceState.isProcessing = true;
      serviceState.progress = 0;
      serviceState.currentOperation = 'Preparing batch processing';
      serviceState.error = null;
      
      // Create progress callback wrapper
      const progressWrapper = (progressInfo) => {
        // Update service state
        serviceState.progress = progressInfo.percent;
        serviceState.currentOperation = `Processing ${progressInfo.currentDocument} of ${progressInfo.totalDocuments}: ${progressInfo.documentName || ''}`;
        
        // Forward to external callback
        if (typeof onProgress === 'function') {
          onProgress(progressInfo);
        }
      };
      
      // Process batch
      const result = await redactBatch(documents, rules, appState.pyodide, progressWrapper);
      
      // Update service state
      serviceState.isProcessing = false;
      serviceState.progress = 100;
      serviceState.currentOperation = null;
      
      return result;
    } catch (error) {
      console.error('Batch processing error:', error);
      
      // Update service state
      serviceState.isProcessing = false;
      serviceState.progress = 0;
      serviceState.currentOperation = null;
      serviceState.error = error;
      
      throw error;
    }
  }

  // Return public methods
  return {
    applyRedaction,
    getRedactedDocument,
    getRedactionStatistics,
    getServiceState,
    checkTextAgainstRules,
    previewRedactedText,
    analyzeSensitiveData,
    processBatch
  };
}

export { initRedactionService };