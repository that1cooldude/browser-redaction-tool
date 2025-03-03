/**
 * Simplified Redaction UI Module
 * 
 * Creates a user-friendly interface for configuring redaction with:
 * 1. Category checkboxes for common sensitive data types
 * 2. Sensitivity slider to control how aggressive redaction is
 * 3. Simple custom term entry form
 */

/**
 * Class for creating and managing the simplified redaction UI
 */
class SimplifiedRedactionUI {
  /**
   * Initialize the UI
   * @param {Object} config - Configuration options
   * @param {HTMLElement} config.container - Container element to render the UI
   * @param {Object} config.ruleManager - Instance of SimplifiedRuleManager
   * @param {Function} config.onConfigChange - Callback for when configuration changes
   */
  constructor(config) {
    this.container = config.container;
    this.ruleManager = config.ruleManager;
    this.onConfigChange = config.onConfigChange || (() => {});
    
    this.render();
    this.bindEvents();
  }
  
  /**
   * Render the UI components
   */
  render() {
    // Clear container
    this.container.innerHTML = '';
    
    // Create main structure
    this.container.innerHTML = `
      <div class="redaction-config">
        <div class="redaction-header">
          <h3>AI Privacy Protection</h3>
          <p>All sensitive information is redacted by default for maximum privacy protection.</p>
        </div>
      
        <div class="redaction-section">
          <h3>Privacy Protection Level</h3>
          <div class="sensitivity-slider-container">
            <input type="range" min="1" max="4" value="4" class="sensitivity-slider" id="sensitivitySlider">
            <div class="sensitivity-labels">
              <span class="sensitivity-label">Basic</span>
              <span class="sensitivity-label">Moderate</span>
              <span class="sensitivity-label">High</span>
              <span class="sensitivity-label active">Maximum</span>
            </div>
            <p class="sensitivity-description">${this.getSensitivityDescription()}</p>
          </div>
        </div>
        
        <div class="redaction-section">
          <h3>Information Categories</h3>
          <div class="category-list" id="categoryCheckboxes">
            ${this.renderCategoryCheckboxes()}
          </div>
        </div>
        
        <div class="redaction-section">
          <h3>Custom Terms to Redact</h3>
          <div class="custom-terms-container">
            <div class="custom-terms-list" id="customTermsList">
              ${this.renderCustomTerms()}
            </div>
            <div class="add-custom-term">
              <input type="text" id="newTermInput" placeholder="Enter specific word or phrase to redact">
              <input type="text" id="newTermReplacement" placeholder="Replacement text (optional)">
              <button id="addTermButton">Add Term</button>
            </div>
          </div>
        </div>
        
        <div class="redaction-actions">
          <button id="resetButton" class="secondary-button">Reset to Maximum Protection</button>
        </div>
      </div>
    `;
  }
  
  /**
   * Get numeric value for current sensitivity
   */
  getSensitivityValue() {
    const levels = {
      'basic': 1,
      'moderate': 2,
      'high': 3,
      'maximum': 4
    };
    
    return levels[this.ruleManager.sensitivityLevel] || 2;
  }
  
  /**
   * Get the description for current sensitivity level
   */
  getSensitivityDescription() {
    const currentSensitivity = this.ruleManager.getCurrentSensitivity();
    return currentSensitivity.description;
  }
  
  /**
   * Get the sensitivity level from a slider value
   */
  getSensitivityFromValue(value) {
    const levels = ['basic', 'moderate', 'high', 'maximum'];
    return levels[value - 1] || 'moderate';
  }
  
  /**
   * Render category checkboxes with a simplified list-based design
   */
  renderCategoryCheckboxes() {
    const categories = this.ruleManager.getAllCategories();
    
    // Group categories by type
    const personalCategories = categories.filter(c => c.id === 'personal');
    const financialCategories = categories.filter(c => c.id === 'financial');
    const technicalCategories = categories.filter(c => c.id === 'technical');
    const otherCategories = categories.filter(c => 
      !['personal', 'financial', 'technical'].includes(c.id)
    );
    
    // Map template items to each category
    const templatesByCategory = {};
    const templates = this.ruleManager.getTemplates ? this.ruleManager.getTemplates() : {};
    
    // Group templates by category
    Object.keys(templates).forEach(key => {
      const template = templates[key];
      const category = template.category || 'other';
      
      if (!templatesByCategory[category]) {
        templatesByCategory[category] = [];
      }
      
      templatesByCategory[category].push({
        id: key,
        name: template.name,
        description: template.description
      });
    });
    
    // Build HTML for each category section
    const categories_html = [];
    
    // Add an intro message explaining all items are checked by default
    categories_html.push(`
      <div class="privacy-explanation">
        <p><strong>Maximum protection enabled by default.</strong> All sensitive information types are selected for redaction.</p>
        <p>Uncheck any categories you specifically want to keep in your AI prompts.</p>
      </div>
    `);
    
    // Personal information category
    if (personalCategories.length > 0) {
      categories_html.push(this.renderCategorySection(
        'personal', 
        'Personal Information',
        'Names, emails, addresses, phone numbers',
        templatesByCategory.personal || []
      ));
    }
    
    // Financial information category
    if (financialCategories.length > 0) {
      categories_html.push(this.renderCategorySection(
        'financial', 
        'Financial Information',
        'Credit cards, SSNs, account numbers',
        templatesByCategory.financial || []
      ));
    }
    
    // Technical information category
    if (technicalCategories.length > 0) {
      categories_html.push(this.renderCategorySection(
        'technical', 
        'Technical Information',
        'IP addresses, URLs, file paths',
        templatesByCategory.technical || []
      ));
    }
    
    // Other categories
    otherCategories.forEach(category => {
      categories_html.push(this.renderCategorySection(
        category.id,
        category.name,
        category.description,
        templatesByCategory[category.id] || []
      ));
    });
    
    return categories_html.join('');
  }
  
  /**
   * Render a simplified section for a category with a master checkbox
   */
  renderCategorySection(categoryId, categoryName, categoryDescription, templates) {
    return `
      <div class="category-section" data-category="${categoryId}">
        <div class="category-header">
          <label class="category-toggle">
            <input type="checkbox" 
              class="category-toggle-input" 
              data-category="${categoryId}" 
              checked>
            <span class="category-toggle-label">${categoryName}</span>
          </label>
        </div>
        <div class="category-description">${categoryDescription}</div>
        <div class="template-count">${templates.length} information types</div>
        <button class="view-details-btn" data-category="${categoryId}">View Details</button>
        <div class="category-templates" id="templates-${categoryId}" style="display: none;">
          ${templates.map(template => `
            <div class="template-item">
              <label>
                <input type="checkbox" 
                  class="template-input" 
                  data-template="${template.id}" 
                  data-category="${categoryId}"
                  checked>
                <span class="template-name">${template.name}</span>
                ${template.description ? `<span class="template-description">- ${template.description}</span>` : ''}
              </label>
            </div>
          `).join('') || '<p class="no-templates">No templates available</p>'}
        </div>
      </div>
    `;
  }
  
  /**
   * Render custom terms list
   */
  renderCustomTerms() {
    const terms = this.ruleManager.getCustomTerms();
    
    if (terms.length === 0) {
      return '<p class="no-terms">No custom terms added yet. Add specific words or phrases you want to redact.</p>';
    }
    
    return `
      <ul class="terms-list">
        ${terms.map(term => `
          <li class="term-item">
            <span class="term-text">${term.term}</span>
            <span class="term-replacement">${term.replacement}</span>
            <button class="remove-term-button" data-term-id="${term.id}">✕</button>
          </li>
        `).join('')}
      </ul>
    `;
  }
  
  /**
   * Update custom terms section
   */
  updateCustomTerms() {
    const container = document.getElementById('customTermsList');
    if (container) {
      container.innerHTML = this.renderCustomTerms();
      this.bindCustomTermEvents();
    }
  }
  
  /**
   * Bind events to UI elements
   */
  bindEvents() {
    // Sensitivity slider - default to "maximum" (4)
    const slider = document.getElementById('sensitivitySlider');
    if (slider) {
      // Set default to maximum
      slider.value = 4;
      this.updateSensitivityLabels('maximum');
      
      slider.addEventListener('input', (e) => {
        const newLevel = this.getSensitivityFromValue(parseInt(e.target.value));
        this.updateSensitivityLabels(newLevel);
      });
      
      slider.addEventListener('change', (e) => {
        const newLevel = this.getSensitivityFromValue(parseInt(e.target.value));
        this.ruleManager.setSensitivityLevel(newLevel);
        this.updateSensitivityLabels(newLevel);
        document.querySelector('.sensitivity-description').textContent = this.getSensitivityDescription();
        this.onConfigChange();
        
        // Update protection categories in the sidebar if the function exists
        if (typeof updateProtectionCategories === 'function') {
          updateProtectionCategories();
        }
      });
    }
    
    // View Details buttons
    const viewDetailsButtons = document.querySelectorAll('.view-details-btn');
    viewDetailsButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const categoryId = e.target.dataset.category;
        const templateContainer = document.getElementById(`templates-${categoryId}`);
        
        if (templateContainer) {
          const isVisible = templateContainer.style.display !== 'none';
          templateContainer.style.display = isVisible ? 'none' : 'block';
          e.target.textContent = isVisible ? 'View Details' : 'Hide Details';
        }
      });
    });
    
    // Category toggle master checkboxes
    const categoryToggles = document.querySelectorAll('.category-toggle-input');
    categoryToggles.forEach(toggle => {
      toggle.addEventListener('change', (e) => {
        const categoryId = e.target.dataset.category;
        const categorySection = document.querySelector(`.category-section[data-category="${categoryId}"]`);
        const templateInputs = categorySection.querySelectorAll('.template-input');
        
        // Toggle all template checkboxes within this category
        templateInputs.forEach(input => {
          input.checked = e.target.checked;
          
          // Update the template status in rule manager
          const templateId = input.dataset.template;
          if (e.target.checked) {
            this.ruleManager.enableTemplate(templateId, categoryId);
          } else {
            this.ruleManager.disableTemplate(templateId, categoryId);
          }
        });
        
        // Update category status in rule manager
        if (e.target.checked) {
          this.ruleManager.enableCategory(categoryId);
        } else {
          this.ruleManager.disableCategory(categoryId);
        }
        
        this.onConfigChange();
        
        // Update protection categories in the sidebar if the function exists
        if (typeof updateProtectionCategories === 'function') {
          updateProtectionCategories();
        }
      });
    });
    
    // Individual template checkboxes
    const templateCheckboxes = document.querySelectorAll('.template-input');
    templateCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const templateId = e.target.dataset.template;
        const categoryId = e.target.dataset.category;
        
        if (e.target.checked) {
          this.ruleManager.enableTemplate(templateId, categoryId);
        } else {
          this.ruleManager.disableTemplate(templateId, categoryId);
          
          // Uncheck category toggle if any template is unchecked
          const categoryToggle = document.querySelector(`.category-toggle-input[data-category="${categoryId}"]`);
          if (categoryToggle) {
            categoryToggle.checked = false;
          }
        }
        
        this.onConfigChange();
        
        // Update protection categories in the sidebar if the function exists
        if (typeof updateProtectionCategories === 'function') {
          updateProtectionCategories();
        }
      });
    });
    
    // Add custom term
    const addButton = document.getElementById('addTermButton');
    if (addButton) {
      addButton.addEventListener('click', () => {
        this.addCustomTerm();
      });
    }
    
    // Allow pressing Enter in input to add term
    const termInput = document.getElementById('newTermInput');
    if (termInput) {
      termInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
          this.addCustomTerm();
        }
      });
    }
    
    // Reset button
    const resetButton = document.getElementById('resetButton');
    if (resetButton) {
      resetButton.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset all redaction settings to defaults?')) {
          this.ruleManager.resetToDefaults();
          this.render();
          this.bindEvents();
          this.onConfigChange();
          
          // Update protection categories in the sidebar if the function exists
          if (typeof updateProtectionCategories === 'function') {
            updateProtectionCategories();
          }
        }
      });
    }
    
    this.bindCustomTermEvents();
  }
  
  /**
   * Bind events for custom term list items
   */
  bindCustomTermEvents() {
    const removeButtons = document.querySelectorAll('.remove-term-button');
    removeButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const termId = e.target.dataset.termId;
        this.ruleManager.removeCustomTerm(termId);
        this.updateCustomTerms();
        this.onConfigChange();
        
        // Update protection categories in the sidebar if the function exists
        if (typeof updateProtectionCategories === 'function') {
          updateProtectionCategories();
        }
      });
    });
  }
  
  /**
   * Add a custom term from the input field
   */
  addCustomTerm() {
    const input = document.getElementById('newTermInput');
    const replacementInput = document.getElementById('newTermReplacement');
    
    if (input && input.value.trim()) {
      const term = input.value.trim();
      const replacement = replacementInput && replacementInput.value.trim() 
        ? replacementInput.value.trim() 
        : `[${term.toUpperCase()}]`;
      
      const result = this.ruleManager.addCustomTerm(term, replacement);
      
      if (result.success) {
        input.value = '';
        if (replacementInput) {
          replacementInput.value = '';
        }
        this.updateCustomTerms();
        this.onConfigChange();
        
        // Update protection categories in the sidebar if the function exists
        if (typeof updateProtectionCategories === 'function') {
          updateProtectionCategories();
        }
      } else {
        alert(result.error || 'Failed to add term');
      }
    }
  }
  
  /**
   * Update the sensitivity labels based on selection
   */
  updateSensitivityLabels(newLevel) {
    const labels = document.querySelectorAll('.sensitivity-label');
    const levels = ['basic', 'moderate', 'high', 'maximum'];
    
    labels.forEach((label, index) => {
      if (levels[index] === newLevel) {
        label.classList.add('active');
      } else {
        label.classList.remove('active');
      }
    });
  }
}

export { SimplifiedRedactionUI };