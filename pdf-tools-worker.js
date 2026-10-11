// Worker entry for PDF.js. pdf-tools.js points GlobalWorkerOptions.workerSrc here.
// PDF.js also calls Map/WeakMap.getOrInsertComputed inside the worker, and browsers
// without it (for example Chromium 141) need the polyfill in both places.
// Imports run in order, so the polyfill is installed before PDF.js's worker starts.
import './pdf-tools-compat.js';
import './vendor/pdf.worker.min.js';
