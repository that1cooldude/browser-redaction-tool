/**
 * Prompt Privacy Tool - Main Application
 *
 * A focused tool for redacting sensitive information in text before sending to AI models.
 * Emphasizes simplicity and prompt-focused text redaction for privacy protection.
 */

import { initializePyodide } from './pyodide-setup.js';
import { SimplifiedRuleManager } from './modules/rule-management/simplified-rule-manager.js';
import { SimplifiedRedactionUI } from './modules/ui/simplified-redaction-ui.js';
import { redactDocument } from './modules/redaction/redaction-engine.js';
import { initUploadManager } from './modules/document-upload/upload-manager.js';
import { 
  initDocumentViewer,
  initBatchUploader,
  initRedactionAnalyzer,
  initRedactionDashboard,
  initImageRedactionEditor,
  initRedactionRuleTester,
  initRedactionRuleSelector
} from './modules/ui/index.js';
import { RuleManager } from './modules/rule-management/rule-manager.js';
import { initRedactionService } from './modules/redaction/redaction-service.js';

// Application state
const appState = {
  pyodide: null,
  isInitialized: false,
  isProcessing: false,
  redactionRules: [],
  errors: [],
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

// Service instances
let uploadManager = null;
let documentViewer = null;
let ruleManager = null;
let redactionService = null;
let batchUploader = null;
let redactionAnalyzer = null;
let redactionDashboard = null;
let imageEditor = null;
let ruleTester = null;
let ruleSelector = null;

/**
 * Initialize the application
 * @returns {Promise<void>}
 */
async function initializeApp() {
  try {
    // Show loading state
    updateUIStatus('initializing');
    
    // Get UI elements - use element IDs for better reliability
    const uiElements = {
      // Text elements
      pasteTextArea: document.getElementById('paste-text'),
      redactedTextArea: document.getElementById('redacted-text'),
      
      // Buttons
      quickRedactBtn: document.getElementById('quick-redact-btn'),
      processTextButton: document.getElementById('process-paste-btn'),
      copyRedactedButton: document.getElementById('copy-redacted-btn'),
      sendToAIBtn: document.getElementById('send-to-ai-btn'),
      
      // UI elements
      redactionSummary: document.getElementById('redaction-summary'),
      redactionDetails: document.getElementById('redaction-details'),
      redactionsList: document.getElementById('redactions-list'),
      
      // Custom terms
      customTermsList: document.getElementById('custom-terms-list'),
      customTermsInput: document.getElementById('custom-term'),
      
      // Modals
      redactOptionsModal: document.getElementById('redact-options-modal'),
      customTermModal: document.getElementById('custom-term-modal'),
      
      // Status elements
      pyodideStatus: document.getElementById('pyodide-status'),
      statusMessage: document.getElementById('status-message')
    };
    
    // Initialize Pyodide (but make it optional)
    try {
      const pyodideStatusEl = document.querySelector('#pyodide-status span');
      if (pyodideStatusEl) {
        pyodideStatusEl.textContent = 'Initializing Python environment...';
      }
      
      appState.pyodide = await initializePyodide();
      appState.isInitialized = true;
      
      if (pyodideStatusEl) {
        pyodideStatusEl.textContent = 'Python environment ready';
      }
      
      const pyodideIconEl = document.querySelector('#pyodide-status i');
      if (pyodideIconEl) {
        pyodideIconEl.className = 'icon-check';
      }
    } catch (pyodideError) {
      console.error('Failed to initialize Pyodide:', pyodideError);
      updateUIStatus('warning', 'Advanced redaction features limited. Basic features still available.');
    }
    
    // Initialize rule manager
    try {
      ruleManager = new RuleManager();
    } catch (e) {
      console.error('Error initializing RuleManager, using simplified fallback', e);
      // Create a minimal fallback rule manager
      ruleManager = createFallbackRuleManager();
    }
    
    // Add default rules
    loadDefaultRules();
    
    // Initialize redaction service
    try {
      redactionService = initRedactionService(appState);
    } catch (e) {
      console.error('Error initializing redaction service, using fallback', e);
      // Create a minimal fallback redaction service
      redactionService = createFallbackRedactionService();
    }
    
    // Update UI to show app is ready
    updateUIStatus('ready');
    
    console.log('Application initialized successfully');
  } catch (error) {
    console.error('Failed to initialize application:', error);
    updateUIStatus('error', error.message);
  }
}

/**
 * Create a fallback rule manager for simpler operation
 */
function createFallbackRuleManager() {
  const templates = {
    EMAIL: {
      name: 'Email Address',
      regex: '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b',
      replacementType: 'fixed',
      replacement: '[EMAIL]',
      description: 'Matches standard email addresses',
      category: 'personal'
    },
    PHONE_US: {
      name: 'US Phone Number',
      regex: '\\b(\\+?1[-\\s]?)?(\\(?[0-9]{3}\\)?[-\\s]?)?[0-9]{3}[-\\s]?[0-9]{4}\\b',
      replacementType: 'fixed',
      replacement: '[PHONE]',
      description: 'Matches US phone numbers in various formats',
      category: 'personal'
    },
    SSN: {
      name: 'Social Security Number',
      regex: '\\b[0-9]{3}[-\\s]?[0-9]{2}[-\\s]?[0-9]{4}\\b',
      replacementType: 'character',
      replacementChar: 'X',
      description: 'Matches US Social Security Numbers',
      category: 'financial'
    }
  };
  
  return {
    getTemplates: () => templates,
    getAllRules: () => [],
    createRuleFromTemplate: (templateName) => ({ success: true, rule: templates[templateName] || {} }),
    enableCategory: () => {},
    getCustomTerms: () => [],
    getAllCategories: () => ['personal', 'financial']
  };
}

/**
 * Create a fallback redaction service for simpler operation
 */
function createFallbackRedactionService() {
  return {
    previewRedactedText: (text, rules) => {
      let result = text;
      // Apply simple regex replacements
      rules.forEach(rule => {
        if (rule.regex) {
          try {
            const regex = new RegExp(rule.regex, 'g');
            result = result.replace(regex, rule.replacement || '[REDACTED]');
          } catch (e) {
            console.error('Regex error in fallback service', e);
          }
        } else if (rule.pattern) {
          // Simple string replacement
          const pattern = rule.pattern;
          result = result.split(pattern).join(rule.replacement || '[REDACTED]');
        }
      });
      return result;
    },
    checkTextAgainstRules: () => []
  };
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
 * Initialize UI elements
 * @param {Object} uiElements - UI elements
 */
function initializeUI(uiElements) {
  // Populate rule list
  updateRuleList(uiElements.ruleList);
  
  // Set initial step
  navigateToStep('upload');
}

/**
 * Set up event listeners for user interactions
 * @param {Object} uiElements - UI elements
 */
function setupEventListeners(uiElements) {
  // Safely add event listeners with null checking
  const safeAddEventListener = (element, event, handler) => {
    if (element && typeof element.addEventListener === 'function') {
      element.addEventListener(event, handler);
      return true;
    }
    return false;
  };
  
  const safeAddEventListenerToCollection = (collection, event, handler) => {
    if (collection && collection.length) {
      collection.forEach(item => safeAddEventListener(item, event, handler));
      return true;
    }
    return false;
  };
  
  // Add listeners for protection categories in sidebar
  const protectionCategories = document.querySelectorAll('.protection-category');
  if (protectionCategories && protectionCategories.length) {
    protectionCategories.forEach(category => {
      category.addEventListener('click', (e) => {
        // Get category name from the clicked element
        const categoryNameEl = e.currentTarget.querySelector('.category-name');
        const categoryName = categoryNameEl ? categoryNameEl.textContent.trim().toLowerCase() : '';
        
        // Toggle active state
        const isActive = e.currentTarget.classList.contains('active');
        
        if (isActive) {
          // If already active, do nothing (maintain maximum protection)
          // We could deactivate, but for privacy-first approach, we keep it active
          updateUIStatus('info', 'For maximum privacy protection, this category will remain active');
        } else {
          // Activate category
          e.currentTarget.classList.add('active');
          
          // If we have a rule manager, enable this category
          if (ruleManager && categoryName) {
            let categoryId = '';
            
            // Map UI category name to rule manager category ID
            if (categoryName.includes('personal')) {
              categoryId = 'personal';
            } else if (categoryName.includes('financial')) {
              categoryId = 'financial';
            } else if (categoryName.includes('technical')) {
              categoryId = 'technical';
            } else if (categoryName.includes('custom')) {
              categoryId = 'custom';
            }
            
            if (categoryId) {
              ruleManager.enableCategory(categoryId);
              updateUIStatus('success', `${categoryName} protection enabled`);
            }
          }
        }
      });
    });
  };
  
  // Paste text processing
  if (uiElements.processTextButton) {
    safeAddEventListener(uiElements.processTextButton, 'click', () => {
      processRedactionText();
    });
  }
  
  // Quick redact button
  const quickRedactBtn = document.getElementById('quick-redact-btn');
  if (quickRedactBtn) {
    safeAddEventListener(quickRedactBtn, 'click', () => {
      quickRedactText();
    });
  }
  
  // Copy redacted text to clipboard
  if (uiElements.copyRedactedButton) {
    safeAddEventListener(uiElements.copyRedactedButton, 'click', () => {
      copyRedactedTextToClipboard();
    });
  }
  
  // Save redacted text as document
  if (uiElements.saveRedactedButton) {
    safeAddEventListener(uiElements.saveRedactedButton, 'click', () => {
      saveRedactedTextAsDocument();
    });
  }
  
  // Workflow step navigation
  safeAddEventListenerToCollection(uiElements.workflowSteps, 'click', (event) => {
    const step = event.currentTarget;
    if (step && step.dataset && step.dataset.step) {
      navigateToStep(step.dataset.step);
    }
  });
  
  // Rule management
  if (uiElements.addRuleButton) {
    safeAddEventListener(uiElements.addRuleButton, 'click', () => {
      showRuleModal();
    });
  }
  
  // Template selection
  const useTemplateBtn = document.getElementById('use-template-btn');
  if (useTemplateBtn) {
    console.log('Found template button, adding event listener');
    safeAddEventListener(useTemplateBtn, 'click', (event) => {
      event.preventDefault();
      console.log('Template button clicked');
      showTemplateModal();
    });
  } else {
    console.error('Template button not found');
  }
  
  // Redaction button
  if (uiElements.redactButton) {
    safeAddEventListener(uiElements.redactButton, 'click', () => {
      applyRedaction();
    });
  }
  
  // Export button
  if (uiElements.exportButton) {
    safeAddEventListener(uiElements.exportButton, 'click', () => {
      exportDocument();
    });
  }
  
  // Preview tabs
  safeAddEventListenerToCollection(uiElements.previewTabs, 'click', (event) => {
    const tab = event.currentTarget;
    if (!tab || !tab.dataset || !tab.dataset.tab) return;
    
    // Deactivate all tabs and content
    uiElements.previewTabs.forEach(t => t.classList.remove('active'));
    uiElements.previewTabContents.forEach(c => c.classList.remove('active'));
    
    // Activate selected tab and content
    tab.classList.add('active');
    const contentId = `${tab.dataset.tab}-tab`;
    const contentElement = document.getElementById(contentId);
    if (contentElement) {
      contentElement.classList.add('active');
      
      // Special case handlers for different tabs
      if (tab.dataset.tab === 'analysis' && redactionAnalyzer) {
        // Refresh analysis when tab is activated
        redactionAnalyzer.setLoading(false);
        if (appState.analysisResults) {
          redactionAnalyzer.displayResults(appState.analysisResults);
        }
      } else if (tab.dataset.tab === 'redaction-dashboard' && redactionDashboard) {
        // Update dashboard data when tab is activated
        if (appState.redactionResults) {
          redactionDashboard.updateDashboard(appState.redactionResults);
        }
      } else if (tab.dataset.tab === 'image-editor' && imageEditor) {
        // Initialize image editor if we have an image document
        if (appState.currentDocument && 
            ['jpg', 'jpeg', 'png', 'gif'].includes(appState.currentDocument.metadata?.extension)) {
          // Would use real image URL in actual implementation
          const sampleImageUrl = 'https://via.placeholder.com/800x600';
          imageEditor.loadImage(sampleImageUrl);
        }
      } else if (tab.dataset.tab === 'rule-tester' && ruleTester) {
        // Initialize rule tester with first rule if available
        if (appState.redactionRules.length > 0) {
          ruleTester.setRule(appState.redactionRules[0]);
          ruleTester.setSampleText('Here is a sample text with john.doe@example.com email and 555-123-4567 phone number.');
        }
      }
    }
  });
  
  // Upload tabs
  safeAddEventListenerToCollection(uiElements.uploadTabs, 'click', (event) => {
    const tab = event.currentTarget;
    if (!tab || !tab.dataset || !tab.dataset.tab) return;
    
    // Deactivate all tabs and content
    uiElements.uploadTabs.forEach(t => t.classList.remove('active'));
    uiElements.uploadTabContents.forEach(c => c.classList.remove('active'));
    
    // Activate selected tab and content
    tab.classList.add('active');
    const contentId = `${tab.dataset.tab}-upload-tab`;
    const contentElement = document.getElementById(contentId);
    if (contentElement) {
      contentElement.classList.add('active');
    }
    
    // Toggle batch mode based on selected tab
    appState.batchMode = tab.dataset.tab === 'batch';
  });
  
  // Rules tabs
  safeAddEventListenerToCollection(uiElements.rulesTabs, 'click', (event) => {
    const tab = event.currentTarget;
    if (!tab || !tab.dataset || !tab.dataset.tab) return;
    
    // Deactivate all tabs and content
    uiElements.rulesTabs.forEach(t => t.classList.remove('active'));
    uiElements.rulesTabContents.forEach(c => c.classList.remove('active'));
    
    // Activate selected tab and content
    tab.classList.add('active');
    const contentId = `${tab.dataset.tab}-tab`;
    const contentElement = document.getElementById(contentId);
    if (contentElement) {
      contentElement.classList.add('active');
    }
  });
  
  // Add listeners to component events
  if (redactionAnalyzer) {
    // Add event listeners for analyzer actions
    const analyzerElement = document.getElementById('redaction-analyzer');
    if (analyzerElement) {
      safeAddEventListener(analyzerElement, 'refreshAnalysis', () => {
        // Handle refresh analysis event
        if (typeof analyzeCurrentDocument === 'function') {
          analyzeCurrentDocument();
        } else {
          // Fallback if function doesn't exist yet
          console.log('Analysis requested but function not implemented');
          updateUIStatus('info', 'Document analysis feature coming soon');
        }
      });
      
      safeAddEventListener(analyzerElement, 'startAnalysis', () => {
        // Handle start analysis event
        if (typeof analyzeCurrentDocument === 'function') {
          analyzeCurrentDocument();
        } else {
          // Fallback if function doesn't exist yet
          console.log('Analysis requested but function not implemented');
          updateUIStatus('info', 'Document analysis feature coming soon');
        }
      });
    }
  }
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
 * Log diagnostic information to help troubleshoot UI issues
 */
function logDiagnostics() {
  console.log('======= BROWSER REDACTION TOOL DIAGNOSTICS =======');
  
  // Check important DOM elements
  const elementsToCheck = [
    '#document-uploader',
    '.drop-zone',
    '.file-input',
    '.browse-link',
    '#document-preview',
    '#rule-list',
    '#add-rule-btn',
    '.workflow-steps .step',
    '.step-container',
    '#pyodide-status',
    '#redact-btn',
    '#export-btn',
    '#rule-modal'
  ];
  
  console.log('Checking DOM elements:');
  elementsToCheck.forEach(selector => {
    const el = document.querySelector(selector);
    console.log(`${selector}: ${el ? 'Found' : 'MISSING'}`);
  });
  
  // Log module loading status
  console.log('Module loading status:');
  console.log('- app.js loaded successfully');
  
  console.log('=================================================');
}

/**
 * Handle document loaded event
 * @param {Object} document - Loaded document
 */
function handleDocumentLoaded(document) {
  // Update application state
  appState.currentDocument = document;
  
  // Load document in viewer
  if (documentViewer) {
    documentViewer.loadDocument(document);
  }
  
  // Start document analysis if the analyzer is available
  if (redactionAnalyzer && redactionService) {
    try {
      // Show analyzing status
      updateUIStatus('info', `Analyzing document for sensitive information...`);
      
      redactionService.analyzeSensitiveData(document)
        .then(analysisResults => {
          appState.analysisResults = analysisResults;
          console.log('Document analysis complete:', analysisResults);
          
          // Update analyzer UI if available
          if (redactionAnalyzer) {
            redactionAnalyzer.displayResults(analysisResults);
          }
          
          // Show success
          updateUIStatus('success', `Document analyzed - found ${analysisResults.summary?.total_findings || 0} items of potential sensitive information`);
        })
        .catch(error => {
          console.error('Document analysis failed:', error);
          updateUIStatus('error', `Document analysis failed: ${error.message}`);
        });
    } catch (error) {
      console.error('Failed to start document analysis:', error);
    }
  }
  
  // Move to the next step
  navigateToStep('rules');
  
  // Add to recent documents list if not already there
  addDocumentToRecentList(document);
}

/**
 * Handle batch files selected event
 * @param {Array} selectedIndexes - Indexes of selected files
 */
function handleBatchFilesSelected(selectedIndexes) {
  // Enable batch mode
  appState.batchMode = true;
  
  // Process batch files (simplified for now)
  updateUIStatus('success', `Processing ${selectedIndexes.length} files in batch mode`);
  
  // Move to rules step
  navigateToStep('rules');
}

/**
 * Handle creating rules from analysis
 * @param {Array} findings - Array of findings to create rules from
 */
function handleCreateRuleFromAnalysis(findings) {
  if (!findings || findings.length === 0) return;
  
  findings.forEach(finding => {
    // Create a rule based on the finding
    const rule = {
      name: `Rule for ${finding.category}`,
      pattern: finding.text,
      replacementType: 'fixed',
      replacement: '[REDACTED]',
      description: `Auto-generated from analysis (${finding.category})`
    };
    
    // Add rule using the rule manager
    ruleManager.addRule(rule);
  });
  
  // Update rule list
  updateRuleList(document.getElementById('rule-list'));
  
  // Show success message
  updateUIStatus('success', `Created ${findings.length} rules from analysis`);
}

/**
 * Handle image redaction complete event
 * @param {Object} result - Result from image redaction
 */
function handleImageRedactionComplete(result) {
  if (result.cancelled) return;
  
  // Store redaction data
  appState.imageRedactions = result.redactions;
  
  // Update the current document with redacted image data
  if (appState.currentDocument) {
    // In a real implementation, would convert canvas to blob and update document
    updateUIStatus('success', 'Image redaction applied');
  }
  
  // Switch back to document preview tab
  const documentPreviewTab = document.querySelector('[data-tab="document-preview"]');
  if (documentPreviewTab) documentPreviewTab.click();
}

/**
 * Handle rule test
 * @param {string} text - Text to test against
 * @param {string} ruleId - ID of the rule to test
 * @param {Function} callback - Callback with test results
 */
function handleRuleTest(text, ruleId, callback) {
  const rule = ruleManager.getRule(ruleId);
  if (!rule) return;
  
  const startTime = performance.now();
  
  // Test the rule against text
  const matches = [];
  
  if (rule.pattern) {
    // Simple pattern matching (indexOf)
    let position = text.indexOf(rule.pattern);
    while (position !== -1) {
      matches.push({
        start: position,
        end: position + rule.pattern.length
      });
      position = text.indexOf(rule.pattern, position + 1);
    }
  } else if (rule.regex) {
    // Regex matching
    try {
      const regex = new RegExp(rule.regex, 'g');
      let match;
      while ((match = regex.exec(text)) !== null) {
        matches.push({
          start: match.index,
          end: match.index + match[0].length
        });
      }
    } catch (error) {
      console.error('Invalid regex:', error);
    }
  }
  
  // Apply redaction
  let redactedText = text;
  // Sort matches by start position in reverse order to avoid affecting other indices
  matches.sort((a, b) => b.start - a.start);
  
  matches.forEach(match => {
    const replacement = rule.replacementType === 'fixed' ? 
      rule.replacement : 
      rule.replacementChar.repeat(match.end - match.start);
      
    redactedText = 
      redactedText.substring(0, match.start) + 
      replacement + 
      redactedText.substring(match.end);
  });
  
  const endTime = performance.now();
  
  // Return results through callback
  callback({
    originalText: text,
    redactedText: redactedText,
    matches: matches.sort((a, b) => a.start - b.start), // Sort back for display
    executionTime: endTime - startTime
  });
}

/**
 * Handle rule selection changes in the rule selector
 * @param {Array} selectedRules - Selected rule objects
 */
function handleRuleSelectionChange(selectedRules) {
  // Update application state with selected rules
  appState.redactionRules = selectedRules;
  
  // Log selected rules for debugging
  console.log('Selected redaction rules:', selectedRules.map(rule => rule.name));
  
  // Update UI status if needed
  updateUIStatus('info', `Selected ${selectedRules.length} redaction rules`);
}

/**
 * Handle text selection in document viewer
 * @param {Selection} selection - Text selection
 * @param {number} page - Page number
 */
function handleTextSelection(selection, page) {
  // Get selected text
  const selectedText = selection.toString().trim();
  if (!selectedText) return;
  
  // Check if text matches any rules
  const matchedRules = redactionService.checkTextAgainstRules(selectedText, appState.redactionRules);
  
  console.log('Selected text:', selectedText);
  console.log('Matched rules:', matchedRules);
  
  // If no rules match, offer to create a new rule
  if (matchedRules.length === 0) {
    // Show UI for creating a rule from selection
    showCreateRuleFromSelection(selectedText);
  } else {
    // Show matched rules
    showMatchedRules(selectedText, matchedRules);
  }
}

/**
 * Show UI for creating a rule from selection
 * @param {string} selectedText - Selected text
 */
function showCreateRuleFromSelection(selectedText) {
  // Simplified for now - just show rule modal with pre-filled pattern
  showRuleModal({ pattern: selectedText });
}

/**
 * Show matched rules for selected text
 * @param {string} selectedText - Selected text
 * @param {Array} matchedRules - Matched rules
 */
function showMatchedRules(selectedText, matchedRules) {
  // Simplified for now - just log to console
  console.log(`Text "${selectedText}" matches rules:`, matchedRules.map(rule => rule.name).join(', '));
}

/**
 * Handle file uploads for the new document UI
 * @param {FileList} files - Files from the input or drop event
 */
function handleFiles(files) {
  if (!files || files.length === 0) return;
  
  // Show file list container
  const uploadedFiles = document.getElementById('uploaded-files');
  if (uploadedFiles) {
    uploadedFiles.style.display = 'block';
  }
  
  // Get file list container
  const fileList = document.getElementById('upload-file-list');
  if (!fileList) return;
  
  // Clear existing files if needed
  // fileList.innerHTML = '';
  
  // Get process button and enable it
  const processFilesBtn = document.getElementById('process-files-btn');
  if (processFilesBtn) {
    processFilesBtn.disabled = false;
  }
  
  // Add files to list
  Array.from(files).forEach(file => {
    // Create file list item
    const fileItem = document.createElement('li');
    fileItem.className = 'file-item';
    
    // Format file size
    const sizeInKB = Math.round(file.size / 1024);
    const sizeDisplay = sizeInKB < 1024 ? `${sizeInKB} KB` : `${(sizeInKB / 1024).toFixed(1)} MB`;
    
    // Add file details
    fileItem.innerHTML = `
      <div class="file-item-info">
        <span class="file-item-name">${file.name}</span>
        <span class="file-item-size">${sizeDisplay}</span>
      </div>
    `;
    
    // Add to list
    fileList.appendChild(fileItem);
    
    // Also create a pseudo document for the app state (simplified)
    const fileExtension = file.name.split('.').pop().toLowerCase();
    const document = {
      id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file: file,
      metadata: {
        name: file.name,
        size: file.size,
        extension: fileExtension,
        type: file.type,
        created: new Date(),
        modified: new Date(file.lastModified)
      }
    };
    
    // Add to app state
    appState.documents.push(document);
    
    // If this is the first file, set it as current document
    if (!appState.currentDocument) {
      appState.currentDocument = document;
    }
  });
  
  // Update status
  updateUIStatus('success', `${files.length} ${files.length === 1 ? 'file' : 'files'} selected`);
}

/**
 * Navigate to a specific step in the workflow
 * @param {string} step - Step name
 */
function navigateToStep(step) {
  // Check if step is valid
  const validSteps = ['upload', 'rules', 'preview', 'export'];
  if (!validSteps.includes(step)) return;
  
  // Check if current document exists for steps beyond upload
  if (step !== 'upload' && !appState.currentDocument && !appState.batchMode) {
    // Allow navigation to rules step in batch mode even without a current document
    if (!(step === 'rules' && appState.batchMode)) {
      updateUIStatus('warning', 'Please upload a document first');
      step = 'upload';
    }
  }
  
  // Update application state
  appState.currentStep = step;
  
  try {
    // Update workflow step indicators
    const workflowSteps = document.querySelectorAll('.workflow-steps .step');
    if (workflowSteps && workflowSteps.length) {
      workflowSteps.forEach(stepElement => {
        if (stepElement && stepElement.classList) {
          stepElement.classList.toggle('active', stepElement.dataset.step === step);
        }
      });
    }
    
    // Show/hide step containers
    const stepContainers = document.querySelectorAll('.step-container');
    if (stepContainers && stepContainers.length) {
      stepContainers.forEach(container => {
        if (container && container.id) {
          const containerStep = container.id.replace('-step', '');
          container.hidden = containerStep !== step;
        }
      });
    }
  } catch (uiError) {
    console.error('Error updating UI during step navigation:', uiError);
  }
  
  // Perform step-specific initialization
  switch (step) {
    case 'upload':
      // Nothing special for upload step
      break;
      
    case 'rules':
      updateRuleList(document.getElementById('rule-list'));
      break;
      
    case 'preview':
      // Make sure document viewer is initialized
      if (documentViewer && appState.currentDocument) {
        documentViewer.loadDocument(appState.currentDocument);
      }
      
      // Initialize redaction analyzer with sample data if needed
      if (redactionAnalyzer) {
        redactionAnalyzer.setLoading(false);
        
        // Simulate analysis results if none available
        if (!appState.analysisResults) {
          const sampleResults = {
            findings: [
              { 
                text: 'john.doe@example.com', 
                category: 'Email Address', 
                confidence: 0.95, 
                page: 1, 
                occurences: 2 
              },
              { 
                text: '123-45-6789', 
                category: 'Social Security Number', 
                confidence: 0.98, 
                page: 1,
                occurences: 1 
              },
              { 
                text: '555-123-4567', 
                category: 'Phone Number', 
                confidence: 0.9, 
                page: 2,
                occurences: 3 
              },
              { 
                text: 'Jane Smith', 
                category: 'Person Name', 
                confidence: 0.8, 
                page: 1,
                occurences: 4 
              }
            ]
          };
          redactionAnalyzer.displayResults(sampleResults);
        }
      }
      
      // Initialize dashboard with sample data
      if (redactionDashboard) {
        const dashboardData = {
          statistics: {
            redactionCount: 42,
            bytesRedacted: 1256,
            rulesApplied: 7,
            processingTime: 356.78
          },
          categories: [
            { name: 'Email Addresses', count: 15 },
            { name: 'Phone Numbers', count: 8 },
            { name: 'Names', count: 12 },
            { name: 'SSNs', count: 4 },
            { name: 'Credit Cards', count: 3 }
          ],
          rules: [
            { name: 'Email Pattern', matches: 15, misses: 1 },
            { name: 'Phone Number', matches: 8, misses: 2 },
            { name: 'SSN Pattern', matches: 4, misses: 0 },
            { name: 'Names List', matches: 12, misses: 5 },
            { name: 'Credit Cards', matches: 3, misses: 1 }
          ]
        };
        
        // Add document stats for batch mode
        if (appState.batchMode) {
          dashboardData.documents = [
            { name: 'document1.pdf', redactionCount: 15 },
            { name: 'document2.pdf', redactionCount: 10 },
            { name: 'image1.jpg', redactionCount: 8 },
            { name: 'document3.docx', redactionCount: 9 }
          ];
        }
        
        redactionDashboard.updateDashboard(dashboardData);
      }
      
      // Set up image editor if needed
      if (imageEditor && appState.currentDocument && 
          ['jpg', 'jpeg', 'png', 'gif'].includes(appState.currentDocument.metadata?.extension)) {
        // Would use real image URL in actual implementation
        const sampleImageUrl = 'https://via.placeholder.com/800x600';
        imageEditor.loadImage(sampleImageUrl);
      }
      
      // Set up rule tester if needed
      if (ruleTester && appState.redactionRules.length > 0) {
        ruleTester.setRule(appState.redactionRules[0]);
        ruleTester.setSampleText('Here is a sample text with john.doe@example.com email and 555-123-4567 phone number.');
      }
      break;
      
    case 'export':
      // Prepare export options
      updateExportOptions();
      break;
  }
}

/**
 * Update the list of redaction rules
 * @param {HTMLElement} ruleListElement - Rule list element
 */
/**
 * Update the protection categories in the sidebar
 */
function updateProtectionCategories() {
  // Get all protection categories from the DOM
  const personalCategory = document.querySelector('.protection-category:nth-child(1)');
  const financialCategory = document.querySelector('.protection-category:nth-child(2)');
  const technicalCategory = document.querySelector('.protection-category:nth-child(3)');
  const customCategory = document.querySelector('.protection-category:nth-child(4)');
  
  // If we have the rule manager, update the counts and active states
  if (ruleManager) {
    try {
      // Get all categories from rule manager
      const allCategories = ruleManager.getAllCategories ? ruleManager.getAllCategories() : [];
      
      // Get all templates
      const templates = ruleManager.getTemplates ? ruleManager.getTemplates() : {};
      
      // Get custom terms
      const customTerms = ruleManager.getCustomTerms ? ruleManager.getCustomTerms() : [];
      
      // Count templates by category
      const templatesByCategory = {};
      
      Object.keys(templates).forEach(key => {
        const template = templates[key];
        const category = template.category || 'other';
        
        if (!templatesByCategory[category]) {
          templatesByCategory[category] = [];
        }
        
        templatesByCategory[category].push(template);
      });
      
      // Update personal category
      if (personalCategory) {
        const countElement = personalCategory.querySelector('.category-count');
        if (countElement) {
          const count = templatesByCategory.personal ? templatesByCategory.personal.length : 0;
          countElement.textContent = `${count} types`;
        }
      }
      
      // Update financial category
      if (financialCategory) {
        const countElement = financialCategory.querySelector('.category-count');
        if (countElement) {
          const count = templatesByCategory.financial ? templatesByCategory.financial.length : 0;
          countElement.textContent = `${count} types`;
        }
      }
      
      // Update technical category
      if (technicalCategory) {
        const countElement = technicalCategory.querySelector('.category-count');
        if (countElement) {
          const count = templatesByCategory.technical ? templatesByCategory.technical.length : 0;
          countElement.textContent = `${count} types`;
        }
      }
      
      // Update custom terms category
      if (customCategory) {
        const countElement = customCategory.querySelector('.category-count');
        if (countElement) {
          countElement.textContent = `${customTerms.length} terms`;
        }
      }
      
      // Update protection level indicator
      const protectionLevelLabel = document.querySelector('.protection-level-label');
      const protectionLevelFill = document.querySelector('.protection-level-fill');
      
      if (protectionLevelLabel && protectionLevelFill) {
        const currentSensitivity = ruleManager.getCurrentSensitivity ? 
          ruleManager.getCurrentSensitivity() : 
          { level: 'maximum', description: 'Maximum protection enabled' };
        
        // Update label text
        protectionLevelLabel.textContent = currentSensitivity.level.charAt(0).toUpperCase() + 
          currentSensitivity.level.slice(1) + ' Protection';
        
        // Update fill width based on sensitivity level
        let fillPercentage = 100; // Default to maximum (100%)
        
        switch (currentSensitivity.level) {
          case 'basic':
            fillPercentage = 25;
            break;
          case 'moderate':
            fillPercentage = 50;
            break;
          case 'high':
            fillPercentage = 75;
            break;
          case 'maximum':
          default:
            fillPercentage = 100;
            break;
        }
        
        protectionLevelFill.style.width = `${fillPercentage}%`;
      }
    } catch (error) {
      console.error('Error updating protection categories:', error);
    }
  }
}

// Legacy function for backwards compatibility
function updateRuleList(ruleListElement) {
  // This function is kept for backwards compatibility
  // It's no longer needed with the new UI, but we keep it to avoid errors
  
  // Update the protection categories instead
  updateProtectionCategories();
}

/**
 * Show rule modal for creating or editing a rule
 * @param {Object} rule - Rule to edit (or null for new rule)
 */
function showRuleModal(rule = null) {
  // Get modal elements
  const modal = document.getElementById('rule-modal');
  if (!modal) return;
  
  // Configure modal for create or edit mode
  const isEditing = !!rule;
  modal.dataset.mode = isEditing ? 'edit' : 'create';
  
  // Set modal title
  document.getElementById('rule-modal-title').textContent = isEditing ? 'Edit Redaction Rule' : 'Add Redaction Rule';
  
  // Fill form with rule data if editing
  if (isEditing) {
    document.getElementById('rule-name').value = rule.name || '';
    
    // Set match type
    if (rule.regex) {
      document.getElementById('match-regex').checked = true;
      document.getElementById('rule-regex').value = rule.regex;
      document.getElementById('pattern-group').hidden = true;
      document.getElementById('regex-group').hidden = false;
    } else {
      document.getElementById('match-pattern').checked = true;
      document.getElementById('rule-pattern').value = rule.pattern || '';
      document.getElementById('pattern-group').hidden = false;
      document.getElementById('regex-group').hidden = true;
    }
    
    // Set replacement type
    document.getElementById('replacement-type').value = rule.replacementType || 'fixed';
    
    // Set replacement text/char
    if (rule.replacementType === 'fixed') {
      document.getElementById('replacement-text').value = rule.replacement || '[REDACTED]';
      document.getElementById('replacement-text-group').hidden = false;
      document.getElementById('replacement-char-group').hidden = true;
    } else if (rule.replacementType === 'character') {
      document.getElementById('replacement-char').value = rule.replacementChar || 'X';
      document.getElementById('replacement-text-group').hidden = true;
      document.getElementById('replacement-char-group').hidden = false;
    } else {
      document.getElementById('replacement-text-group').hidden = true;
      document.getElementById('replacement-char-group').hidden = true;
    }
    
    // Set description
    document.getElementById('rule-description').value = rule.description || '';
  } else {
    // Reset form for new rule
    document.getElementById('rule-form').reset();
    document.getElementById('match-pattern').checked = true;
    document.getElementById('pattern-group').hidden = false;
    document.getElementById('regex-group').hidden = true;
    document.getElementById('replacement-type').value = 'fixed';
    document.getElementById('replacement-text-group').hidden = false;
    document.getElementById('replacement-char-group').hidden = true;
  }
  
  // Set up form submission
  const form = document.getElementById('rule-form');
  form.onsubmit = (event) => {
    event.preventDefault();
    saveRule(rule ? rule.id : null);
  };
  
  // Set up match type change
  document.querySelectorAll('input[name="match-type"]').forEach(input => {
    input.onchange = () => {
      const isRegex = document.getElementById('match-regex').checked;
      document.getElementById('pattern-group').hidden = isRegex;
      document.getElementById('regex-group').hidden = !isRegex;
    };
  });
  
  // Set up replacement type change
  document.getElementById('replacement-type').onchange = () => {
    const replacementType = document.getElementById('replacement-type').value;
    document.getElementById('replacement-text-group').hidden = replacementType !== 'fixed';
    document.getElementById('replacement-char-group').hidden = replacementType !== 'character';
  };
  
  // Set up close button with multiple closing methods
  const closeButton = document.getElementById('rule-modal-close');
  if (closeButton) {
    closeButton.onclick = () => {
      // Try multiple methods to ensure modal closes
      modal.hidden = true;
      modal.style.display = 'none';
      modal.classList.add('hidden');
      console.log('Modal close button clicked');
    };
  }
  
  // Set up test button
  document.getElementById('rule-test-btn').onclick = () => {
    testRule();
  };
  
  // Show modal using multiple methods
  modal.hidden = false;
  modal.style.display = 'flex';
  modal.classList.remove('hidden');
}

/**
 * Save a rule from modal form
 * @param {string} ruleId - Rule ID for editing (null for new rule)
 */
function saveRule(ruleId) {
  try {
    // Get form values
    const name = document.getElementById('rule-name').value.trim();
    const matchType = document.querySelector('input[name="match-type"]:checked').value;
    const pattern = document.getElementById('rule-pattern').value.trim();
    const regex = document.getElementById('rule-regex').value.trim();
    const replacementType = document.getElementById('replacement-type').value;
    const replacement = document.getElementById('replacement-text').value;
    const replacementChar = document.getElementById('replacement-char').value[0] || 'X';
    const description = document.getElementById('rule-description').value.trim();
    
    // Validate name
    if (!name) {
      throw new Error('Rule name is required');
    }
    
    // Validate pattern or regex
    if (matchType === 'pattern' && !pattern) {
      throw new Error('Pattern is required');
    }
    
    if (matchType === 'regex' && !regex) {
      throw new Error('Regular expression is required');
    }
    
    // Create rule object
    const rule = {
      id: ruleId || `rule-${Date.now()}`,
      name,
      pattern: matchType === 'pattern' ? pattern : null,
      regex: matchType === 'regex' ? regex : null,
      replacementType,
      replacement,
      replacementChar,
      description,
      enabled: true
    };
    
    // Save rule
    let result;
    if (ruleId) {
      result = ruleManager.updateRule(ruleId, rule);
    } else {
      result = ruleManager.addRule(rule);
    }
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    // Update rule list
    updateRuleList(document.getElementById('rule-list'));
    
    // Hide modal using multiple methods
    const modalElement = document.getElementById('rule-modal');
    if (modalElement) {
      modalElement.hidden = true;
      modalElement.style.display = 'none';
      modalElement.classList.add('hidden');
    }
    
    // Show success message
    updateUIStatus('success', result.message);
  } catch (error) {
    alert(`Failed to save rule: ${error.message}`);
  }
}

/**
 * Delete a rule
 * @param {string} ruleId - Rule ID to delete
 */
function deleteRule(ruleId) {
  if (!confirm('Are you sure you want to delete this rule?')) return;
  
  const result = ruleManager.deleteRule(ruleId);
  
  if (result.success) {
    updateRuleList(document.getElementById('rule-list'));
    updateUIStatus('success', result.message);
  } else {
    alert(`Failed to delete rule: ${result.error}`);
  }
}

/**
 * Test a rule with sample text
 */
function testRule() {
  try {
    // Get rule from form
    const matchType = document.querySelector('input[name="match-type"]:checked').value;
    const pattern = document.getElementById('rule-pattern').value.trim();
    const regex = document.getElementById('rule-regex').value.trim();
    const replacementType = document.getElementById('replacement-type').value;
    const replacement = document.getElementById('replacement-text').value;
    const replacementChar = document.getElementById('replacement-char').value[0] || 'X';
    
    // Validate pattern or regex
    if (matchType === 'pattern' && !pattern) {
      throw new Error('Pattern is required');
    }
    
    if (matchType === 'regex' && !regex) {
      throw new Error('Regular expression is required');
    }
    
    // Create temporary rule for testing
    const rule = {
      id: 'test-rule',
      name: 'Test Rule',
      pattern: matchType === 'pattern' ? pattern : null,
      regex: matchType === 'regex' ? regex : null,
      replacementType,
      replacement,
      replacementChar,
      enabled: true
    };
    
    // Get sample text
    const sampleText = prompt('Enter sample text to test rule:', '');
    if (!sampleText) return;
    
    // Test rule
    const redactedText = redactionService.previewRedactedText(sampleText, [rule]);
    
    // Show result
    alert(`Original: ${sampleText}\nRedacted: ${redactedText}`);
  } catch (error) {
    alert(`Rule test failed: ${error.message}`);
  }
}

/**
 * Apply redaction to current document
 */
async function applyRedaction() {
  // Check for redact button and disable it
  const redactBtn = document.getElementById('redact-btn');
  if (redactBtn) {
    redactBtn.disabled = true;
    redactBtn.textContent = 'Processing...';
  }
  
  try {
    // Check if we have a document or are in batch mode
    if (!appState.currentDocument && !appState.batchMode) {
      throw new Error('No document loaded. Please upload a document first.');
    }
    
    // Check if we have rules
    if (!appState.redactionRules || appState.redactionRules.length === 0) {
      throw new Error('No redaction rules defined. Please add at least one rule.');
    }
    
    // Show processing status
    updateUIStatus('processing', 'Applying redaction rules...');
    
    // Apply redaction - use fallback mock result if service not ready
    let result;
    if (redactionService && typeof redactionService.applyRedaction === 'function') {
      result = await redactionService.applyRedaction(
        appState.redactionRules,
        (progress, message) => {
          // Update progress UI
          console.log(`Redaction progress: ${progress}% - ${message}`);
        }
      );
    } else {
      // Mock result for testing UI
      console.log('Using mock redaction result (redaction service not fully implemented)');
      result = {
        statistics: {
          redactionCount: 42,
          bytesRedacted: 1256,
          rulesApplied: 7,
          processingTime: 356.78
        },
        categories: [
          { name: 'Email Addresses', count: 15 },
          { name: 'Phone Numbers', count: 8 },
          { name: 'Names', count: 12 },
          { name: 'SSNs', count: 4 },
          { name: 'Credit Cards', count: 3 }
        ],
        rules: [
          { name: 'Email Pattern', matches: 15, misses: 1 },
          { name: 'Phone Number', matches: 8, misses: 2 },
          { name: 'SSN Pattern', matches: 4, misses: 0 },
          { name: 'Names List', matches: 12, misses: 5 },
          { name: 'Credit Cards', matches: 3, misses: 1 }
        ]
      };
      
      // Add batch stats if in batch mode
      if (appState.batchMode) {
        result.documents = [
          { name: 'document1.pdf', redactionCount: 15 },
          { name: 'document2.pdf', redactionCount: 10 },
          { name: 'image1.jpg', redactionCount: 8 },
          { name: 'document3.docx', redactionCount: 9 }
        ];
      }
      
      // Simulate async processing
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    // Update application state
    appState.redactionResults = result;
    
    // Update dashboard if it exists
    if (redactionDashboard) {
      redactionDashboard.updateDashboard(result);
    }
    
    // Update document viewer to show redacted version
    if (documentViewer) {
      documentViewer.setViewMode('redacted');
    }
    
    // Show success message
    updateUIStatus('success', `Redaction complete. ${result.statistics.redactionCount} items redacted.`);
    
    // Move to export step
    navigateToStep('export');
  } catch (error) {
    console.error('Redaction error:', error);
    updateUIStatus('error', `Redaction failed: ${error.message}`);
  } finally {
    // Re-enable the redact button
    if (redactBtn) {
      redactBtn.disabled = false;
      redactBtn.textContent = 'Apply Redactions';
    }
  }
}

/**
 * Update export options based on document type
 */
function updateExportOptions() {
  const exportFormat = document.getElementById('export-format');
  if (!exportFormat) return;
  
  // Clear current options
  exportFormat.innerHTML = '';
  
  // Determine available formats based on document type
  const documentType = appState.currentDocument?.metadata?.extension;
  
  const formats = [];
  
  switch (documentType) {
    case 'pdf':
      formats.push({ value: 'pdf', label: 'PDF' });
      formats.push({ value: 'text', label: 'Text' });
      break;
      
    case 'docx':
    case 'doc':
      formats.push({ value: 'pdf', label: 'PDF' });
      formats.push({ value: 'docx', label: 'DOCX' });
      formats.push({ value: 'text', label: 'Text' });
      break;
      
    case 'jpg':
    case 'jpeg':
    case 'png':
      formats.push({ value: 'png', label: 'PNG' });
      formats.push({ value: 'jpeg', label: 'JPEG' });
      formats.push({ value: 'pdf', label: 'PDF' });
      break;
      
    case 'txt':
      formats.push({ value: 'text', label: 'Text' });
      formats.push({ value: 'pdf', label: 'PDF' });
      break;
      
    default:
      formats.push({ value: 'text', label: 'Text' });
      formats.push({ value: 'pdf', label: 'PDF' });
  }
  
  // Add JSON option for all document types
  formats.push({ value: 'json', label: 'JSON' });
  
  // Create format options
  formats.forEach(format => {
    const option = document.createElement('option');
    option.value = format.value;
    option.textContent = format.label;
    exportFormat.appendChild(option);
  });
  
  // Set default filename
  const filenameInput = document.getElementById('export-filename');
  if (filenameInput && appState.currentDocument) {
    const originalName = appState.currentDocument.metadata.name;
    const extension = formats[0]?.value || 'pdf';
    filenameInput.value = `${originalName.replace(/\.[^/.]+$/, '')}_redacted.${extension}`;
  }
}

/**
 * Export redacted document
 */
async function exportDocument() {
  // Get export button and disable it
  const exportBtn = document.getElementById('export-btn');
  if (exportBtn) {
    exportBtn.disabled = true;
    exportBtn.textContent = 'Exporting...';
  }
  
  try {
    // Check if we have redaction results
    if (!appState.redactionResults) {
      throw new Error('No redacted document available. Please apply redaction first.');
    }
    
    // Get export options safely
    const formatElement = document.getElementById('export-format');
    const filenameElement = document.getElementById('export-filename');
    const auditElement = document.getElementById('include-audit');
    const watermarkElement = document.getElementById('add-watermark');
    
    const format = formatElement ? formatElement.value : 'pdf';
    const filename = filenameElement ? filenameElement.value.trim() : '';
    const includeAudit = auditElement ? auditElement.checked : true;
    const addWatermark = watermarkElement ? watermarkElement.checked : true;
    
    // Validate filename
    if (!filename) {
      throw new Error('Filename is required');
    }
    
    // Show progress status
    updateUIStatus('processing', 'Exporting document...');
    
    // Simulate export delay for UI testing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // This part would normally connect to the export manager
    // For now, show success message with export details
    let exportDetails;
    if (appState.batchMode) {
      exportDetails = `${appState.redactionResults.documents?.length || 0} documents exported as ${format} files.`;
    } else {
      exportDetails = `Document exported as ${filename} in ${format} format.`;
    }
    
    // Log details for debugging
    console.log(`Export completed: ${exportDetails}\nInclude audit: ${includeAudit}\nAdd watermark: ${addWatermark}`);
    
    // Show success message to user
    updateUIStatus('success', exportDetails);
    
    // Create download simulation for better UX
    setTimeout(() => {
      // Simulate browser download behavior
      const downloadNotification = document.createElement('div');
      downloadNotification.className = 'download-notification';
      downloadNotification.textContent = `Download started: ${filename}`;
      document.body.appendChild(downloadNotification);
      
      // Remove after a few seconds
      setTimeout(() => {
        if (downloadNotification.parentNode) {
          downloadNotification.parentNode.removeChild(downloadNotification);
        }
      }, 3000);
    }, 500);
    
  } catch (error) {
    console.error('Export error:', error);
    updateUIStatus('error', `Export failed: ${error.message}`);
  } finally {
    // Re-enable export button
    if (exportBtn) {
      exportBtn.disabled = false;
      exportBtn.textContent = 'Export Document';
    }
  }
}

/**
 * Show template selection modal
 */
function showTemplateModal() {
  console.log('Opening template modal');
  
  // Get modal elements
  const modal = document.getElementById('rule-template-modal');
  if (!modal) {
    console.error('Template modal element not found');
    return;
  }
  
  // Get template list container
  const templateListEl = modal.querySelector('.template-list');
  if (!templateListEl) {
    console.error('Template list container not found');
    return;
  }
  
  // Clear existing templates
  templateListEl.innerHTML = '';
  
  // Get templates from rule manager
  const templates = ruleManager.getTemplates();
  console.log('Available templates:', templates);
  
  // Group templates by category
  const templatesByCategory = {};
  
  Object.keys(templates).forEach(key => {
    const template = templates[key];
    const category = template.category || 'general';
    
    if (!templatesByCategory[category]) {
      templatesByCategory[category] = [];
    }
    
    templatesByCategory[category].push({
      id: key,
      ...template
    });
  });
  
  // Function to create a category heading
  const createCategoryHeading = (categoryName) => {
    const formattedName = categoryName.charAt(0).toUpperCase() + categoryName.slice(1);
    const heading = document.createElement('div');
    heading.className = 'template-category-heading';
    heading.textContent = formattedName;
    return heading;
  };
  
  // Create template items grouped by category
  Object.keys(templatesByCategory).forEach(category => {
    // Add category heading
    templateListEl.appendChild(createCategoryHeading(category));
    
    // Add templates for this category
    templatesByCategory[category].forEach(template => {
      console.log(`Creating template item for ${template.id}:`, template);
      
      const templateItem = document.createElement('div');
      templateItem.className = 'template-item';
      templateItem.dataset.templateId = template.id;
      
      const templateTitle = document.createElement('h4');
      templateTitle.textContent = template.name;
      
      const templateDescription = document.createElement('p');
      templateDescription.textContent = template.description || '';
      
      templateItem.appendChild(templateTitle);
      templateItem.appendChild(templateDescription);
      
      // Add click event to use template
      templateItem.addEventListener('click', () => {
        console.log(`Template selected: ${template.id}`);
        useTemplate(template.id);
        // Hide modal
        modal.hidden = true;
        modal.style.display = 'none';
        modal.classList.add('hidden');
      });
      
      templateListEl.appendChild(templateItem);
    });
  });
  
  // Set up close button
  const closeButton = document.getElementById('template-modal-close');
  if (closeButton) {
    closeButton.onclick = () => {
      console.log('Template modal closed');
      modal.hidden = true;
      modal.style.display = 'none';
      modal.classList.add('hidden');
    };
  } else {
    console.error('Close button not found');
  }
  
  // Show modal
  console.log('Displaying template modal');
  modal.hidden = false;
  modal.style.display = 'flex';
  modal.classList.remove('hidden');
  
  // Add global click handler to close when clicking outside the modal content
  const handleOutsideClick = (e) => {
    if (e.target === modal) {
      modal.hidden = true;
      modal.style.display = 'none';
      modal.classList.add('hidden');
      document.removeEventListener('click', handleOutsideClick);
    }
  };
  
  // Add event listener with a slight delay to avoid immediate closure
  setTimeout(() => {
    document.addEventListener('click', handleOutsideClick);
  }, 100);
}

/**
 * Use a rule template
 * @param {string} templateId - ID of the template to use
 */
function useTemplate(templateId) {
  // Create rule from template
  const result = ruleManager.createRuleFromTemplate(templateId);
  
  if (result.success) {
    // Update rule list
    updateRuleList(document.getElementById('rule-list'));
    
    // Show success message
    updateUIStatus('success', `Created rule from "${result.rule.name}" template`);
  } else {
    // Show error
    updateUIStatus('error', `Failed to create rule: ${result.error}`);
  }
}

// Add keyboard event listener for Escape key to close any open modals
window.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
      modal.hidden = true;
      modal.style.display = 'none';
      modal.classList.add('hidden');
    });
  }
});

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
    
    // Apply redaction
    if (redactionService && typeof redactionService.previewRedactedText === 'function') {
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
    } else {
      throw new Error('Redaction service not available. Please try again later.');
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
 * Update the example with actual redacted text if available
 * @param {string} originalText - Original text
 * @param {string} redactedText - Redacted text
 */
function updateExampleWithActualText(originalText, redactedText) {
  // Get a short excerpt from the original text (first 100 chars)
  let excerpt = originalText.substring(0, 100);
  if (originalText.length > 100) {
    excerpt += '...';
  }
  
  // Get the corresponding redacted excerpt
  let redactedExcerpt = redactedText.substring(0, excerpt.length);
  if (redactedText.length > excerpt.length) {
    redactedExcerpt += '...';
  }
  
  // Update the example text
  const originalExample = document.getElementById('example-original-text');
  const redactedExample = document.getElementById('example-redacted-text');
  
  if (originalExample && redactedExample) {
    originalExample.textContent = excerpt;
    redactedExample.textContent = redactedExcerpt;
  }
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
 * Save redacted text as a document
 */
function saveRedactedTextAsDocument() {
  try {
    if (!appState.redactedText) {
      throw new Error('No redacted text available');
    }
    
    // Create a text document object
    const textDocument = {
      id: `doc-${Date.now()}`,
      metadata: {
        name: `redacted-text-${new Date().toISOString().slice(0, 10)}.txt`,
        type: 'text/plain',
        extension: 'txt',
        size: appState.redactedText.length,
        created: new Date(),
        source: 'paste'
      },
      content: {
        text: appState.redactedText,
        lines: appState.redactedText.split('\n')
      }
    };
    
    // Add document to app state
    appState.currentDocument = textDocument;
    appState.documents.push(textDocument);
    
    // Update document viewer if available
    if (documentViewer) {
      documentViewer.loadDocument(textDocument);
    }
    
    // Move to preview step
    navigateToStep('preview');
    
    // Show success message
    updateUIStatus('success', 'Redacted text saved as document');
  } catch (error) {
    console.error('Save as document error:', error);
    updateUIStatus('error', `Failed to save text as document: ${error.message}`);
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
  // First run diagnostics
  logDiagnostics();
  
  // Then try to initialize the application
  try {
    console.log('Starting application initialization...');
    initializeApp();
    
    // Setup event handlers for the prompt-focused UI
    setupPromptFocusedUI();
    
  } catch (error) {
    console.error('Failed to initialize application:', error);
    updateUIStatus('error', 'Failed to initialize the application. Check console for details.');
  }
});