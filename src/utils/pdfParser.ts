import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export interface ExtractedItem {
  name: string;
  quantity: number;
  unitCost: number;
}

export const extractItemsFromPDF = async (fileUrl: string | ArrayBuffer): Promise<ExtractedItem[]> => {
  // Asegurarse de enviar Uint8Array a pdf.js
  const data = typeof fileUrl === 'string' ? fileUrl : new Uint8Array(fileUrl);
  const loadingTask = pdfjsLib.getDocument(data);
  const pdf = await loadingTask.promise;
  const items: ExtractedItem[] = [];
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((item: any) => item.str.trim()).filter((s: string) => s !== '');
    
    // Heurística simple para proformas estilo Smart Security y otras que usan 'pcs' o 'unidad'
    for (let j = 0; j < strings.length; j++) {
      const lower = strings[j].toLowerCase();
      if (lower === 'pcs' || lower === 'unidad' || lower === 'unidades') {
        const quantity = Number(strings[j - 1]);
        
        let nameParts = [];
        let index = j - 2;
        while (index >= 0 && isNaN(Number(strings[index]))) {
           if (strings[index] !== '') nameParts.unshift(strings[index]);
           index--;
           if (j - index > 5) break; 
        }
        
        if (nameParts.length === 0) {
          // Fallback por si la estructura está invertida o no detectamos bien
          nameParts = [strings[j - 2] || 'Artículo'];
        }

        const name = nameParts.join(' ').trim();
        const unitCostStr = strings[j + 1] ? strings[j + 1].replace(/,/g, '') : '0';
        const unitCost = parseFloat(unitCostStr);
        
        if (!isNaN(quantity) && !isNaN(unitCost)) {
           items.push({
             name: name || 'Artículo Desconocido',
             quantity,
             unitCost
           });
        }
      }
    }
  }
  return items;
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};
