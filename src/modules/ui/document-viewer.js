/**
 * Document Viewer Component
 * 
 * This module provides UI components for viewing documents and their redacted versions.
 */

/**
 * Initialize document viewer
 * @param {string} containerId - ID of the viewer container element
 * @param {Function} onSelectionChange - Callback for when text selection changes
 * @returns {Object} - Document viewer controller
 */
function initDocumentViewer(containerId, onSelectionChange) {
  // Get container element
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container element with ID "${containerId}" not found`);
    return null;
  }
  
  // Create viewer elements
  const viewerElements = createViewerElements();
  container.appendChild(viewerElements.element);
  
  // Set up state for the viewer
  const viewerState = {
    document: null,
    currentPage: 1,
    totalPages: 1,
    mode: 'original', // 'original' or 'redacted'
    showHighlights: true,
    scale: 1.0,
    selections: []
  };
  
  // Set up event listeners
  setupEventListeners(viewerElements, viewerState, onSelectionChange);
  
  /**
   * Load document into the viewer
   * @param {Object} document - Document to display
   */
  function loadDocument(document) {
    viewerState.document = document;
    
    // Reset viewer state
    viewerState.currentPage = 1;
    viewerState.selections = [];
    
    // Update total pages
    if (document.content.pages) {
      viewerState.totalPages = document.content.pages.length;
    } else {
      viewerState.totalPages = 1;
    }
    
    // Render document
    renderDocument(viewerElements, viewerState);
    
    // Update UI controls
    updateUIControls(viewerElements, viewerState);
  }
  
  /**
   * Render document in the viewer
   * @param {Object} elements - Viewer UI elements
   * @param {Object} state - Viewer state
   */
  function renderDocument(elements, state) {
    const document = state.document;
    if (!document) return;
    
    // Clear previous content
    elements.contentArea.innerHTML = '';
    
    // Determine what to display based on document type
    const documentType = document.metadata.extension;
    
    if (['pdf', 'docx', 'doc'].includes(documentType)) {
      renderPaginatedDocument(elements, state);
    } else if (['jpg', 'jpeg', 'png', 'gif'].includes(documentType)) {
      renderImageDocument(elements, state);
    } else {
      renderTextDocument(elements, state);
    }
  }
  
  /**
   * Render paginated document (PDF, DOCX)
   * @param {Object} elements - Viewer UI elements
   * @param {Object} state - Viewer state
   */
  function renderPaginatedDocument(elements, state) {
    const document = state.document;
    
    // Create page container
    const pageContainer = document.createElement('div');
    pageContainer.className = 'document-page-container';
    
    // Handle original vs redacted view
    if (document.content.pages && document.content.pages.length > 0) {
      const pageIndex = state.currentPage - 1;
      
      if (pageIndex >= 0 && pageIndex < document.content.pages.length) {
        // Get the appropriate page content based on view mode
        let pageContent;
        
        if (state.mode === 'redacted' && state.document.redactionResults?.redacted?.pages) {
          // Display redacted content if available
          if (pageIndex < state.document.redactionResults.redacted.pages.length) {
            pageContent = state.document.redactionResults.redacted.pages[pageIndex];
          } else {
            console.warn('Redacted page not found');
            pageContent = document.content.pages[pageIndex];
          }
        } else {
          // Display original content
          pageContent = document.content.pages[pageIndex];
        }
        
        // Create page element
        const pageElement = document.createElement('div');
        pageElement.className = 'document-page';
        
        if (document.content.pdfUrl && state.mode === 'original') {
          // Use PDF viewer for original PDF documents
          const pdfEmbed = document.createElement('iframe');
          pdfEmbed.className = 'pdf-embed';
          pdfEmbed.src = document.content.pdfUrl + '#page=' + state.currentPage;
          pageElement.appendChild(pdfEmbed);
        } else {
          // For text or redacted content
          const contentDiv = document.createElement('div');
          contentDiv.className = 'document-page-content';
          
          if (state.mode === 'redacted' && state.showHighlights) {
            // Display with highlighted redactions
            contentDiv.innerHTML = formatRedactedText(pageContent.text);
          } else {
            // Display plain text
            contentDiv.textContent = pageContent.text;
          }
          
          pageElement.appendChild(contentDiv);
        }
        
        pageContainer.appendChild(pageElement);
      }
    }
    
    elements.contentArea.appendChild(pageContainer);
  }
  
  /**
   * Format redacted text to highlight the redactions
   * @param {string} text - The redacted text
   * @returns {string} - HTML formatted text with highlighted redactions
   */
  function formatRedactedText(text) {
    if (!text) return '';
    
    // Replace typical redaction markers with highlighted spans
    // This is a simple implementation - could be improved to match specific patterns
    const redactionPatterns = [
      // Match [REDACTED], [EMAIL], etc.
      { pattern: /\[(REDACTED|EMAIL|PHONE|SSN|NAME|ADDRESS|IP_ADDRESS|DATE|CREDIT_CARD)[^\]]*\]/g, 
        replacement: '<span class="redacted-text">$&</span>' },
      
      // Match X's (for character replacement)
      { pattern: /X{4,}/g, 
        replacement: '<span class="redacted-text">$&</span>' }
    ];
    
    let formattedText = text;
    
    // Apply each pattern
    redactionPatterns.forEach(({ pattern, replacement }) => {
      formattedText = formattedText.replace(pattern, replacement);
    });
    
    // Convert newlines to <br> tags
    formattedText = formattedText.replace(/\n/g, '<br>');
    
    return formattedText;
  }
  
  /**
   * Render image document
   * @param {Object} elements - Viewer UI elements
   * @param {Object} state - Viewer state
   */
  function renderImageDocument(elements, state) {
    const document = state.document;
    
    // Create image container
    const imageContainer = document.createElement('div');
    imageContainer.className = 'document-image-container';
    
    // Create image element
    const imageElement = document.createElement('img');
    imageElement.className = 'document-image';
    imageElement.src = document.content.imageUrl;
    imageElement.alt = document.metadata.name;
    
    imageContainer.appendChild(imageElement);
    elements.contentArea.appendChild(imageContainer);
  }
  
  /**
   * Render text document
   * @param {Object} elements - Viewer UI elements
   * @param {Object} state - Viewer state
   */
  function renderTextDocument(elements, state) {
    const document = state.document;
    
    // Create text container
    const textContainer = document.createElement('div');
    textContainer.className = 'document-text-container';
    
    // Create pre element for text
    const textElement = document.createElement('pre');
    textElement.className = 'document-text';
    textElement.textContent = document.content.text;
    
    textContainer.appendChild(textElement);
    elements.contentArea.appendChild(textContainer);
  }
  
  /**
   * Update UI controls based on viewer state
   * @param {Object} elements - Viewer UI elements
   * @param {Object} state - Viewer state
   */
  function updateUIControls(elements, state) {
    // Update page counter
    elements.pageCounter.textContent = `Page ${state.currentPage} of ${state.totalPages}`;
    
    // Update pagination buttons
    elements.prevPageButton.disabled = state.currentPage <= 1;
    elements.nextPageButton.disabled = state.currentPage >= state.totalPages;
    
    // Update view mode buttons
    elements.originalButton.classList.toggle('active', state.mode === 'original');
    elements.redactedButton.classList.toggle('active', state.mode === 'redacted');
    
    // Show/hide pagination controls based on total pages
    elements.paginationControls.style.display = state.totalPages > 1 ? 'flex' : 'none';
  }
  
  /**
   * Go to specified page
   * @param {number} pageNumber - Page number to display
   */
  function goToPage(pageNumber) {
    if (pageNumber < 1 || pageNumber > viewerState.totalPages) return;
    
    viewerState.currentPage = pageNumber;
    renderDocument(viewerElements, viewerState);
    updateUIControls(viewerElements, viewerState);
  }
  
  /**
   * Toggle between original and redacted view
   * @param {string} mode - 'original' or 'redacted'
   */
  function setViewMode(mode) {
    if (mode !== 'original' && mode !== 'redacted') return;
    
    viewerState.mode = mode;
    renderDocument(viewerElements, viewerState);
    updateUIControls(viewerElements, viewerState);
  }
  
  /**
   * Toggle highlight visibility
   * @param {boolean} showHighlights - Whether to show redaction highlights
   */
  function toggleHighlights(showHighlights) {
    viewerState.showHighlights = showHighlights;
    renderDocument(viewerElements, viewerState);
  }
  
  /**
   * Set zoom level
   * @param {number} scale - Zoom scale (1.0 = 100%)
   */
  function setZoom(scale) {
    viewerState.scale = scale;
    
    // Apply zoom to content
    viewerElements.contentArea.style.transform = `scale(${scale})`;
    viewerElements.contentArea.style.transformOrigin = 'top left';
  }
  
  /**
   * Create viewer UI elements
   * @returns {Object} - Viewer UI elements
   */
  function createViewerElements() {
    // Create main container
    const element = document.createElement('div');
    element.className = 'document-viewer';
    
    // Create toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 'document-viewer-toolbar';
    
    // Create view mode buttons
    const viewModeGroup = document.createElement('div');
    viewModeGroup.className = 'toolbar-group';
    
    const originalButton = document.createElement('button');
    originalButton.className = 'toolbar-button active';
    originalButton.textContent = 'Original';
    
    const redactedButton = document.createElement('button');
    redactedButton.className = 'toolbar-button';
    redactedButton.textContent = 'Redacted';
    
    viewModeGroup.appendChild(originalButton);
    viewModeGroup.appendChild(redactedButton);
    
    // Create pagination controls
    const paginationControls = document.createElement('div');
    paginationControls.className = 'toolbar-group pagination-controls';
    
    const prevPageButton = document.createElement('button');
    prevPageButton.className = 'toolbar-button';
    prevPageButton.textContent = '←';
    prevPageButton.title = 'Previous Page';
    
    const pageCounter = document.createElement('span');
    pageCounter.className = 'page-counter';
    pageCounter.textContent = 'Page 1 of 1';
    
    const nextPageButton = document.createElement('button');
    nextPageButton.className = 'toolbar-button';
    nextPageButton.textContent = '→';
    nextPageButton.title = 'Next Page';
    
    paginationControls.appendChild(prevPageButton);
    paginationControls.appendChild(pageCounter);
    paginationControls.appendChild(nextPageButton);
    
    // Create zoom controls
    const zoomControls = document.createElement('div');
    zoomControls.className = 'toolbar-group zoom-controls';
    
    const zoomOutButton = document.createElement('button');
    zoomOutButton.className = 'toolbar-button';
    zoomOutButton.textContent = '-';
    zoomOutButton.title = 'Zoom Out';
    
    const zoomLabel = document.createElement('span');
    zoomLabel.className = 'zoom-label';
    zoomLabel.textContent = '100%';
    
    const zoomInButton = document.createElement('button');
    zoomInButton.className = 'toolbar-button';
    zoomInButton.textContent = '+';
    zoomInButton.title = 'Zoom In';
    
    zoomControls.appendChild(zoomOutButton);
    zoomControls.appendChild(zoomLabel);
    zoomControls.appendChild(zoomInButton);
    
    // Assemble toolbar
    toolbar.appendChild(viewModeGroup);
    toolbar.appendChild(paginationControls);
    toolbar.appendChild(zoomControls);
    
    // Create content area
    const contentArea = document.createElement('div');
    contentArea.className = 'document-viewer-content';
    
    // Create message overlay for empty state
    const messageOverlay = document.createElement('div');
    messageOverlay.className = 'document-viewer-message';
    messageOverlay.textContent = 'No document loaded';
    
    // Assemble viewer
    element.appendChild(toolbar);
    element.appendChild(contentArea);
    element.appendChild(messageOverlay);
    
    return {
      element,
      toolbar,
      contentArea,
      messageOverlay,
      originalButton,
      redactedButton,
      paginationControls,
      prevPageButton,
      pageCounter,
      nextPageButton,
      zoomControls,
      zoomOutButton,
      zoomLabel,
      zoomInButton
    };
  }
  
  /**
   * Set up event listeners for viewer interactions
   * @param {Object} elements - Viewer UI elements
   * @param {Object} state - Viewer state
   * @param {Function} onSelectionChange - Callback for selection changes
   */
  function setupEventListeners(elements, state, onSelectionChange) {
    // Pagination
    elements.prevPageButton.addEventListener('click', () => {
      goToPage(state.currentPage - 1);
    });
    
    elements.nextPageButton.addEventListener('click', () => {
      goToPage(state.currentPage + 1);
    });
    
    // View mode
    elements.originalButton.addEventListener('click', () => {
      setViewMode('original');
    });
    
    elements.redactedButton.addEventListener('click', () => {
      setViewMode('redacted');
    });
    
    // Zoom
    elements.zoomInButton.addEventListener('click', () => {
      const newScale = Math.min(state.scale + 0.1, 3.0);
      setZoom(newScale);
      elements.zoomLabel.textContent = `${Math.round(newScale * 100)}%`;
    });
    
    elements.zoomOutButton.addEventListener('click', () => {
      const newScale = Math.max(state.scale - 0.1, 0.5);
      setZoom(newScale);
      elements.zoomLabel.textContent = `${Math.round(newScale * 100)}%`;
    });
    
    // Text selection for manual redaction
    elements.contentArea.addEventListener('mouseup', () => {
      if (typeof onSelectionChange === 'function') {
        const selection = window.getSelection();
        if (selection.toString().trim()) {
          onSelectionChange(selection, state.currentPage);
        }
      }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (event) => {
      if (!state.document) return;
      
      switch (event.key) {
        case 'ArrowLeft':
          if (!elements.prevPageButton.disabled) {
            goToPage(state.currentPage - 1);
          }
          break;
        case 'ArrowRight':
          if (!elements.nextPageButton.disabled) {
            goToPage(state.currentPage + 1);
          }
          break;
        case 'Home':
          goToPage(1);
          break;
        case 'End':
          goToPage(state.totalPages);
          break;
      }
    });
  }
  
  // Return controller object
  return {
    loadDocument,
    goToPage,
    setViewMode,
    toggleHighlights,
    setZoom,
    getState: () => ({ ...viewerState }),
    getElements: () => viewerElements
  };
}

export { initDocumentViewer };