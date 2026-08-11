import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

async function createSamplePDF() {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // Standard A4 points

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const logoColor = rgb(0.06, 0.44, 0.3); // Secure deep forest teal

    // Header banner carbon plate
    page.drawRectangle({
      x: 0,
      y: 775,
      width: 595,
      height: 67,
      color: rgb(0.09, 0.12, 0.15),
    });

    page.drawText("🔒 CLIENT ENVIRONMENT PRIVATE SANDBOX", {
      x: 35,
      y: 810,
      size: 13,
      font: boldFont,
      color: rgb(1, 1, 1),
    });
    return await pdfDoc.save();
}

async function run() {
  const bytes = await createSamplePDF();
  console.log(bytes.byteLength);
  const doc = await pdfjsLib.getDocument({ data: bytes.slice(0) }).promise;
  console.log("Pages:", doc.numPages);
}
run();
