import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

async function run() {
  try {
    const doc = await pdfjsLib.getDocument({ data: new Uint8Array([1, 2, 3, 4, 5]) }).promise;
    console.log("Pages:", doc.numPages);
  } catch(e) {
    console.log(e.name, e.message);
  }
}
run();
