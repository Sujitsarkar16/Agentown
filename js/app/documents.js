/* Local file-processing engine. Libraries load on demand; no uploaded data leaves the browser. */
'use strict';

let documentLibraryPromise = null;
function loadDocumentLibraries() {
  if (window.NirmalDocumentLibs) return Promise.resolve(window.NirmalDocumentLibs);
  if (documentLibraryPromise) return documentLibraryPromise;
  documentLibraryPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'vendor/document-tools.js';
    script.onload = () => {
      const worker = document.createElement('script');
      // Also expose the worker on the main thread, allowing file:// without worker CORS.
      worker.src = 'vendor/pdf.worker.min.js';
      worker.onload = () => {
        NirmalDocumentLibs.pdfjs.GlobalWorkerOptions.workerSrc = new URL('vendor/pdf.worker.min.js', document.baseURI).href;
        resolve(NirmalDocumentLibs);
      };
      worker.onerror = () => { documentLibraryPromise = null; reject(Error('PDF support could not load. Keep the vendor folder beside index.html.')); };
      document.head.append(worker);
    };
    script.onerror = () => { documentLibraryPromise = null; reject(Error('Document tools could not load. Keep the vendor folder beside index.html.')); };
    document.head.append(script);
  });
  return documentLibraryPromise;
}

const pdfMime = 'application/pdf';
const wordMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
function documentBaseName(file) { return file.name.replace(/\.[^.]+$/, '').replace(/[<>:"/\\|?*]/g, '-'); }
function documentOutput(bytes, name, detail, type = pdfMime) { return { blob: new Blob([bytes], { type }), name, detail }; }

async function readPDF(file, libs) {
  try { return await libs.PDFLib.PDFDocument.load(await file.arrayBuffer()); }
  catch (error) {
    if (/encrypt|password/i.test(String(error))) throw Error(`${file.name} is password-protected. Use an unlocked PDF.`);
    throw Error(`${file.name} is not a readable PDF or is damaged.`);
  }
}

async function readRenderedPDF(file, libs) {
  try { return await libs.pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), useSystemFonts: true, isEvalSupported: false }).promise; }
  catch (error) {
    if (/password|encrypt/i.test(String(error))) throw Error(`${file.name} is password-protected. Use an unlocked PDF.`);
    throw Error(`${file.name} could not be rendered as a PDF.`);
  }
}

function parsePageRange(value, count) {
  if (!value.trim()) throw Error('Enter the pages to extract, such as 1-3, 5.');
  const pages = [];
  for (const section of value.split(',')) {
    const match = section.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!match) throw Error(`Invalid page selection: ${section.trim() || '(empty)'}. Use numbers and ranges, such as 1-3, 5.`);
    const start = Number(match[1]); const end = Number(match[2] || match[1]);
    if (start < 1 || end < start || end > count) throw Error(`Page numbers must be between 1 and ${count}, with ascending ranges.`);
    for (let page = start; page <= end; page++) if (!pages.includes(page - 1)) pages.push(page - 1);
  }
  return pages;
}

async function canvasBlob(canvasElement, type = 'image/jpeg', quality = 0.86) {
  return new Promise((resolve, reject) => canvasElement.toBlob(blob => blob ? resolve(blob) : reject(Error('This image could not be encoded.')), type, quality));
}

async function renderPDFPage(page, scale) {
  const viewport = page.getViewport({ scale });
  // Bound the canvas area for large-format or unusually sized documents.
  const safeScale = Math.min(scale, scale * Math.sqrt(16000000 / Math.max(viewport.width * viewport.height, 1)));
  const size = page.getViewport({ scale: safeScale });
  const c = document.createElement('canvas'); c.width = Math.ceil(size.width); c.height = Math.ceil(size.height);
  await page.render({ canvasContext: c.getContext('2d'), viewport: size, background: '#ffffff' }).promise;
  return c;
}

async function imagePDF(files, options, libs, report) {
  const pdf = await libs.PDFLib.PDFDocument.create();
  const landscape = options.orientation === 'landscape';
  const width = landscape ? 841.89 : 595.28; const height = landscape ? 595.28 : 841.89;
  for (let i = 0; i < files.length; i++) {
    report(`Adding image ${i + 1} of ${files.length}…`);
    const url = URL.createObjectURL(files[i]);
    try {
      const img = new Image(); img.src = url;
      try { await img.decode(); } catch { throw Error(`${files[i].name} is not a readable image.`); }
      const scale = Math.min(1, 2400 / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(img.naturalWidth * scale)); c.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const ctx = c.getContext('2d'); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
      const png = /\.png$/i.test(files[i].name);
      const blob = await canvasBlob(c, png ? 'image/png' : 'image/jpeg');
      const image = png ? await pdf.embedPng(await blob.arrayBuffer()) : await pdf.embedJpg(await blob.arrayBuffer());
      const fit = Math.min((width - 56) / image.width, (height - 56) / image.height);
      pdf.addPage([width, height]).drawImage(image, { x: (width - image.width * fit) / 2, y: (height - image.height * fit) / 2, width: image.width * fit, height: image.height * fit });
      c.width = c.height = 0;
    } finally { URL.revokeObjectURL(url); }
  }
  return documentOutput(await pdf.save(), `${documentBaseName(files[0])}-images.pdf`, `${files.length} image page${files.length === 1 ? '' : 's'}`);
}

async function htmlDocumentPDF(html, name, libs, report) {
  const element = document.createElement('article'); element.className = 'document-print';
  element.innerHTML = libs.DOMPurify.sanitize(html, { FORBID_TAGS: ['script', 'iframe', 'style', 'video', 'audio', 'object', 'embed', 'form', 'input'], FORBID_ATTR: ['style', 'srcset'] });
  // Embedded DOCX images are supported. Markdown remote media is not fetched.
  let omitted = 0;
  for (const image of element.querySelectorAll('img')) {
    if (!/^data:image\/(png|jpeg|jpg|gif|webp);base64,/i.test(image.getAttribute('src') || '')) {
      const alt = document.createElement('span'); alt.textContent = `[Image: ${image.alt || 'external image'}]`; image.replaceWith(alt); omitted++;
    }
  }
  document.body.append(element);
  try {
    if (!element.textContent.trim() && !element.querySelector('img')) throw Error('This file contains no readable document content.');
    await Promise.all(Array.from(element.querySelectorAll('img')).map(img => img.decode().catch(() => {})));
    if (element.scrollHeight > 24000) throw Error('This document is too long for browser PDF layout. Split it into smaller files first.');
    report('Laying out your document pages…');
    const rendered = await libs.html2canvas(element, { scale: 1.5, backgroundColor: '#ffffff', logging: false, useCORS: false, allowTaint: false, windowWidth: 1000 });
    const pdf = await libs.PDFLib.PDFDocument.create();
    const contentWidth = 539.28; const contentHeight = 785.89;
    const sliceHeight = Math.floor(rendered.width * contentHeight / contentWidth);
    const pageCount = Math.ceil(rendered.height / sliceHeight);
    for (let i = 0; i < pageCount; i++) {
      report(`Creating page ${i + 1} of ${pageCount}…`);
      const h = Math.min(sliceHeight, rendered.height - i * sliceHeight);
      const slice = document.createElement('canvas'); slice.width = rendered.width; slice.height = h;
      slice.getContext('2d').drawImage(rendered, 0, i * sliceHeight, rendered.width, h, 0, 0, rendered.width, h);
      const image = await pdf.embedPng(await (await canvasBlob(slice, 'image/png')).arrayBuffer());
      const physicalHeight = h / rendered.width * contentWidth;
      pdf.addPage([595.28, 841.89]).drawImage(image, { x: 28, y: 841.89 - 28 - physicalHeight, width: contentWidth, height: physicalHeight });
      slice.width = slice.height = 0;
    }
    rendered.width = rendered.height = 0;
    return documentOutput(await pdf.save(), name, `${pageCount} rendered A4 page${pageCount === 1 ? '' : 's'}${omitted ? ' · external images replaced with labels' : ''}`);
  } finally { element.remove(); }
}

async function pdfWord(file, options, libs, report) {
  const pdf = await readRenderedPDF(file, libs);
  const { Document, Paragraph, TextRun, ImageRun, Packer } = libs.docx;
  const children = []; let imagePages = 0;
  try {
    for (let i = 1; i <= pdf.numPages; i++) {
      report(`Reading PDF page ${i} of ${pdf.numPages}…`);
      const page = await pdf.getPage(i);
      const text = await page.getTextContent();
      if (options.layout === 'pages' || !text.items.some(item => item.str?.trim())) {
        const c = await renderPDFPage(page, 1.4);
        const data = new Uint8Array(await (await canvasBlob(c, 'image/png')).arrayBuffer());
        const width = 600; const height = Math.min(900, Math.round(width * c.height / c.width));
        children.push(new Paragraph({ pageBreakBefore: i > 1, children: [new ImageRun({ type: 'png', data, transformation: { width, height } })] }));
        c.width = c.height = 0; imagePages++;
      } else {
        const lines = [];
        for (const item of text.items) {
          if (!item.str) continue;
          const y = item.transform[5];
          let line = lines.find(line => Math.abs(line.y - y) < 3);
          if (!line) { line = { y, items: [] }; lines.push(line); }
          line.items.push(item);
        }
        lines.sort((a, b) => b.y - a.y);
        lines.forEach((line, index) => {
          const content = line.items.sort((a, b) => a.transform[4] - b.transform[4]).map(item => item.str).join(' ');
          children.push(new Paragraph({ pageBreakBefore: i > 1 && index === 0, spacing: { after: 90 }, children: [new TextRun({ text: content, font: 'Calibri', size: 22 })] }));
        });
      }
      page.cleanup();
    }
    const doc = new Document({ sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 720, right: 720, bottom: 720, left: 720 } } }, children }] });
    return { blob: await Packer.toBlob(doc), name: `${documentBaseName(file)}.docx`, detail: `${pdf.numPages} page${pdf.numPages === 1 ? '' : 's'} · ${imagePages ? `${imagePages} page(s) preserved as images` : 'Editable, reflowed text'}` };
  } finally { await pdf.destroy(); }
}

async function compressPDF(file, options, libs, report) {
  let bytes;
  let detail;
  if (options.compression === 'lossless') {
    const source = await readPDF(file, libs);
    const result = await libs.PDFLib.PDFDocument.create();
    const pages = await result.copyPages(source, source.getPageIndices());
    pages.forEach(page => result.addPage(page));
    bytes = await result.save({ useObjectStreams: true }); detail = 'Selectable text preserved';
  } else {
    const source = await readRenderedPDF(file, libs);
    const result = await libs.PDFLib.PDFDocument.create();
    try {
      for (let i = 1; i <= source.numPages; i++) {
        report(`Compressing page ${i} of ${source.numPages}…`);
        const page = await source.getPage(i); const original = page.getViewport({ scale: 1 });
        const strong = options.compression === 'strong';
        const c = await renderPDFPage(page, (strong ? 85 : 120) / 72);
        const image = await result.embedJpg(await (await canvasBlob(c, 'image/jpeg', strong ? 0.52 : 0.72)).arrayBuffer());
        result.addPage([original.width, original.height]).drawImage(image, { x: 0, y: 0, width: original.width, height: original.height });
        c.width = c.height = 0; page.cleanup();
      }
      bytes = await result.save(); detail = 'Image-based pages · text flattened';
    } finally { await source.destroy(); }
  }
  if (bytes.length >= file.size) return { blob: new Blob([await file.arrayBuffer()], { type: pdfMime }), name: `${documentBaseName(file)}-original.pdf`, detail: 'Already efficient: kept the original because the processed version was larger' };
  const saved = Math.round((1 - bytes.length / file.size) * 100);
  return documentOutput(bytes, `${documentBaseName(file)}-compressed.pdf`, `${saved}% smaller · ${detail}`);
}

async function processDocumentFiles(id, files, options = {}, report = () => {}) {
  if (!files.length) throw Error('Choose a file first.');
  report('Loading document tools…');
  const libs = await loadDocumentLibraries();
  if (id === 'image-pdf') return imagePDF(files, options, libs, report);
  if (id === 'word-pdf') {
    report('Reading Word content…');
    let result;
    try { result = await libs.mammoth.convertToHtml({ arrayBuffer: await files[0].arrayBuffer() }); }
    catch { throw Error('This is not a readable DOCX file. Save the document as .docx and try again.'); }
    return htmlDocumentPDF(result.value, `${documentBaseName(files[0])}.pdf`, libs, report);
  }
  if (id === 'md-pdf') {
    const text = await files[0].text();
    return htmlDocumentPDF(libs.marked.parse(text, { gfm: true }), `${documentBaseName(files[0])}.pdf`, libs, report);
  }
  if (id === 'pdf-word') return pdfWord(files[0], options, libs, report);
  if (id === 'pdf-compress') return compressPDF(files[0], options, libs, report);
  if (id === 'pdf-merge') {
    if (files.length < 2) throw Error('Choose at least two PDFs to merge.');
    const result = await libs.PDFLib.PDFDocument.create();
    for (let i = 0; i < files.length; i++) {
      report(`Merging file ${i + 1} of ${files.length}…`);
      const source = await readPDF(files[i], libs);
      const pages = await result.copyPages(source, source.getPageIndices()); pages.forEach(page => result.addPage(page));
    }
    return documentOutput(await result.save(), 'nirmal-merged.pdf', `${files.length} files · ${result.getPageCount()} pages in your chosen order`);
  }
  if (id === 'pdf-split') {
    const source = await readPDF(files[0], libs);
    if (options.split === 'individual') {
      const entries = {};
      for (let i = 0; i < source.getPageCount(); i++) {
        report(`Extracting page ${i + 1} of ${source.getPageCount()}…`);
        const result = await libs.PDFLib.PDFDocument.create();
        const [page] = await result.copyPages(source, [i]); result.addPage(page);
        entries[`${documentBaseName(files[0])}-page-${String(i + 1).padStart(3, '0')}.pdf`] = await result.save();
      }
      return documentOutput(libs.zipSync(entries), `${documentBaseName(files[0])}-pages.zip`, `${source.getPageCount()} individual PDF files`, 'application/zip');
    }
    const indices = parsePageRange(options.range || '', source.getPageCount());
    const result = await libs.PDFLib.PDFDocument.create();
    const pages = await result.copyPages(source, indices); pages.forEach(page => result.addPage(page));
    return documentOutput(await result.save(), `${documentBaseName(files[0])}-selected.pdf`, `${pages.length} selected page${pages.length === 1 ? '' : 's'}`);
  }
  throw Error('Choose a supported document tool.');
}
