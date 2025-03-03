/**
 * File Utility Functions
 * 
 * These utilities handle common file operations needed across the application.
 */

/**
 * Check if a file is of a supported type
 * @param {File} file - The file to check
 * @returns {boolean} - Whether the file type is supported
 */
function isSupportedFileType(file) {
  // List of supported MIME types
  const supportedTypes = [
    'application/pdf',                // PDF
    'image/jpeg', 'image/png',        // Images
    'text/plain',                     // Text files
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
    'application/msword',             // DOC
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',       // XLSX
    'application/vnd.ms-excel',       // XLS
    'application/json',               // JSON
    'text/csv'                        // CSV
  ];
  
  return supportedTypes.includes(file.type);
}

/**
 * Get file extension from File object
 * @param {File} file - The file
 * @returns {string} - The file extension (lowercase, without dot)
 */
function getFileExtension(file) {
  return file.name.split('.').pop().toLowerCase();
}

/**
 * Read a file as text
 * @param {File} file - The file to read
 * @returns {Promise<string>} - The file contents as text
 */
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      resolve(event.target.result);
    };
    
    reader.onerror = (error) => {
      reject(new Error(`Failed to read file: ${error}`));
    };
    
    reader.readAsText(file);
  });
}

/**
 * Read a file as array buffer (for binary files)
 * @param {File} file - The file to read
 * @returns {Promise<ArrayBuffer>} - The file contents as array buffer
 */
function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      resolve(event.target.result);
    };
    
    reader.onerror = (error) => {
      reject(new Error(`Failed to read file: ${error}`));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Create a downloadable blob URL from data
 * @param {string|ArrayBuffer} data - The data to convert
 * @param {string} type - The MIME type of the data
 * @returns {string} - Blob URL that can be used for downloading
 */
function createDownloadableUrl(data, type) {
  const blob = new Blob([data], { type });
  return URL.createObjectURL(blob);
}

/**
 * Trigger file download
 * @param {string} url - The blob URL to download
 * @param {string} filename - The filename to use
 */
function downloadFile(url, filename) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL to avoid memory leaks
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Get human-readable file size
 * @param {number} bytes - Size in bytes
 * @returns {string} - Formatted file size (e.g., "1.5 MB")
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export {
  isSupportedFileType,
  getFileExtension,
  readFileAsText,
  readFileAsArrayBuffer,
  createDownloadableUrl,
  downloadFile,
  formatFileSize
};