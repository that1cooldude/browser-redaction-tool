/**
 * Redaction Rule Tester UI Component
 * 
 * This module provides a UI for testing redaction rules against sample text
 * and visualizing the results.
 */

/**
 * Initialize a redaction rule tester UI
 * @param {string} containerId - ID of the container element
 * @param {Function} onRuleTest - Function to test the rule with the text
 * @returns {Object} - UI controller object
 */
function initRedactionRuleTester(containerId, onRuleTest) {
  // Get container element
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container element with ID "${containerId}" not found`);
    return null;
  }
  
  // Create tester UI elements
  const testerUI = createTesterUI();
  container.appendChild(testerUI.element);
  
  // Set up event listeners
  setupEventListeners(testerUI, onRuleTest);
  
  /**
   * Set sample text for testing
   * @param {string} text - Sample text to test against
   */
  function setSampleText(text) {
    testerUI.sampleTextArea.value = text;
  }
  
  /**
   * Set rule being tested
   * @param {Object} rule - Rule object to test
   */
  function setRule(rule) {
    if (!rule) return;
    
    // Fill in rule details summary
    testerUI.ruleNameDisplay.textContent = rule.name || 'Unnamed Rule';
    
    if (rule.pattern) {
      testerUI.rulePatternDisplay.textContent = rule.pattern;
      testerUI.rulePatternLabel.textContent = 'Pattern:';
    } else if (rule.regex) {
      testerUI.rulePatternDisplay.textContent = rule.regex;
      testerUI.rulePatternLabel.textContent = 'Regex:';
    }
    
    // Display replacement info
    if (rule.replacementType === 'fixed') {
      testerUI.ruleReplacementDisplay.textContent = rule.replacement;
    } else if (rule.replacementType === 'character') {
      testerUI.ruleReplacementDisplay.textContent = `Character replacement: "${rule.replacementChar}" (repeated)`;
    } else {
      testerUI.ruleReplacementDisplay.textContent = 'Format-preserving replacement';
    }
    
    // Show placeholder text in textarea
    if (!testerUI.sampleTextArea.value) {
      if (rule.pattern) {
        testerUI.sampleTextArea.placeholder = `Enter text containing "${rule.pattern}" to test this rule...`;
      } else {
        testerUI.sampleTextArea.placeholder = `Enter text to test this rule...`;
      }
    }
    
    // Store rule for reference
    testerUI.element.dataset.ruleId = rule.id;
  }
  
  /**
   * Display test results
   * @param {Object} results - Test results
   */
  function displayResults(results) {
    if (!results) {
      testerUI.resultsContainer.setAttribute('hidden', '');
      return;
    }
    
    const { originalText, redactedText, matches, executionTime } = results;
    
    // Update result view
    testerUI.originalTextDisplay.textContent = originalText;
    testerUI.redactedTextDisplay.textContent = redactedText;
    
    // Show stats
    testerUI.matchCountDisplay.textContent = matches.length;
    testerUI.executionTimeDisplay.textContent = `${executionTime.toFixed(2)} ms`;
    
    // Highlight matches in original text
    highlightMatches(testerUI.originalTextDisplay, originalText, matches);
    
    // Show results
    testerUI.resultsContainer.removeAttribute('hidden');
    testerUI.noMatchesMessage.style.display = matches.length === 0 ? 'block' : 'none';
    testerUI.matchesFoundMessage.style.display = matches.length > 0 ? 'block' : 'none';
    
    // Set loading state
    setLoading(false);
  }
  
  /**
   * Set loading state
   * @param {boolean} isLoading - Whether the tester is in loading state
   */
  function setLoading(isLoading) {
    if (isLoading) {
      testerUI.testButton.disabled = true;
      testerUI.testButton.innerHTML = '<span class="spinner-inline"></span> Testing...';
    } else {
      testerUI.testButton.disabled = false;
      testerUI.testButton.innerHTML = 'Test Rule';
    }
  }
  
  // Return controller object
  return {
    setSampleText,
    setRule,
    displayResults,
    setLoading,
    element: testerUI.element
  };
}

/**
 * Create tester UI elements
 * @returns {Object} - Object containing UI elements
 */
function createTesterUI() {
  // Create main container
  const element = document.createElement('div');
  element.className = 'redaction-rule-tester';
  
  // Create rule summary section
  const ruleSummarySection = document.createElement('div');
  ruleSummarySection.className = 'rule-summary-section';
  ruleSummarySection.innerHTML = `
    <h3>Testing Rule: <span class="rule-name">No rule selected</span></h3>
    <div class="rule-details">
      <div class="rule-pattern">
        <span class="rule-pattern-label">Pattern:</span>
        <code class="rule-pattern-value">N/A</code>
      </div>
      <div class="rule-replacement">
        <span class="label">Replacement:</span>
        <code class="rule-replacement-value">N/A</code>
      </div>
    </div>
  `;
  
  // Create input section
  const inputSection = document.createElement('div');
  inputSection.className = 'test-input-section';
  inputSection.innerHTML = `
    <div class="form-group">
      <label for="sample-text">Sample Text to Test</label>
      <textarea id="sample-text" class="form-control" rows="5" placeholder="Enter text to test against the rule..."></textarea>
    </div>
    <div class="test-actions">
      <button class="btn btn-primary test-button">Test Rule</button>
    </div>
  `;
  
  // Create results section
  const resultsSection = document.createElement('div');
  resultsSection.className = 'test-results-section';
  resultsSection.setAttribute('hidden', '');
  resultsSection.innerHTML = `
    <h3>Test Results</h3>
    
    <div class="results-stats">
      <div class="stat-item">
        <span class="stat-value match-count">0</span>
        <span class="stat-label">matches found</span>
      </div>
      <div class="stat-item">
        <span class="stat-value execution-time">0</span>
        <span class="stat-label">execution time</span>
      </div>
    </div>
    
    <div class="no-matches-message">
      <i class="icon-warning"></i>
      <p>No matches found. Try different text or adjust your rule.</p>
    </div>
    
    <div class="matches-found-message">
      <i class="icon-check"></i>
      <p>Rule is working! See the redacted result below.</p>
    </div>
    
    <div class="results-view">
      <div class="result-column">
        <h4>Original Text</h4>
        <div class="original-text text-display"></div>
      </div>
      <div class="result-divider">→</div>
      <div class="result-column">
        <h4>Redacted Text</h4>
        <div class="redacted-text text-display"></div>
      </div>
    </div>
  `;
  
  // Assemble all sections
  element.appendChild(ruleSummarySection);
  element.appendChild(inputSection);
  element.appendChild(resultsSection);
  
  // Return object with all elements
  return {
    element,
    ruleNameDisplay: ruleSummarySection.querySelector('.rule-name'),
    rulePatternLabel: ruleSummarySection.querySelector('.rule-pattern-label'),
    rulePatternDisplay: ruleSummarySection.querySelector('.rule-pattern-value'),
    ruleReplacementDisplay: ruleSummarySection.querySelector('.rule-replacement-value'),
    sampleTextArea: inputSection.querySelector('#sample-text'),
    testButton: inputSection.querySelector('.test-button'),
    resultsContainer: resultsSection,
    matchCountDisplay: resultsSection.querySelector('.match-count'),
    executionTimeDisplay: resultsSection.querySelector('.execution-time'),
    noMatchesMessage: resultsSection.querySelector('.no-matches-message'),
    matchesFoundMessage: resultsSection.querySelector('.matches-found-message'),
    originalTextDisplay: resultsSection.querySelector('.original-text'),
    redactedTextDisplay: resultsSection.querySelector('.redacted-text')
  };
}

/**
 * Set up event listeners for the tester
 * @param {Object} testerUI - Tester UI elements
 * @param {Function} onRuleTest - Function to test the rule with the text
 */
function setupEventListeners(testerUI, onRuleTest) {
  // Test button click
  testerUI.testButton.addEventListener('click', () => {
    const sampleText = testerUI.sampleTextArea.value.trim();
    if (!sampleText) {
      alert('Please enter sample text to test the rule against.');
      return;
    }
    
    // Get rule ID from dataset
    const ruleId = testerUI.element.dataset.ruleId;
    
    // Set loading state
    testerUI.testButton.disabled = true;
    testerUI.testButton.innerHTML = '<span class="spinner-inline"></span> Testing...';
    
    // Call test function
    if (typeof onRuleTest === 'function') {
      onRuleTest(sampleText, ruleId, (results) => {
        // Display results
        displayResults(testerUI, results);
      });
    } else {
      // If no test function provided, simulate results
      setTimeout(() => {
        const simulatedResults = {
          originalText: sampleText,
          redactedText: sampleText.replace(/\w+/g, '[REDACTED]'),
          matches: [{ start: 0, end: 5 }, { start: 10, end: 15 }],
          executionTime: 12.34
        };
        displayResults(testerUI, simulatedResults);
      }, 500);
    }
  });
  
  // Sample text input event for pressing Enter
  testerUI.sampleTextArea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      testerUI.testButton.click();
    }
  });
}

/**
 * Display test results
 * @param {Object} testerUI - Tester UI elements
 * @param {Object} results - Test results
 */
function displayResults(testerUI, results) {
  if (!results) {
    testerUI.resultsContainer.setAttribute('hidden', '');
    return;
  }
  
  const { originalText, redactedText, matches, executionTime } = results;
  
  // Update result view
  testerUI.originalTextDisplay.textContent = originalText;
  testerUI.redactedTextDisplay.textContent = redactedText;
  
  // Show stats
  testerUI.matchCountDisplay.textContent = matches.length;
  testerUI.executionTimeDisplay.textContent = `${executionTime.toFixed(2)} ms`;
  
  // Highlight matches in original text
  highlightMatches(testerUI.originalTextDisplay, originalText, matches);
  
  // Show results
  testerUI.resultsContainer.removeAttribute('hidden');
  testerUI.noMatchesMessage.style.display = matches.length === 0 ? 'block' : 'none';
  testerUI.matchesFoundMessage.style.display = matches.length > 0 ? 'block' : 'none';
  
  // Reset button
  testerUI.testButton.disabled = false;
  testerUI.testButton.innerHTML = 'Test Rule';
}

/**
 * Highlight matches in original text
 * @param {HTMLElement} container - Container element
 * @param {string} text - Original text
 * @param {Array} matches - Array of match objects with start and end properties
 */
function highlightMatches(container, text, matches) {
  // Clear current content
  container.innerHTML = '';
  
  if (!matches || matches.length === 0) {
    container.textContent = text;
    return;
  }
  
  // Sort matches by start position
  matches.sort((a, b) => a.start - b.start);
  
  let lastIndex = 0;
  
  // Process each match
  matches.forEach(match => {
    // Add text before the match
    if (match.start > lastIndex) {
      const beforeText = document.createTextNode(text.substring(lastIndex, match.start));
      container.appendChild(beforeText);
    }
    
    // Add highlighted match
    const matchSpan = document.createElement('span');
    matchSpan.className = 'highlight-match';
    matchSpan.textContent = text.substring(match.start, match.end);
    container.appendChild(matchSpan);
    
    lastIndex = match.end;
  });
  
  // Add any remaining text after the last match
  if (lastIndex < text.length) {
    const afterText = document.createTextNode(text.substring(lastIndex));
    container.appendChild(afterText);
  }
}

export { initRedactionRuleTester };