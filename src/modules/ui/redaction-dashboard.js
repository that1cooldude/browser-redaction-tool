/**
 * Redaction Dashboard UI Component
 * 
 * This module provides a dashboard for displaying redaction statistics
 * and results in a visual format.
 */

/**
 * Initialize redaction dashboard
 * @param {string} containerId - ID of the container element
 * @returns {Object} - Dashboard controller
 */
function initRedactionDashboard(containerId) {
  // Get container element
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container element with ID "${containerId}" not found`);
    return null;
  }
  
  // Create dashboard elements
  const dashboardUI = createDashboardUI();
  container.appendChild(dashboardUI.element);
  
  /**
   * Update dashboard with redaction results
   * @param {Object} results - Redaction results data
   */
  function updateDashboard(results) {
    if (!results) {
      showEmptyState(dashboardUI);
      return;
    }
    
    // Update summary metrics
    updateSummaryMetrics(dashboardUI, results);
    
    // Update redaction counts by category
    updateCategoryBreakdown(dashboardUI, results);
    
    // Update redaction count by document (if multiple documents)
    if (results.documents && results.documents.length > 1) {
      updateDocumentBreakdown(dashboardUI, results);
      dashboardUI.documentBreakdown.removeAttribute('hidden');
    } else {
      dashboardUI.documentBreakdown.setAttribute('hidden', '');
    }
    
    // Update rule effectiveness
    updateRuleEffectiveness(dashboardUI, results);
    
    // Show dashboard
    dashboardUI.emptyState.setAttribute('hidden', '');
    dashboardUI.dashboardContent.removeAttribute('hidden');
  }
  
  /**
   * Show loading state
   * @param {boolean} isLoading - Whether dashboard is loading
   */
  function setLoading(isLoading) {
    dashboardUI.loader.style.display = isLoading ? 'flex' : 'none';
  }
  
  // Return controller object
  return {
    updateDashboard,
    setLoading,
    element: dashboardUI.element
  };
}

/**
 * Create dashboard UI elements
 * @returns {Object} - Dashboard UI elements
 */
function createDashboardUI() {
  // Create main container
  const element = document.createElement('div');
  element.className = 'redaction-dashboard';
  
  // Create loading state
  const loader = document.createElement('div');
  loader.className = 'dashboard-loader';
  loader.style.display = 'none';
  loader.innerHTML = `
    <div class="spinner"></div>
    <p>Loading redaction data...</p>
  `;
  
  // Create empty state
  const emptyState = document.createElement('div');
  emptyState.className = 'dashboard-empty-state';
  emptyState.innerHTML = `
    <i class="icon-chart"></i>
    <h3>No Redaction Data Available</h3>
    <p>Apply redactions to your document to see statistics and metrics.</p>
  `;
  
  // Create dashboard content
  const dashboardContent = document.createElement('div');
  dashboardContent.className = 'dashboard-content';
  dashboardContent.setAttribute('hidden', '');
  
  // Create summary metrics
  const summaryMetrics = document.createElement('div');
  summaryMetrics.className = 'summary-metrics';
  summaryMetrics.innerHTML = `
    <div class="metric-card">
      <h3>Total Redactions</h3>
      <div class="metric-value" id="total-redactions">0</div>
    </div>
    <div class="metric-card">
      <h3>Information Protected</h3>
      <div class="metric-value" id="information-protected">0 bytes</div>
    </div>
    <div class="metric-card">
      <h3>Rules Applied</h3>
      <div class="metric-value" id="rules-applied">0</div>
    </div>
    <div class="metric-card">
      <h3>Processing Time</h3>
      <div class="metric-value" id="processing-time">0 ms</div>
    </div>
  `;
  
  // Create category breakdown
  const categoryBreakdown = document.createElement('div');
  categoryBreakdown.className = 'breakdown-section';
  categoryBreakdown.innerHTML = `
    <h3>Redactions by Category</h3>
    <div class="chart-container">
      <div class="chart-placeholder" id="category-chart-placeholder">
        <div class="bar-chart" id="category-chart"></div>
      </div>
    </div>
  `;
  
  // Create document breakdown (for batch mode)
  const documentBreakdown = document.createElement('div');
  documentBreakdown.className = 'breakdown-section';
  documentBreakdown.setAttribute('hidden', '');
  documentBreakdown.innerHTML = `
    <h3>Redactions by Document</h3>
    <div class="chart-container">
      <div class="chart-placeholder" id="document-chart-placeholder">
        <div class="bar-chart" id="document-chart"></div>
      </div>
    </div>
  `;
  
  // Create rule effectiveness
  const ruleEffectiveness = document.createElement('div');
  ruleEffectiveness.className = 'breakdown-section';
  ruleEffectiveness.innerHTML = `
    <h3>Rule Effectiveness</h3>
    <div class="rule-list" id="rule-effectiveness-list">
      <!-- Rule items will be added here -->
    </div>
  `;
  
  // Assemble dashboard
  dashboardContent.appendChild(summaryMetrics);
  dashboardContent.appendChild(categoryBreakdown);
  dashboardContent.appendChild(documentBreakdown);
  dashboardContent.appendChild(ruleEffectiveness);
  
  element.appendChild(loader);
  element.appendChild(emptyState);
  element.appendChild(dashboardContent);
  
  return {
    element,
    loader,
    emptyState,
    dashboardContent,
    summaryMetrics,
    categoryBreakdown,
    documentBreakdown,
    ruleEffectiveness,
    categoryChart: categoryBreakdown.querySelector('#category-chart'),
    documentChart: documentBreakdown.querySelector('#document-chart'),
    ruleList: ruleEffectiveness.querySelector('#rule-effectiveness-list')
  };
}

/**
 * Show empty state when no data is available
 * @param {Object} dashboardUI - Dashboard UI elements
 */
function showEmptyState(dashboardUI) {
  dashboardUI.emptyState.removeAttribute('hidden');
  dashboardUI.dashboardContent.setAttribute('hidden', '');
}

/**
 * Update summary metrics
 * @param {Object} dashboardUI - Dashboard UI elements
 * @param {Object} results - Redaction results data
 */
function updateSummaryMetrics(dashboardUI, results) {
  const stats = results.statistics || {};
  
  // Update total redactions
  document.getElementById('total-redactions').textContent = stats.redactionCount || 0;
  
  // Update information protected (bytes of redacted content)
  const protectedBytes = stats.bytesRedacted || 0;
  let sizeDisplay = `${protectedBytes} bytes`;
  if (protectedBytes > 1024 * 1024) {
    sizeDisplay = `${(protectedBytes / (1024 * 1024)).toFixed(2)} MB`;
  } else if (protectedBytes > 1024) {
    sizeDisplay = `${(protectedBytes / 1024).toFixed(2)} KB`;
  }
  document.getElementById('information-protected').textContent = sizeDisplay;
  
  // Update rules applied
  document.getElementById('rules-applied').textContent = stats.rulesApplied || 0;
  
  // Update processing time
  const processingTime = stats.processingTime || 0;
  document.getElementById('processing-time').textContent = `${processingTime.toFixed(2)} ms`;
}

/**
 * Update category breakdown chart
 * @param {Object} dashboardUI - Dashboard UI elements
 * @param {Object} results - Redaction results data
 */
function updateCategoryBreakdown(dashboardUI, results) {
  const categories = results.categories || [];
  const chartContainer = dashboardUI.categoryChart;
  
  // Clear previous chart
  chartContainer.innerHTML = '';
  
  if (categories.length === 0) {
    chartContainer.innerHTML = '<div class="no-data">No category data available</div>';
    return;
  }
  
  // Sort categories by count (descending)
  categories.sort((a, b) => b.count - a.count);
  
  // Find max value for scaling
  const maxCount = Math.max(...categories.map(cat => cat.count));
  
  // Create bars for each category
  categories.forEach(category => {
    const barHeight = (category.count / maxCount) * 100;
    
    const barContainer = document.createElement('div');
    barContainer.className = 'chart-bar-container';
    
    const bar = document.createElement('div');
    bar.className = 'chart-bar';
    bar.style.height = `${barHeight}%`;
    
    const label = document.createElement('div');
    label.className = 'chart-label';
    label.textContent = category.name;
    
    const value = document.createElement('div');
    value.className = 'chart-value';
    value.textContent = category.count;
    
    barContainer.appendChild(bar);
    barContainer.appendChild(value);
    barContainer.appendChild(label);
    
    chartContainer.appendChild(barContainer);
  });
}

/**
 * Update document breakdown chart
 * @param {Object} dashboardUI - Dashboard UI elements
 * @param {Object} results - Redaction results data
 */
function updateDocumentBreakdown(dashboardUI, results) {
  const documents = results.documents || [];
  const chartContainer = dashboardUI.documentChart;
  
  // Clear previous chart
  chartContainer.innerHTML = '';
  
  if (documents.length <= 1) {
    chartContainer.innerHTML = '<div class="no-data">No multi-document data available</div>';
    return;
  }
  
  // Sort documents by redaction count (descending)
  documents.sort((a, b) => b.redactionCount - a.redactionCount);
  
  // Find max value for scaling
  const maxCount = Math.max(...documents.map(doc => doc.redactionCount));
  
  // Create bars for each document
  documents.forEach(document => {
    const barHeight = (document.redactionCount / maxCount) * 100;
    
    const barContainer = document.createElement('div');
    barContainer.className = 'chart-bar-container';
    
    const bar = document.createElement('div');
    bar.className = 'chart-bar';
    bar.style.height = `${barHeight}%`;
    
    const label = document.createElement('div');
    label.className = 'chart-label';
    // Truncate long filenames
    const fileName = document.name.length > 15 
      ? document.name.substring(0, 12) + '...' 
      : document.name;
    label.textContent = fileName;
    label.title = document.name; // Full name on hover
    
    const value = document.createElement('div');
    value.className = 'chart-value';
    value.textContent = document.redactionCount;
    
    barContainer.appendChild(bar);
    barContainer.appendChild(value);
    barContainer.appendChild(label);
    
    chartContainer.appendChild(barContainer);
  });
}

/**
 * Update rule effectiveness list
 * @param {Object} dashboardUI - Dashboard UI elements
 * @param {Object} results - Redaction results data
 */
function updateRuleEffectiveness(dashboardUI, results) {
  const rules = results.rules || [];
  const ruleList = dashboardUI.ruleList;
  
  // Clear previous list
  ruleList.innerHTML = '';
  
  if (rules.length === 0) {
    ruleList.innerHTML = '<div class="no-data">No rule effectiveness data available</div>';
    return;
  }
  
  // Sort rules by effectiveness (matches)
  rules.sort((a, b) => b.matches - a.matches);
  
  // Create items for each rule
  rules.forEach(rule => {
    const ruleItem = document.createElement('div');
    ruleItem.className = 'rule-effectiveness-item';
    
    // Calculate effectiveness percentage
    const effectivenessPercentage = Math.min(Math.round((rule.matches / (rule.matches + rule.misses)) * 100), 100) || 0;
    
    ruleItem.innerHTML = `
      <div class="rule-name">${rule.name}</div>
      <div class="rule-stats">
        <span class="rule-matches">${rule.matches} matches</span>
        <div class="rule-effectiveness-meter">
          <div class="effectiveness-bar" style="width: ${effectivenessPercentage}%"></div>
          <span class="effectiveness-label">${effectivenessPercentage}% effective</span>
        </div>
      </div>
    `;
    
    ruleList.appendChild(ruleItem);
  });
}

export { initRedactionDashboard };