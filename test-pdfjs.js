import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { PDFDocument } from 'pdf-lib';

async function run() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const bytes = await pdfDoc.save();
  
  try {
    const doc = await pdfjsLib.getDocument({ data: bytes.slice(0) }).promise;
    console.log("Pages:", doc.numPages);
  } catch (e) {
    console.error(e.message);
  }
}
run();
