/**
 * Redaction Rule Selector UI Component
 * 
 * This module provides a simplified UI for selecting predefined redaction rules
 * via checkboxes grouped by category.
 */

/**
 * Initialize a redaction rule selector UI
 * @param {string} containerId - ID of the container element
 * @param {Object} ruleManager - The rule manager instance
 * @param {Function} onRuleSelectionChange - Callback when rule selection changes
 * @returns {Object} - UI controller object
 */
function initRedactionRuleSelector(containerId, ruleManager, onRuleSelectionChange) {
  // Get container element
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container element with ID "${containerId}" not found`);
    return null;
  }
  
  // Get templates from rule manager
  const templates = ruleManager.getTemplates();
  
  // Track selected rule templates
  let selectedRules = {};
  
  // Create UI elements
  const selectorUI = createSelectorUI(templates);
  container.appendChild(selectorUI.element);
  
  // Set up event listeners
  setupEventListeners(selectorUI, templates, onRuleSelectionChange);
  
  /**
   * Get currently selected rule templates
   * @returns {Array} - Array of selected rule template keys
   */
  function getSelectedRules() {
    return Object.keys(selectedRules).filter(key => selectedRules[key]);
  }
  
  /**
   * Get rule objects for the selected templates
   * @returns {Array} - Array of rule objects
   */
  function getSelectedRuleObjects() {
    const templateKeys = getSelectedRules();
    return templateKeys.map(key => {
      const template = templates[key];
      return {
        id: `rule-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        name: template.name,
        regex: template.regex,
        replacementType: template.replacementType,
        replacement: template.replacement || '[REDACTED]',
        replacementChar: template.replacementChar || 'X',
        description: template.description,
        enabled: true,
        category: template.category,
        created: new Date().toISOString()
      };
    });
  }
  
  /**
   * Set rules to be selected
   * @param {Array} rules - Array of rule IDs to select
   */
  function setSelectedRules(rules) {
    // Reset selections
    selectedRules = {};
    
    // Mark rules as selected
    rules.forEach(ruleId => {
      selectedRules[ruleId] = true;
    });
    
    // Update checkboxes
    updateCheckboxes();
  }
  
  /**
   * Update checkbox states based on selected rules
   */
  function updateCheckboxes() {
    const checkboxes = selectorUI.element.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      checkbox.checked = !!selectedRules[checkbox.dataset.templateId];
    });
    
    // Update category checkboxes
    updateCategoryCheckboxes();
  }
  
  /**
   * Update category checkbox states based on individual rule selections
   */
  function updateCategoryCheckboxes() {
    const categories = {};
    
    // Group templates by category
    Object.keys(templates).forEach(key => {
      const category = templates[key].category || 'general';
      if (!categories[category]) {
        categories[category] = {
          total: 0,
          selected: 0
        };
      }
      
      categories[category].total++;
      if (selectedRules[key]) {
        categories[category].selected++;
      }
    });
    
    // Update category checkboxes
    Object.keys(categories).forEach(category => {
      const checkbox = selectorUI.element.querySelector(`input[data-category="${category}"]`);
      if (checkbox) {
        const { total, selected } = categories[category];
        
        if (selected === 0) {
          checkbox.checked = false;
          checkbox.indeterminate = false;
        } else if (selected === total) {
          checkbox.checked = true;
          checkbox.indeterminate = false;
        } else {
          checkbox.checked = false;
          checkbox.indeterminate = true;
        }
      }
    });
  }
  
  /**
   * Select all rules in a category
   * @param {string} category - Category to select all rules for
   * @param {boolean} selected - Whether to select or deselect
   */
  function selectCategory(category, selected) {
    Object.keys(templates).forEach(key => {
      const template = templates[key];
      if (template.category === category) {
        selectedRules[key] = selected;
      }
    });
    
    // Update UI
    updateCheckboxes();
    
    // Notify of changes
    if (typeof onRuleSelectionChange === 'function') {
      onRuleSelectionChange(getSelectedRuleObjects());
    }
  }
  
  // Return controller object
  return {
    getSelectedRules,
    getSelectedRuleObjects,
    setSelectedRules,
    selectCategory,
    element: selectorUI.element
  };
}

/**
 * Create the selector UI elements
 * @param {Object} templates - Rule templates
 * @returns {Object} - UI elements
 */
function createSelectorUI(templates) {
  // Create main container
  const element = document.createElement('div');
  element.className = 'redaction-rule-selector';
  
  // Add header and description
  const header = document.createElement('div');
  header.className = 'rule-selector-header';
  header.innerHTML = `
    <h3>Select Redaction Types</h3>
    <p>Choose the types of information you want to redact from your document.</p>
  `;
  element.appendChild(header);
  
  // Group templates by category
  const categories = {};
  Object.keys(templates).forEach(key => {
    const template = templates[key];
    const category = template.category || 'general';
    
    if (!categories[category]) {
      categories[category] = [];
    }
    
    categories[category].push({
      id: key,
      ...template
    });
  });
  
  // Category labels
  const categoryLabels = {
    'personal': 'Personal Information',
    'financial': 'Financial Information',
    'technical': 'Technical Information',
    'government': 'Government & Agencies',
    'general': 'General Information'
  };
  
  // Create category sections
  const categoryOrder = ['personal', 'financial', 'government', 'technical', 'general'];
  const sortedCategories = categoryOrder.filter(cat => categories[cat] && categories[cat].length > 0);
  
  // Add any categories not in our predefined order
  Object.keys(categories).forEach(cat => {
    if (!categoryOrder.includes(cat)) {
      sortedCategories.push(cat);
    }
  });
  
  // Create sections for each category
  sortedCategories.forEach(category => {
    const categorySection = document.createElement('div');
    categorySection.className = 'rule-category-section';
    
    // Category header with select all checkbox
    const categoryHeader = document.createElement('div');
    categoryHeader.className = 'rule-category-header';
    
    const categoryCheckbox = document.createElement('input');
    categoryCheckbox.type = 'checkbox';
    categoryCheckbox.id = `category-${category}`;
    categoryCheckbox.dataset.category = category;
    
    const categoryLabel = document.createElement('label');
    categoryLabel.htmlFor = `category-${category}`;
    categoryLabel.textContent = categoryLabels[category] || category.charAt(0).toUpperCase() + category.slice(1);
    
    categoryHeader.appendChild(categoryCheckbox);
    categoryHeader.appendChild(categoryLabel);
    categorySection.appendChild(categoryHeader);
    
    // Rule checkboxes for this category
    const rulesContainer = document.createElement('div');
    rulesContainer.className = 'rule-checkboxes';
    
    categories[category].forEach(template => {
      const ruleItem = document.createElement('div');
      ruleItem.className = 'rule-checkbox-item';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `rule-${template.id}`;
      checkbox.dataset.templateId = template.id;
      
      const label = document.createElement('label');
      label.htmlFor = `rule-${template.id}`;
      label.textContent = template.name;
      
      // Add tooltip with description
      if (template.description) {
        label.title = template.description;
        label.classList.add('has-tooltip');
      }
      
      ruleItem.appendChild(checkbox);
      ruleItem.appendChild(label);
      rulesContainer.appendChild(ruleItem);
    });
    
    categorySection.appendChild(rulesContainer);
    element.appendChild(categorySection);
  });
  
  // Add quick selection buttons
  const quickSelect = document.createElement('div');
  quickSelect.className = 'quick-select-buttons';
  
  const selectAllBtn = document.createElement('button');
  selectAllBtn.className = 'btn btn-sm btn-outline';
  selectAllBtn.textContent = 'Select All';
  selectAllBtn.id = 'select-all-rules';
  
  const selectNoneBtn = document.createElement('button');
  selectNoneBtn.className = 'btn btn-sm btn-outline';
  selectNoneBtn.textContent = 'Clear All';
  selectNoneBtn.id = 'clear-all-rules';
  
  const selectRecommendedBtn = document.createElement('button');
  selectRecommendedBtn.className = 'btn btn-sm btn-primary';
  selectRecommendedBtn.textContent = 'Recommended Selection';
  selectRecommendedBtn.id = 'recommended-rules';
  
  quickSelect.appendChild(selectRecommendedBtn);
  quickSelect.appendChild(selectAllBtn);
  quickSelect.appendChild(selectNoneBtn);
  
  element.appendChild(quickSelect);
  
  return { element };
}

/**
 * Set up event listeners for the selector UI
 * @param {Object} selectorUI - UI elements
 * @param {Object} templates - Rule templates
 * @param {Function} onRuleSelectionChange - Callback for selection changes
 */
function setupEventListeners(selectorUI, templates, onRuleSelectionChange) {
  // Map to track selected rules
  const selectedRules = {};
  
  // Handle individual rule checkbox changes
  const ruleCheckboxes = selectorUI.element.querySelectorAll('input[data-template-id]');
  ruleCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      const templateId = checkbox.dataset.templateId;
      selectedRules[templateId] = checkbox.checked;
      
      // Update category checkbox states
      updateCategoryCheckboxes();
      
      // Notify of changes
      if (typeof onRuleSelectionChange === 'function') {
        onRuleSelectionChange(getSelectedRuleObjects());
      }
    });
  });
  
  // Handle category checkbox changes
  const categoryCheckboxes = selectorUI.element.querySelectorAll('input[data-category]');
  categoryCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      const category = checkbox.dataset.category;
      const checked = checkbox.checked;
      
      // Update all rule checkboxes in this category
      ruleCheckboxes.forEach(ruleCheckbox => {
        const templateId = ruleCheckbox.dataset.templateId;
        const template = templates[templateId];
        
        if (template.category === category) {
          ruleCheckbox.checked = checked;
          selectedRules[templateId] = checked;
        }
      });
      
      // Notify of changes
      if (typeof onRuleSelectionChange === 'function') {
        onRuleSelectionChange(getSelectedRuleObjects());
      }
    });
  });
  
  // Handle quick selection buttons
  const selectAllBtn = selectorUI.element.querySelector('#select-all-rules');
  if (selectAllBtn) {
    selectAllBtn.addEventListener('click', () => {
      ruleCheckboxes.forEach(checkbox => {
        checkbox.checked = true;
        selectedRules[checkbox.dataset.templateId] = true;
      });
      
      updateCategoryCheckboxes();
      
      // Notify of changes
      if (typeof onRuleSelectionChange === 'function') {
        onRuleSelectionChange(getSelectedRuleObjects());
      }
    });
  }
  
  const clearAllBtn = selectorUI.element.querySelector('#clear-all-rules');
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', () => {
      ruleCheckboxes.forEach(checkbox => {
        checkbox.checked = false;
        selectedRules[checkbox.dataset.templateId] = false;
      });
      
      updateCategoryCheckboxes();
      
      // Notify of changes
      if (typeof onRuleSelectionChange === 'function') {
        onRuleSelectionChange(getSelectedRuleObjects());
      }
    });
  }
  
  const recommendedBtn = selectorUI.element.querySelector('#recommended-rules');
  if (recommendedBtn) {
    recommendedBtn.addEventListener('click', () => {
      // Clear all first
      ruleCheckboxes.forEach(checkbox => {
        checkbox.checked = false;
        selectedRules[checkbox.dataset.templateId] = false;
      });
      
      // Select recommended rules
      const recommended = ['EMAIL', 'PHONE_US', 'SSN', 'CREDIT_CARD', 'NAME', 'ADDRESS'];
      ruleCheckboxes.forEach(checkbox => {
        const templateId = checkbox.dataset.templateId;
        if (recommended.includes(templateId)) {
          checkbox.checked = true;
          selectedRules[templateId] = true;
        }
      });
      
      updateCategoryCheckboxes();
      
      // Notify of changes
      if (typeof onRuleSelectionChange === 'function') {
        onRuleSelectionChange(getSelectedRuleObjects());
      }
    });
  }
  
  /**
   * Get rule objects for selected templates
   * @returns {Array} - Array of rule objects
   */
  function getSelectedRuleObjects() {
    return Object.keys(selectedRules)
      .filter(key => selectedRules[key])
      .map(key => {
        const template = templates[key];
        return {
          id: `rule-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          name: template.name,
          regex: template.regex,
          replacementType: template.replacementType,
          replacement: template.replacement || '[REDACTED]',
          replacementChar: template.replacementChar || 'X',
          description: template.description,
          enabled: true,
          category: template.category,
          created: new Date().toISOString()
        };
      });
  }
  
  /**
   * Update category checkbox states based on individual selections
   */
  function updateCategoryCheckboxes() {
    const categories = {};
    
    // Group templates by category and count selections
    ruleCheckboxes.forEach(checkbox => {
      const templateId = checkbox.dataset.templateId;
      const template = templates[templateId];
      const category = template.category || 'general';
      
      if (!categories[category]) {
        categories[category] = {
          total: 0,
          selected: 0
        };
      }
      
      categories[category].total++;
      if (checkbox.checked) {
        categories[category].selected++;
      }
    });
    
    // Update category checkboxes
    categoryCheckboxes.forEach(checkbox => {
      const category = checkbox.dataset.category;
      if (categories[category]) {
        const { total, selected } = categories[category];
        
        if (selected === 0) {
          checkbox.checked = false;
          checkbox.indeterminate = false;
        } else if (selected === total) {
          checkbox.checked = true;
          checkbox.indeterminate = false;
        } else {
          checkbox.checked = false;
          checkbox.indeterminate = true;
        }
      }
    });
  }
}

export { initRedactionRuleSelector };