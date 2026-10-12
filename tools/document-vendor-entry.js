/* Bundled into vendor/document-tools.js; loaded only when the office is opened. */
import * as PDFLib from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist/build/pdf.js';
import mammoth from 'mammoth/mammoth.browser.js';
import * as docx from 'docx';
import html2canvas from 'html2canvas';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { zipSync, unzipSync } from 'fflate';
export { PDFLib, pdfjs, mammoth, docx, html2canvas, marked, DOMPurify, zipSync, unzipSync };
