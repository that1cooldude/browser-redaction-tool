/**
 * Document Uploader UI Component
 * 
 * This module provides UI components for document upload, including
 * drag-and-drop functionality and file validation.
 */

import { isSupportedFileType, formatFileSize } from '../../utils/file-utils.js';

/**
 * Initialize document uploader UI
 * @param {string} containerId - ID of the container element
 * @param {Function} onFileSelected - Callback function when files are selected
 * @returns {Object} - UI controller object
 */
function initDocumentUploader(containerId, onFileSelected) {
  // Get container element
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container element with ID "${containerId}" not found`);
    return null;
  }
  
  // Create uploader UI elements
  const uploaderUI = createUploaderUI();
  container.appendChild(uploaderUI.element);
  
  // Set up event listeners
  setupEventListeners(uploaderUI, onFileSelected);
  
  // Return controller object
  return {
    setLoading: (isLoading) => setLoaderState(uploaderUI, isLoading),
    showError: (message) => showErrorMessage(uploaderUI, message),
    reset: () => resetUploader(uploaderUI),
    setAcceptedFileTypes: (types) => setAcceptedFileTypes(uploaderUI, types),
    element: uploaderUI.element
  };
}

/**
 * Create uploader UI elements
 * @returns {Object} - Uploader UI elements
 */
function createUploaderUI() {
  // Create main container
  const element = document.createElement('div');
  element.className = 'document-uploader';
  
  // Create drop zone
  const dropZone = document.createElement('div');
  dropZone.className = 'drop-zone';
  dropZone.innerHTML = `
    <div class="drop-zone-prompt">
      <i class="icon-upload"></i>
      <p>Drag and drop your document here, or <span class="browse-link">browse</span></p>
      <p class="file-types">Supported file types: PDF, DOCX, TXT, Images, CSV, JSON</p>
    </div>
    <div class="drop-zone-loader" hidden>
      <div class="spinner"></div>
      <p>Processing document...</p>
    </div>
    <div class="drop-zone-error" hidden>
      <i class="icon-error"></i>
      <p class="error-message"></p>
      <button class="retry-button">Try Again</button>
    </div>
  `;
  
  // Create file input (hidden)
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.className = 'file-input';
  fileInput.setAttribute('hidden', '');
  fileInput.setAttribute('accept', '.pdf,.txt,.docx,.doc,.jpg,.jpeg,.png,.csv,.json,.xlsx,.xls');
  
  // Assemble components
  element.appendChild(dropZone);
  element.appendChild(fileInput);
  
  return {
    element,
    dropZone,
    fileInput,
    prompt: dropZone.querySelector('.drop-zone-prompt'),
    loader: dropZone.querySelector('.drop-zone-loader'),
    error: dropZone.querySelector('.drop-zone-error'),
    errorMessage: dropZone.querySelector('.error-message'),
    retryButton: dropZone.querySelector('.retry-button'),
    browseLink: dropZone.querySelector('.browse-link')
  };
}

/**
 * Set up event listeners for the uploader
 * @param {Object} uploaderUI - Uploader UI elements
 * @param {Function} onFileSelected - Callback when files are selected
 */
function setupEventListeners(uploaderUI, onFileSelected) {
  const { element, dropZone, fileInput, browseLink, retryButton } = uploaderUI;
  
  // Drag and drop events
  dropZone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropZone.classList.add('drag-over');
  });
  
  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });
  
  dropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropZone.classList.remove('drag-over');
    
    if (event.dataTransfer.files.length > 0) {
      handleFileSelection(uploaderUI, event.dataTransfer.files, onFileSelected);
    }
  });
  
  // Browse link click
  browseLink.addEventListener('click', () => {
    fileInput.click();
  });
  
  // File input change
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      handleFileSelection(uploaderUI, fileInput.files, onFileSelected);
    }
  });
  
  // Retry button click
  retryButton.addEventListener('click', () => {
    resetUploader(uploaderUI);
  });
}

/**
 * Handle file selection
 * @param {Object} uploaderUI - Uploader UI elements
 * @param {FileList} files - Selected files
 * @param {Function} onFileSelected - Callback when files are selected
 */
function handleFileSelection(uploaderUI, files, onFileSelected) {
  // Get first file (multi-file upload not supported yet)
  const file = files[0];
  
  // Check file type
  if (!isSupportedFileType(file)) {
    showErrorMessage(
      uploaderUI, 
      `Unsupported file type: ${file.type || 'unknown'}. Please try a different file.`
    );
    return;
  }
  
  // Show loader
  setLoaderState(uploaderUI, true);
  
  // Reset file input for future uploads
  uploaderUI.fileInput.value = '';
  
  // Call callback with file
  if (typeof onFileSelected === 'function') {
    try {
      onFileSelected(file);
    } catch (error) {
      console.error('Error in file selection callback:', error);
      showErrorMessage(
        uploaderUI,
        `Error processing file: ${error.message}`
      );
    }
  }
}

/**
 * Set loader state
 * @param {Object} uploaderUI - Uploader UI elements
 * @param {boolean} isLoading - Whether loader should be shown
 */
function setLoaderState(uploaderUI, isLoading) {
  const { prompt, loader, error } = uploaderUI;
  
  if (isLoading) {
    prompt.setAttribute('hidden', '');
    loader.removeAttribute('hidden');
    error.setAttribute('hidden', '');
  } else {
    prompt.removeAttribute('hidden');
    loader.setAttribute('hidden', '');
    error.setAttribute('hidden', '');
  }
}

/**
 * Show error message
 * @param {Object} uploaderUI - Uploader UI elements
 * @param {string} message - Error message to display
 */
function showErrorMessage(uploaderUI, message) {
  const { prompt, loader, error, errorMessage } = uploaderUI;
  
  // Set error message
  errorMessage.textContent = message;
  
  // Show error UI
  prompt.setAttribute('hidden', '');
  loader.setAttribute('hidden', '');
  error.removeAttribute('hidden');
}

/**
 * Reset uploader to initial state
 * @param {Object} uploaderUI - Uploader UI elements
 */
function resetUploader(uploaderUI) {
  const { prompt, loader, error, fileInput } = uploaderUI;
  
  // Reset file input
  fileInput.value = '';
  
  // Show prompt
  prompt.removeAttribute('hidden');
  loader.setAttribute('hidden', '');
  error.setAttribute('hidden', '');
}

/**
 * Set accepted file types
 * @param {Object} uploaderUI - Uploader UI elements
 * @param {Array} types - Array of file extensions to accept
 */
function setAcceptedFileTypes(uploaderUI, types) {
  if (!Array.isArray(types) || types.length === 0) {
    return;
  }
  
  // Format file extensions
  const formattedTypes = types.map(type => {
    return type.startsWith('.') ? type : `.${type}`;
  });
  
  // Update file input accept attribute
  uploaderUI.fileInput.setAttribute('accept', formattedTypes.join(','));
  
  // Update file types display
  const fileTypesElement = uploaderUI.element.querySelector('.file-types');
  if (fileTypesElement) {
    fileTypesElement.textContent = `Supported file types: ${formattedTypes.join(', ')}`;
  }
}

export { initDocumentUploader };