import fs from "fs";
import { PDFDocument, PDFName, PDFDict, PDFArray, PDFString, PDFHexString } from "pdf-lib";

async function run() {
    const doc = await PDFDocument.create();
    const page = doc.addPage([500, 500]);
    
    // Create a FreeText annotation manually to test parsing
    const annot = doc.context.obj({
        Type: 'Annot',
        Subtype: 'FreeText',
        Rect: [50, 400, 250, 450],
        Contents: PDFString.of('Hello from FreeText'),
    });
    const annotRef = doc.context.register(annot);
    
    let annots = page.node.Annots();
    if (!annots) {
        annots = doc.context.obj([]);
        page.node.set(PDFName.of('Annots'), annots);
    }
    annots.push(annotRef);
    
    const bytes = await doc.save();
    
    const loadedDoc = await PDFDocument.load(bytes);
    const loadedPages = loadedDoc.getPages();
    for (const p of loadedPages) {
        const pAnnots = p.node.Annots();
        if (pAnnots instanceof PDFArray) {
            for (let i = pAnnots.size() - 1; i >= 0; i--) {
                const a = pAnnots.lookup(i, PDFDict);
                const subtype = a.lookup(PDFName.of('Subtype'));
                if (subtype === PDFName.of('FreeText')) {
                    const rect = a.lookup(PDFName.of('Rect'), PDFArray);
                    const rArr = rect.asArray().map(n => n.numberValue);
                    
                    let text = '';
                    const contents = a.lookupMaybe(PDFName.of('Contents'), PDFString) || a.lookupMaybe(PDFName.of('Contents'), PDFHexString);
                    if (contents) {
                        text = contents.decodeText();
                    }
                    console.log("FreeText found:", text, "Rect:", rArr);
                    pAnnots.remove(i); // delete it!
                }
            }
        }
    }
    console.log("Deleted FreeText annotations");
}
run();
