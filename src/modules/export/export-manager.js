/**
 * Export Manager Module
 * 
 * This module handles exporting redacted documents in various formats
 * and creates audit logs of redaction activities.
 */

import { createDownloadableUrl, downloadFile } from '../../utils/file-utils.js';

/**
 * Export Manager class for handling document exports
 */
class ExportManager {
  /**
   * Initialize the export manager
   * @param {Object} pyodide - Initialized Pyodide instance
   */
  constructor(pyodide) {
    this.pyodide = pyodide;
    this.exportHistory = [];
    this.loadExportHistoryFromStorage();
  }
  
  /**
   * Load export history from local storage
   */
  loadExportHistoryFromStorage() {
    try {
      const savedHistory = localStorage.getItem('exportHistory');
      if (savedHistory) {
        this.exportHistory = JSON.parse(savedHistory);
      }
    } catch (error) {
      console.error('Failed to load export history:', error);
      this.exportHistory = [];
    }
  }
  
  /**
   * Save export history to local storage
   */
  saveExportHistoryToStorage() {
    try {
      localStorage.setItem('exportHistory', JSON.stringify(this.exportHistory));
    } catch (error) {
      console.error('Failed to save export history:', error);
    }
  }
  
  /**
   * Export redacted document
   * @param {Object} redactionResult - Result from the redaction process
   * @param {Object} options - Export options
   * @returns {Promise<Object>} - Export result with download URL and metadata
   */
  async exportDocument(redactionResult, options = {}) {
    try {
      // Set default options
      const exportOptions = {
        format: options.format || 'pdf',
        includeAuditInfo: options.includeAuditInfo !== undefined ? options.includeAuditInfo : true,
        filename: options.filename || this.generateFilename(redactionResult, options.format || 'pdf'),
        addWatermark: options.addWatermark !== undefined ? options.addWatermark : true,
        watermarkText: options.watermarkText || 'REDACTED',
        includeMetadata: options.includeMetadata !== undefined ? options.includeMetadata : true
      };
      
      // Generate audit information if needed
      let auditInfo = null;
      if (exportOptions.includeAuditInfo) {
        auditInfo = this.generateAuditInfo(redactionResult);
      }
      
      // Export based on format
      let exportResult;
      switch (exportOptions.format.toLowerCase()) {
        case 'pdf':
          exportResult = await this.exportToPdf(redactionResult, exportOptions, auditInfo);
          break;
        case 'text':
          exportResult = await this.exportToText(redactionResult, exportOptions, auditInfo);
          break;
        case 'json':
          exportResult = await this.exportToJson(redactionResult, exportOptions, auditInfo);
          break;
        case 'image':
          exportResult = await this.exportToImage(redactionResult, exportOptions, auditInfo);
          break;
        default:
          throw new Error(`Unsupported export format: ${exportOptions.format}`);
      }
      
      // Add to export history
      const historyEntry = {
        id: `export-${Date.now()}`,
        documentId: redactionResult.documentId,
        documentName: redactionResult.original.metadata.name,
        exportFormat: exportOptions.format,
        timestamp: new Date().toISOString(),
        redactionCount: redactionResult.statistics.redactionCount,
        includesAuditInfo: exportOptions.includeAuditInfo
      };
      
      this.exportHistory.push(historyEntry);
      this.saveExportHistoryToStorage();
      
      return {
        success: true,
        downloadUrl: exportResult.url,
        filename: exportOptions.filename,
        format: exportOptions.format,
        auditInfoIncluded: exportOptions.includeAuditInfo,
        exportId: historyEntry.id
      };
    } catch (error) {
      console.error('Export failed:', error);
      throw new Error(`Failed to export document: ${error.message}`);
    }
  }
  
  /**
   * Export document as PDF
   * @param {Object} redactionResult - Redaction result
   * @param {Object} options - Export options
   * @param {Object} auditInfo - Audit information (optional)
   * @returns {Promise<Object>} - PDF export result with download URL
   */
  async exportToPdf(redactionResult, options, auditInfo) {
    // This is a placeholder - would use PDF generation logic with PyPDF2 or similar
    
    // For PDF documents that already have pages structure
    if (redactionResult.redacted.pages) {
      // Use Python to create a PDF
      const result = this.pyodide.runPython(`
        import io
        from pypdf import PdfWriter, PdfReader
        
        # Create a new PDF writer
        writer = PdfWriter()
        
        # Add redacted content
        # In a real implementation, this would use the redacted content
        # to create new PDF pages
        
        # Add watermark if needed
        watermark = "${options.addWatermark ? options.watermarkText : ''}"
        
        # Add audit information if needed
        has_audit = ${options.includeAuditInfo ? 'True' : 'False'}
        
        # Get the PDF as bytes
        output = io.BytesIO()
        writer.write(output)
        output.seek(0)
        pdf_bytes = output.getvalue()
        
        # Return base64 encoded PDF
        import base64
        base64.b64encode(pdf_bytes).decode('utf-8')
      `);
      
      // Convert base64 to Blob and create URL
      const base64Data = result.toString();
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      return { url, format: 'pdf' };
    }
    
    // Fallback for testing - in a real implementation this would be removed
    const fallbackContent = `
      REDACTED DOCUMENT
      
      Original: ${redactionResult.original.metadata.name}
      Redactions: ${redactionResult.statistics.redactionCount}
      Date: ${new Date().toISOString()}
      
      ${JSON.stringify(redactionResult.redacted, null, 2)}
      
      ${auditInfo ? JSON.stringify(auditInfo, null, 2) : ''}
    `;
    
    const blob = new Blob([fallbackContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    return { url, format: 'text' };
  }
  
  /**
   * Export document as plain text
   * @param {Object} redactionResult - Redaction result
   * @param {Object} options - Export options
   * @param {Object} auditInfo - Audit information (optional)
   * @returns {Promise<Object>} - Text export result with download URL
   */
  async exportToText(redactionResult, options, auditInfo) {
    // Extract redacted text content
    let textContent = '';
    
    if (redactionResult.redacted.text) {
      // Direct text content
      textContent = redactionResult.redacted.text;
    } else if (redactionResult.redacted.pages) {
      // Pages from PDF or similar
      textContent = redactionResult.redacted.pages
        .map(page => page.text || '')
        .join('\n\n--- Page Break ---\n\n');
    } else {
      // Fallback
      textContent = JSON.stringify(redactionResult.redacted, null, 2);
    }
    
    // Add watermark if specified
    if (options.addWatermark) {
      const watermarkText = `--- ${options.watermarkText} ---`;
      const watermarkLine = watermarkText.padEnd(80, ' ');
      
      // Add watermark at top and bottom
      textContent = `${watermarkLine}\n\n${textContent}\n\n${watermarkLine}`;
    }
    
    // Add audit information if specified
    if (options.includeAuditInfo && auditInfo) {
      textContent += '\n\n=== AUDIT INFORMATION ===\n\n';
      textContent += JSON.stringify(auditInfo, null, 2);
    }
    
    // Create downloadable URL
    const url = createDownloadableUrl(textContent, 'text/plain');
    
    return { url, format: 'text' };
  }
  
  /**
   * Export document as JSON
   * @param {Object} redactionResult - Redaction result
   * @param {Object} options - Export options
   * @param {Object} auditInfo - Audit information (optional)
   * @returns {Promise<Object>} - JSON export result with download URL
   */
  async exportToJson(redactionResult, options, auditInfo) {
    // Prepare JSON export object
    const exportObject = {
      redactedDocument: redactionResult.redacted,
      metadata: {
        originalName: redactionResult.original.metadata.name,
        originalType: redactionResult.original.metadata.type,
        redacted: true,
        redactionTimestamp: redactionResult.timestamp,
        redactionCount: redactionResult.statistics.redactionCount,
        exportTimestamp: new Date().toISOString()
      }
    };
    
    // Add watermark if specified
    if (options.addWatermark) {
      exportObject.metadata.watermark = options.watermarkText;
    }
    
    // Add audit information if specified
    if (options.includeAuditInfo && auditInfo) {
      exportObject.auditInfo = auditInfo;
    }
    
    // Create JSON string
    const jsonContent = JSON.stringify(exportObject, null, 2);
    
    // Create downloadable URL
    const url = createDownloadableUrl(jsonContent, 'application/json');
    
    return { url, format: 'json' };
  }
  
  /**
   * Export document as image (for image-based documents)
   * @param {Object} redactionResult - Redaction result
   * @param {Object} options - Export options
   * @param {Object} auditInfo - Audit information (optional)
   * @returns {Promise<Object>} - Image export result with download URL
   */
  async exportToImage(redactionResult, options, auditInfo) {
    // Placeholder - would use image processing logic with PIL/Pillow via Python
    
    // In a real implementation, this would modify the image with redactions
    // and add watermark if specified
    
    // For testing, just return the original image URL if available
    if (redactionResult.redacted.imageUrl) {
      return {
        url: redactionResult.redacted.imageUrl,
        format: 'image'
      };
    }
    
    // Fallback
    throw new Error('Image export not implemented for this document type');
  }
  
  /**
   * Generate audit information for the export
   * @param {Object} redactionResult - Result from redaction process
   * @returns {Object} - Audit information
   */
  generateAuditInfo(redactionResult) {
    return {
      documentId: redactionResult.documentId,
      originalDocumentName: redactionResult.original.metadata.name,
      originalDocumentType: redactionResult.original.metadata.type,
      originalDocumentSize: redactionResult.original.metadata.size,
      redactionTimestamp: redactionResult.timestamp,
      exportTimestamp: new Date().toISOString(),
      redactionStatistics: {
        totalRedactions: redactionResult.statistics.redactionCount,
        processingTime: redactionResult.statistics.processingTime,
        appliedRules: redactionResult.statistics.appliedRules.map(rule => ({
          ruleName: rule.ruleName,
          matchCount: rule.matches
        }))
      }
    };
  }
  
  /**
   * Generate filename for exported document
   * @param {Object} redactionResult - Redaction result
   * @param {string} format - Export format
   * @returns {string} - Generated filename
   */
  generateFilename(redactionResult, format) {
    const originalName = redactionResult.original.metadata.name || 'document';
    const baseName = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
    const timestamp = new Date().toISOString().replace(/:/g, '-').substring(0, 19);
    
    return `${baseName}_redacted_${timestamp}.${format}`;
  }
  
  /**
   * Get export history
   * @param {number} limit - Maximum number of entries to return (0 for all)
   * @returns {Array} - Export history entries
   */
  getExportHistory(limit = 0) {
    // Sort by timestamp (newest first)
    const sortedHistory = [...this.exportHistory].sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );
    
    // Return all or limited entries
    return limit > 0 ? sortedHistory.slice(0, limit) : sortedHistory;
  }
  
  /**
   * Download a previously exported document
   * @param {string} exportId - ID of the export to download
   * @returns {Promise<boolean>} - True if download was successful
   */
  async downloadExport(exportId) {
    // Find export in history
    const exportEntry = this.exportHistory.find(entry => entry.id === exportId);
    if (!exportEntry) {
      throw new Error(`Export with ID ${exportId} not found`);
    }
    
    // In a real implementation, this would retrieve the exported file from storage
    // For this example, we'll just simulate it
    
    throw new Error('Re-downloading previous exports is not implemented');
  }
}

export { ExportManager };