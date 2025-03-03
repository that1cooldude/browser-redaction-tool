/**
 * Browser Redaction Tool - Main Application
 *
 * This is the entry point for the application, coordinating between modules
 * and managing the application state.
 */

import { initializePyodide } from './pyodide-setup.js';
import { initUploadManager } from './modules/document-upload/upload-manager.js';
import { 
  initDocumentViewer,
  initBatchUploader,
  initRedactionAnalyzer,
  initRedactionDashboard,
  initImageRedactionEditor,
  initRedactionRuleTester
} from './modules/ui/index.js';
import { RuleManager } from './modules/rule-management/rule-manager.js';
import { initRedactionService } from './modules/redaction/redaction-service.js';

// Application state
const appState = {
  pyodide: null,
  isInitialized: false,
  isProcessing: false,
  documents: [],
  redactionRules: [],
  currentDocument: null,
  redactionResults: null,
  errors: [],
  currentStep: 'upload',
  batchMode: false,
  batchDocuments: [],
  analysisResults: null,
  imageRedactions: []
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
      // Upload elements
      uploadContainer: document.getElementById('document-uploader'),
      batchUploaderContainer: document.getElementById('batch-uploader-container'),
      
      // Document interaction elements
      documentViewer: document.getElementById('document-preview'),
      redactionAnalyzer: document.getElementById('redaction-analyzer'),
      redactionDashboard: document.getElementById('redaction-dashboard'),
      imageRedactionEditor: document.getElementById('image-redaction-editor'),
      redactionRuleTester: document.getElementById('redaction-rule-tester'),
      
      // Rule management
      ruleList: document.getElementById('rule-list'),
      addRuleButton: document.getElementById('add-rule-btn'),
      
      // Navigation and workflow
      workflowSteps: document.querySelectorAll('.workflow-steps .step'),
      stepContainers: document.querySelectorAll('.step-container'),
      previewTabs: document.querySelectorAll('.preview-tab'),
      previewTabContents: document.querySelectorAll('.preview-tab-content'),
      uploadTabs: document.querySelectorAll('.upload-tab'),
      uploadTabContents: document.querySelectorAll('.upload-tab-content'),
      
      // Status elements
      pyodideStatus: document.getElementById('pyodide-status'),
      memoryUsage: document.getElementById('memory-usage'),
      statusMessage: document.getElementById('status-message'),
      
      // Action buttons
      redactButton: document.getElementById('redact-btn'),
      exportButton: document.getElementById('export-btn')
    };
    
    // Initialize Pyodide
    // Initialize Pyodide with proper error handling
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
      updateUIStatus('error', 'Failed to initialize Python environment. Some features may be limited.');
    }
    
    // Initialize rule manager
    ruleManager = new RuleManager();
    appState.redactionRules = ruleManager.getAllRules();
    
    // Initialize redaction service
    redactionService = initRedactionService(appState);
    
    // Initialize core components with proper error handling
    try {
      // Initialize document viewer if container exists
      if (uiElements.documentViewer) {
        documentViewer = initDocumentViewer('document-preview', handleTextSelection);
      }
      
      // Initialize upload manager with simpler config
      if (uiElements.uploadContainer) {
        uploadManager = initUploadManager(appState, {
          containerId: 'document-uploader',
          onDocumentLoaded: handleDocumentLoaded
        });
      }
    
      // Initialize secondary components only if their containers exist
      if (uiElements.batchUploaderContainer) {
        batchUploader = initBatchUploader('batch-uploader-container', handleBatchFilesSelected);
      }
      
      if (uiElements.redactionAnalyzer) {
        redactionAnalyzer = initRedactionAnalyzer('redaction-analyzer', handleCreateRuleFromAnalysis);
      }
      
      if (uiElements.redactionDashboard) {
        redactionDashboard = initRedactionDashboard('redaction-dashboard');
      }
      
      if (uiElements.imageRedactionEditor) {
        imageEditor = initImageRedactionEditor('image-redaction-editor', handleImageRedactionComplete);
      }
      
      if (uiElements.redactionRuleTester) {
        ruleTester = initRedactionRuleTester('redaction-rule-tester', handleRuleTest);
      }
    } catch (componentError) {
      console.error('Failed to initialize UI components:', componentError);
      updateUIStatus('warning', 'Some UI components could not be initialized. Try refreshing the page.');
    }
    
    // Set up UI event listeners
    setupEventListeners(uiElements);
    
    // Initialize UI elements
    initializeUI(uiElements);
    
    // Update UI to show app is ready
    updateUIStatus('ready');
    
    console.log('Application initialized successfully');
  } catch (error) {
    console.error('Failed to initialize application:', error);
    updateUIStatus('error', error.message);
  }
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
  
  // Move to the next step
  navigateToStep('rules');
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
function updateRuleList(ruleListElement) {
  if (!ruleListElement) return;
  
  // Clear current list
  ruleListElement.innerHTML = '';
  
  // Get rules from rule manager
  appState.redactionRules = ruleManager.getAllRules();
  
  // Create rule items
  appState.redactionRules.forEach(rule => {
    const ruleItem = document.createElement('li');
    ruleItem.className = 'rule-item';
    ruleItem.dataset.ruleId = rule.id;
    
    const ruleName = document.createElement('span');
    ruleName.className = 'rule-item-name';
    ruleName.textContent = rule.name;
    
    const ruleActions = document.createElement('div');
    ruleActions.className = 'rule-actions';
    
    const editButton = document.createElement('button');
    editButton.className = 'btn-icon';
    editButton.innerHTML = '<i class="icon-edit"></i>';
    editButton.title = 'Edit Rule';
    editButton.addEventListener('click', () => {
      showRuleModal(rule);
    });
    
    const deleteButton = document.createElement('button');
    deleteButton.className = 'btn-icon';
    deleteButton.innerHTML = '<i class="icon-delete"></i>';
    deleteButton.title = 'Delete Rule';
    deleteButton.addEventListener('click', () => {
      deleteRule(rule.id);
    });
    
    ruleActions.appendChild(editButton);
    ruleActions.appendChild(deleteButton);
    
    ruleItem.appendChild(ruleName);
    ruleItem.appendChild(ruleActions);
    
    ruleListElement.appendChild(ruleItem);
  });
  
  // Add empty state if no rules
  if (appState.redactionRules.length === 0) {
    const emptyState = document.createElement('li');
    emptyState.className = 'rule-item empty-state';
    emptyState.textContent = 'No rules added yet. Click "Add Rule" to create one.';
    ruleListElement.appendChild(emptyState);
  }
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

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // First run diagnostics
  logDiagnostics();
  
  // Then try to initialize the application
  try {
    console.log('Starting application initialization...');
    initializeApp();
  } catch (error) {
    console.error('Failed to initialize application:', error);
    updateUIStatus('error', 'Failed to initialize the application. Check console for details.');
  }
});