/**
 * Redaction Engine Module
 * 
 * This module provides the core redaction functionality, 
 * applying rules to documents and managing the redaction process.
 */

import { validateRedactionRule } from '../../utils/validation-utils.js';

/**
 * Apply redaction rules to document content
 * @param {Object} document - The document object with content to redact
 * @param {Array} rules - Array of redaction rules to apply
 * @param {Object} pyodide - Initialized Pyodide instance
 * @returns {Promise<Object>} - Redacted document and metadata about applied redactions
 */
async function redactDocument(document, rules, pyodide) {
  try {
    // Validate inputs
    if (!document || !document.content) {
      throw new Error('Invalid document: missing content');
    }
    
    if (!Array.isArray(rules) || rules.length === 0) {
      throw new Error('No redaction rules provided');
    }
    
    // Validate each rule
    const invalidRules = rules
      .map(rule => ({ rule, validation: validateRedactionRule(rule) }))
      .filter(item => !item.validation.valid);
    
    if (invalidRules.length > 0) {
      const errors = invalidRules.map(item => item.validation.error).join('; ');
      throw new Error(`Invalid redaction rules: ${errors}`);
    }
    
    // Choose appropriate redaction method based on document type
    let result;
    const documentType = document.metadata.extension;
    
    if (['txt', 'json'].includes(documentType)) {
      result = await redactTextDocument(document, rules);
    } else if (['pdf', 'doc', 'docx'].includes(documentType)) {
      result = await redactStructuredDocument(document, rules, pyodide);
    } else if (['jpg', 'jpeg', 'png'].includes(documentType)) {
      result = await redactImageDocument(document, rules, pyodide);
    } else {
      throw new Error(`Unsupported document type for redaction: ${documentType}`);
    }
    
    return {
      documentId: document.id,
      original: document,
      redacted: result.redacted,
      statistics: {
        appliedRules: result.appliedRules,
        redactionCount: result.totalRedactions,
        processingTime: result.processingTime
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Redaction error:', error);
    throw new Error(`Redaction failed: ${error.message}`);
  }
}

/**
 * Apply redaction to plain text document
 * @param {Object} document - Text document to redact
 * @param {Array} rules - Redaction rules to apply
 * @returns {Promise<Object>} - Redacted text and metadata
 */
async function redactTextDocument(document, rules) {
  const startTime = performance.now();
  
  // Statistics for tracking rule application
  const appliedRules = rules.map(rule => ({
    ruleId: rule.id,
    ruleName: rule.name,
    matches: 0
  }));
  
  // Create a copy of the text to modify
  let redactedText = document.content.text;
  let totalRedactions = 0;
  
  // Apply each rule sequentially
  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    const pattern = rule.regex ? new RegExp(rule.regex, 'g') : new RegExp(escapeRegExp(rule.pattern), 'g');
    
    // Determine replacement text based on the rule type
    let replacement;
    switch (rule.replacementType) {
      case 'fixed':
        replacement = rule.replacement || '[REDACTED]';
        break;
      case 'character':
        replacement = match => rule.replacementChar.repeat(match.length);
        break;
      case 'format-preserving':
        replacement = match => {
          let result = '';
          for (let j = 0; j < match.length; j++) {
            const char = match[j];
            if (/[0-9]/.test(char)) result += 'X';
            else if (/[a-z]/.test(char)) result += 'x';
            else if (/[A-Z]/.test(char)) result += 'X';
            else result += char;
          }
          return result;
        };
        break;
      default:
        replacement = '[REDACTED]';
    }
    
    // Count matches before redaction
    const matches = (redactedText.match(pattern) || []).length;
    appliedRules[i].matches = matches;
    totalRedactions += matches;
    
    // Apply redaction
    redactedText = redactedText.replace(pattern, replacement);
  }
  
  const processingTime = performance.now() - startTime;
  
  return {
    redacted: {
      ...document.content,
      text: redactedText,
      lines: redactedText.split('\n')
    },
    appliedRules,
    totalRedactions,
    processingTime
  };
}

/**
 * Apply redaction to structured documents (PDF, Word)
 * @param {Object} document - Structured document to redact
 * @param {Array} rules - Redaction rules to apply
 * @param {Object} pyodide - Pyodide instance for Python processing
 * @returns {Promise<Object>} - Redacted document content and metadata
 */
async function redactStructuredDocument(document, rules, pyodide) {
  const startTime = performance.now();
  
  // Check if we have Pyodide
  if (!pyodide) {
    throw new Error('Pyodide instance is required for structured document redaction');
  }
  
  // Determine document type based on metadata
  const documentType = document.metadata.extension;
  console.log(`Redacting structured document of type: ${documentType}`);
  
  // Convert rules to a Python-friendly format
  const pythonRules = rules.map(rule => ({
    id: rule.id,
    name: rule.name,
    pattern: rule.pattern || null,
    regex: rule.regex || null,
    replacementType: rule.replacementType,
    replacement: rule.replacement || '[REDACTED]',
    replacementChar: rule.replacementChar || 'X'
  }));
  
  try {
    // Pass document and rules to Python for processing
    // Using async version to avoid blocking the UI
    const result = await pyodide.runPythonAsync(`
      import json
      import re
      
      # Parse input data
      document_content = json.loads('${JSON.stringify(document.content)}')
      rules = json.loads('${JSON.stringify(pythonRules)}')
      document_type = "${documentType}"
      
      # Statistics for tracking
      applied_rules = [{
        'rule_id': rule['id'],
        'rule_name': rule['name'],
        'matches': 0
      } for rule in rules]
      
      total_redactions = 0
      
      # Function to create regex pattern from a rule
      def create_pattern(rule):
          if rule['regex']:
              return re.compile(rule['regex'], re.IGNORECASE)
          else:
              return re.compile(re.escape(rule['pattern']), re.IGNORECASE)
      
      # Function to get replacement based on rule type
      def get_replacement(rule, match):
          if rule['replacementType'] == 'fixed':
              return rule['replacement']
          elif rule['replacementType'] == 'character':
              return rule['replacementChar'] * len(match)
          elif rule['replacementType'] == 'format-preserving':
              result = ''
              for char in match:
                  if char.isdigit():
                      result += 'X'
                  elif char.islower():
                      result += 'x'
                  elif char.isupper():
                      result += 'X'
                  else:
                      result += char
              return result
          else:
              return '[REDACTED]'
      
      # Deep copy a dictionary/list structure
      def deep_copy(obj):
          return json.loads(json.dumps(obj))
      
      # Process PDF document
      if document_type in ["pdf"]:
          # Make a copy of the document
          redacted_document = deep_copy(document_content)
          
          # Process each page
          for i, page in enumerate(document_content.get('pages', [])):
              # Process main text content
              text = page.get('text', '')
              redacted_text = text
              
              # Apply each rule to the text
              for rule_idx, rule in enumerate(rules):
                  pattern = create_pattern(rule)
                  
                  # Find all matches
                  matches = pattern.findall(redacted_text)
                  match_count = len(matches)
                  
                  # Update statistics
                  applied_rules[rule_idx]['matches'] += match_count
                  total_redactions += match_count
                  
                  # Apply redaction
                  def replace_func(match_obj):
                      return get_replacement(rule, match_obj.group(0))
                  
                  redacted_text = pattern.sub(replace_func, redacted_text)
              
              # Update the redacted document
              redacted_document['pages'][i]['text'] = redacted_text
              
              # Process paragraphs if available
              if 'paragraphs' in page:
                  for j, para in enumerate(page['paragraphs']):
                      para_text = para.get('text', '')
                      redacted_para = para_text
                      
                      # Apply each rule to the paragraph
                      for rule_idx, rule in enumerate(rules):
                          pattern = create_pattern(rule)
                          redacted_para = pattern.sub(lambda m: get_replacement(rule, m.group(0)), redacted_para)
                      
                      # Update the redacted document
                      redacted_document['pages'][i]['paragraphs'][j]['text'] = redacted_para
              
              # Process elements if available
              if 'elements' in page:
                  for j, element in enumerate(page['elements']):
                      element_text = element.get('text', '')
                      redacted_element = element_text
                      
                      # Apply each rule to the element
                      for rule_idx, rule in enumerate(rules):
                          pattern = create_pattern(rule)
                          redacted_element = pattern.sub(lambda m: get_replacement(rule, m.group(0)), redacted_element)
                      
                      # Update the redacted document
                      redacted_document['pages'][i]['elements'][j]['text'] = redacted_element
          
          # Additionally redact the full text if available
          if 'text' in document_content:
              redacted_full_text = document_content['text']
              for rule in rules:
                  pattern = create_pattern(rule)
                  redacted_full_text = pattern.sub(lambda m: get_replacement(rule, m.group(0)), redacted_full_text)
              redacted_document['text'] = redacted_full_text
          
      # Process Word document
      elif document_type in ["docx", "doc"]:
          # Make a copy of the document
          redacted_document = deep_copy(document_content)
          
          # Process paragraphs
          if 'paragraphs' in document_content:
              for i, para in enumerate(document_content['paragraphs']):
                  para_text = para.get('text', '')
                  redacted_para = para_text
                  
                  # Apply each rule to the paragraph
                  for rule_idx, rule in enumerate(rules):
                      pattern = create_pattern(rule)
                      
                      # Find all matches
                      matches = pattern.findall(redacted_para)
                      match_count = len(matches)
                      
                      # Update statistics
                      applied_rules[rule_idx]['matches'] += match_count
                      total_redactions += match_count
                      
                      # Apply redaction
                      redacted_para = pattern.sub(lambda m: get_replacement(rule, m.group(0)), redacted_para)
                  
                  # Update the redacted document
                  redacted_document['paragraphs'][i]['text'] = redacted_para
          
          # Process tables
          if 'tables' in document_content:
              for i, table in enumerate(document_content['tables']):
                  for j, row in enumerate(table.get('data', [])):
                      for k, cell in enumerate(row):
                          cell_text = cell.get('text', '')
                          redacted_cell = cell_text
                          
                          # Apply each rule to the cell
                          for rule_idx, rule in enumerate(rules):
                              pattern = create_pattern(rule)
                              
                              # Find all matches
                              matches = pattern.findall(redacted_cell)
                              match_count = len(matches)
                              
                              # Update statistics
                              applied_rules[rule_idx]['matches'] += match_count
                              total_redactions += match_count
                              
                              # Apply redaction
                              redacted_cell = pattern.sub(lambda m: get_replacement(rule, m.group(0)), redacted_cell)
                          
                          # Update the redacted document
                          redacted_document['tables'][i]['data'][j][k]['text'] = redacted_cell
          
          # Redact pages if available (for consistency)
          if 'pages' in document_content:
              for i, page in enumerate(document_content['pages']):
                  # Process paragraphs in pages
                  if 'paragraphs' in page:
                      for j, para in enumerate(page['paragraphs']):
                          para_text = para.get('text', '')
                          redacted_para = para_text
                          
                          # Apply each rule to the paragraph
                          for rule in rules:
                              pattern = create_pattern(rule)
                              redacted_para = pattern.sub(lambda m: get_replacement(rule, m.group(0)), redacted_para)
                          
                          # Update the redacted document
                          redacted_document['pages'][i]['paragraphs'][j]['text'] = redacted_para
                  
                  # Process tables in pages
                  if 'tables' in page:
                      for j, table in enumerate(page['tables']):
                          # Same logic as above for tables
                          pass
          
          # Additionally redact the full text if available
          if 'text' in document_content:
              redacted_full_text = document_content['text']
              for rule in rules:
                  pattern = create_pattern(rule)
                  redacted_full_text = pattern.sub(lambda m: get_replacement(rule, m.group(0)), redacted_full_text)
              redacted_document['text'] = redacted_full_text
      
      # Process image with OCR text
      elif document_type in ["jpg", "jpeg", "png", "gif"]:
          # Make a copy of the document
          redacted_document = deep_copy(document_content)
          
          # Redact main text
          if 'text' in document_content:
              redacted_text = document_content['text']
              
              # Apply each rule to the text
              for rule_idx, rule in enumerate(rules):
                  pattern = create_pattern(rule)
                  
                  # Find all matches
                  matches = pattern.findall(redacted_text)
                  match_count = len(matches)
                  
                  # Update statistics
                  applied_rules[rule_idx]['matches'] += match_count
                  total_redactions += match_count
                  
                  # Apply redaction
                  redacted_text = pattern.sub(lambda m: get_replacement(rule, m.group(0)), redacted_text)
              
              redacted_document['text'] = redacted_text
          
          # Redact words
          if 'words' in document_content:
              for i, word in enumerate(document_content['words']):
                  word_text = word.get('text', '')
                  redacted_word = word_text
                  was_redacted = False
                  
                  # Apply each rule to the word
                  for rule_idx, rule in enumerate(rules):
                      pattern = create_pattern(rule)
                      
                      if pattern.fullmatch(word_text):
                          # Word fully matches the pattern - update statistics once
                          if not was_redacted:
                              applied_rules[rule_idx]['matches'] += 1
                              total_redactions += 1
                              was_redacted = True
                          
                          # Apply redaction
                          redacted_word = get_replacement(rule, word_text)
                      
                  # Update the redacted document
                  redacted_document['words'][i]['text'] = redacted_word
                  redacted_document['words'][i]['redacted'] = was_redacted
          
          # Redact paragraphs
          if 'paragraphs' in document_content:
              for i, para in enumerate(document_content['paragraphs']):
                  para_text = para.get('text', '')
                  redacted_para = para_text
                  
                  # Apply each rule to the paragraph
                  for rule in rules:
                      pattern = create_pattern(rule)
                      redacted_para = pattern.sub(lambda m: get_replacement(rule, m.group(0)), redacted_para)
                  
                  # Update the redacted document
                  redacted_document['paragraphs'][i]['text'] = redacted_para
          
          # Redact pages if available (for OCR result consistency)
          if 'pages' in document_content:
              for i, page in enumerate(document_content['pages']):
                  page_text = page.get('text', '')
                  redacted_page_text = page_text
                  
                  # Apply each rule to the page text
                  for rule in rules:
                      pattern = create_pattern(rule)
                      redacted_page_text = pattern.sub(lambda m: get_replacement(rule, m.group(0)), redacted_page_text)
                  
                  # Update the redacted document
                  redacted_document['pages'][i]['text'] = redacted_page_text
                  
                  # Also redact words in pages
                  if 'words' in page:
                      for j, word in enumerate(page['words']):
                          word_text = word.get('text', '')
                          redacted_word = word_text
                          was_redacted = False
                          
                          # Apply each rule to the word
                          for rule in rules:
                              pattern = create_pattern(rule)
                              
                              if pattern.fullmatch(word_text):
                                  # Apply redaction
                                  redacted_word = get_replacement(rule, word_text)
                                  was_redacted = True
                              
                          # Update the redacted document
                          redacted_document['pages'][i]['words'][j]['text'] = redacted_word
                          redacted_document['pages'][i]['words'][j]['redacted'] = was_redacted
      
      else:
          # Default fallback for unsupported structured document types
          redacted_document = deep_copy(document_content)
          if 'text' in document_content:
              text = document_content['text']
              redacted_text = text
              
              # Apply each rule to the text
              for rule_idx, rule in enumerate(rules):
                  pattern = create_pattern(rule)
                  
                  # Find all matches
                  matches = pattern.findall(redacted_text)
                  match_count = len(matches)
                  
                  # Update statistics
                  applied_rules[rule_idx]['matches'] += match_count
                  total_redactions += match_count
                  
                  # Apply redaction
                  redacted_text = pattern.sub(lambda m: get_replacement(rule, m.group(0)), redacted_text)
              
              redacted_document['text'] = redacted_text
      
      # Return the result
      {
          'redacted': redacted_document,
          'applied_rules': applied_rules,
          'total_redactions': total_redactions
      }
    `);
  
    const processingTime = performance.now() - startTime;
    
    // Convert Python result to JavaScript object
    const pythonResult = result.toJs();
    
    console.log(`Redacted ${pythonResult.total_redactions} items in ${Math.round(processingTime)}ms`);
    
    return {
      redacted: pythonResult.redacted,
      appliedRules: pythonResult.applied_rules,
      totalRedactions: pythonResult.total_redactions,
      processingTime
    };
  } catch (error) {
    console.error('Error during structured document redaction:', error);
    throw new Error(`Structured document redaction failed: ${error.message}`);
  }
}

/**
 * Apply redaction to image documents
 * @param {Object} document - Image document to redact
 * @param {Array} rules - Redaction rules to apply
 * @param {Object} pyodide - Pyodide instance for Python processing
 * @returns {Promise<Object>} - Redacted image data and metadata
 */
async function redactImageDocument(document, rules, pyodide) {
  const startTime = performance.now();
  
  // Check if we have Pyodide
  if (!pyodide) {
    throw new Error('Pyodide instance is required for image document redaction');
  }
  
  // Check if we have OCR data (text, words, etc.)
  if (!document.content.words || document.content.words.length === 0) {
    console.warn('No word data found in the image document. OCR may not have been performed.');
    return {
      redacted: document.content,
      appliedRules: rules.map(rule => ({ ruleId: rule.id, ruleName: rule.name, matches: 0 })),
      totalRedactions: 0,
      processingTime: 0
    };
  }
  
  try {
    console.log(`Redacting image document with ${document.content.words.length} words`);
    
    // Convert rules to a Python-friendly format
    const pythonRules = rules.map(rule => ({
      id: rule.id,
      name: rule.name,
      pattern: rule.pattern || null,
      regex: rule.regex || null,
      replacementType: rule.replacementType,
      replacement: rule.replacement || '[REDACTED]',
      replacementChar: rule.replacementChar || 'X'
    }));
    
    // First use the text redaction logic from redactStructuredDocument to handle the text content
    // This will identify which words need visual redaction in the image
    const result = await pyodide.runPythonAsync(`
      import json
      import re
      import base64
      import io
      from PIL import Image, ImageDraw, ImageFont
      
      # Parse input data
      document_content = json.loads('${JSON.stringify(document.content)}')
      rules = json.loads('${JSON.stringify(pythonRules)}')
      
      # Statistics for tracking
      applied_rules = [{
        'rule_id': rule['id'],
        'rule_name': rule['name'],
        'matches': 0
      } for rule in rules]
      
      total_redactions = 0
      
      # Function to create regex pattern from a rule
      def create_pattern(rule):
          if rule['regex']:
              return re.compile(rule['regex'], re.IGNORECASE)
          else:
              return re.compile(re.escape(rule['pattern']), re.IGNORECASE)
      
      # Function to get replacement based on rule type
      def get_replacement(rule, match):
          if rule['replacementType'] == 'fixed':
              return rule['replacement']
          elif rule['replacementType'] == 'character':
              return rule['replacementChar'] * len(match)
          elif rule['replacementType'] == 'format-preserving':
              result = ''
              for char in match:
                  if char.isdigit():
                      result += 'X'
                  elif char.islower():
                      result += 'x'
                  elif char.isupper():
                      result += 'X'
                  else:
                      result += char
              return result
          else:
              return '[REDACTED]'
      
      # Deep copy a dictionary/list structure
      def deep_copy(obj):
          return json.loads(json.dumps(obj))
      
      # Make a copy of the document
      redacted_document = deep_copy(document_content)
      
      # Redact text in the OCR content
      if 'text' in document_content:
          redacted_text = document_content['text']
          
          for rule_idx, rule in enumerate(rules):
              pattern = create_pattern(rule)
              
              # Find all matches
              matches = pattern.findall(redacted_text)
              match_count = len(matches)
              
              # Update statistics
              applied_rules[rule_idx]['matches'] += match_count
              total_redactions += match_count
              
              # Apply text redaction
              redacted_text = pattern.sub(lambda m: get_replacement(rule, m.group(0)), redacted_text)
          
          redacted_document['text'] = redacted_text
      
      # Process words and mark them for visual redaction
      redacted_words = []
      if 'words' in document_content:
          for word in document_content['words']:
              word_text = word.get('text', '')
              word_redacted = False
              word_replacement = word_text  # Default to original text
              matching_rule = None
              
              # Check each rule
              for rule_idx, rule in enumerate(rules):
                  pattern = create_pattern(rule)
                  
                  # Check if word matches pattern (full match for words)
                  if pattern.fullmatch(word_text):
                      word_redacted = True
                      word_replacement = get_replacement(rule, word_text)
                      matching_rule = rule
                      
                      # Only count as a new redaction if not already counted
                      if not any(rw['id'] == word['id'] for rw in redacted_words):
                          redacted_words.append({
                              'id': word.get('id', len(redacted_words)),
                              'text': word_text,
                              'replacement': word_replacement,
                              'x': word['x'],
                              'y': word['y'],
                              'width': word['width'],
                              'height': word['height'],
                              'rule': rule['id']
                          })
                      break  # Stop after first matching rule
      
      # Now we need to visually redact the image
      has_visual_redactions = len(redacted_words) > 0 and 'imageUrl' in document_content
      
      # Create image URL for redacted version
      redacted_image_data_url = None
      
      if has_visual_redactions:
          try:
              # Extract the base64 data from the image URL
              img_data = document_content['imageUrl']
              if img_data.startswith('data:image'):
                  # Extract the actual base64 data after the comma
                  base64_data = img_data.split(',')[1]
                  image_bytes = base64.b64decode(base64_data)
                  
                  # Open image with PIL
                  img = Image.open(io.BytesIO(image_bytes))
                  
                  # Create a drawing context
                  draw = ImageDraw.Draw(img)
                  
                  # Redact each word
                  for word in redacted_words:
                      # Draw a rectangle over the word
                      x = word['x']
                      y = word['y']
                      width = word['width']
                      height = word['height']
                      
                      # Add padding
                      padding = 2
                      x = max(0, x - padding)
                      y = max(0, y - padding)
                      width = width + (padding * 2)
                      height = height + (padding * 2)
                      
                      # Draw a filled rectangle
                      draw.rectangle([(x, y), (x + width, y + height)], fill="black")
                      
                      # For fixed replacement, we can draw the replacement text
                      for rule in rules:
                          if rule['id'] == word['rule'] and rule['replacementType'] == 'fixed':
                              # Center the text in the redaction box
                              draw.text((x + width/2, y + height/2), rule['replacement'], 
                                       fill="white", anchor="mm")
                              break
                  
                  # Convert back to base64
                  buffer = io.BytesIO()
                  img_format = img.format if img.format else 'JPEG'
                  img.save(buffer, format=img_format)
                  img_bytes = buffer.getvalue()
                  img_base64 = base64.b64encode(img_bytes).decode('utf-8')
                  
                  # Create data URL
                  mime_type = f"image/{img_format.lower()}"
                  redacted_image_data_url = f"data:{mime_type};base64,{img_base64}"
              else:
                  print("Image URL is not in expected data URL format")
          except Exception as e:
              print(f"Error during visual redaction: {str(e)}")
              # If visual redaction fails, continue with text redaction only
      
      # Update the redacted document
      if redacted_image_data_url:
          redacted_document['redactedImageUrl'] = redacted_image_data_url
      
      # Also update the words in the document with redaction markers
      if 'words' in redacted_document:
          for i, word in enumerate(redacted_document['words']):
              word_redacted = False
              word_replacement = word['text']
              
              # Check if this word is in the redacted_words list
              for rw in redacted_words:
                  if (rw['x'] == word['x'] and rw['y'] == word['y'] and 
                      rw['width'] == word['width'] and rw['height'] == word['height']):
                      word_redacted = True
                      word_replacement = rw['replacement']
                      break
              
              # Update the word
              redacted_document['words'][i]['redacted'] = word_redacted
              if word_redacted:
                  redacted_document['words'][i]['text'] = word_replacement
      
      # Return the result
      {
          'redacted': redacted_document,
          'applied_rules': applied_rules,
          'total_redactions': len(redacted_words),
          'redacted_words': redacted_words
      }
    `);
    
    const processingTime = performance.now() - startTime;
    
    // Convert Python result to JavaScript object
    const pythonResult = result.toJs();
    
    console.log(`Redacted ${pythonResult.total_redactions} items in image with ${Math.round(processingTime)}ms processing time`);
    
    return {
      redacted: pythonResult.redacted,
      appliedRules: pythonResult.applied_rules,
      totalRedactions: pythonResult.total_redactions,
      redactedWords: pythonResult.redacted_words,
      processingTime
    };
  } catch (error) {
    console.error('Error during image document redaction:', error);
    console.log('Falling back to text-only redaction');
    
    // Fall back to just returning the document with text redaction, without visual redaction
    const textRedacted = await redactStructuredDocument(document, rules, pyodide);
    return {
      ...textRedacted,
      redactedWords: []
    };
  }
}

/**
 * Escape special characters in string for use in regular expression
 * @param {string} string - String to escape
 * @returns {string} - Escaped string safe for regex
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Create a default redaction rule
 * @param {string} name - Rule name
 * @returns {Object} - New redaction rule with default values
 */
function createDefaultRule(name = 'New Rule') {
  return {
    id: `rule-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    name,
    pattern: '',
    regex: null,
    replacementType: 'fixed',
    replacement: '[REDACTED]',
    replacementChar: 'X',
    priority: 1,
    enabled: true,
    created: new Date().toISOString()
  };
}

/**
 * Create common rules for sensitive data
 * @returns {Array} - Array of common redaction rules
 */
function createCommonRules() {
  return [
    {
      id: `rule-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      name: 'Email Addresses',
      pattern: null,
      regex: '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b',
      replacementType: 'fixed',
      replacement: '[EMAIL]',
      description: 'Matches standard email addresses',
      priority: 1,
      enabled: true,
      created: new Date().toISOString()
    },
    {
      id: `rule-${Date.now()}-${Math.floor(Math.random() * 10000) + 1}`,
      name: 'Phone Numbers',
      pattern: null,
      regex: '\\b(\\+?1[-\\s]?)?(\\(?[0-9]{3}\\)?[-\\s]?)?[0-9]{3}[-\\s]?[0-9]{4}\\b',
      replacementType: 'fixed',
      replacement: '[PHONE]',
      description: 'Matches US phone numbers in various formats',
      priority: 2,
      enabled: true,
      created: new Date().toISOString()
    },
    {
      id: `rule-${Date.now()}-${Math.floor(Math.random() * 10000) + 2}`,
      name: 'Social Security Numbers',
      pattern: null,
      regex: '\\b[0-9]{3}[-\\s]?[0-9]{2}[-\\s]?[0-9]{4}\\b',
      replacementType: 'character',
      replacementChar: 'X',
      description: 'Matches US Social Security Numbers',
      priority: 3,
      enabled: true,
      created: new Date().toISOString()
    },
    {
      id: `rule-${Date.now()}-${Math.floor(Math.random() * 10000) + 3}`,
      name: 'Credit Card Numbers',
      pattern: null,
      regex: '\\b(?:[0-9]{4}[-\\s]?){3}[0-9]{4}\\b',
      replacementType: 'character',
      replacementChar: 'X',
      description: 'Matches credit card numbers with 16 digits',
      priority: 4,
      enabled: true,
      created: new Date().toISOString()
    }
  ];
}

/**
 * Process a batch of documents with the same redaction rules
 * @param {Array} documents - Array of document objects to redact
 * @param {Array} rules - Array of redaction rules to apply
 * @param {Object} pyodide - Initialized Pyodide instance 
 * @param {Function} progressCallback - Optional callback for progress updates
 * @returns {Promise<Object>} - Results for each document and overall statistics
 */
async function redactBatch(documents, rules, pyodide, progressCallback = null) {
  if (!Array.isArray(documents) || documents.length === 0) {
    throw new Error('No documents provided for batch processing');
  }
  
  if (!Array.isArray(rules) || rules.length === 0) {
    throw new Error('No redaction rules provided for batch processing');
  }
  
  const batchStartTime = performance.now();
  const results = [];
  let totalRedactions = 0;
  let processingErrors = 0;
  
  // Process each document
  for (let i = 0; i < documents.length; i++) {
    const document = documents[i];
    
    try {
      // Update progress
      if (progressCallback) {
        progressCallback({
          currentDocument: i + 1,
          totalDocuments: documents.length,
          percent: Math.round((i / documents.length) * 100),
          documentName: document.metadata?.name || `Document ${i + 1}`,
          status: 'processing'
        });
      }
      
      // Process the document
      const result = await redactDocument(document, rules, pyodide);
      
      // Add to results
      results.push({
        documentId: document.id,
        success: true,
        result
      });
      
      // Update totals
      totalRedactions += result.statistics.redactionCount;
    } catch (error) {
      console.error(`Error processing document ${i + 1}:`, error);
      
      // Add failure to results
      results.push({
        documentId: document.id,
        success: false,
        error: error.message
      });
      
      processingErrors++;
    }
  }
  
  // Calculate batch statistics
  const processingTime = performance.now() - batchStartTime;
  const successCount = results.filter(r => r.success).length;
  
  // Final progress update
  if (progressCallback) {
    progressCallback({
      currentDocument: documents.length,
      totalDocuments: documents.length,
      percent: 100,
      status: 'complete',
      processingTime
    });
  }
  
  // Return batch results
  return {
    results,
    statistics: {
      totalDocuments: documents.length,
      successfulDocuments: successCount,
      failedDocuments: processingErrors,
      totalRedactions,
      processingTime
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Analyze document content for potentially sensitive information
 * @param {Object} document - The document object to analyze
 * @param {Object} pyodide - Initialized Pyodide instance
 * @returns {Promise<Object>} - Analysis results with suggested redactions
 */
async function analyzeDocument(document, pyodide) {
  if (!document || !document.content) {
    throw new Error('Invalid document: missing content');
  }
  
  if (!pyodide) {
    throw new Error('Pyodide instance is required for document analysis');
  }
  
  const analysisStartTime = performance.now();
  
  try {
    // Run Python-based analysis
    const result = await pyodide.runPythonAsync(`
      import json
      import re
      
      # Parse document content
      document_content = json.loads('${JSON.stringify(document.content)}')
      
      # Common sensitive data patterns
      patterns = {
          'email': (r'\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b', 'Email Address'),
          'phone_us': (r'\\b(\\+?1[-\\s]?)?(\\(?[0-9]{3}\\)?[-\\s]?)?[0-9]{3}[-\\s]?[0-9]{4}\\b', 'US Phone Number'),
          'ssn': (r'\\b[0-9]{3}[-\\s]?[0-9]{2}[-\\s]?[0-9]{4}\\b', 'US Social Security Number'),
          'credit_card': (r'\\b(?:[0-9]{4}[-\\s]?){3}[0-9]{4}\\b', 'Credit Card Number'),
          'date': (r'\\b(?:[0-9]{1,2}[-/\\s][0-9]{1,2}[-/\\s][0-9]{2,4}|[A-Za-z]{3,9}\\s[0-9]{1,2},?\\s[0-9]{2,4})\\b', 'Date'),
          'ip_address': (r'\\b(?:[0-9]{1,3}\\.){3}[0-9]{1,3}\\b', 'IP Address'),
          'address': (r'\\b\\d+\\s+[A-Za-z0-9\\s,]+\\b(?:Avenue|Lane|Road|Boulevard|Drive|Street|Ave|Dr|Rd|Blvd|Ln|St)\\.?\\b', 'Street Address')
      }
      
      # Get text to analyze
      if isinstance(document_content, str):
          # Direct text content
          text = document_content
      elif 'text' in document_content:
          # Text field in document
          text = document_content['text']
      elif 'pages' in document_content and isinstance(document_content['pages'], list):
          # Concatenate text from pages
          text = '\\n'.join(page.get('text', '') for page in document_content['pages'] if 'text' in page)
      else:
          # Try to extract from paragraphs, words, etc.
          text_parts = []
          
          if 'paragraphs' in document_content:
              text_parts.extend(p.get('text', '') for p in document_content['paragraphs'] if 'text' in p)
          
          if 'words' in document_content:
              text_parts.extend(w.get('text', '') for w in document_content['words'] if 'text' in w)
              
          text = '\\n'.join(text_parts)
      
      # Find matches for each pattern
      findings = []
      for pattern_id, (pattern, pattern_name) in patterns.items():
          regex = re.compile(pattern)
          matches = regex.finditer(text)
          
          for match in matches:
              match_text = match.group(0)
              findings.append({
                  'pattern': pattern_id,
                  'pattern_name': pattern_name,
                  'text': match_text,
                  'start': match.start(),
                  'end': match.end(),
                  'context': text[max(0, match.start() - 20):min(len(text), match.end() + 20)]
              })
      
      # Analyze findings
      analysis = {
          'has_sensitive_data': len(findings) > 0,
          'findings': findings,
          'summary': {
              'total_findings': len(findings),
              'by_type': {}
          }
      }
      
      # Generate summary by type
      for pattern_id, (_, pattern_name) in patterns.items():
          count = sum(1 for f in findings if f['pattern'] == pattern_id)
          if count > 0:
              analysis['summary']['by_type'][pattern_id] = {
                  'name': pattern_name,
                  'count': count
              }
      
      # Generate suggested redaction rules
      suggested_rules = []
      
      for pattern_id, (pattern, pattern_name) in patterns.items():
          if pattern_id in analysis['summary']['by_type']:
              # This pattern has matches - create a rule
              rule = {
                  'name': pattern_name,
                  'regex': pattern,
                  'replacementType': 'fixed',
                  'replacement': f'[{pattern_name.upper()}]',
                  'description': f'Auto-generated rule for {pattern_name}'
              }
              
              # For credit cards and SSNs, use character replacement
              if pattern_id in ['credit_card', 'ssn']:
                  rule['replacementType'] = 'character'
                  rule['replacementChar'] = 'X'
              
              suggested_rules.append(rule)
      
      analysis['suggested_rules'] = suggested_rules
      
      # Return the analysis
      analysis
    `);
    
    const processingTime = performance.now() - analysisStartTime;
    
    // Get JavaScript version of the result
    const analysisResult = result.toJs();
    
    // Add metadata about the analysis
    return {
      ...analysisResult,
      documentId: document.id,
      documentName: document.metadata?.name || 'Unknown Document',
      analysisTime: processingTime,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Document analysis error:', error);
    throw new Error(`Document analysis failed: ${error.message}`);
  }
}

export {
  redactDocument,
  redactBatch,
  analyzeDocument,
  createDefaultRule,
  createCommonRules
};