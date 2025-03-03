/**
 * Pyodide Setup and Integration Module
 * 
 * This module handles the initialization and management of the Pyodide environment,
 * which allows running Python code within the browser for document processing and redaction.
 */

// Required Python packages for document processing and redaction
const REQUIRED_PACKAGES = [
  'numpy',
  'pandas',
  'pillow',  // For image processing
  'regex',   // For advanced pattern matching
  // Add more packages as needed
];

/**
 * Initialize the Pyodide environment
 * @returns {Promise<Object>} - Initialized Pyodide instance
 */
async function initializePyodide() {
  try {
    // Load Pyodide from CDN
    const pyodide = await loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.23.4/full/",
    });
    
    console.log("Pyodide loaded successfully");
    
    // Install required packages
    await installRequiredPackages(pyodide);
    
    return pyodide;
  } catch (error) {
    console.error("Failed to initialize Pyodide:", error);
    throw new Error("Failed to initialize Python environment: " + error.message);
  }
}

/**
 * Install required Python packages in the Pyodide environment
 * @param {Object} pyodide - Initialized Pyodide instance
 * @returns {Promise<void>}
 */
async function installRequiredPackages(pyodide) {
  try {
    console.log("Installing required Python packages...");
    await pyodide.loadPackagesFromImports(`
      import micropip
      await micropip.install(['${REQUIRED_PACKAGES.join("','")}'])
    `);
    console.log("Required packages installed successfully");
  } catch (error) {
    console.error("Failed to install required packages:", error);
    throw new Error("Failed to install Python packages: " + error.message);
  }
}

/**
 * Execute Python code in the Pyodide environment
 * @param {Object} pyodide - Initialized Pyodide instance
 * @param {string} code - Python code to execute
 * @param {Object} context - Variables to include in the Python namespace
 * @returns {any} - Result from the Python execution
 */
function runPythonCode(pyodide, code, context = {}) {
  try {
    // Create namespace with context variables
    pyodide.globals.set("js_context", context);
    
    // Execute the Python code
    return pyodide.runPython(`
      # Access JavaScript context
      globals().update(js_context)
      
      ${code}
    `);
  } catch (error) {
    console.error("Python execution error:", error);
    throw new Error("Python execution failed: " + error.message);
  }
}

export { initializePyodide, runPythonCode };