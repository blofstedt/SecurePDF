import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

async function run() {
  const pdfDoc = await PDFDocument.create();
  const bytes = await pdfDoc.save();
  try {
    const doc = await pdfjsLib.getDocument({ data: bytes.slice(0) }).promise;
    console.log("Pages:", doc.numPages);
  } catch(e) {
    console.log(e.name, e.message);
  }
}
run();
