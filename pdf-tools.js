// PDF tools for codebyabdulaziz.github.io.
// Everything runs in the visitor's browser. Files are never uploaded.
import * as pdfjsLib from './vendor/pdf.min.js';

const PDFLib = window.PDFLib;
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const assetUrl = (path) => new URL(path, document.baseURI).href;

// Worker entry: installs the Map/WeakMap polyfill, then loads PDF.js's worker.
pdfjsLib.GlobalWorkerOptions.workerSrc = assetUrl('pdf-tools-worker.js');

// Compression presets: render resolution (dpi) and JPEG quality for each page.
const PRESETS = {
  high: { dpi: 150, quality: 0.85 },
  balanced: { dpi: 110, quality: 0.7 },
  smallest: { dpi: 80, quality: 0.5 },
};
const MAX_SIDE_PX = 3000; // limits canvas memory for very large pages
const A4 = { width: 595.28, height: 841.89 }; // points
const MARGIN = 24;
const PDF_TYPE = 'application/pdf';

// ---------- helpers ----------

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

function fileKind(file) {
  const name = file.name.toLowerCase();
  if (file.type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
  if (file.type === 'image/jpeg' || /\.jpe?g$/.test(name)) return 'jpeg';
  if (file.type === 'image/png' || name.endsWith('.png')) return 'png';
  if (file.type === 'image/webp' || name.endsWith('.webp')) return 'webp';
  return null;
}

function setStatus(element, message, tone = 'info') {
  element.textContent = message;
  element.dataset.tone = tone;
}

const ENCRYPTED_MESSAGE = 'This PDF is password-protected or encrypted, so it cannot be changed here. Remove the protection first.';

// pdf-lib reports encryption with a plain Error, so the message is checked as well.
function isEncryptedError(error) {
  return /is encrypted/i.test(error?.message ?? '') || error?.name === 'PasswordException';
}

function friendlyError(error) {
  if (isEncryptedError(error)) return ENCRYPTED_MESSAGE;
  return error?.message || 'Something went wrong. Please try another file.';
}

async function readBytes(file) {
  return new Uint8Array(await file.arrayBuffer());
}

async function openPdf(bytes) {
  try {
    return await PDFLib.PDFDocument.load(bytes, { updateMetadata: false });
  } catch (error) {
    if (isEncryptedError(error)) throw new Error(ENCRYPTED_MESSAGE);
    throw new Error('This file could not be read as a PDF. It may be damaged.');
  }
}

function download(bytes, name, type = PDF_TYPE) {
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const link = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

async function runTask(button, label, status, task, refresh) {
  button.disabled = true;
  button.textContent = 'Working…';
  try {
    await task();
  } catch (error) {
    setStatus(status, friendlyError(error), 'error');
  } finally {
    button.textContent = label;
    refresh();
  }
}

// Accepts files from the input or from drag and drop.
function wireFileInput(input, handler) {
  input.addEventListener('change', () => {
    const files = [...input.files];
    input.value = '';
    handler(files);
  });
  const zone = input.closest('.drop-zone');
  zone.addEventListener('dragover', (event) => {
    event.preventDefault();
    zone.classList.add('is-dragover');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('is-dragover'));
  zone.addEventListener('drop', (event) => {
    event.preventDefault();
    zone.classList.remove('is-dragover');
    handler([...event.dataTransfer.files]);
  });
}

// Parses "1-3, 5, 8-10" (Arabic digits allowed) into sorted 0-based page indexes.
function parsePageList(text, count) {
  const normalized = text
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[–—−]/g, '-')
    .trim();
  const parts = normalized.split(',').map((part) => part.trim()).filter(Boolean);
  if (!parts.length) throw new Error('Enter at least one page or range, for example 1-3, 5.');
  const selected = new Set();
  for (const part of parts) {
    const match = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(part);
    if (!match) throw new Error(`"${part}" is not a page or a page range.`);
    const from = Number(match[1]);
    const to = match[2] ? Number(match[2]) : from;
    if (from < 1 || to > count || from > to) {
      throw new Error(`"${part}" is outside the pages of this file (1–${count}).`);
    }
    for (let page = from; page <= to; page += 1) selected.add(page - 1);
  }
  return [...selected].sort((a, b) => a - b);
}

function iconButton(label, symbol, action, disabled, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'icon-btn';
  button.dataset.action = action;
  button.setAttribute('aria-label', label);
  button.title = label;
  button.textContent = symbol;
  button.disabled = disabled;
  button.addEventListener('click', onClick);
  return button;
}

// A list of files the user can reorder and remove. Used by Merge and Images to PDF.
function createFileList({ listEl, kinds, acceptLabel, status, describe, onChange }) {
  const items = [];

  function render(focus) {
    listEl.replaceChildren(...items.map((item, index) => {
      const row = document.createElement('li');
      row.className = 'file-item';

      const info = document.createElement('div');
      info.className = 'file-info';
      const name = document.createElement('span');
      name.className = 'file-name';
      name.textContent = item.file.name;
      const meta = document.createElement('span');
      meta.className = item.error ? 'file-meta is-error' : 'file-meta';
      meta.textContent = item.error || [formatSize(item.file.size), item.meta].filter(Boolean).join(' · ');
      info.append(name, meta);

      const actions = document.createElement('div');
      actions.className = 'file-actions';
      actions.append(
        iconButton(`Move ${item.file.name} up`, '↑', 'up', index === 0, () => move(index, -1)),
        iconButton(`Move ${item.file.name} down`, '↓', 'down', index === items.length - 1, () => move(index, 1)),
        iconButton(`Remove ${item.file.name}`, '×', 'remove', false, () => remove(index)),
      );
      row.append(info, actions);
      return row;
    }));
    if (focus) {
      // Keep keyboard focus on the moved row, falling back to another enabled button.
      const row = listEl.children[focus.index];
      const button = [focus.action, 'up', 'down', 'remove']
        .map((action) => row?.querySelector(`[data-action="${action}"]:not([disabled])`))
        .find(Boolean);
      button?.focus();
    }
    onChange();
  }

  function move(index, step) {
    const target = index + step;
    if (target < 0 || target >= items.length) return;
    [items[index], items[target]] = [items[target], items[index]];
    render({ index: target, action: step < 0 ? 'up' : 'down' });
  }

  function remove(index) {
    items.splice(index, 1);
    render(items.length ? { index: Math.min(index, items.length - 1), action: 'remove' } : null);
  }

  async function add(files) {
    const accepted = files.filter((file) => kinds.includes(fileKind(file)));
    setStatus(status, accepted.length < files.length ? `Only ${acceptLabel} files can be added here.` : '', accepted.length < files.length ? 'error' : 'info');
    const added = accepted.map((file) => ({ file, meta: '', error: '' }));
    items.push(...added);
    render();
    for (const item of added) {
      try {
        item.meta = await describe(item.file);
      } catch (error) {
        item.error = friendlyError(error);
      }
      render();
    }
  }

  return { items, add };
}

async function describePdf(file) {
  const doc = await openPdf(await readBytes(file));
  return `${doc.getPageCount()} pages`;
}

async function describeImage(file) {
  const bitmap = await createImageBitmap(file);
  const label = `${bitmap.width} × ${bitmap.height} px`;
  bitmap.close();
  return label;
}

// A single PDF chosen with a file input. Shows its page count and calls onChange.
function singlePdfPicker({ input, info, status, onChange }) {
  const picker = { file: null, pages: 0 };
  wireFileInput(input, async (files) => {
    if (!files.length) return;
    const candidate = files.find((file) => fileKind(file) === 'pdf');
    if (!candidate) {
      setStatus(status, 'Please choose a PDF file.', 'error');
      return;
    }
    picker.file = candidate;
    picker.pages = 0;
    setStatus(status, '');
    info.textContent = `Reading ${candidate.name}…`;
    try {
      const doc = await openPdf(await readBytes(candidate));
      picker.pages = doc.getPageCount();
      info.textContent = `${candidate.name} · ${picker.pages} pages · ${formatSize(candidate.size)}`;
    } catch (error) {
      picker.file = null;
      info.textContent = '';
      setStatus(status, friendlyError(error), 'error');
    }
    onChange();
  });
  return picker;
}

// Renders each page to a canvas and rebuilds the PDF from those images.
// The result is smaller for scans and photos, but text becomes non-selectable.
async function compressPdf(bytes, preset, onPage) {
  const loadingTask = pdfjsLib.getDocument({
    data: bytes.slice(),
    disableFontFace: true,
    standardFontDataUrl: assetUrl('vendor/standard_fonts/'),
  });
  const source = await loadingTask.promise;
  const output = await PDFLib.PDFDocument.create();
  try {
    for (let number = 1; number <= source.numPages; number += 1) {
      onPage(number, source.numPages);
      const page = await source.getPage(number);
      const size = page.getViewport({ scale: 1 }); // points, with the page rotation applied
      const scale = Math.min(preset.dpi / 72, MAX_SIDE_PX / Math.max(size.width, size.height));
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext('2d', { alpha: false });
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: context, viewport }).promise;
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', preset.quality));
      if (!blob) throw new Error(`Page ${number} is too large to convert. Try a lower quality setting.`);
      const image = await output.embedJpg(new Uint8Array(await blob.arrayBuffer()));
      const outPage = output.addPage([size.width, size.height]);
      outPage.drawImage(image, { x: 0, y: 0, width: size.width, height: size.height });
      await page.cleanup();
      canvas.width = 0;
      canvas.height = 0;
    }
    return await output.save();
  } finally {
    await loadingTask.destroy();
  }
}

async function webpToPng(file) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext('2d').drawImage(bitmap, 0, 0);
  bitmap.close();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('This WebP image could not be converted.');
  return new Uint8Array(await blob.arrayBuffer());
}

function addImagePage(pdf, image, mode) {
  const { width, height } = image;
  if (mode === 'original') {
    const page = pdf.addPage([width, height]);
    page.drawImage(image, { x: 0, y: 0, width, height });
    return;
  }
  const landscape = width > height;
  const pageWidth = landscape ? A4.height : A4.width;
  const pageHeight = landscape ? A4.width : A4.height;
  const scale = Math.min((pageWidth - 2 * MARGIN) / width, (pageHeight - 2 * MARGIN) / height);
  const drawWidth = width * scale;
  const drawHeight = height * scale;
  const page = pdf.addPage([pageWidth, pageHeight]);
  page.drawImage(image, {
    x: (pageWidth - drawWidth) / 2,
    y: (pageHeight - drawHeight) / 2,
    width: drawWidth,
    height: drawHeight,
  });
}

// ---------- tools ----------

function setupMerge() {
  const status = $('#merge-status');
  const run = $('#merge-run');
  const refresh = () => {
    run.disabled = list.items.length < 2 || list.items.some((item) => item.error);
  };
  const list = createFileList({
    listEl: $('#merge-list'),
    kinds: ['pdf'],
    acceptLabel: 'PDF',
    status,
    describe: describePdf,
    onChange: refresh,
  });
  wireFileInput($('#merge-input'), (files) => list.add(files));
  run.addEventListener('click', () => runTask(run, 'Merge and download', status, async () => {
    const merged = await PDFLib.PDFDocument.create();
    let pages = 0;
    for (const [index, item] of list.items.entries()) {
      setStatus(status, `Reading file ${index + 1} of ${list.items.length}…`);
      const source = await openPdf(await readBytes(item.file));
      const copied = await merged.copyPages(source, source.getPageIndices());
      copied.forEach((page) => merged.addPage(page));
      pages += copied.length;
    }
    const bytes = await merged.save();
    download(bytes, 'merged.pdf');
    setStatus(status, `Merged ${list.items.length} files into ${pages} pages (${formatSize(bytes.length)}).`, 'success');
  }, refresh));
  refresh();
}

function setupCompress() {
  const status = $('#compress-status');
  const run = $('#compress-run');
  const refresh = () => {
    run.disabled = !picker.file;
  };
  const picker = singlePdfPicker({
    input: $('#compress-input'),
    info: $('#compress-info'),
    status,
    onChange: refresh,
  });
  run.addEventListener('click', () => runTask(run, 'Compress and download', status, async () => {
    const level = document.querySelector('input[name="compress-level"]:checked').value;
    const original = await readBytes(picker.file);
    const compressed = await compressPdf(original, PRESETS[level], (page, total) => {
      setStatus(status, `Rendering page ${page} of ${total}…`);
    });
    if (compressed.length >= original.length) {
      const hint = level === 'smallest'
        ? 'The original is already the smallest option for this file.'
        : 'Try the Smallest setting.';
      setStatus(status, `Compressing did not make this file smaller (${formatSize(compressed.length)} instead of ${formatSize(original.length)}). Nothing was downloaded. ${hint}`, 'info');
      return;
    }
    download(compressed, `compressed-${picker.file.name}`);
    const percent = Math.round((1 - compressed.length / original.length) * 100);
    setStatus(status, `Reduced from ${formatSize(original.length)} to ${formatSize(compressed.length)} (${percent}% smaller).`, 'success');
  }, refresh));
  refresh();
}

function setupExtract() {
  const status = $('#extract-status');
  const run = $('#extract-run');
  const ranges = $('#extract-ranges');
  const refresh = () => {
    run.disabled = !picker.file;
  };
  const picker = singlePdfPicker({
    input: $('#extract-input'),
    info: $('#extract-info'),
    status,
    onChange: refresh,
  });
  run.addEventListener('click', () => runTask(run, 'Extract and download', status, async () => {
    const pages = parsePageList(ranges.value, picker.pages);
    const source = await openPdf(await readBytes(picker.file));
    const output = await PDFLib.PDFDocument.create();
    const copied = await output.copyPages(source, pages);
    copied.forEach((page) => output.addPage(page));
    download(await output.save(), `extracted-${picker.file.name}`);
    setStatus(status, `Extracted ${pages.length} ${pages.length === 1 ? 'page' : 'pages'}.`, 'success');
  }, refresh));
  refresh();
}

function setupRotate() {
  const status = $('#rotate-status');
  const run = $('#rotate-run');
  const allPages = $('#rotate-all');
  const pageText = $('#rotate-pages');
  const refresh = () => {
    run.disabled = !picker.file;
    pageText.disabled = allPages.checked;
  };
  const picker = singlePdfPicker({
    input: $('#rotate-input'),
    info: $('#rotate-info'),
    status,
    onChange: refresh,
  });
  allPages.addEventListener('change', refresh);
  run.addEventListener('click', () => runTask(run, 'Rotate and download', status, async () => {
    const angle = Number(document.querySelector('input[name="rotate-angle"]:checked').value);
    const source = await openPdf(await readBytes(picker.file));
    const indexes = allPages.checked
      ? source.getPageIndices()
      : parsePageList(pageText.value, source.getPageCount());
    for (const index of indexes) {
      const page = source.getPage(index);
      page.setRotation(PDFLib.degrees((page.getRotation().angle + angle) % 360));
    }
    download(await source.save(), `rotated-${picker.file.name}`);
    setStatus(status, `Rotated ${indexes.length} ${indexes.length === 1 ? 'page' : 'pages'} by ${angle}°.`, 'success');
  }, refresh));
  refresh();
}

function setupImages() {
  const status = $('#images-status');
  const run = $('#images-run');
  const refresh = () => {
    run.disabled = list.items.length === 0 || list.items.some((item) => item.error);
  };
  const list = createFileList({
    listEl: $('#images-list'),
    kinds: ['jpeg', 'png', 'webp'],
    acceptLabel: 'JPG, PNG or WebP',
    status,
    describe: describeImage,
    onChange: refresh,
  });
  wireFileInput($('#images-input'), (files) => list.add(files));
  run.addEventListener('click', () => runTask(run, 'Create PDF and download', status, async () => {
    const mode = document.querySelector('input[name="images-size"]:checked').value;
    const output = await PDFLib.PDFDocument.create();
    for (const [index, item] of list.items.entries()) {
      setStatus(status, `Adding image ${index + 1} of ${list.items.length}…`);
      const kind = fileKind(item.file);
      const bytes = kind === 'webp' ? await webpToPng(item.file) : await readBytes(item.file);
      const image = kind === 'jpeg' ? await output.embedJpg(bytes) : await output.embedPng(bytes);
      addImagePage(output, image, mode);
    }
    download(await output.save(), 'images.pdf');
    setStatus(status, `Created a ${list.items.length}-page PDF.`, 'success');
  }, refresh));
  refresh();
}

function setupNumbers() {
  const status = $('#numbers-status');
  const run = $('#numbers-run');
  const position = $('#numbers-position');
  const format = $('#numbers-format');
  const start = $('#numbers-start');
  const refresh = () => {
    run.disabled = !picker.file;
  };
  const picker = singlePdfPicker({
    input: $('#numbers-input'),
    info: $('#numbers-info'),
    status,
    onChange: refresh,
  });
  run.addEventListener('click', () => runTask(run, 'Add page numbers and download', status, async () => {
    const first = Math.floor(Number(start.value));
    if (!Number.isFinite(first) || first < 0) throw new Error('Start number must be a whole number, 0 or higher.');
    const doc = await openPdf(await readBytes(picker.file));
    const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
    const total = doc.getPageCount();
    const last = first + total - 1;
    doc.getPages().forEach((page, index) => {
      const number = first + index;
      let label = `${number} / ${last}`;
      if (format.value === 'plain') label = `${number}`;
      if (format.value === 'page') label = `Page ${number} of ${last}`;
      const size = 9;
      const textWidth = font.widthOfTextAtSize(label, size);
      const { width } = page.getSize();
      let x = (width - textWidth) / 2;
      if (position.value === 'left') x = MARGIN + 12;
      if (position.value === 'right') x = width - MARGIN - 12 - textWidth;
      page.drawText(label, { x, y: 22, size, font, color: PDFLib.rgb(0.3, 0.3, 0.3) });
    });
    download(await doc.save(), `numbered-${picker.file.name}`);
    setStatus(status, `Numbered ${total} ${total === 1 ? 'page' : 'pages'}.`, 'success');
  }, refresh));
  refresh();
}

// ---------- tabs ----------

function setupTabs() {
  const tabs = $$('[role="tab"]');
  const select = (tab, { focus = false } = {}) => {
    for (const item of tabs) {
      const active = item === tab;
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
      document.getElementById(item.getAttribute('aria-controls')).hidden = !active;
    }
    if (focus) tab.focus();
    history.replaceState(null, '', `#${tab.dataset.tool}`);
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', (event) => {
      let next = null;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== null) {
        event.preventDefault();
        select(tabs[next], { focus: true });
      }
    });
  });

  // Open a tool directly with a link such as pdf-tools.html#compress.
  const requested = tabs.find((tab) => tab.dataset.tool === location.hash.slice(1));
  select(requested ?? tabs[0]);
}

function init() {
  if (!PDFLib) {
    setStatus($('#merge-status'), 'The PDF library did not load. Refresh the page and try again.', 'error');
    return;
  }
  setupMerge();
  setupCompress();
  setupExtract();
  setupRotate();
  setupImages();
  setupNumbers();
  setupTabs();
}

init();
