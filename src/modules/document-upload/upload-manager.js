/**
 * Upload Manager Module
 * 
 * This module handles the document upload process, including drag-and-drop
 * functionality, file validation, and initial document processing.
 */

import { processDocument } from './document-processor.js';
import { isSupportedFileType, formatFileSize } from '../../utils/file-utils.js';

/**
 * Initialize the upload manager
 * @param {Object} appState - Main application state
 * @param {Object} uiElements - UI elements to control
 * @returns {Object} - Upload manager methods
 */
function initUploadManager(appState, uiElements) {
  // Track current uploads
  const uploadState = {
    activeUpload: false,
    progressPercent: 0,
    currentFile: null,
    error: null
  };

  /**
   * Handle file drop
   * @param {DragEvent} event - Drop event
   */
  function handleFileDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    uiElements.dropZone.classList.remove('drag-over');
    
    // Get dropped files
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelection(files[0]);
    }
  }

  /**
   * Handle file selection from input element
   * @param {Event} event - Change event from file input
   */
  function handleInputChange(event) {
    const files = event.target.files;
    if (files.length > 0) {
      handleFileSelection(files[0]);
    }
  }

  /**
   * Handle file selection (common for drop and input)
   * @param {File} file - Selected file
   */
  async function handleFileSelection(file) {
    try {
      // Check if we already have an active upload
      if (uploadState.activeUpload) {
        showError("An upload is already in progress. Please wait or cancel the current upload.");
        return;
      }
      
      // Check file type
      if (!isSupportedFileType(file)) {
        showError(`File type not supported: ${file.type || 'unknown'}. Please try a PDF, DOCX, or TXT file.`);
        return;
      }
      
      // Check file size (limit to 100MB for browser processing)
      const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
      if (file.size > MAX_FILE_SIZE) {
        showError(`File too large: ${formatFileSize(file.size)}. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}.`);
        return;
      }
      
      // Update UI to show loading
      uploadState.activeUpload = true;
      uploadState.currentFile = file;
      uploadState.progressPercent = 0;
      uploadState.error = null;
      
      updateProgressUI(0, `Preparing to process ${file.name}...`);
      
      // Small delay to show the progress UI before heavy processing begins
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Process the document
      updateProgressUI(30, 'Processing document...');
      
      const processedDocument = await processDocument(file, appState.pyodide);
      
      // Update app state with the new document
      appState.currentDocument = processedDocument;
      appState.documents.push(processedDocument);
      
      // Complete the upload
      updateProgressUI(100, 'Document processed successfully!');
      
      // Call the document loaded callback if provided
      if (typeof uiElements.onDocumentLoaded === 'function') {
        uiElements.onDocumentLoaded(processedDocument);
      }
      
      // Reset upload state after a delay to show completion
      setTimeout(() => {
        uploadState.activeUpload = false;
        resetUploadUI();
      }, 1500);
      
      // Log success
      console.log('Document processed successfully:', processedDocument);
      
      return processedDocument;
    } catch (error) {
      console.error('Error processing document:', error);
      showError(`Error processing document: ${error.message}`);
      uploadState.activeUpload = false;
      uploadState.error = error;
      return null;
    }
  }

  /**
   * Update progress UI
   * @param {number} percent - Progress percentage
   * @param {string} message - Status message
   */
  function updateProgressUI(percent, message) {
    uploadState.progressPercent = percent;
    
    // Log the progress for debugging
    console.log(`Upload progress: ${percent}% - ${message}`);
    
    if (uiElements.progressBar) {
      uiElements.progressBar.style.width = `${percent}%`;
    } else {
      console.warn('Progress bar element not found');
    }
    
    if (uiElements.statusMessage) {
      uiElements.statusMessage.textContent = message;
    } else {
      // Fallback to global status message
      const globalStatus = document.getElementById('status-message');
      if (globalStatus) {
        globalStatus.textContent = message;
        globalStatus.className = 'status-message visible';
        setTimeout(() => {
          globalStatus.className = 'status-message';
        }, 4000);
      }
    }
    
    if (uiElements.uploadContainer) {
      uiElements.uploadContainer.classList.add('uploading');
    }
  }

  /**
   * Show error message
   * @param {string} message - Error message to display
   */
  function showError(message) {
    uploadState.error = message;
    
    if (uiElements.errorMessage) {
      uiElements.errorMessage.textContent = message;
      uiElements.uploadContainer.classList.add('has-error');
    }
    
    console.error('Upload error:', message);
  }

  /**
   * Reset upload UI to initial state
   */
  function resetUploadUI() {
    if (uiElements.uploadContainer) {
      uiElements.uploadContainer.classList.remove('uploading', 'has-error');
    }
    
    if (uiElements.fileInput) {
      uiElements.fileInput.value = '';
    }
    
    uploadState.progressPercent = 0;
    uploadState.currentFile = null;
    uploadState.error = null;
  }

  /**
   * Cancel current upload
   */
  function cancelUpload() {
    if (uploadState.activeUpload) {
      uploadState.activeUpload = false;
      resetUploadUI();
      return true;
    }
    return false;
  }

  /**
   * Create the uploader UI elements if they don't exist already
   */
  function createDropZoneIfNeeded() {
    if (!uiElements.uploadContainer) {
      console.error('Upload container element not found');
      return false;
    }
    
    // Check if we need to create the drop zone
    if (!uiElements.dropZone) {
      console.log('Creating drop zone elements');
      
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
      
      // Create progress bar
      const progressContainer = document.createElement('div');
      progressContainer.className = 'progress-container';
      
      const progressBar = document.createElement('div');
      progressBar.className = 'progress-bar';
      progressBar.style.width = '0%';
      
      const statusMessage = document.createElement('div');
      statusMessage.className = 'status-message';
      
      progressContainer.appendChild(progressBar);
      progressContainer.appendChild(statusMessage);
      
      // Create file input
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.className = 'file-input';
      fileInput.setAttribute('hidden', '');
      fileInput.setAttribute('accept', '.pdf,.txt,.docx,.doc,.jpg,.jpeg,.png,.csv,.json,.xlsx,.xls');
      
      // Add elements to the container
      uiElements.uploadContainer.appendChild(dropZone);
      uiElements.uploadContainer.appendChild(progressContainer);
      uiElements.uploadContainer.appendChild(fileInput);
      
      // Update UI elements
      uiElements.dropZone = dropZone;
      uiElements.progressBar = progressBar;
      uiElements.statusMessage = statusMessage;
      uiElements.fileInput = fileInput;
      uiElements.browseButton = dropZone.querySelector('.browse-link');
      
      return true;
    }
    
    return true;
  }

  /**
   * Set up event listeners for upload interactions
   */
  function setupEventListeners() {
    // Create UI elements if needed
    if (!createDropZoneIfNeeded()) {
      console.error('Failed to create uploader UI elements');
      return;
    }
    
    console.log('Setting up event listeners for upload manager');
    
    // Set up drag and drop events
    if (uiElements.dropZone) {
      uiElements.dropZone.addEventListener('dragover', (event) => {
        event.preventDefault();
        event.stopPropagation();
        uiElements.dropZone.classList.add('drag-over');
      });
      
      uiElements.dropZone.addEventListener('dragleave', () => {
        uiElements.dropZone.classList.remove('drag-over');
      });
      
      uiElements.dropZone.addEventListener('drop', handleFileDrop);
      console.log('Drop zone event listeners added');
    } else {
      console.error('Drop zone element not found');
    }
    
    // Set up file input
    if (uiElements.fileInput) {
      uiElements.fileInput.addEventListener('change', handleInputChange);
      console.log('File input event listener added');
    } else {
      console.error('File input element not found');
    }
    
    // Set up browse button
    if (uiElements.browseButton) {
      uiElements.browseButton.addEventListener('click', () => {
        if (uiElements.fileInput) {
          uiElements.fileInput.click();
        }
      });
      console.log('Browse button event listener added');
    } else {
      console.error('Browse button element not found');
    }
    
    // Set up cancel button
    if (uiElements.cancelButton) {
      uiElements.cancelButton.addEventListener('click', cancelUpload);
      console.log('Cancel button event listener added');
    }
  }

  // Initialize event listeners
  setupEventListeners();

  // Return public methods
  return {
    handleFileSelection,
    cancelUpload,
    resetUpload: resetUploadUI,
    getUploadState: () => ({ ...uploadState }),
  };
}

export { initUploadManager };