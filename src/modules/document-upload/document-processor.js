/**
 * Document Processor Module
 * 
 * This module handles document parsing and preparation for redaction.
 * It extracts text and structure from different document formats.
 */

import { getFileExtension, readFileAsArrayBuffer, readFileAsText } from '../../utils/file-utils.js';

/**
 * Process an uploaded document and extract text and metadata
 * @param {File} file - The uploaded file
 * @param {Object} pyodide - Initialized Pyodide instance for Python processing
 * @returns {Promise<Object>} - Processed document data with text content and metadata
 */
async function processDocument(file, pyodide) {
  try {
    // Extract basic metadata from the file
    const metadata = {
      name: file.name,
      type: file.type,
      size: file.size,
      extension: getFileExtension(file),
      lastModified: new Date(file.lastModified),
    };
    
    // Process document based on file extension
    const fileExtension = getFileExtension(file);
    let content = null;
    
    switch (fileExtension) {
      case 'pdf':
        content = await processPdfDocument(file, pyodide);
        break;
      case 'txt':
        content = await processTextDocument(file);
        break;
      case 'json':
        content = await processJsonDocument(file);
        break;
      case 'jpg':
      case 'jpeg':
      case 'png':
        content = await processImageDocument(file, pyodide);
        break;
      case 'docx':
      case 'doc':
        content = await processWordDocument(file, pyodide);
        break;
      case 'xlsx':
      case 'xls':
      case 'csv':
        content = await processSpreadsheetDocument(file, pyodide);
        break;
      default:
        throw new Error(`Unsupported file type: ${fileExtension}`);
    }
    
    return {
      metadata,
      content,
      id: generateDocumentId(file),
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Document processing error:', error);
    throw new Error(`Failed to process document: ${error.message}`);
  }
}

/**
 * Generate a unique ID for a document
 * @param {File} file - The document file
 * @returns {string} - Unique document ID
 */
function generateDocumentId(file) {
  // Create a unique ID based on file attributes and current time
  const fileAttributes = `${file.name}-${file.size}-${file.lastModified}`;
  return `doc-${Date.now()}-${hashString(fileAttributes)}`;
}

/**
 * Simple hashing function for strings
 * @param {string} str - String to hash
 * @returns {string} - Hashed string
 */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Process PDF document using Python libraries via Pyodide
 * @param {File} file - The PDF file
 * @param {Object} pyodide - Initialized Pyodide instance
 * @returns {Promise<Object>} - Extracted text content and structure
 */
async function processPdfDocument(file, pyodide) {
  if (!pyodide) {
    throw new Error('Pyodide instance is required for PDF processing');
  }

  console.log(`Processing PDF document: ${file.name} (${file.size} bytes)`);
  
  // Read the PDF file as array buffer
  const arrayBuffer = await readFileAsArrayBuffer(file);
  
  try {
    // Convert ArrayBuffer to Python bytes
    const pythonBytes = pyodide.toPy(new Uint8Array(arrayBuffer));
    
    // Set up progress indicator
    await updateProcessingStatus('Initializing PDF processing libraries...', 10);
    
    // Install PDF processing libraries if needed
    if (!pyodide.globals.get('pdf_processing_available')) {
      await updateProcessingStatus('Loading PDF libraries (this may take a minute)...', 20);
      
      await pyodide.runPythonAsync(`
        import micropip
        try:
            from pypdf import PdfReader
            print("pypdf already installed")
        except ImportError:
            await micropip.install('pypdf')
            print("Installed pypdf")
        
        # For extracting structured content
        try:
            import pdfminer
            print("pdfminer already installed")
        except ImportError:
            await micropip.install('pdfminer.six')
            print("Installed pdfminer.six")
            
        pdf_processing_available = True
      `);
      
      console.log('PDF dependencies installed');
    }
    
    await updateProcessingStatus('Extracting text from PDF...', 30);
    
    // First pass: Extract basic text using pypdf
    const basicTextResult = await pyodide.runPythonAsync(`
      import io
      from pypdf import PdfReader
      
      # Create file-like object from bytes
      pdf_file = io.BytesIO(pythonBytes)
      
      # Initialize PDF reader
      pdf_reader = PdfReader(pdf_file)
      
      # Extract text from each page
      pages = []
      for page_num in range(len(pdf_reader.pages)):
          page = pdf_reader.pages[page_num]
          text = page.extract_text()
          pages.append({
              'page_number': page_num + 1,
              'text': text
          })
      
      # Get document metadata
      metadata = {}
      if pdf_reader.metadata:
          for key in dir(pdf_reader.metadata):
              if not key.startswith('_') and hasattr(pdf_reader.metadata, key):
                  value = getattr(pdf_reader.metadata, key)
                  if value is not None:
                      metadata[key] = str(value)
      
      metadata['page_count'] = len(pdf_reader.pages)
      
      # Return the extracted content
      {'pages': pages, 'metadata': metadata}
    `);
    
    await updateProcessingStatus('Extracting detailed layout information...', 60);
    
    // Second pass: Use pdfminer for detailed layout extraction
    const detailedResult = await pyodide.runPythonAsync(`
      import io
      from pdfminer.high_level import extract_pages
      from pdfminer.layout import LTTextContainer, LTChar, LTLine, LTTextBox, LTTextLine
      
      # Create file-like object from bytes
      pdf_file = io.BytesIO(pythonBytes)
      
      # Function to extract text and coordinates from layout elements
      def extract_text_elements(element, page_number):
          results = []
          
          if isinstance(element, LTTextContainer):
              # Extract text and coordinates
              text = element.get_text().strip()
              if text:
                  if isinstance(element, LTTextBox):
                      element_type = 'paragraph'
                  elif isinstance(element, LTTextLine):
                      element_type = 'line'
                  else:
                      element_type = 'text'
                      
                  # Get bounding box
                  x0, y0, x1, y1 = element.bbox
                  
                  # Add to results
                  results.append({
                      'type': element_type,
                      'text': text,
                      'x': x0,
                      'y': y0,
                      'width': x1 - x0,
                      'height': y1 - y0,
                      'page': page_number
                  })
          
          # Process any child elements
          if hasattr(element, '_objs'):
              for obj in element._objs:
                  results.extend(extract_text_elements(obj, page_number))
          
          return results
      
      # Extract page layout information
      detailed_pages = []
      
      for i, page_layout in enumerate(extract_pages(pdf_file)):
          page_number = i + 1
          page_elements = []
          
          # Process all elements on the page
          for element in page_layout:
              page_elements.extend(extract_text_elements(element, page_number))
          
          # Organize text by type
          paragraphs = [e for e in page_elements if e['type'] == 'paragraph']
          lines = [e for e in page_elements if e['type'] == 'line']
          
          # Add to detailed pages
          detailed_pages.append({
              'page_number': page_number,
              'elements': page_elements,
              'paragraphs': paragraphs,
              'lines': lines,
              'width': page_layout.width,
              'height': page_layout.height
          })
      
      # Return detailed layout information
      {'detailed_pages': detailed_pages}
    `);
    
    await updateProcessingStatus('Merging PDF analysis results...', 90);
    
    // Merge the results
    const basicResult = basicTextResult.toJs();
    const layoutResult = detailedResult.toJs();
    
    // Create enhanced page objects with both text and layout information
    const enhancedPages = basicResult.pages.map((page, index) => {
      // Get corresponding detailed page if available
      const detailedPage = index < layoutResult.detailed_pages.length 
        ? layoutResult.detailed_pages[index] 
        : null;
      
      return {
        page_number: page.page_number,
        text: page.text,
        paragraphs: detailedPage ? detailedPage.paragraphs : [],
        lines: detailedPage ? detailedPage.lines : [],
        elements: detailedPage ? detailedPage.elements : [],
        width: detailedPage ? detailedPage.width : 0,
        height: detailedPage ? detailedPage.height : 0
      };
    });
    
    // Create a URL for the PDF to display (for browser-based PDF viewer)
    const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
    const pdfUrl = URL.createObjectURL(blob);
    
    // Return the combined result
    return {
      pages: enhancedPages,
      metadata: basicResult.metadata,
      pdfUrl: pdfUrl,
      text: enhancedPages.map(page => page.text).join('\n\n')
    };
  } catch (error) {
    console.error('PDF processing error:', error);
    
    // Create a URL for the PDF to display (for browser-based PDF viewer) even if processing failed
    const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
    const pdfUrl = URL.createObjectURL(blob);
    
    // Return a basic structure with the error
    return {
      pages: [{
        page_number: 1,
        text: `PDF processing error: ${error.message}`,
        paragraphs: [],
        lines: [],
        elements: []
      }],
      metadata: {
        error: error.message
      },
      pdfUrl: pdfUrl,
      text: `PDF processing error: ${error.message}`
    };
  }
}

/**
 * Process plain text document
 * @param {File} file - The text file
 * @returns {Promise<Object>} - Processed text content
 */
async function processTextDocument(file) {
  const text = await readFileAsText(file);
  
  // Split text into lines for easier processing
  const lines = text.split('\n');
  
  return {
    text,
    lines,
    metadata: {
      lineCount: lines.length,
      characterCount: text.length
    }
  };
}

/**
 * Process JSON document
 * @param {File} file - The JSON file
 * @returns {Promise<Object>} - Parsed JSON content
 */
async function processJsonDocument(file) {
  const text = await readFileAsText(file);
  const json = JSON.parse(text);
  
  return {
    text,
    json,
    metadata: {
      isArray: Array.isArray(json),
      size: text.length
    }
  };
}

/**
 * Process image document using Python libraries via Pyodide
 * @param {File} file - The image file
 * @param {Object} pyodide - Initialized Pyodide instance
 * @returns {Promise<Object>} - Image data and extracted text (if OCR is available)
 */
async function processImageDocument(file, pyodide) {
  if (!pyodide) {
    throw new Error('Pyodide instance is required for image OCR processing');
  }

  // Read the image file as array buffer
  const arrayBuffer = await readFileAsArrayBuffer(file);
  
  // Create a URL for the image to display
  const blob = new Blob([arrayBuffer], { type: file.type });
  const imageUrl = URL.createObjectURL(blob);
  
  console.log(`Processing image document: ${file.name} (${file.size} bytes)`);
  
  try {
    // Convert ArrayBuffer to Python bytes
    const pythonBytes = pyodide.toPy(new Uint8Array(arrayBuffer));
    
    // Set up progress indicator - this is a placeholder for more granular progress updates
    await updateProcessingStatus('Initializing OCR dependencies...', 10);
    
    // Install pytesseract and dependencies if needed
    if (!pyodide.globals.get('pytesseract_available')) {
      await updateProcessingStatus('Loading OCR libraries (this may take a minute)...', 20);
      
      await pyodide.runPythonAsync(`
        import micropip
        try:
            import PIL
            print("PIL already installed")
        except ImportError:
            await micropip.install('pillow')
            print("Installed pillow")
            
        try:
            import pytesseract
            print("Pytesseract already installed")
        except ImportError:
            await micropip.install('pytesseract')
            print("Installed pytesseract")
            
        import numpy as np
        import io
        from PIL import Image
        
        pytesseract_available = True
        
        # Configure pytesseract - in browser we use worker mode
        import pytesseract
        try:
            pytesseract.pytesseract.tesseract_cmd = 'tesseract'
        except:
            print("Using default tesseract configuration")
      `);
      
      console.log('OCR dependencies installed');
    }
    
    await updateProcessingStatus('Performing OCR analysis...', 50);
    
    // Process the image using OCR
    const result = await pyodide.runPythonAsync(`
      import io
      from PIL import Image
      import pytesseract
      import numpy as np
      
      # Create file-like object from bytes
      image_file = io.BytesIO(pythonBytes)
      
      # Open the image
      image = Image.open(image_file)
      
      # Get image dimensions
      width, height = image.size
      
      # Perform OCR to extract text
      try:
          text = pytesseract.image_to_string(image)
          has_ocr_text = len(text.strip()) > 0
      except Exception as e:
          print(f"OCR error: {str(e)}")
          text = f"OCR processing failed: {str(e)}"
          has_ocr_text = False
      
      # Create a structural representation of text areas (for redaction zones)
      try:
          # Get word-level data using image_to_data
          data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
          
          # Convert to usable format for JavaScript
          words = []
          for i in range(len(data['text'])):
              text = data['text'][i].strip()
              if text:  # Only add non-empty words
                  words.append({
                      'text': text,
                      'x': data['left'][i],
                      'y': data['top'][i],
                      'width': data['width'][i],
                      'height': data['height'][i],
                      'conf': data['conf'][i],
                      'line_num': data['line_num'][i],
                      'block_num': data['block_num'][i]
                  })
      except Exception as e:
          print(f"OCR data extraction error: {str(e)}")
          words = []
      
      # Create a structure of paragraphs
      paragraphs = []
      current_para = []
      current_line = -1
      
      for word in words:
          if word['line_num'] != current_line:
              if current_para:
                  para_text = ' '.join([w['text'] for w in current_para])
                  if para_text.strip():
                      paragraphs.append({
                          'text': para_text,
                          'x': min([w['x'] for w in current_para]),
                          'y': min([w['y'] for w in current_para]),
                          'width': max([w['x'] + w['width'] for w in current_para]) - min([w['x'] for w in current_para]),
                          'height': max([w['y'] + w['height'] for w in current_para]) - min([w['y'] for w in current_para]),
                          'words': current_para
                      })
              current_para = []
              current_line = word['line_num']
          
          current_para.append(word)
      
      # Add the last paragraph
      if current_para:
          para_text = ' '.join([w['text'] for w in current_para])
          if para_text.strip():
              paragraphs.append({
                  'text': para_text,
                  'x': min([w['x'] for w in current_para]),
                  'y': min([w['y'] for w in current_para]),
                  'width': max([w['x'] + w['width'] for w in current_para]) - min([w['x'] for w in current_para]),
                  'height': max([w['y'] + w['height'] for w in current_para]) - min([w['y'] for w in current_para]),
                  'words': current_para
              })
              
      # Add text structure information (pages for consistency with PDF format)
      pages = [{
          'page_number': 1,
          'text': text,
          'words': words,
          'paragraphs': paragraphs,
          'width': width,
          'height': height
      }]
      
      # Return the result
      {
          'text': text,
          'pages': pages,
          'words': words,
          'paragraphs': paragraphs,
          'metadata': {
              'width': width,
              'height': height,
              'has_ocr_text': has_ocr_text
          }
      }
    `);
    
    await updateProcessingStatus('Finalizing document processing...', 90);
    
    // Convert Python result to JavaScript object
    const ocrResult = result.toJs();
    
    // Add the image URL to the result
    ocrResult.imageUrl = imageUrl;
    
    console.log(`OCR processing complete for ${file.name} - detected ${ocrResult.words.length} words`);
    
    return ocrResult;
  } catch (error) {
    console.error('OCR processing error:', error);
    
    // Provide a fallback without OCR
    return {
      imageUrl,
      text: `Image OCR processing error: ${error.message}`,
      pages: [{
        page_number: 1,
        text: '',
        words: [],
        paragraphs: []
      }],
      words: [],
      paragraphs: [],
      metadata: {
        width: 0,
        height: 0,
        hasOcrText: false,
        error: error.message
      }
    };
  }
}

/**
 * Update processing status - this is a helper for tracking long operations
 * @param {string} message - Status message
 * @param {number} percent - Progress percentage
 * @returns {Promise} - Resolved after a short delay to allow UI updates
 */
async function updateProcessingStatus(message, percent) {
  console.log(`Processing status: ${percent}% - ${message}`);
  // Add a small delay to allow for UI rendering
  return new Promise(resolve => setTimeout(resolve, 10));
}

/**
 * Process Word document using Python libraries via Pyodide
 * @param {File} file - The Word document file
 * @param {Object} pyodide - Initialized Pyodide instance
 * @returns {Promise<Object>} - Extracted text content and structure
 */
async function processWordDocument(file, pyodide) {
  if (!pyodide) {
    throw new Error('Pyodide instance is required for Word document processing');
  }

  console.log(`Processing Word document: ${file.name} (${file.size} bytes)`);
  
  // Read the Word file as array buffer
  const arrayBuffer = await readFileAsArrayBuffer(file);
  
  try {
    // Convert ArrayBuffer to Python bytes
    const pythonBytes = pyodide.toPy(new Uint8Array(arrayBuffer));
    
    // Set up progress indicator
    await updateProcessingStatus('Initializing Word processing libraries...', 10);
    
    // Install Word processing libraries if needed
    if (!pyodide.globals.get('docx_processing_available')) {
      await updateProcessingStatus('Loading Word document libraries (this may take a minute)...', 20);
      
      await pyodide.runPythonAsync(`
        import micropip
        try:
            import docx
            print("python-docx already installed")
        except ImportError:
            await micropip.install('python-docx')
            print("Installed python-docx")
            
        import io
        docx_processing_available = True
      `);
      
      console.log('Word document dependencies installed');
    }
    
    await updateProcessingStatus('Extracting text from Word document...', 40);
    
    // Process the Word document using python-docx
    const result = await pyodide.runPythonAsync(`
      import io
      import docx
      
      # Create file-like object from bytes
      doc_file = io.BytesIO(pythonBytes)
      
      try:
          # Open the document
          doc = docx.Document(doc_file)
          
          # Extract text from paragraphs
          paragraphs = []
          for i, para in enumerate(doc.paragraphs):
              if para.text.strip():
                  paragraphs.append({
                      'id': i,
                      'text': para.text.strip(),
                      'style': para.style.name if para.style else 'Normal'
                  })
          
          # Extract text from tables
          tables = []
          for i, table in enumerate(doc.tables):
              table_data = []
              for row_idx, row in enumerate(table.rows):
                  row_data = []
                  for cell_idx, cell in enumerate(row.cells):
                      row_data.append({
                          'text': cell.text.strip(),
                          'row': row_idx,
                          'col': cell_idx
                      })
                  table_data.append(row_data)
              tables.append({
                  'id': i,
                  'data': table_data
              })
          
          # Extract document properties
          properties = {}
          if doc.core_properties:
              if hasattr(doc.core_properties, 'title') and doc.core_properties.title:
                  properties['title'] = doc.core_properties.title
              if hasattr(doc.core_properties, 'author') and doc.core_properties.author:
                  properties['author'] = doc.core_properties.author
              if hasattr(doc.core_properties, 'created') and doc.core_properties.created:
                  properties['created'] = str(doc.core_properties.created)
              if hasattr(doc.core_properties, 'modified') and doc.core_properties.modified:
                  properties['modified'] = str(doc.core_properties.modified)
          
          # Create sections for page-like structure (for consistency with PDF)
          sections = []
          current_section = {
              'page_number': 1,
              'paragraphs': [],
              'tables': []
          }
          
          # Simple heuristic: group paragraphs into "pages" of approximately 15 paragraphs each
          # In a real implementation, we would use section breaks from the document
          paragraphs_per_page = 15
          page_number = 1
          
          for i, para in enumerate(paragraphs):
              if i > 0 and i % paragraphs_per_page == 0:
                  # Start a new section
                  sections.append(current_section)
                  page_number += 1
                  current_section = {
                      'page_number': page_number,
                      'paragraphs': [],
                      'tables': []
                  }
              
              current_section['paragraphs'].append(para)
          
          # Add the last section
          sections.append(current_section)
          
          # Combine all text
          all_text = '\\n\\n'.join(p['text'] for p in paragraphs)
          
          # Return the result
          {
              'success': True,
              'text': all_text,
              'paragraphs': paragraphs,
              'tables': tables,
              'properties': properties,
              'pages': sections
          }
          
      except Exception as e:
          print(f"Error processing Word document: {str(e)}")
          return {
              'success': False,
              'error': str(e)
          }
    `);
    
    await updateProcessingStatus('Finalizing Word document processing...', 90);
    
    // Convert Python result to JavaScript object
    const wordResult = result.toJs();
    
    if (!wordResult.success) {
      throw new Error(wordResult.error || 'Failed to process Word document');
    }
    
    return {
      text: wordResult.text,
      paragraphs: wordResult.paragraphs,
      tables: wordResult.tables,
      pages: wordResult.pages,
      metadata: wordResult.properties
    };
  } catch (error) {
    console.error('Word document processing error:', error);
    
    // Return a basic structure with the error
    return {
      text: `Word document processing error: ${error.message}`,
      paragraphs: [],
      tables: [],
      pages: [{
        page_number: 1,
        paragraphs: [{ id: 0, text: `Processing error: ${error.message}`, style: 'Normal' }],
        tables: []
      }],
      metadata: {
        error: error.message
      }
    };
  }
}

/**
 * Process spreadsheet document using Python libraries via Pyodide
 * @param {File} file - The spreadsheet file
 * @param {Object} pyodide - Initialized Pyodide instance
 * @returns {Promise<Object>} - Extracted data and structure
 */
async function processSpreadsheetDocument(file, pyodide) {
  // Placeholder - would use pandas or similar
  return { text: "Spreadsheet processing will be implemented" };
}

export { processDocument };