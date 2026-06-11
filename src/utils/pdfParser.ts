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
    
    const units = ['pcs', 'unidad', 'unidades', 'pza', 'pzas', 'pieza', 'piezas', 'und', 'unds', 'u', 'u.', 'c/u', 'mt', 'mts', 'm', 'rollo', 'rollos', 'caja', 'cajas', 'par', 'pares', 'gl', 'gln', 'galon', 'galones'];
    
    for (let j = 0; j < strings.length; j++) {
      const lower = strings[j].toLowerCase().trim();
      
      if (units.includes(lower)) {
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
           continue; // Salta al siguiente token
        }
      }
      
      // Fallback Heurística Matemática: Cantidad -> Precio Unitario -> Total
      // Si encontramos 3 números consecutivos donde num1 * num2 == num3
      const q = Number(strings[j]);
      const p1Str = strings[j + 1] ? strings[j + 1].replace(/,/g, '') : 'NaN';
      const p2Str = strings[j + 2] ? strings[j + 2].replace(/,/g, '') : 'NaN';
      
      const p1 = parseFloat(p1Str);
      const p2 = parseFloat(p2Str);
      
      if (!isNaN(q) && !isNaN(p1) && !isNaN(p2) && q > 0 && p1 >= 0) {
        // Verifica si la matemática cuadra (con un pequeño margen de error por redondeos)
        if (Math.abs((q * p1) - p2) < 0.05) {
          let nameParts = [];
          let index = j - 1;
          while (index >= 0 && isNaN(Number(strings[index]))) {
             if (strings[index] !== '') nameParts.unshift(strings[index]);
             index--;
             if (j - index > 6) break; 
          }
          
          const name = nameParts.join(' ').trim();
          
          // Solo lo agregamos si no es un artículo que ya agregamos (evitar duplicados)
          // O simplemente si tiene un nombre válido
          if (name && name.length > 2) {
             items.push({
               name: name,
               quantity: q,
               unitCost: p1
             });
             j += 2; // Avanzamos el índice para no re-procesar el precio y el total
          }
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
