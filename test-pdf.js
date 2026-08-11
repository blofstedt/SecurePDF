import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

async function run() {
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); 
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    page.drawText("Test", {
      x: 35,
      y: 810,
      size: 13,
      font: boldFont,
      color: rgb(1, 1, 1),
    });
    
    const bytes = await pdfDoc.save();
    console.log("Size:", bytes.length);
  } catch (e) {
    console.error(e);
  }
}
run();
