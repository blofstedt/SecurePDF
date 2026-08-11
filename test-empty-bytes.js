import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

async function run() {
  try {
    const doc = await pdfjsLib.getDocument({ data: new Uint8Array(0) }).promise;
    console.log("Pages:", doc.numPages);
  } catch(e) {
    console.log(e.name, e.message);
  }
}
run();
