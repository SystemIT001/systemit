import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const pdfPath = './PROFORMA2981.pdf';

async function extractText() {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjsLib.getDocument({ data }).promise;
  let text = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((item) => item.str);
    text += strings.join('\n') + '\n';
  }
  fs.writeFileSync('proforma.txt', text);
  console.log('PDF Extracted to proforma.txt');
}

extractText().catch(console.error);
