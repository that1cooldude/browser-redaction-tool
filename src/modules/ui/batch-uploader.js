/**
 * Batch Document Uploader UI Component
 * 
 * This module provides UI components for batch document upload, displaying
 * upload progress, and managing multiple files.
 */

import { isSupportedFileType, formatFileSize } from '../../utils/file-utils.js';

/**
 * Initialize batch document uploader UI
 * @param {string} containerId - ID of the container element
 * @param {Function} onFilesSelected - Callback function when files are selected
 * @returns {Object} - UI controller object
 */
function initBatchUploader(containerId, onFilesSelected) {
  // Get container element
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container element with ID "${containerId}" not found`);
    return null;
  }
  
  // Create uploader UI elements
  const uploaderUI = createBatchUploaderUI();
  container.appendChild(uploaderUI.element);
  
  // Set up event listeners
  setupEventListeners(uploaderUI, onFilesSelected);
  
  // Return controller object
  return {
    setLoading: (isLoading) => setLoaderState(uploaderUI, isLoading),
    showError: (message) => showErrorMessage(uploaderUI, message),
    updateProgress: (fileIndex, progress, message) => updateFileProgress(uploaderUI, fileIndex, progress, message),
    reset: () => resetUploader(uploaderUI),
    setAcceptedFileTypes: (types) => setAcceptedFileTypes(uploaderUI, types),
    setFileList: (files) => updateFileList(uploaderUI, files),
    getSelectedFileIndexes: () => getSelectedFileIndexes(uploaderUI),
    element: uploaderUI.element
  };
}

/**
 * Create batch uploader UI elements
 * @returns {Object} - Uploader UI elements
 */
function createBatchUploaderUI() {
  // Create main container
  const element = document.createElement('div');
  element.className = 'batch-uploader';
  
  // Create drop zone
  const dropZone = document.createElement('div');
  dropZone.className = 'drop-zone batch-drop-zone';
  dropZone.innerHTML = `
    <div class="drop-zone-prompt">
      <i class="icon-upload"></i>
      <p>Drag and drop multiple documents here, or <span class="browse-link">browse</span></p>
      <p class="file-types">Supported file types: PDF, DOCX, TXT, Images, CSV, JSON</p>
    </div>
    <div class="drop-zone-loader" hidden>
      <div class="spinner"></div>
      <p>Processing files...</p>
    </div>
    <div class="drop-zone-error" hidden>
      <i class="icon-error"></i>
      <p class="error-message"></p>
      <button class="retry-button btn btn-sm btn-outline">Try Again</button>
    </div>
  `;
  
  // Create file input (hidden)
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.className = 'file-input';
  fileInput.setAttribute('hidden', '');
  fileInput.setAttribute('multiple', '');
  fileInput.setAttribute('accept', '.pdf,.txt,.docx,.doc,.jpg,.jpeg,.png,.csv,.json,.xlsx,.xls');

  // Create file list container
  const fileListContainer = document.createElement('div');
  fileListContainer.className = 'file-list-container';
  fileListContainer.innerHTML = `
    <div class="file-list-header">
      <h3>Selected Files</h3>
      <div class="file-list-actions">
        <button class="btn btn-sm btn-outline select-all-btn">Select All</button>
        <button class="btn btn-sm btn-outline clear-btn">Clear</button>
      </div>
    </div>
    <ul class="file-list"></ul>
    <div class="batch-actions">
      <button class="btn btn-primary process-selected-btn">Process Selected Files</button>
    </div>
  `;
  
  // Assemble components
  element.appendChild(dropZone);
  element.appendChild(fileInput);
  element.appendChild(fileListContainer);
  
  return {
    element,
    dropZone,
    fileInput,
    fileList: fileListContainer.querySelector('.file-list'),
    prompt: dropZone.querySelector('.drop-zone-prompt'),
    loader: dropZone.querySelector('.drop-zone-loader'),
    error: dropZone.querySelector('.drop-zone-error'),
    errorMessage: dropZone.querySelector('.error-message'),
    retryButton: dropZone.querySelector('.retry-button'),
    browseLink: dropZone.querySelector('.browse-link'),
    selectAllBtn: fileListContainer.querySelector('.select-all-btn'),
    clearBtn: fileListContainer.querySelector('.clear-btn'),
    processSelectedBtn: fileListContainer.querySelector('.process-selected-btn')
  };
}

/**
 * Set up event listeners for the batch uploader
 * @param {Object} uploaderUI - Uploader UI elements
 * @param {Function} onFilesSelected - Callback when files are selected
 */
function setupEventListeners(uploaderUI, onFilesSelected) {
  const { 
    dropZone, 
    fileInput, 
    browseLink, 
    retryButton,
    selectAllBtn,
    clearBtn,
    processSelectedBtn
  } = uploaderUI;
  
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
      handleFileSelection(uploaderUI, event.dataTransfer.files, onFilesSelected);
    }
  });
  
  // Browse link click
  browseLink.addEventListener('click', () => {
    fileInput.click();
  });
  
  // File input change
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      handleFileSelection(uploaderUI, fileInput.files, onFilesSelected);
    }
  });
  
  // Retry button click
  retryButton.addEventListener('click', () => {
    resetUploader(uploaderUI);
  });

  // Select all button
  selectAllBtn.addEventListener('click', () => {
    const checkboxes = uploaderUI.fileList.querySelectorAll('.file-item-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.checked = true;
    });
  });

  // Clear button
  clearBtn.addEventListener('click', () => {
    resetUploader(uploaderUI);
  });

  // Process selected button
  processSelectedBtn.addEventListener('click', () => {
    const selectedIndexes = getSelectedFileIndexes(uploaderUI);
    if (selectedIndexes.length === 0) {
      alert('Please select at least one file to process.');
      return;
    }

    if (typeof onFilesSelected === 'function') {
      onFilesSelected(selectedIndexes);
    }
  });
}

/**
 * Handle file selection for batch upload
 * @param {Object} uploaderUI - Uploader UI elements
 * @param {FileList} files - Selected files
 * @param {Function} onFilesSelected - Callback when files are selected
 */
function handleFileSelection(uploaderUI, files, onFilesSelected) {
  const validFiles = [];
  const invalidFiles = [];
  
  // Filter valid files
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (isSupportedFileType(file)) {
      validFiles.push(file);
    } else {
      invalidFiles.push(file);
    }
  }
  
  // Show error if no valid files
  if (validFiles.length === 0) {
    showErrorMessage(
      uploaderUI,
      `No supported files found. Please try again with valid file types.`
    );
    return;
  }
  
  // Show warning for invalid files
  if (invalidFiles.length > 0) {
    console.warn(`${invalidFiles.length} files were skipped due to unsupported file types.`);
  }
  
  // Update file list
  updateFileList(uploaderUI, validFiles);
  
  // Reset file input for future uploads
  uploaderUI.fileInput.value = '';
}

/**
 * Update the file list UI
 * @param {Object} uploaderUI - Uploader UI elements
 * @param {Array} files - Array of File objects
 */
function updateFileList(uploaderUI, files) {
  const { fileList } = uploaderUI;
  
  // Clear the list
  fileList.innerHTML = '';
  
  // Add each file to the list
  files.forEach((file, index) => {
    const fileItem = document.createElement('li');
    fileItem.className = 'file-item';
    fileItem.dataset.fileIndex = index;
    
    // Create checkbox for selection
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'file-item-checkbox';
    checkbox.checked = true;
    
    // Create file info
    const fileInfo = document.createElement('div');
    fileInfo.className = 'file-item-info';
    
    const fileName = document.createElement('span');
    fileName.className = 'file-item-name';
    fileName.textContent = file.name;
    
    const fileSize = document.createElement('span');
    fileSize.className = 'file-item-size';
    fileSize.textContent = formatFileSize(file.size);
    
    fileInfo.appendChild(fileName);
    fileInfo.appendChild(fileSize);
    
    // Create progress indicator
    const progressContainer = document.createElement('div');
    progressContainer.className = 'file-item-progress';
    progressContainer.innerHTML = `
      <div class="progress-container">
        <div class="progress-bar" style="width: 0%;"></div>
      </div>
      <span class="progress-text">Ready</span>
    `;
    
    // Assemble file item
    fileItem.appendChild(checkbox);
    fileItem.appendChild(fileInfo);
    fileItem.appendChild(progressContainer);
    
    fileList.appendChild(fileItem);
  });
  
  // Show file list container
  uploaderUI.element.querySelector('.file-list-container').style.display = files.length > 0 ? 'block' : 'none';
}

/**
 * Update progress for a specific file
 * @param {Object} uploaderUI - Uploader UI elements
 * @param {number} fileIndex - Index of the file
 * @param {number} progress - Progress percentage (0-100)
 * @param {string} message - Status message
 */
function updateFileProgress(uploaderUI, fileIndex, progress, message) {
  const fileItem = uploaderUI.fileList.querySelector(`[data-file-index="${fileIndex}"]`);
  if (!fileItem) return;
  
  const progressBar = fileItem.querySelector('.progress-bar');
  const progressText = fileItem.querySelector('.progress-text');
  
  progressBar.style.width = `${progress}%`;
  progressText.textContent = message || `${progress}%`;
  
  // Update appearance based on progress
  if (progress === 100) {
    fileItem.classList.add('completed');
  } else if (progress < 0) {
    fileItem.classList.add('error');
  } else {
    fileItem.classList.remove('completed', 'error');
  }
}

/**
 * Get the indexes of selected files
 * @param {Object} uploaderUI - Uploader UI elements
 * @returns {Array} - Array of selected file indexes
 */
function getSelectedFileIndexes(uploaderUI) {
  const selectedIndexes = [];
  
  uploaderUI.fileList.querySelectorAll('.file-item-checkbox').forEach(checkbox => {
    if (checkbox.checked) {
      const fileItem = checkbox.closest('.file-item');
      const fileIndex = parseInt(fileItem.dataset.fileIndex, 10);
      selectedIndexes.push(fileIndex);
    }
  });
  
  return selectedIndexes;
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
  const { prompt, loader, error, fileInput, fileList } = uploaderUI;
  
  // Reset file input
  fileInput.value = '';
  
  // Clear file list
  fileList.innerHTML = '';
  
  // Hide file list container
  uploaderUI.element.querySelector('.file-list-container').style.display = 'none';
  
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

export { initBatchUploader };