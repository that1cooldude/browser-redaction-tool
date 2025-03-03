/**
 * Prompt Privacy Tool - Main Application
 *
 * A focused tool for redacting sensitive information in text before sending to AI models.
 * Emphasizes simplicity and prompt-focused text redaction for privacy protection.
 */

// Application state
const appState = {
  isInitialized: false,
  isProcessing: false,
  redactionRules: [],
  pastedText: null,
  redactedText: null,
  customTerms: [],
  protectionLevel: 'standard',
  redactionStyle: 'type-label',
  redactionResults: {
    redactionCount: 0,
    categories: [],
    protectionScore: 0
  },
  detailedRedactions: [] // Stores individual redactions for details view
};

/**
 * Initialize the application
 */
function initializeApp() {
  try {
    console.log('Starting application initialization...');
    
    // Setup event handlers for the prompt-focused UI
    setupPromptFocusedUI();
    
    // Update UI status
    updateUIStatus('ready', 'Prompt Privacy Tool ready');
    
    // Load default rules
    loadDefaultRules();
    
    console.log('Application initialized successfully');
  } catch (error) {
    console.error('Failed to initialize application:', error);
    updateUIStatus('error', 'Failed to initialize the application. Check console for details.');
  }
}

/**
 * Load default redaction rules
 */
function loadDefaultRules() {
  // Standard rules that we always want to have available
  const standardRules = [
    { 
      type: 'email',
      category: 'contact', 
      regex: '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b', 
      replacement: '[EMAIL]' 
    },
    { 
      type: 'phone',
      category: 'contact', 
      regex: '\\b(\\+\\d{1,2}\\s?)?\\(?\\d{3}\\)?[\\s.-]?\\d{3}[\\s.-]?\\d{4}\\b', 
      replacement: '[PHONE]' 
    },
    { 
      type: 'ssn',
      category: 'personal', 
      regex: '\\b\\d{3}-\\d{2}-\\d{4}\\b', 
      replacement: '[SSN]' 
    }
  ];
  
  // Set these as our default rules
  appState.redactionRules = standardRules;
}

/**
 * Update the UI based on application status
 * @param {string} status - Current application status
 * @param {string} message - Optional message to display
 */
function updateUIStatus(status, message = '') {
  try {
    const statusElement = document.querySelector('#status-message');
    if (statusElement) {
      statusElement.textContent = message || status;
      statusElement.className = `status-message status-${status} visible`;
      
      // Auto-hide after 4 seconds
      setTimeout(() => {
        if (statusElement) {
          statusElement.className = 'status-message';
        }
      }, 4000);
    }
    
    if (document.body && document.body.dataset) {
      document.body.dataset.appStatus = status;
    }
  } catch (error) {
    // If UI update fails, at least log to console
    console.error('Failed to update UI status element:', error);
  }
  
  // Always log status to console for debugging
  console.log(`App status: ${status}${message ? ' - ' + message : ''}`);
}

/**
 * Set up event listeners for new UI
 */
function setupPromptFocusedUI() {
  // Protection level selection
  const protectionLevels = document.querySelectorAll('input[name="protection-level"]');
  protectionLevels.forEach(radio => {
    radio.addEventListener('change', () => {
      appState.protectionLevel = radio.value;
    });
  });

  // Quick redact button
  const quickRedactBtn = document.getElementById('quick-redact-btn');
  if (quickRedactBtn) {
    quickRedactBtn.addEventListener('click', quickRedactText);
  }

  // Redact with options button
  const optionsRedactBtn = document.getElementById('process-paste-btn');
  if (optionsRedactBtn) {
    optionsRedactBtn.addEventListener('click', processRedactionText);
  }

  // Apply redaction options
  const applyOptionsBtn = document.getElementById('options-apply-btn');
  if (applyOptionsBtn) {
    applyOptionsBtn.addEventListener('click', applyRedactionWithOptions);
  }

  // Cancel options
  const cancelOptionsBtn = document.getElementById('options-cancel-btn');
  if (cancelOptionsBtn) {
    cancelOptionsBtn.addEventListener('click', () => {
      const modal = document.getElementById('redact-options-modal');
      if (modal) {
        modal.style.display = 'none';
        modal.classList.add('hidden');
      }
    });
  }

  // Close options modal
  const closeOptionsBtn = document.getElementById('redaction-options-close');
  if (closeOptionsBtn) {
    closeOptionsBtn.addEventListener('click', () => {
      const modal = document.getElementById('redact-options-modal');
      if (modal) {
        modal.style.display = 'none';
        modal.classList.add('hidden');
      }
    });
  }

  // Custom term modal
  const addTermBtn = document.getElementById('add-term-btn');
  if (addTermBtn) {
    addTermBtn.addEventListener('click', () => {
      const modal = document.getElementById('custom-term-modal');
      if (modal) {
        modal.style.display = 'flex';
        modal.classList.remove('hidden');
        document.getElementById('custom-term').focus();
      }
    });
  }

  // Add custom term
  const addCustomTermBtn = document.getElementById('add-custom-term-btn');
  if (addCustomTermBtn) {
    addCustomTermBtn.addEventListener('click', addCustomTerm);
  }

  // Close custom term modal
  const closeCustomTermBtn = document.getElementById('custom-term-modal-close');
  if (closeCustomTermBtn) {
    closeCustomTermBtn.addEventListener('click', () => {
      const modal = document.getElementById('custom-term-modal');
      if (modal) {
        modal.style.display = 'none';
        modal.classList.add('hidden');
      }
    });
  }

  // Copy redacted text
  const copyRedactedBtn = document.getElementById('copy-redacted-btn');
  if (copyRedactedBtn) {
    copyRedactedBtn.addEventListener('click', copyRedactedTextToClipboard);
  }

  // Send to AI
  const sendToAIBtn = document.getElementById('send-to-ai-btn');
  if (sendToAIBtn) {
    sendToAIBtn.addEventListener('click', () => {
      const destination = document.getElementById('destination-select').value;
      sendToDestination(destination);
    });
  }

  // Close redaction details
  const closeDetailsBtn = document.getElementById('close-details-btn');
  if (closeDetailsBtn) {
    closeDetailsBtn.addEventListener('click', () => {
      const details = document.getElementById('redaction-details');
      if (details) {
        details.style.display = 'none';
      }
    });
  }

  // Clear text button
  const clearTextBtn = document.getElementById('clear-text-btn');
  if (clearTextBtn) {
    clearTextBtn.addEventListener('click', () => {
      const pasteTextArea = document.getElementById('paste-text');
      if (pasteTextArea) {
        pasteTextArea.value = '';
        pasteTextArea.focus();
      }
    });
  }

  // Load example button
  const exampleBtn = document.getElementById('example-btn');
  if (exampleBtn) {
    exampleBtn.addEventListener('click', loadExampleText);
  }

  // Initialize UI elements
  updateCustomTermsUI();
}

/**
 * Process text from the paste area and apply redaction rules with options dialog
 */
function processRedactionText() {
  try {
    // Show the options modal
    const optionsModal = document.getElementById('redact-options-modal');
    if (optionsModal) {
      optionsModal.style.display = 'flex';
      optionsModal.classList.remove('hidden');
    } else {
      // Fallback to quick redaction if modal not found
      quickRedactText();
    }
  } catch (error) {
    console.error('Process redaction error:', error);
    updateUIStatus('error', `Failed to open options: ${error.message}`);
  }
}

/**
 * Apply redaction with the selected options from the modal
 */
function applyRedactionWithOptions() {
  try {
    // Get text from textarea
    const pasteTextArea = document.getElementById('paste-text');
    if (!pasteTextArea) {
      throw new Error('Paste text area not found');
    }
    
    const text = pasteTextArea.value.trim();
    if (!text) {
      throw new Error('Please paste some text to redact');
    }
    
    // Store original text in app state
    appState.pastedText = text;
    
    // Get selected options
    const redactionStyle = document.getElementById('redaction-style').value;
    appState.redactionStyle = redactionStyle;
    
    // Build redaction rules based on selected categories
    const selectedCategories = [];
    const rules = [];
    
    // Personal info
    if (document.getElementById('personal-info').checked) {
      selectedCategories.push('personal');
      
      if (document.getElementById('names').checked) {
        rules.push({ 
          category: 'personal', 
          type: 'names',
          regex: '\\b[A-Z][a-z]+ [A-Z][a-z]+\\b', 
          replacement: redactionStyle === 'type-label' ? '[NAME]' : '[REDACTED]' 
        });
      }
      
      if (document.getElementById('dates').checked) {
        rules.push({ 
          category: 'personal', 
          type: 'dates',
          regex: '\\b(0?[1-9]|1[0-2])[\\/\\-](0?[1-9]|[12][0-9]|3[01])[\\/\\-](19|20)\\d{2}\\b', 
          replacement: redactionStyle === 'type-label' ? '[DATE]' : '[REDACTED]' 
        });
      }
      
      if (document.getElementById('ids').checked) {
        rules.push({ 
          category: 'personal', 
          type: 'id',
          regex: '\\b\\d{3}-\\d{2}-\\d{4}\\b', // SSN
          replacement: redactionStyle === 'type-label' ? '[SSN]' : '[REDACTED]' 
        });
      }
    }
    
    // Contact info
    if (document.getElementById('contact-info').checked) {
      selectedCategories.push('contact');
      
      if (document.getElementById('emails').checked) {
        rules.push({ 
          category: 'contact', 
          type: 'email',
          regex: '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b', 
          replacement: redactionStyle === 'type-label' ? '[EMAIL]' : '[REDACTED]' 
        });
      }
      
      if (document.getElementById('phones').checked) {
        rules.push({ 
          category: 'contact', 
          type: 'phone',
          regex: '\\b(\\+\\d{1,2}\\s?)?\\(?\\d{3}\\)?[\\s.-]?\\d{3}[\\s.-]?\\d{4}\\b', 
          replacement: redactionStyle === 'type-label' ? '[PHONE]' : '[REDACTED]' 
        });
      }
      
      if (document.getElementById('addresses').checked) {
        rules.push({ 
          category: 'contact', 
          type: 'address',
          regex: '\\b\\d+\\s[A-Z][a-z]+\\s(St|Ave|Rd|Blvd|Dr|Ln|Ct|Way)(\\.|,)?\\s[A-Z][a-z]+,\\s[A-Z]{2}\\s\\d{5}\\b', 
          replacement: redactionStyle === 'type-label' ? '[ADDRESS]' : '[REDACTED]' 
        });
      }
    }
    
    // Financial info
    if (document.getElementById('financial-info').checked) {
      selectedCategories.push('financial');
      
      if (document.getElementById('credit-card').checked) {
        rules.push({ 
          category: 'financial', 
          type: 'credit-card',
          regex: '\\b(?:\\d{4}[- ]?){3}\\d{4}\\b', 
          replacement: redactionStyle === 'type-label' ? '[CREDIT_CARD]' : '[REDACTED]' 
        });
      }
      
      if (document.getElementById('bank-accounts').checked) {
        rules.push({ 
          category: 'financial', 
          type: 'bank-account',
          regex: '\\b\\d{8,17}\\b', 
          replacement: redactionStyle === 'type-label' ? '[ACCOUNT_NUM]' : '[REDACTED]' 
        });
      }
    }
    
    // Add custom terms
    if (appState.customTerms.length > 0) {
      selectedCategories.push('custom');
      
      appState.customTerms.forEach(term => {
        if (term.term.trim()) {
          rules.push({
            category: 'custom',
            type: 'custom-term',
            pattern: term.term.trim(),
            replacement: term.replacement || (redactionStyle === 'type-label' ? '[CUSTOM]' : '[REDACTED]')
          });
        }
      });
    }
    
    // Update appState with selected rules
    appState.redactionRules = rules;
    
    // Show processing status
    updateUIStatus('processing', 'Applying redaction rules to text...');
    
    // Process the redaction
    const result = processRedaction(text, rules, redactionStyle);
    
    // Update UI
    updateRedactionResults(result);
    
    // Close the modal
    const modal = document.getElementById('redact-options-modal');
    if (modal) {
      modal.style.display = 'none';
      modal.classList.add('hidden');
    }
    
    // Show success message
    updateUIStatus('success', 'Text redacted successfully. Ready for use in AI prompts.');
    
    // Show redaction details
    const redactionDetails = document.getElementById('redaction-details');
    if (redactionDetails) {
      redactionDetails.style.display = 'block';
    }
  } catch (error) {
    console.error('Redaction error:', error);
    updateUIStatus('error', `Failed to redact text: ${error.message}`);
  }
}

/**
 * Process redaction and return detailed results
 * @param {string} text - Text to redact
 * @param {Array} rules - Redaction rules
 * @param {string} style - Redaction style
 * @returns {Object} - Results with redacted text and statistics
 */
function processRedaction(text, rules, style) {
  const detailedRedactions = [];
  let redactedText = text;
  
  // Apply each rule and track replacements
  rules.forEach(rule => {
    if (rule.pattern) {
      // Simple pattern matching
      let position = 0;
      while ((position = redactedText.indexOf(rule.pattern, position)) !== -1) {
        const originalText = redactedText.substring(position, position + rule.pattern.length);
        
        // Create replacement text based on style
        let replacement = rule.replacement;
        if (style === 'black-box') {
          replacement = '█'.repeat(originalText.length);
        } else if (style === 'character') {
          replacement = 'X'.repeat(originalText.length);
        }
        
        // Track this redaction
        detailedRedactions.push({
          type: rule.type || 'custom',
          category: rule.category,
          originalText: originalText,
          position: position
        });
        
        // Apply replacement
        redactedText = 
          redactedText.substring(0, position) + 
          replacement + 
          redactedText.substring(position + rule.pattern.length);
          
        position += replacement.length;
      }
    } else if (rule.regex) {
      // Regex matching
      try {
        const regex = new RegExp(rule.regex, 'g');
        let match;
        let offset = 0;
        
        // We need to reapply the regex for each match because the string length changes
        let workingText = redactedText;
        
        while ((match = regex.exec(workingText)) !== null) {
          const originalText = match[0];
          const adjustedPosition = match.index + offset;
          
          // Create replacement text based on style
          let replacement = rule.replacement;
          if (style === 'black-box') {
            replacement = '█'.repeat(originalText.length);
          } else if (style === 'character') {
            replacement = 'X'.repeat(originalText.length);
          }
          
          // Track this redaction
          detailedRedactions.push({
            type: rule.type || 'regex',
            category: rule.category,
            originalText: originalText,
            position: adjustedPosition
          });
          
          // Apply replacement
          redactedText = 
            redactedText.substring(0, adjustedPosition) + 
            replacement + 
            redactedText.substring(adjustedPosition + originalText.length);
            
          // Reset regex and update working text
          offset += (replacement.length - originalText.length);
          workingText = redactedText;
          regex.lastIndex = 0;
        }
      } catch (error) {
        console.error('Invalid regex:', error);
      }
    }
  });
  
  // Calculate categories covered
  const categories = [...new Set(detailedRedactions.map(r => r.category))];
  
  // Calculate protection score (simplistic approach)
  const protectionScore = Math.min(100, Math.round((detailedRedactions.length / (text.length / 100)) * 10));
  
  return {
    redactedText,
    redactionCount: detailedRedactions.length,
    categories: categories,
    protectionScore: protectionScore,
    detailedRedactions: detailedRedactions
  };
}

/**
 * Quick redact text with default rules based on selected protection level
 */
function quickRedactText() {
  try {
    // Get text from textarea
    const pasteTextArea = document.getElementById('paste-text');
    if (!pasteTextArea) {
      throw new Error('Paste text area not found');
    }
    
    const text = pasteTextArea.value.trim();
    if (!text) {
      throw new Error('Please paste some text to redact');
    }
    
    // Store original text in app state
    appState.pastedText = text;
    
    // Show processing status
    updateUIStatus('processing', 'Applying quick redaction...');
    
    // Get protection level
    const protectionLevel = document.querySelector('input[name="protection-level"]:checked')?.value || 'standard';
    appState.protectionLevel = protectionLevel;
    
    // Create rules based on protection level
    const rules = [
      // Standard level - Basic PII
      { 
        category: 'contact', 
        type: 'email',
        regex: '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b', 
        replacement: '[EMAIL]' 
      },
      { 
        category: 'contact', 
        type: 'phone',
        regex: '\\b(\\+\\d{1,2}\\s?)?\\(?\\d{3}\\)?[\\s.-]?\\d{3}[\\s.-]?\\d{4}\\b', 
        replacement: '[PHONE]' 
      },
      { 
        category: 'personal', 
        type: 'ssn',
        regex: '\\b\\d{3}-\\d{2}-\\d{4}\\b', 
        replacement: '[SSN]' 
      },
      { 
        category: 'personal', 
        type: 'names',
        regex: '\\b[A-Z][a-z]+ [A-Z][a-z]+\\b', 
        replacement: '[NAME]' 
      }
    ];
    
    // High protection adds more rules
    if (protectionLevel === 'high' || protectionLevel === 'maximum') {
      rules.push(
        { 
          category: 'financial', 
          type: 'credit-card',
          regex: '\\b(?:\\d{4}[- ]?){3}\\d{4}\\b', 
          replacement: '[CREDIT_CARD]' 
        },
        { 
          category: 'personal', 
          type: 'dates',
          regex: '\\b(0?[1-9]|1[0-2])[\\/\\-](0?[1-9]|[12][0-9]|3[01])[\\/\\-](19|20)\\d{2}\\b', 
          replacement: '[DATE]' 
        },
        { 
          category: 'contact', 
          type: 'address',
          regex: '\\b\\d+\\s[A-Z][a-z]+\\s(St|Ave|Rd|Blvd|Dr|Ln|Ct|Way)(\\.|,)?\\s[A-Z][a-z]+,\\s[A-Z]{2}\\s\\d{5}\\b', 
          replacement: '[ADDRESS]' 
        },
        {
          category: 'personal',
          type: 'age',
          regex: '\\b(\\d{1,2}) years old\\b',
          replacement: '[AGE]'
        }
      );
    }
    
    // Maximum protection adds even more rules
    if (protectionLevel === 'maximum') {
      rules.push(
        {
          category: 'location',
          type: 'location',
          regex: '\\b[A-Z][a-z]+(,\\s[A-Z]{2})?\\b',
          replacement: '[LOCATION]'
        },
        {
          category: 'personal',
          type: 'gender',
          regex: '\\b(male|female|man|woman|boy|girl|non-binary|transgender)\\b',
          replacement: '[GENDER]'
        },
        {
          category: 'location',
          type: 'ip',
          regex: '\\b\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\b',
          replacement: '[IP_ADDRESS]'
        },
        {
          category: 'personal',
          type: 'job-title',
          regex: '\\b[A-Z][a-z]+ (Officer|Manager|Director|President|Specialist|Engineer|Architect|Analyst|Executive|Assistant)\\b',
          replacement: '[JOB_TITLE]'
        }
      );
    }
    
    // Add custom terms
    if (appState.customTerms && appState.customTerms.length > 0) {
      appState.customTerms.forEach(term => {
        if (term.term && term.term.trim()) {
          rules.push({
            category: 'custom',
            type: 'custom-term',
            pattern: term.term.trim(),
            replacement: term.replacement || '[CUSTOM]'
          });
        }
      });
    }
    
    // Process the redaction
    const result = processRedaction(text, rules, 'type-label');
    
    // Update UI
    updateRedactionResults(result);
    
    // Show success message
    updateUIStatus('success', 'Quick redaction complete! Ready for AI prompts.');
    
    // Show redaction details
    const redactionDetails = document.getElementById('redaction-details');
    if (redactionDetails) {
      redactionDetails.style.display = 'block';
    }
    
    // Add success animation to output
    const outputSection = document.querySelector('.text-output-section');
    if (outputSection) {
      outputSection.classList.add('pulse-success');
      // Remove animation class after it completes
      setTimeout(() => {
        outputSection.classList.remove('pulse-success');
      }, 1500);
    }
  } catch (error) {
    console.error('Quick redaction error:', error);
    updateUIStatus('error', `Failed to redact text: ${error.message}`);
  }
}

/**
 * Update the UI with redaction results
 * @param {Object} result - The redaction results
 */
function updateRedactionResults(result) {
  try {
    // Fallback defaults if results are missing properties
    const safeResult = {
      redactedText: result.redactedText || 'Error processing text',
      redactionCount: result.redactionCount || 0,
      categories: result.categories || [],
      protectionScore: result.protectionScore || 0,
      detailedRedactions: result.detailedRedactions || []
    };
    
    // Update app state
    appState.redactedText = safeResult.redactedText;
    appState.redactionResults.redactionCount = safeResult.redactionCount;
    appState.redactionResults.categories = safeResult.categories;
    appState.redactionResults.protectionScore = safeResult.protectionScore;
    appState.detailedRedactions = safeResult.detailedRedactions;
    
    // Update the redacted text area
    const redactedTextArea = document.getElementById('redacted-text');
    if (redactedTextArea) {
      redactedTextArea.value = safeResult.redactedText;
    }
    
    // Update summary stats - check elements exist first
    const totalRedactions = document.getElementById('total-redactions');
    if (totalRedactions) {
      totalRedactions.textContent = safeResult.redactionCount;
    }
    
    const protectedCategories = document.getElementById('protected-categories');
    if (protectedCategories) {
      protectedCategories.textContent = safeResult.categories.length;
    }
    
    const protectionScore = document.getElementById('protection-score');
    if (protectionScore) {
      protectionScore.textContent = `${safeResult.protectionScore}%`;
    }
    
    // Update redactions list
    updateRedactionsList(safeResult.detailedRedactions);
  } catch (error) {
    console.error('Error updating redaction results:', error);
  }
}

/**
 * Update the list of redactions in the details panel
 * @param {Array} redactions - The detailed redactions
 */
function updateRedactionsList(redactions) {
  const redactionsList = document.getElementById('redactions-list');
  if (!redactionsList) return;
  
  // Clear existing items
  redactionsList.innerHTML = '';
  
  // Check if we have redactions
  if (!redactions || redactions.length === 0) {
    const emptyItem = document.createElement('li');
    emptyItem.className = 'redaction-item-empty';
    emptyItem.textContent = 'No redactions to display';
    redactionsList.appendChild(emptyItem);
    return;
  }
  
  // Add each redaction to the list
  redactions.forEach((redaction, index) => {
    try {
      const item = document.createElement('li');
      item.className = 'redaction-item';
      item.dataset.index = index;
      
      const itemInfo = document.createElement('div');
      itemInfo.className = 'redaction-item-info';
      
      const typeSpan = document.createElement('span');
      typeSpan.className = 'redaction-type';
      const typeName = redaction.type ? 
        redaction.type.charAt(0).toUpperCase() + redaction.type.slice(1) : 
        'Unknown';
      typeSpan.textContent = typeName;
      
      const textSpan = document.createElement('span');
      textSpan.className = 'redaction-text';
      textSpan.textContent = redaction.originalText || '[Text unavailable]';
      
      itemInfo.appendChild(typeSpan);
      itemInfo.appendChild(textSpan);
      
      const itemActions = document.createElement('div');
      itemActions.className = 'redaction-item-actions';
      
      const restoreBtn = document.createElement('button');
      restoreBtn.className = 'restore-btn';
      restoreBtn.title = 'Restore';
      restoreBtn.textContent = 'Restore';
      restoreBtn.dataset.index = index;
      restoreBtn.addEventListener('click', () => restoreRedaction(index));
      
      itemActions.appendChild(restoreBtn);
      
      item.appendChild(itemInfo);
      item.appendChild(itemActions);
      
      redactionsList.appendChild(item);
    } catch (error) {
      console.error('Error creating redaction item:', error);
    }
  });
}

/**
 * Restore a redacted item
 * @param {number} index - The index of the redaction to restore
 */
function restoreRedaction(index) {
  try {
    const redaction = appState.detailedRedactions[index];
    if (!redaction) return;
    
    // Remove from the list of redactions
    appState.detailedRedactions.splice(index, 1);
    
    // Reapply all redactions from scratch on the original text
    const result = processAllRedactions();
    
    // Update UI
    updateRedactionResults(result);
    
    // Success message
    updateUIStatus('success', 'Redaction removed successfully');
  } catch (error) {
    console.error('Error restoring redaction:', error);
    updateUIStatus('error', 'Failed to restore redaction');
  }
}

/**
 * Process all redactions from scratch on original text
 * This is used when restoring a redaction
 */
function processAllRedactions() {
  try {
    const text = appState.pastedText;
    if (!text) {
      console.error('No original text to process');
      return {
        redactedText: '',
        redactionCount: 0,
        categories: [],
        protectionScore: 0,
        detailedRedactions: []
      };
    }
    
    const rules = appState.redactionRules;
    const style = appState.redactionStyle || 'type-label';
    
    return processRedaction(text, rules, style);
  } catch (error) {
    console.error('Error in processAllRedactions:', error);
    // Return empty results
    return {
      redactedText: appState.pastedText || '',
      redactionCount: 0,
      categories: [],
      protectionScore: 0,
      detailedRedactions: []
    };
  }
}

/**
 * Handle adding a custom term
 */
function addCustomTerm() {
  const termInput = document.getElementById('custom-term');
  const replacementInput = document.getElementById('custom-replacement');
  
  if (!termInput || !termInput.value.trim()) {
    updateUIStatus('error', 'Please enter a term to redact');
    return;
  }
  
  // Add to custom terms list
  appState.customTerms.push({
    term: termInput.value.trim(),
    replacement: replacementInput.value.trim() || null
  });
  
  // Update UI
  updateCustomTermsUI();
  
  // Close modal
  const modal = document.getElementById('custom-term-modal');
  if (modal) {
    modal.style.display = 'none';
    modal.classList.add('hidden');
  }
  
  // Clear inputs
  termInput.value = '';
  replacementInput.value = '';
  
  // Show success message
  updateUIStatus('success', 'Custom term added successfully');
}

/**
 * Update the custom terms UI
 */
function updateCustomTermsUI() {
  const termsList = document.getElementById('custom-terms-list');
  if (!termsList) return;
  
  // Clear existing items except the last one (which is the template)
  termsList.innerHTML = '';
  
  // Add each term to the list
  appState.customTerms.forEach((term, index) => {
    const termEntry = document.createElement('div');
    termEntry.className = 'custom-term-entry';
    
    const termInput = document.createElement('input');
    termInput.type = 'text';
    termInput.className = 'form-control custom-term-input';
    termInput.value = term.term;
    termInput.readOnly = true;
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-term-btn';
    removeBtn.textContent = '×';
    removeBtn.dataset.index = index;
    removeBtn.addEventListener('click', () => removeCustomTerm(index));
    
    termEntry.appendChild(termInput);
    termEntry.appendChild(removeBtn);
    
    termsList.appendChild(termEntry);
  });
  
  // Add an empty one at the end for adding new terms
  const newTermEntry = document.createElement('div');
  newTermEntry.className = 'custom-term-entry';
  
  const newTermInput = document.createElement('input');
  newTermInput.type = 'text';
  newTermInput.className = 'form-control custom-term-input';
  newTermInput.placeholder = 'Enter custom term';
  newTermInput.addEventListener('focus', () => {
    // Show the custom term modal when clicking this field
    const modal = document.getElementById('custom-term-modal');
    if (modal) {
      modal.style.display = 'flex';
      modal.classList.remove('hidden');
      document.getElementById('custom-term').focus();
    }
  });
  
  const newRemoveBtn = document.createElement('button');
  newRemoveBtn.className = 'remove-term-btn';
  newRemoveBtn.textContent = '×';
  newRemoveBtn.style.visibility = 'hidden';
  
  newTermEntry.appendChild(newTermInput);
  newTermEntry.appendChild(newRemoveBtn);
  
  termsList.appendChild(newTermEntry);
}

/**
 * Remove a custom term
 * @param {number} index - The index of the term to remove
 */
function removeCustomTerm(index) {
  if (index < 0 || index >= appState.customTerms.length) return;
  
  // Remove from array
  appState.customTerms.splice(index, 1);
  
  // Update UI
  updateCustomTermsUI();
  
  // Show success message
  updateUIStatus('success', 'Custom term removed');
}

/**
 * Copy redacted text to clipboard
 */
function copyRedactedTextToClipboard() {
  try {
    const redactedTextArea = document.getElementById('redacted-text');
    if (!redactedTextArea) {
      throw new Error('Redacted text area not found');
    }
    
    // Select the text
    redactedTextArea.select();
    redactedTextArea.setSelectionRange(0, 99999); // For mobile devices
    
    // Copy to clipboard
    document.execCommand('copy');
    
    // Deselect
    window.getSelection().removeAllRanges();
    
    // Show success message
    updateUIStatus('success', 'Redacted text copied to clipboard');
  } catch (error) {
    console.error('Copy to clipboard error:', error);
    
    // Fallback method
    try {
      if (appState.redactedText) {
        navigator.clipboard.writeText(appState.redactedText)
          .then(() => updateUIStatus('success', 'Redacted text copied to clipboard'))
          .catch(err => {
            updateUIStatus('error', `Failed to copy text: ${err.message}`);
          });
      }
    } catch (fallbackError) {
      updateUIStatus('error', 'Failed to copy text to clipboard');
    }
  }
}

/**
 * Load an example text for demonstration
 */
function loadExampleText() {
  const pasteTextArea = document.getElementById('paste-text');
  if (!pasteTextArea) return;
  
  const exampleText = `From: John Smith <john.smith@example.com>
Phone: (555) 123-4567
Address: 123 Main St, Anytown, CA 12345
Date of Birth: 04/15/1980

Dear Customer Support,

I'm writing regarding my account #98765432 and my recent purchase with credit card 4111-2222-3333-4444 on January 15, 2025.

I'm a 42 years old software engineer at TechCorp living in San Francisco, CA. I've been experiencing issues with my account that started on 12/20/2024.

Please contact me as soon as possible to resolve this matter.

Thanks,
John
SSN: 123-45-6789
IP: 192.168.1.1`;

  pasteTextArea.value = exampleText;
  
  // Show success message
  updateUIStatus('success', 'Example text loaded');
}

/**
 * Send redacted text to selected destination
 * @param {string} destination - The destination option (clipboard, claude, etc.)
 */
function sendToDestination(destination) {
  if (!appState.redactedText) {
    updateUIStatus('error', 'No redacted text available');
    return;
  }
  
  switch (destination) {
    case 'clipboard':
      copyRedactedTextToClipboard();
      break;
    case 'claude':
      updateUIStatus('info', 'Claude integration coming soon');
      // Here you would add code to send to Claude
      break;
    case 'chatgpt':
      updateUIStatus('info', 'ChatGPT integration coming soon');
      // Here you would add code to send to ChatGPT
      break;
    case 'gemini':
      updateUIStatus('info', 'Gemini integration coming soon');
      // Here you would add code to send to Gemini
      break;
    default:
      updateUIStatus('info', 'Copying to clipboard');
      copyRedactedTextToClipboard();
  }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  try {
    console.log('Starting application initialization...');
    initializeApp();
  } catch (error) {
    console.error('Failed to initialize application:', error);
    updateUIStatus('error', 'Failed to initialize the application. Check console for details.');
  }
});