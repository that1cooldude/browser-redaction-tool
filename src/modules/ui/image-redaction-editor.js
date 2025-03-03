/**
 * Image Redaction Editor UI Component
 * 
 * This module provides UI for visually redacting images through
 * an interactive editor with drawing tools.
 */

/**
 * Initialize image redaction editor
 * @param {string} containerId - ID of the container element
 * @param {Function} onRedactionComplete - Callback when redaction is complete
 * @returns {Object} - Editor controller
 */
function initImageRedactionEditor(containerId, onRedactionComplete) {
  // Get container element
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container element with ID "${containerId}" not found`);
    return null;
  }
  
  // Create editor UI elements
  const editorUI = createEditorUI();
  container.appendChild(editorUI.element);
  
  // Initialize state
  const editorState = {
    currentMode: 'box', // box, text, auto
    scale: 1,
    imageLoaded: false,
    redactions: [],
    originalImageData: null,
    selectedRedactionIndex: -1,
    isDragging: false,
    startX: 0,
    startY: 0,
    drawing: false
  };
  
  // Set up event listeners
  setupEventListeners(editorUI, editorState, onRedactionComplete);
  
  /**
   * Load image into the editor
   * @param {string} imageUrl - URL of the image to load
   * @param {Array} existingRedactions - Optional array of existing redactions
   */
  function loadImage(imageUrl, existingRedactions = []) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      
      image.onload = function() {
        const canvas = editorUI.canvas;
        const ctx = canvas.getContext('2d');
        
        // Size canvas to match image dimensions
        canvas.width = image.width;
        canvas.height = image.height;
        
        // Draw image on canvas
        ctx.drawImage(image, 0, 0);
        
        // Store original image data
        editorState.originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Set image loaded flag
        editorState.imageLoaded = true;
        
        // Clear any existing redactions
        editorState.redactions = existingRedactions || [];
        
        // Reset scale
        editorState.scale = 1;
        updateZoomIndicator(editorUI, editorState);
        
        // Apply existing redactions
        if (existingRedactions && existingRedactions.length > 0) {
          drawAllRedactions(editorUI, editorState);
        }
        
        // Enable editing
        editorUI.toolsContainer.removeAttribute('disabled');
        editorUI.redactButton.removeAttribute('disabled');
        
        // Show canvas, hide loading and empty states
        editorUI.loadingState.style.display = 'none';
        editorUI.emptyState.style.display = 'none';
        editorUI.canvas.style.display = 'block';
        
        resolve();
      };
      
      image.onerror = function() {
        reject(new Error('Failed to load image'));
      };
      
      // Show loading state
      editorUI.canvas.style.display = 'none';
      editorUI.emptyState.style.display = 'none';
      editorUI.loadingState.style.display = 'flex';
      
      // Load the image
      image.src = imageUrl;
    });
  }
  
  /**
   * Apply OCR to detect text regions automatically
   */
  function detectTextRegions() {
    if (!editorState.imageLoaded) return;
    
    // Show loading state with message
    editorUI.loadingState.style.display = 'flex';
    editorUI.loadingMessage.textContent = 'Detecting text regions...';
    
    // In a real implementation, this would call the OCR service
    // For now, we'll simulate with a timeout and dummy regions
    setTimeout(() => {
      // Dummy regions for demonstration
      const regions = [
        { x: 50, y: 50, width: 200, height: 30, text: 'Detected Text 1' },
        { x: 100, y: 100, width: 150, height: 30, text: 'Detected Text 2' },
        { x: 150, y: 200, width: 180, height: 30, text: 'Detected Text 3' }
      ];
      
      // Add detected regions to redactions array
      regions.forEach(region => {
        editorState.redactions.push({
          type: 'box',
          x: region.x,
          y: region.y,
          width: region.width,
          height: region.height,
          text: region.text,
          replacement: '[REDACTED]',
          showReplacement: true
        });
      });
      
      // Draw all redactions
      drawAllRedactions(editorUI, editorState);
      
      // Hide loading state
      editorUI.loadingState.style.display = 'none';
      editorUI.canvas.style.display = 'block';
      
      // Update redaction list
      updateRedactionList(editorUI, editorState);
    }, 1500);
  }
  
  /**
   * Save the redacted image
   * @returns {Promise<Blob>} - Blob containing the redacted image
   */
  function saveRedactedImage() {
    return new Promise((resolve, reject) => {
      if (!editorState.imageLoaded) {
        reject(new Error('No image loaded'));
        return;
      }
      
      try {
        // Get canvas data
        const canvas = editorUI.canvas;
        
        // Convert to blob
        canvas.toBlob(blob => {
          resolve(blob);
        });
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * Get redaction data
   * @returns {Array} - Array of redaction objects
   */
  function getRedactions() {
    return [...editorState.redactions];
  }
  
  // Return controller object
  return {
    loadImage,
    detectTextRegions,
    saveRedactedImage,
    getRedactions,
    element: editorUI.element
  };
}

/**
 * Create editor UI elements
 * @returns {Object} - Editor UI elements
 */
function createEditorUI() {
  // Create main container
  const element = document.createElement('div');
  element.className = 'image-redaction-editor';
  
  // Create tools container
  const toolsContainer = document.createElement('div');
  toolsContainer.className = 'redaction-tools';
  toolsContainer.setAttribute('disabled', '');
  toolsContainer.innerHTML = `
    <div class="tool-group">
      <button class="tool-button active" data-tool="box" title="Draw Redaction Box">
        <i class="icon-box"></i>
      </button>
      <button class="tool-button" data-tool="text" title="Add Redaction Text">
        <i class="icon-text"></i>
      </button>
      <button class="tool-button" data-tool="auto" title="Auto-Detect Text">
        <i class="icon-auto"></i>
      </button>
    </div>
    <div class="tool-group">
      <button class="tool-button" id="zoom-in-btn" title="Zoom In">
        <i class="icon-zoom-in">+</i>
      </button>
      <span class="zoom-level">100%</span>
      <button class="tool-button" id="zoom-out-btn" title="Zoom Out">
        <i class="icon-zoom-out">-</i>
      </button>
    </div>
    <div class="tool-group">
      <button class="tool-button" id="undo-btn" title="Undo" disabled>
        <i class="icon-undo">↩</i>
      </button>
      <button class="tool-button" id="clear-all-btn" title="Clear All">
        <i class="icon-clear">✕</i>
      </button>
    </div>
  `;
  
  // Create editor area
  const editorArea = document.createElement('div');
  editorArea.className = 'editor-area';
  
  // Create canvas container (for scrolling and zooming)
  const canvasContainer = document.createElement('div');
  canvasContainer.className = 'canvas-container';
  
  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.className = 'redaction-canvas';
  canvas.width = 800;
  canvas.height = 600;
  canvas.style.display = 'none';
  
  // Create loading state
  const loadingState = document.createElement('div');
  loadingState.className = 'editor-loading';
  loadingState.style.display = 'none';
  loadingState.innerHTML = `
    <div class="spinner"></div>
    <p class="loading-message">Loading image...</p>
  `;
  
  // Create empty state
  const emptyState = document.createElement('div');
  emptyState.className = 'editor-empty';
  emptyState.innerHTML = `
    <i class="icon-image">🖼️</i>
    <p>Load an image to begin redaction</p>
  `;
  
  // Append canvas to container
  canvasContainer.appendChild(canvas);
  canvasContainer.appendChild(loadingState);
  canvasContainer.appendChild(emptyState);
  
  // Create redaction list
  const redactionList = document.createElement('div');
  redactionList.className = 'redaction-list';
  redactionList.innerHTML = `
    <div class="redaction-list-header">
      <h3>Redaction Areas</h3>
    </div>
    <div class="redaction-items"></div>
  `;
  
  // Create settings panel
  const settingsPanel = document.createElement('div');
  settingsPanel.className = 'redaction-settings';
  settingsPanel.innerHTML = `
    <div class="settings-header">
      <h3>Redaction Settings</h3>
    </div>
    <div class="settings-form">
      <div class="form-group">
        <label for="replacement-text">Replacement Text</label>
        <input type="text" id="replacement-text" class="form-control" value="[REDACTED]">
      </div>
      <div class="form-group checkbox">
        <input type="checkbox" id="show-replacement" checked>
        <label for="show-replacement">Show replacement text</label>
      </div>
      <div class="form-group">
        <label for="redaction-color">Redaction Color</label>
        <input type="color" id="redaction-color" class="form-control" value="#000000">
      </div>
    </div>
  `;
  
  // Create action buttons
  const actionButtons = document.createElement('div');
  actionButtons.className = 'editor-actions';
  
  const redactButton = document.createElement('button');
  redactButton.className = 'btn btn-primary';
  redactButton.textContent = 'Apply Redactions';
  redactButton.id = 'apply-redactions-btn';
  redactButton.setAttribute('disabled', '');
  
  const cancelButton = document.createElement('button');
  cancelButton.className = 'btn btn-outline';
  cancelButton.textContent = 'Cancel';
  cancelButton.id = 'cancel-redaction-btn';
  
  actionButtons.appendChild(cancelButton);
  actionButtons.appendChild(redactButton);
  
  // Assemble sidebar
  const sidebar = document.createElement('div');
  sidebar.className = 'editor-sidebar';
  sidebar.appendChild(redactionList);
  sidebar.appendChild(settingsPanel);
  
  // Assemble editor area
  editorArea.appendChild(canvasContainer);
  editorArea.appendChild(sidebar);
  
  // Assemble main container
  element.appendChild(toolsContainer);
  element.appendChild(editorArea);
  element.appendChild(actionButtons);
  
  return {
    element,
    toolsContainer,
    canvasContainer,
    canvas,
    loadingState,
    loadingMessage: loadingState.querySelector('.loading-message'),
    emptyState,
    redactionList: redactionList.querySelector('.redaction-items'),
    redactButton,
    cancelButton,
    zoomInButton: toolsContainer.querySelector('#zoom-in-btn'),
    zoomOutButton: toolsContainer.querySelector('#zoom-out-btn'),
    zoomLevel: toolsContainer.querySelector('.zoom-level'),
    undoButton: toolsContainer.querySelector('#undo-btn'),
    clearAllButton: toolsContainer.querySelector('#clear-all-btn'),
    replacementInput: settingsPanel.querySelector('#replacement-text'),
    showReplacementCheckbox: settingsPanel.querySelector('#show-replacement'),
    redactionColorInput: settingsPanel.querySelector('#redaction-color'),
    toolButtons: toolsContainer.querySelectorAll('[data-tool]')
  };
}

/**
 * Set up event listeners for the editor
 * @param {Object} editorUI - Editor UI elements
 * @param {Object} state - Editor state
 * @param {Function} onRedactionComplete - Callback when redaction is complete
 */
function setupEventListeners(editorUI, state, onRedactionComplete) {
  const { 
    canvas, 
    zoomInButton, 
    zoomOutButton,
    undoButton,
    clearAllButton,
    toolButtons,
    redactButton,
    cancelButton,
    replacementInput,
    showReplacementCheckbox,
    redactionColorInput 
  } = editorUI;
  
  // Canvas drawing events
  canvas.addEventListener('mousedown', (e) => {
    if (!state.imageLoaded) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    state.startX = (e.clientX - rect.left) * scaleX;
    state.startY = (e.clientY - rect.top) * scaleY;
    
    // Check if we're clicking on an existing redaction
    const clickedIndex = findRedactionAtPosition(state, state.startX, state.startY);
    
    if (clickedIndex >= 0) {
      state.selectedRedactionIndex = clickedIndex;
      state.isDragging = true;
      
      // Redraw to highlight the selected redaction
      drawAllRedactions(editorUI, state);
    } else {
      // Start drawing new redaction
      state.drawing = true;
      state.selectedRedactionIndex = -1;
      
      if (state.currentMode === 'box') {
        // For box mode, we'll start drawing a rectangle
        state.currentRedaction = {
          type: 'box',
          x: state.startX,
          y: state.startY,
          width: 0,
          height: 0,
          replacement: replacementInput.value,
          showReplacement: showReplacementCheckbox.checked
        };
      }
    }
  });
  
  canvas.addEventListener('mousemove', (e) => {
    if (!state.imageLoaded) return;
    if (!state.drawing && !state.isDragging) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const currentX = (e.clientX - rect.left) * scaleX;
    const currentY = (e.clientY - rect.top) * scaleY;
    
    if (state.isDragging && state.selectedRedactionIndex >= 0) {
      // Move the selected redaction
      const redaction = state.redactions[state.selectedRedactionIndex];
      const deltaX = currentX - state.startX;
      const deltaY = currentY - state.startY;
      
      redaction.x += deltaX;
      redaction.y += deltaY;
      
      // Update start position for next move
      state.startX = currentX;
      state.startY = currentY;
      
      // Redraw
      drawAllRedactions(editorUI, state);
    } else if (state.drawing) {
      // For box mode, update the rectangle dimensions
      if (state.currentMode === 'box' && state.currentRedaction) {
        state.currentRedaction.width = currentX - state.currentRedaction.x;
        state.currentRedaction.height = currentY - state.currentRedaction.y;
        
        // Redraw with the current redaction
        drawAllRedactions(editorUI, state);
        drawCurrentRedaction(editorUI, state);
      }
    }
  });
  
  canvas.addEventListener('mouseup', () => {
    if (!state.imageLoaded) return;
    
    if (state.drawing && state.currentMode === 'box' && state.currentRedaction) {
      // Normalize rectangle if dimensions are negative
      if (state.currentRedaction.width < 0) {
        state.currentRedaction.x += state.currentRedaction.width;
        state.currentRedaction.width = Math.abs(state.currentRedaction.width);
      }
      
      if (state.currentRedaction.height < 0) {
        state.currentRedaction.y += state.currentRedaction.height;
        state.currentRedaction.height = Math.abs(state.currentRedaction.height);
      }
      
      // Only add if the box has a meaningful size
      if (state.currentRedaction.width > 5 && state.currentRedaction.height > 5) {
        state.redactions.push({ ...state.currentRedaction });
        
        // Enable undo button
        undoButton.removeAttribute('disabled');
        
        // Update redaction list
        updateRedactionList(editorUI, state);
      }
    }
    
    // Reset drawing state
    state.drawing = false;
    state.isDragging = false;
    state.currentRedaction = null;
    
    // Redraw all redactions
    drawAllRedactions(editorUI, state);
  });
  
  // Tool selection
  toolButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all tools
      toolButtons.forEach(btn => btn.classList.remove('active'));
      
      // Add active class to selected tool
      button.classList.add('active');
      
      // Update current mode
      state.currentMode = button.dataset.tool;
      
      // If auto detect is selected, run detection
      if (state.currentMode === 'auto') {
        detectTextRegions(editorUI, state);
        
        // Switch back to box mode after detection
        setTimeout(() => {
          state.currentMode = 'box';
          toolButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === 'box');
          });
        }, 1500);
      }
    });
  });
  
  // Zoom controls
  zoomInButton.addEventListener('click', () => {
    if (!state.imageLoaded) return;
    
    state.scale = Math.min(state.scale + 0.1, 3);
    updateZoomIndicator(editorUI, state);
    applyZoom(editorUI.canvas, state.scale);
  });
  
  zoomOutButton.addEventListener('click', () => {
    if (!state.imageLoaded) return;
    
    state.scale = Math.max(state.scale - 0.1, 0.5);
    updateZoomIndicator(editorUI, state);
    applyZoom(editorUI.canvas, state.scale);
  });
  
  // Undo button
  undoButton.addEventListener('click', () => {
    if (!state.imageLoaded || state.redactions.length === 0) return;
    
    // Remove the last redaction
    state.redactions.pop();
    
    // Disable undo if no more redactions
    if (state.redactions.length === 0) {
      undoButton.setAttribute('disabled', '');
    }
    
    // Update redaction list
    updateRedactionList(editorUI, state);
    
    // Redraw
    drawAllRedactions(editorUI, state);
  });
  
  // Clear all button
  clearAllButton.addEventListener('click', () => {
    if (!state.imageLoaded || state.redactions.length === 0) return;
    
    if (confirm('Are you sure you want to clear all redactions?')) {
      // Clear all redactions
      state.redactions = [];
      
      // Disable undo
      undoButton.setAttribute('disabled', '');
      
      // Update redaction list
      updateRedactionList(editorUI, state);
      
      // Redraw
      const ctx = canvas.getContext('2d');
      ctx.putImageData(state.originalImageData, 0, 0);
    }
  });
  
  // Apply redactions button
  redactButton.addEventListener('click', () => {
    if (!state.imageLoaded || state.redactions.length === 0) return;
    
    // Apply all redactions permanently
    applyRedactionsPermanently(editorUI, state);
    
    // Call the completion callback
    if (typeof onRedactionComplete === 'function') {
      onRedactionComplete({
        redactions: state.redactions,
        canvas: canvas
      });
    }
  });
  
  // Cancel button
  cancelButton.addEventListener('click', () => {
    if (typeof onRedactionComplete === 'function') {
      onRedactionComplete({ cancelled: true });
    }
  });
  
  // Redaction settings
  replacementInput.addEventListener('input', () => {
    // Update currently selected redaction replacement text
    if (state.selectedRedactionIndex >= 0) {
      state.redactions[state.selectedRedactionIndex].replacement = replacementInput.value;
      drawAllRedactions(editorUI, state);
      updateRedactionList(editorUI, state);
    }
  });
  
  showReplacementCheckbox.addEventListener('change', () => {
    // Update currently selected redaction show replacement setting
    if (state.selectedRedactionIndex >= 0) {
      state.redactions[state.selectedRedactionIndex].showReplacement = showReplacementCheckbox.checked;
      drawAllRedactions(editorUI, state);
    }
  });
}

/**
 * Draw all redactions on the canvas
 * @param {Object} editorUI - Editor UI elements
 * @param {Object} state - Editor state
 */
function drawAllRedactions(editorUI, state) {
  const canvas = editorUI.canvas;
  const ctx = canvas.getContext('2d');
  
  // Reset canvas to original image
  if (state.originalImageData) {
    ctx.putImageData(state.originalImageData, 0, 0);
  }
  
  // Draw each redaction
  state.redactions.forEach((redaction, index) => {
    const isSelected = index === state.selectedRedactionIndex;
    
    if (redaction.type === 'box') {
      // Draw redaction box
      ctx.fillStyle = '#000000'; // Black redaction box
      ctx.fillRect(redaction.x, redaction.y, redaction.width, redaction.height);
      
      // Draw selection indicator if selected
      if (isSelected) {
        ctx.strokeStyle = '#FF0000'; // Red outline for selected redaction
        ctx.lineWidth = 2;
        ctx.strokeRect(
          redaction.x - 2, 
          redaction.y - 2, 
          redaction.width + 4, 
          redaction.height + 4
        );
      }
      
      // Draw replacement text if enabled
      if (redaction.showReplacement && redaction.replacement) {
        ctx.fillStyle = '#FFFFFF'; // White text
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Ensure text fits within the box
        const maxWidth = redaction.width - 10;
        const centerX = redaction.x + (redaction.width / 2);
        const centerY = redaction.y + (redaction.height / 2);
        
        ctx.fillText(
          redaction.replacement, 
          centerX, 
          centerY, 
          maxWidth
        );
      }
    }
  });
}

/**
 * Draw the current redaction being created
 * @param {Object} editorUI - Editor UI elements
 * @param {Object} state - Editor state
 */
function drawCurrentRedaction(editorUI, state) {
  if (!state.currentRedaction) return;
  
  const canvas = editorUI.canvas;
  const ctx = canvas.getContext('2d');
  
  if (state.currentRedaction.type === 'box') {
    // Draw semi-transparent box for the in-progress redaction
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(
      state.currentRedaction.x,
      state.currentRedaction.y,
      state.currentRedaction.width,
      state.currentRedaction.height
    );
    
    // Draw border
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      state.currentRedaction.x,
      state.currentRedaction.y,
      state.currentRedaction.width,
      state.currentRedaction.height
    );
  }
}

/**
 * Apply all redactions permanently to the image
 * @param {Object} editorUI - Editor UI elements
 * @param {Object} state - Editor state
 */
function applyRedactionsPermanently(editorUI, state) {
  const canvas = editorUI.canvas;
  const ctx = canvas.getContext('2d');
  
  // Update original image data to include redactions
  state.originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  // Disable editing
  state.redactions = [];
  state.selectedRedactionIndex = -1;
  
  // Update redaction list
  updateRedactionList(editorUI, state);
  
  // Disable undo
  editorUI.undoButton.setAttribute('disabled', '');
}

/**
 * Find a redaction at the given position
 * @param {Object} state - Editor state
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {number} - Index of the redaction, or -1 if none found
 */
function findRedactionAtPosition(state, x, y) {
  // Iterate in reverse to handle overlapping redactions (top one gets selected)
  for (let i = state.redactions.length - 1; i >= 0; i--) {
    const redaction = state.redactions[i];
    
    if (redaction.type === 'box') {
      // Check if point is inside box
      if (
        x >= redaction.x && 
        x <= redaction.x + redaction.width &&
        y >= redaction.y && 
        y <= redaction.y + redaction.height
      ) {
        return i;
      }
    }
  }
  
  return -1;
}

/**
 * Update the redaction list in the sidebar
 * @param {Object} editorUI - Editor UI elements
 * @param {Object} state - Editor state
 */
function updateRedactionList(editorUI, state) {
  const listContainer = editorUI.redactionList;
  
  // Clear current list
  listContainer.innerHTML = '';
  
  if (state.redactions.length === 0) {
    // Show empty state
    const emptyState = document.createElement('div');
    emptyState.className = 'redaction-empty-state';
    emptyState.textContent = 'No redaction areas defined';
    listContainer.appendChild(emptyState);
    return;
  }
  
  // Create a list item for each redaction
  state.redactions.forEach((redaction, index) => {
    const item = document.createElement('div');
    item.className = 'redaction-item';
    if (index === state.selectedRedactionIndex) {
      item.classList.add('selected');
    }
    
    // Determine a label for the redaction
    let label = `Redaction #${index + 1}`;
    if (redaction.text) {
      label = redaction.text.length > 20 
        ? `${redaction.text.substring(0, 20)}...` 
        : redaction.text;
    }
    
    const deleteButton = document.createElement('button');
    deleteButton.className = 'redaction-item-delete';
    deleteButton.innerHTML = '×';
    deleteButton.title = 'Delete this redaction';
    
    const itemText = document.createElement('span');
    itemText.className = 'redaction-item-text';
    itemText.textContent = label;
    
    item.appendChild(itemText);
    item.appendChild(deleteButton);
    
    // Add event listeners
    item.addEventListener('click', (e) => {
      if (e.target !== deleteButton) {
        // Select this redaction
        state.selectedRedactionIndex = index;
        
        // Update selection in the list
        const items = listContainer.querySelectorAll('.redaction-item');
        items.forEach((el, i) => {
          el.classList.toggle('selected', i === index);
        });
        
        // Update form with this redaction's settings
        editorUI.replacementInput.value = redaction.replacement || '[REDACTED]';
        editorUI.showReplacementCheckbox.checked = redaction.showReplacement !== false;
        
        // Redraw to show selection
        drawAllRedactions(editorUI, state);
      }
    });
    
    deleteButton.addEventListener('click', () => {
      // Remove this redaction
      state.redactions.splice(index, 1);
      
      // Reset selection if the selected redaction was deleted
      if (state.selectedRedactionIndex === index) {
        state.selectedRedactionIndex = -1;
      } else if (state.selectedRedactionIndex > index) {
        // Adjust selection index if a redaction before it was deleted
        state.selectedRedactionIndex--;
      }
      
      // Disable undo if no more redactions
      if (state.redactions.length === 0) {
        editorUI.undoButton.setAttribute('disabled', '');
      }
      
      // Update redaction list
      updateRedactionList(editorUI, state);
      
      // Redraw
      drawAllRedactions(editorUI, state);
    });
    
    listContainer.appendChild(item);
  });
}

/**
 * Update zoom level indicator
 * @param {Object} editorUI - Editor UI elements
 * @param {Object} state - Editor state
 */
function updateZoomIndicator(editorUI, state) {
  editorUI.zoomLevel.textContent = `${Math.round(state.scale * 100)}%`;
}

/**
 * Apply zoom to canvas
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {number} scale - Scale factor
 */
function applyZoom(canvas, scale) {
  canvas.style.transform = `scale(${scale})`;
  canvas.style.transformOrigin = 'top left';
}

export { initImageRedactionEditor };