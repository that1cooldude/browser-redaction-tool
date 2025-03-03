/**
 * UI Components Module Index
 * 
 * This module exports all the UI components available in the redaction tool.
 */

import { initDocumentUploader } from './document-uploader.js';
import { initDocumentViewer } from './document-viewer.js';
import { initBatchUploader } from './batch-uploader.js';
import { initRedactionAnalyzer } from './redaction-analyzer.js';
import { initRedactionDashboard } from './redaction-dashboard.js';
import { initImageRedactionEditor } from './image-redaction-editor.js';
import { initRedactionRuleTester } from './redaction-rule-tester.js';
import { initRedactionRuleSelector } from './redaction-rule-selector.js';

export {
  initDocumentUploader,
  initDocumentViewer,
  initBatchUploader,
  initRedactionAnalyzer,
  initRedactionDashboard,
  initImageRedactionEditor,
  initRedactionRuleTester,
  initRedactionRuleSelector
};