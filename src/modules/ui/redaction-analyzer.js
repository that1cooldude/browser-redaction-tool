/**
 * Redaction Analyzer UI Component
 * 
 * This module provides UI components for analyzing documents for sensitive data
 * and visualizing findings.
 */

/**
 * Initialize redaction analyzer UI
 * @param {string} containerId - ID of the container element
 * @param {Function} onRuleCreate - Callback when user wants to create a rule from a finding
 * @returns {Object} - UI controller object
 */
function initRedactionAnalyzer(containerId, onRuleCreate) {
  // Get container element
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container element with ID "${containerId}" not found`);
    return null;
  }
  
  // Create analyzer UI elements
  const analyzerUI = createAnalyzerUI();
  container.appendChild(analyzerUI.element);
  
  // Set up event handlers
  setupEventListeners(analyzerUI, onRuleCreate);
  
  /**
   * Display analysis results
   * @param {Object} results - Analysis results from the redaction engine
   */
  function displayResults(results) {
    // Clear previous results
    analyzerUI.resultsContainer.innerHTML = '';
    
    if (!results || !results.findings || results.findings.length === 0) {
      showEmptyState(analyzerUI);
      return;
    }
    
    // Group findings by category
    const groupedFindings = groupFindingsByCategory(results.findings);
    
    // Create category sections
    for (const [category, findings] of Object.entries(groupedFindings)) {
      const categorySection = createCategorySection(category, findings, onRuleCreate);
      analyzerUI.resultsContainer.appendChild(categorySection);
    }
    
    // Show the results
    analyzerUI.emptyState.setAttribute('hidden', '');
    analyzerUI.resultsContainer.removeAttribute('hidden');
    
    // Update stats
    updateAnalysisStats(analyzerUI, results);
  }
  
  /**
   * Set loading state
   * @param {boolean} isLoading - Whether the analyzer is loading
   * @param {string} message - Optional loading message
   */
  function setLoading(isLoading, message = 'Analyzing document...') {
    if (isLoading) {
      analyzerUI.loader.removeAttribute('hidden');
      analyzerUI.emptyState.setAttribute('hidden', '');
      analyzerUI.resultsContainer.setAttribute('hidden', '');
      analyzerUI.loadingMessage.textContent = message;
    } else {
      analyzerUI.loader.setAttribute('hidden', '');
    }
  }
  
  /**
   * Show error message
   * @param {string} message - Error message to display
   */
  function showError(message) {
    analyzerUI.errorMessage.textContent = message;
    analyzerUI.errorContainer.removeAttribute('hidden');
    analyzerUI.loader.setAttribute('hidden', '');
    analyzerUI.emptyState.setAttribute('hidden', '');
    analyzerUI.resultsContainer.setAttribute('hidden', '');
  }
  
  // Return controller object
  return {
    displayResults,
    setLoading,
    showError,
    element: analyzerUI.element
  };
}

/**
 * Create analyzer UI elements
 * @returns {Object} - UI elements
 */
function createAnalyzerUI() {
  // Create main container
  const element = document.createElement('div');
  element.className = 'redaction-analyzer';
  
  // Create header with stats and controls
  const header = document.createElement('div');
  header.className = 'analyzer-header';
  header.innerHTML = `
    <div class="analyzer-stats">
      <div class="stat-item">
        <span class="stat-value" id="total-findings-count">0</span>
        <span class="stat-label">Sensitive items found</span>
      </div>
      <div class="stat-item">
        <span class="stat-value" id="categories-count">0</span>
        <span class="stat-label">Categories</span>
      </div>
      <div class="stat-item">
        <span class="stat-value" id="risk-score">0</span>
        <span class="stat-label">Risk score</span>
      </div>
    </div>
    <div class="analyzer-controls">
      <button class="btn btn-outline" id="refresh-analysis-btn">
        <i class="icon-refresh"></i> Refresh Analysis
      </button>
      <button class="btn btn-primary" id="add-all-rules-btn">
        Create Rules from All
      </button>
    </div>
  `;
  
  // Create loading state
  const loader = document.createElement('div');
  loader.className = 'analyzer-loader';
  loader.setAttribute('hidden', '');
  loader.innerHTML = `
    <div class="spinner"></div>
    <p class="loading-message">Analyzing document...</p>
  `;
  
  // Create empty state
  const emptyState = document.createElement('div');
  emptyState.className = 'analyzer-empty-state';
  emptyState.innerHTML = `
    <i class="icon-search"></i>
    <h3>No sensitive data found</h3>
    <p>We couldn't detect any sensitive information in your document based on our analysis.</p>
    <button class="btn btn-outline" id="start-analysis-btn">Start Analysis</button>
  `;
  
  // Create error state
  const errorContainer = document.createElement('div');
  errorContainer.className = 'analyzer-error';
  errorContainer.setAttribute('hidden', '');
  errorContainer.innerHTML = `
    <i class="icon-error"></i>
    <h3>Analysis Error</h3>
    <p class="error-message"></p>
    <button class="btn btn-outline" id="retry-analysis-btn">Retry</button>
  `;
  
  // Create results container
  const resultsContainer = document.createElement('div');
  resultsContainer.className = 'analyzer-results';
  resultsContainer.setAttribute('hidden', '');
  
  // Assemble all components
  element.appendChild(header);
  element.appendChild(loader);
  element.appendChild(emptyState);
  element.appendChild(errorContainer);
  element.appendChild(resultsContainer);
  
  return {
    element,
    header,
    statsContainer: header.querySelector('.analyzer-stats'),
    controlsContainer: header.querySelector('.analyzer-controls'),
    refreshButton: header.querySelector('#refresh-analysis-btn'),
    addAllRulesButton: header.querySelector('#add-all-rules-btn'),
    loader,
    loadingMessage: loader.querySelector('.loading-message'),
    emptyState,
    startButton: emptyState.querySelector('#start-analysis-btn'),
    errorContainer,
    errorMessage: errorContainer.querySelector('.error-message'),
    retryButton: errorContainer.querySelector('#retry-analysis-btn'),
    resultsContainer
  };
}

/**
 * Set up event listeners for the analyzer
 * @param {Object} analyzerUI - Analyzer UI elements
 * @param {Function} onRuleCreate - Callback when creating a rule
 */
function setupEventListeners(analyzerUI, onRuleCreate) {
  // Refresh analysis button
  analyzerUI.refreshButton.addEventListener('click', () => {
    // Trigger a new analysis (callback to be implemented by parent)
    if (analyzerUI.element.dispatchEvent) {
      analyzerUI.element.dispatchEvent(new CustomEvent('refreshAnalysis'));
    }
  });
  
  // Start analysis button
  analyzerUI.startButton.addEventListener('click', () => {
    if (analyzerUI.element.dispatchEvent) {
      analyzerUI.element.dispatchEvent(new CustomEvent('startAnalysis'));
    }
  });
  
  // Retry button
  analyzerUI.retryButton.addEventListener('click', () => {
    if (analyzerUI.element.dispatchEvent) {
      analyzerUI.element.dispatchEvent(new CustomEvent('retryAnalysis'));
    }
  });
  
  // Add all rules button
  analyzerUI.addAllRulesButton.addEventListener('click', () => {
    // Get all findings
    const findingElements = analyzerUI.resultsContainer.querySelectorAll('.finding-item');
    const findings = Array.from(findingElements).map(el => {
      return {
        text: el.dataset.text,
        category: el.dataset.category,
        confidence: parseFloat(el.dataset.confidence)
      };
    });
    
    // Call onRuleCreate callback with all findings
    if (typeof onRuleCreate === 'function') {
      onRuleCreate(findings);
    }
  });
}

/**
 * Show empty state when no findings are available
 * @param {Object} analyzerUI - Analyzer UI elements
 */
function showEmptyState(analyzerUI) {
  analyzerUI.emptyState.removeAttribute('hidden');
  analyzerUI.resultsContainer.setAttribute('hidden', '');
  analyzerUI.errorContainer.setAttribute('hidden', '');
  
  // Reset stats
  document.getElementById('total-findings-count').textContent = '0';
  document.getElementById('categories-count').textContent = '0';
  document.getElementById('risk-score').textContent = '0';
}

/**
 * Update statistics based on analysis results
 * @param {Object} analyzerUI - Analyzer UI elements
 * @param {Object} results - Analysis results
 */
function updateAnalysisStats(analyzerUI, results) {
  const totalFindings = results.findings.length;
  const categories = new Set(results.findings.map(finding => finding.category)).size;
  
  // Calculate a simple risk score (1-100) based on number and sensitivity of findings
  let riskScore = Math.min(Math.round((totalFindings / 10) * 100), 100);
  
  // Update the stats in the UI
  document.getElementById('total-findings-count').textContent = totalFindings.toString();
  document.getElementById('categories-count').textContent = categories.toString();
  document.getElementById('risk-score').textContent = riskScore.toString();
}

/**
 * Group findings by their category
 * @param {Array} findings - Array of finding objects
 * @returns {Object} - Object with categories as keys and arrays of findings as values
 */
function groupFindingsByCategory(findings) {
  const groupedFindings = {};
  
  findings.forEach(finding => {
    const category = finding.category || 'Other';
    
    if (!groupedFindings[category]) {
      groupedFindings[category] = [];
    }
    
    groupedFindings[category].push(finding);
  });
  
  return groupedFindings;
}

/**
 * Create a section for a category of findings
 * @param {string} category - Category name
 * @param {Array} findings - Array of findings in this category
 * @param {Function} onRuleCreate - Callback when creating a rule
 * @returns {HTMLElement} - Category section element
 */
function createCategorySection(category, findings, onRuleCreate) {
  const section = document.createElement('div');
  section.className = 'finding-category';
  
  // Create header with count
  const header = document.createElement('div');
  header.className = 'finding-category-header';
  header.innerHTML = `
    <h3>${category} <span class="finding-count">(${findings.length})</span></h3>
    <button class="btn btn-sm btn-outline category-rule-btn">Create Rule</button>
  `;
  
  // Add event listener to the "Create Rule" button
  header.querySelector('.category-rule-btn').addEventListener('click', () => {
    if (typeof onRuleCreate === 'function') {
      onRuleCreate(findings);
    }
  });
  
  // Create list of findings
  const findingsList = document.createElement('ul');
  findingsList.className = 'findings-list';
  
  // Add each finding to the list
  findings.forEach(finding => {
    const findingItem = createFindingItem(finding, onRuleCreate);
    findingsList.appendChild(findingItem);
  });
  
  // Assemble section
  section.appendChild(header);
  section.appendChild(findingsList);
  
  return section;
}

/**
 * Create a finding item element
 * @param {Object} finding - Finding object
 * @param {Function} onRuleCreate - Callback when creating a rule
 * @returns {HTMLElement} - Finding item element
 */
function createFindingItem(finding, onRuleCreate) {
  const item = document.createElement('li');
  item.className = 'finding-item';
  item.dataset.text = finding.text;
  item.dataset.category = finding.category;
  item.dataset.confidence = finding.confidence.toString();
  
  // Calculate confidence class
  let confidenceClass = 'confidence-medium';
  if (finding.confidence >= 0.8) {
    confidenceClass = 'confidence-high';
  } else if (finding.confidence < 0.4) {
    confidenceClass = 'confidence-low';
  }
  
  // Create item content
  item.innerHTML = `
    <div class="finding-content">
      <div class="finding-text">${escapeHtml(finding.text)}</div>
      <div class="finding-details">
        <span class="finding-location">Page ${finding.page || 1}, ${finding.occurences || 1} occurrence(s)</span>
        <span class="finding-confidence ${confidenceClass}">
          ${Math.round(finding.confidence * 100)}% confidence
        </span>
      </div>
    </div>
    <div class="finding-actions">
      <button class="btn btn-sm btn-outline finding-rule-btn">Create Rule</button>
      <button class="btn btn-sm btn-outline finding-ignore-btn">Ignore</button>
    </div>
  `;
  
  // Add event listeners
  item.querySelector('.finding-rule-btn').addEventListener('click', () => {
    if (typeof onRuleCreate === 'function') {
      onRuleCreate([finding]);
    }
  });
  
  item.querySelector('.finding-ignore-btn').addEventListener('click', () => {
    item.classList.add('ignored');
    // Update counts
    const categorySection = item.closest('.finding-category');
    const countElement = categorySection.querySelector('.finding-count');
    const count = parseInt(countElement.textContent.match(/\d+/)[0], 10) - 1;
    countElement.textContent = `(${count})`;
    
    // Update total count
    const totalElement = document.getElementById('total-findings-count');
    const total = parseInt(totalElement.textContent, 10) - 1;
    totalElement.textContent = total.toString();
  });
  
  return item;
}

/**
 * Helper function to escape HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export { initRedactionAnalyzer };