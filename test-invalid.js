import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
const bytes = new Uint8Array([37, 80, 68, 70, 45, 49, 46, 52]); // "%PDF-1.4"
pdfjsLib.getDocument({ data: bytes.slice(0) }).promise.catch(e => console.log(e.message));
