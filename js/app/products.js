/* City product directory, fly-to-office navigation and file workspace UI. */
'use strict';

const documentTools = [
  { id: 'image-pdf', name: 'Image to PDF', glyph: 'IMG', accept: '.jpg,.jpeg,.png,.webp', multiple: true, hint: 'JPG, PNG or WebP · Reorder images below', description: 'Turn one or more images into an A4 PDF. Each image gets its own page.', action: 'Create PDF' },
  { id: 'word-pdf', name: 'Word to PDF', glyph: 'DOC', accept: '.docx', multiple: false, hint: 'Word document (.docx)', description: 'Convert DOCX content, tables and images into a PDF. Complex Word layouts are reflowed.', action: 'Convert to PDF' },
  { id: 'pdf-word', name: 'PDF to Word', glyph: 'PDF', accept: '.pdf', multiple: false, hint: 'One PDF document', description: 'Create an editable Word document from PDF text, or preserve each page as an image. Scanned pages are included as images.', action: 'Create Word document' },
  { id: 'pdf-split', name: 'Split PDF', glyph: 'CUT', accept: '.pdf', multiple: false, hint: 'One PDF · Choose the pages to extract', description: 'Extract a selection of pages into a PDF, or download every page separately in a ZIP.', action: 'Split PDF' },
  { id: 'pdf-merge', name: 'Merge PDFs', glyph: 'JOIN', accept: '.pdf', multiple: true, hint: 'Two or more PDFs · Reorder files below', description: 'Combine PDF documents in the order shown below. Original pages and selectable text are preserved.', action: 'Merge PDFs' },
  { id: 'pdf-compress', name: 'Compress PDF', glyph: 'ZIP', accept: '.pdf', multiple: false, hint: 'One PDF document', description: 'Optimise PDF structure without losing text, or use image-based compression for a smaller visual copy.', action: 'Compress PDF' },
  { id: 'md-pdf', name: 'Markdown to PDF', glyph: 'MD', accept: '.md,.markdown,.txt', multiple: false, hint: 'Markdown (.md, .markdown) or text (.txt)', description: 'Render headings, lists, code, tables and formatted text into a clean, readable PDF.', action: 'Create PDF' },
];
let selectedDocumentTool = documentTools[0];
let documentFiles = [];
let documentBusy = false;
let documentResultURL = null;
let studioReturnFocus = null;
let arrivalTween = null;

function openDocumentStudio(toolId = selectedDocumentTool.id, trigger = document.activeElement) {
  studioReturnFocus = trigger;
  $('#documentStudio').hidden = false;
  document.body.classList.add('studio-open');
  if (toolId !== selectedDocumentTool.id && !documentBusy) selectDocumentTool(toolId);
  manual();
  showView(documentOfficeLocation.view);
  $('#studioArrival').textContent = 'Travelling to Document Studio…';
  if (arrivalTween) arrivalTween.kill();
  arrivalTween = gsap.delayedCall(reduced ? 0.05 : 2.6, () => {
    $('#studioArrival').textContent = 'You have arrived · Choose a tool to begin';
  });
  $('#documentTool').focus({ preventScroll: true });
  loadDocumentLibraries().catch(err => setDocumentStatus(err.message, true));
}

function closeDocumentStudio() {
  $('#documentStudio').hidden = true;
  document.body.classList.remove('studio-open');
  if (arrivalTween) arrivalTween.kill();
  if (studioReturnFocus?.isConnected && studioReturnFocus.focus) studioReturnFocus.focus({ preventScroll: true });
}

function pickDocumentOffice(clientX, clientY) {
  if (!diagnostics.documentOffice) return false;
  const rect = $('#world').getBoundingClientRect();
  const ray = new T.Raycaster();
  ray.setFromCamera(new T.Vector2((clientX - rect.left) / rect.width * 2 - 1, -(clientY - rect.top) / rect.height * 2 + 1), camera);
  const hit = ray.intersectObject(diagnostics.documentOffice.mesh)[0];
  if (!hit) return false;
  // Avoid opening an office hidden behind another building.
  const point = hit.point;
  for (const b of buildingBounds) {
    if (b.type === 'document office') continue;
    const bounds = new T.Box3(new T.Vector3(b.x - b.w / 2, 0, b.z - b.d / 2), new T.Vector3(b.x + b.w / 2, b.h, b.z + b.d / 2));
    const intersection = ray.ray.intersectBox(bounds, new T.Vector3());
    if (intersection && intersection.distanceTo(camera.position) < point.distanceTo(camera.position) - 1) return false;
  }
  openDocumentStudio();
  return true;
}

function setDocumentStatus(message, error = false) {
  $('#documentStatus').textContent = message;
  $('#documentStatus').classList.toggle('error', error);
}

function clearDocumentResult() {
  if (documentResultURL) URL.revokeObjectURL(documentResultURL);
  documentResultURL = null;
  $('#documentResult').hidden = true;
  $('#downloadDocument').removeAttribute('href');
}

function selectDocumentTool(id) {
  if (documentBusy) return;
  selectedDocumentTool = documentTools.find(t => t.id === id) || documentTools[0];
  $('#documentTool').value = selectedDocumentTool.id;
  $('#toolDescription').textContent = selectedDocumentTool.description;
  $('#fileAcceptHint').textContent = selectedDocumentTool.hint;
  $('#documentFiles').accept = selectedDocumentTool.accept;
  $('#documentFiles').multiple = selectedDocumentTool.multiple;
  $('#documentFiles').value = '';
  documentFiles = [];
  clearDocumentResult();
  setDocumentStatus('');
  $$('[data-document-tool]').forEach(b => b.classList.toggle('active', b.dataset.documentTool === selectedDocumentTool.id));
  const options = $('#documentOptions');
  options.innerHTML = '';
  if (id === 'image-pdf') options.innerHTML = '<label><span>Page orientation</span><select id="imageOrientation"><option value="portrait">Portrait A4</option><option value="landscape">Landscape A4</option></select></label>';
  if (id === 'pdf-word') options.innerHTML = '<label><span>Word output</span><select id="wordLayout"><option value="text">Editable text (reflowed)</option><option value="pages">Page images (visual layout)</option></select></label><p class="option-hint">Editable text does not reproduce complex columns exactly. Image pages preserve appearance; text in scanned pages is not OCR-transcribed.</p>';
  if (id === 'pdf-split') options.innerHTML = '<label><span>Split mode</span><select id="splitMode"><option value="selection">Extract selected pages</option><option value="individual">Every page as a separate PDF (ZIP)</option></select></label><label id="pageRangeField"><span>Pages to extract</span><input id="pdfPageRange" type="text" placeholder="e.g. 1-3, 5, 8" autocomplete="off"></label><p class="option-hint">Use page numbers starting at 1. Selected pages keep the order you enter.</p>';
  if (id === 'pdf-compress') options.innerHTML = '<label><span>Compression mode</span><select id="compressionMode"><option value="lossless">Lossless · preserve selectable text</option><option value="balanced">Balanced · image pages, 120 DPI</option><option value="strong">Smaller file · image pages, 85 DPI</option></select></label><p class="option-hint">Image modes flatten pages, so text is no longer selectable. Already optimised PDFs may not become smaller.</p>';
  renderDocumentFiles();
}

function fileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function renderDocumentFiles() {
  const list = $('#documentFileList'); list.replaceChildren();
  documentFiles.forEach((file, index) => {
    const li = document.createElement('li');
    const name = document.createElement('span'); name.className = 'file-name'; name.textContent = file.name;
    const size = document.createElement('small'); size.textContent = fileSize(file.size); name.append(size); li.append(name);
    if (selectedDocumentTool.multiple) for (const [glyph, delta, label] of [['↑', -1, 'Move up'], ['↓', 1, 'Move down']]) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = glyph; button.setAttribute('aria-label', `${label}: ${file.name}`);
      button.disabled = documentBusy || index + delta < 0 || index + delta >= documentFiles.length;
      button.onclick = () => { const target = index + delta; [documentFiles[index], documentFiles[target]] = [documentFiles[target], documentFiles[index]]; clearDocumentResult(); renderDocumentFiles(); };
      li.append(button);
    }
    const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = '×'; remove.disabled = documentBusy; remove.setAttribute('aria-label', `Remove ${file.name}`);
    remove.onclick = () => { documentFiles.splice(index, 1); clearDocumentResult(); renderDocumentFiles(); }; li.append(remove); list.append(li);
  });
  $('#runDocumentTool').disabled = documentBusy || !documentFiles.length || (selectedDocumentTool.id === 'pdf-merge' && documentFiles.length < 2);
  $('#runDocumentTool').innerHTML = `${documentBusy ? 'Processing…' : selectedDocumentTool.action}<span>→</span>`;
}

function addDocumentFiles(files) {
  if (documentBusy) return;
  const allowed = selectedDocumentTool.accept.split(',');
  const incoming = Array.from(files);
  if (!selectedDocumentTool.multiple && incoming.length > 1) { setDocumentStatus('Choose one file for this tool.', true); return; }
  for (const file of incoming) {
    if (!allowed.some(ext => file.name.toLowerCase().endsWith(ext))) { setDocumentStatus(`Unsupported file: ${file.name}. Choose ${selectedDocumentTool.hint}.`, true); return; }
    if (!file.size) { setDocumentStatus(`${file.name} is empty. Choose a file with content.`, true); return; }
    if (file.size > 100 * 1024 * 1024) { setDocumentStatus('Choose files under 100 MB each for browser processing.', true); return; }
  }
  clearDocumentResult();
  if (selectedDocumentTool.multiple) documentFiles.push(...incoming); else documentFiles = incoming;
  setDocumentStatus(`${documentFiles.length} file${documentFiles.length === 1 ? '' : 's'} selected.`);
  renderDocumentFiles();
  $('#documentFiles').value = '';
}

async function runDocumentTool(event) {
  event.preventDefault();
  if (documentBusy || !documentFiles.length) return;
  documentBusy = true;
  const wasPaused = paused;
  paused = true;
  renderRequested = true;
  clearDocumentResult(); renderDocumentFiles();
  $('#documentTool').disabled = true; $('#documentFiles').disabled = true;
  $$('[data-document-tool]').forEach(button => { button.disabled = true; });
  for (const input of $('#documentOptions').querySelectorAll('input, select')) input.disabled = true;
  $('#documentProgress').hidden = false;
  setDocumentStatus('Preparing your files…');
  try {
    const options = {
      orientation: $('#imageOrientation')?.value || 'portrait', layout: $('#wordLayout')?.value || 'text',
      split: $('#splitMode')?.value || 'selection', range: $('#pdfPageRange')?.value || '', compression: $('#compressionMode')?.value || 'lossless',
    };
    const result = await processDocumentFiles(selectedDocumentTool.id, [...documentFiles], options, setDocumentStatus);
    documentResultURL = URL.createObjectURL(result.blob);
    $('#downloadDocument').href = documentResultURL;
    $('#downloadDocument').download = result.name;
    $('#resultTitle').textContent = result.name;
    $('#resultDetail').textContent = `${fileSize(result.blob.size)} · ${result.detail}`;
    $('#documentResult').hidden = false;
    setDocumentStatus('Done. Your download is ready.');
  } catch (error) {
    setDocumentStatus(error.message || 'This document could not be processed. Please try another file.', true);
  } finally {
    paused = wasPaused;
    lastStamp = 0;
    renderRequested = true;
    documentBusy = false; $('#documentTool').disabled = false; $('#documentFiles').disabled = false;
    $$('[data-document-tool]').forEach(button => { button.disabled = false; });
    for (const input of $('#documentOptions').querySelectorAll('input, select')) input.disabled = false;
    $('#documentProgress').hidden = true; renderDocumentFiles();
  }
}

function productControls() {
  const nav = $('#documentNav');
  for (const tool of documentTools) {
    const button = document.createElement('button'); button.dataset.documentTool = tool.id;
    const glyph = document.createElement('span'); glyph.className = 'tool-glyph'; glyph.textContent = tool.glyph;
    button.append(glyph, document.createTextNode(tool.name));
    button.onclick = () => openDocumentStudio(tool.id, button); nav.append(button);
    const option = document.createElement('option'); option.value = tool.id; option.textContent = tool.name; $('#documentTool').append(option);
  }
  selectDocumentTool(selectedDocumentTool.id);
  $('#documentTool').onchange = event => selectDocumentTool(event.target.value);
  $('#visitDocumentOffice').onclick = () => openDocumentStudio();
  $('#closeStudio').onclick = closeDocumentStudio;
  $('#documentForm').onsubmit = runDocumentTool;
  $('#documentFiles').onchange = event => addDocumentFiles(event.target.files);
  $('#documentOptions').onchange = event => { if (event.target.id === 'splitMode') $('#pageRangeField').hidden = event.target.value === 'individual'; clearDocumentResult(); };
  $('#documentOptions').oninput = clearDocumentResult;
  const drop = $('#fileDrop');
  drop.ondragover = event => { event.preventDefault(); drop.classList.add('drag-over'); };
  drop.ondragleave = () => drop.classList.remove('drag-over');
  drop.ondrop = event => { event.preventDefault(); drop.classList.remove('drag-over'); addDocumentFiles(event.dataTransfer.files); };
  const setNavigation = collapsed => {
    document.body.classList.toggle('nav-collapsed', collapsed);
    $('#navToggle').setAttribute('aria-expanded', !collapsed);
    (collapsed ? $('#navToggle') : $('#navCollapse')).focus({ preventScroll: true });
  };
  $('#navCollapse').onclick = () => setNavigation(true); $('#navToggle').onclick = () => setNavigation(false);
  $$('[data-action]').forEach(button => { button.onclick = () => $(`#${button.dataset.action}`).click(); });
  const features = $('#documentFeatures');
  let featureOpenBeforeSearch = false;
  let searchingFeatures = false;
  $('#navSearch').oninput = event => {
    const search = event.target.value.trim().toLowerCase(); let count = 0;
    if (search && !searchingFeatures) featureOpenBeforeSearch = features.open;
    const buildingMatch = search && features.querySelector('summary').textContent.toLowerCase().includes(search);
    for (const button of $$('#documentNav button, .neighbourhood-links button, .office-card, .nav-actions button, .nav-lighting button, .move-modes button')) {
      const matches = button.textContent.toLowerCase().includes(search)
        || (buildingMatch && features.contains(button));
      button.hidden = !matches; if (matches) count++;
    }
    if (search) {
      features.hidden = !buildingMatch && !features.querySelector('button:not([hidden])');
      features.open = !features.hidden;
    } else {
      features.hidden = false;
      if (searchingFeatures) features.open = featureOpenBeforeSearch;
    }
    searchingFeatures = !!search;
    $('#navEmpty').hidden = count > 0;
  };
  diagnostics.openDocumentStudio = openDocumentStudio;
  diagnostics.pickDocumentOffice = pickDocumentOffice;
  diagnostics.processDocumentFiles = processDocumentFiles;
}
