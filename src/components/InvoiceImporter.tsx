import React, { useState, useRef } from 'react';
import { Upload, X, Check, CheckCircle2 } from 'lucide-react';
import { extractItemsFromPDF } from '../utils/pdfParser';
import type { ExtractedItem } from '../utils/pdfParser';
import type { InvoiceFile } from '../types';
import { generateId } from '../utils';
import { useInventory } from '../hooks/useInventory';

interface ImportedItem extends ExtractedItem {
  id: string;
  category: 'materials' | 'equipments' | 'labor' | 'skip';
  profitMargin?: number | 'manual';
  addToInventory: boolean;
  inventoryQuantity: number;
}

interface Props {
  onImport: (classifiedItems: ImportedItem[], invoiceFile: InvoiceFile) => void;
  mode?: 'project' | 'inventory';
}

export const InvoiceImporter: React.FC<Props> = ({ onImport, mode = 'project' }) => {
  const { inventory } = useInventory();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [extractedItems, setExtractedItems] = useState<ImportedItem[]>([]);
  const [invoiceData, setInvoiceData] = useState<InvoiceFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const originalNameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      const customName = window.prompt("Ingrese un nombre para este archivo:", originalNameWithoutExt);
      if (customName === null) {
        if (fileInputRef.current) fileInputRef.current.value = '';
        return; // Usuario canceló
      }

      setIsProcessing(true);
      
      const formData = new FormData();
      if (customName.trim() !== '') {
        formData.append('customName', customName.trim());
      }
      formData.append('type', 'facturas');
      formData.append('file', file);
      
      const response = await fetch('http://localhost:3001/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      
      setInvoiceData({
        fileName: data.fileName,
        dataUrl: `http://localhost:3001${data.url}`,
        dateAdded: new Date().toISOString()
      });

      let rawItems: ExtractedItem[] = [];
      
      if (file.type === 'application/pdf') {
        try {
          const buffer = await file.arrayBuffer();
          rawItems = await extractItemsFromPDF(buffer);
        } catch (pdfErr) {
          console.warn('No se pudieron extraer ítems automáticamente del PDF', pdfErr);
        }
      }
      
      setExtractedItems(rawItems.map(item => ({
        ...item,
        id: generateId(),
        category: 'equipments', // Default para Smart Security
        profitMargin: 30,
        addToInventory: mode === 'inventory' ? true : false,
        inventoryQuantity: item.quantity
      })));
      
      setShowModal(true);
    } catch (err: any) {
      console.error(err);
      alert(`Error al procesar el archivo: ${err.message || err.toString()}`);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUpdateItem = (id: string, updates: Partial<ImportedItem>) => {
    setExtractedItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const handleConfirm = () => {
    if (invoiceData) {
      onImport(extractedItems.filter(item => item.category !== 'skip'), invoiceData);
    }
    setShowModal(false);
  };

  return (
    <>
      <input type="file" accept="application/pdf,image/*" style={{ display: 'none' }} ref={fileInputRef} onChange={handleFileUpload} />
      <button className="btn-secondary" onClick={() => fileInputRef.current?.click()} disabled={isProcessing}>
        <Upload size={20} />
        {isProcessing ? 'Analizando...' : 'Importar Factura / Imagen'}
      </button>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '90%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', backgroundColor: 'var(--bg-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>Clasificar Ítems Encontrados</h2>
              <button onClick={() => setShowModal(false)}><X size={24} color="var(--text-muted)" /></button>
            </div>
            
            <p style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
              {extractedItems.length > 0 
                ? `Hemos leído estos ${extractedItems.length} artículos. Selecciona en qué sección quieres agregarlos (o descártalos).` 
                : 'El archivo se adjuntará al proyecto/historial. No se detectaron artículos para importar automáticamente.'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
              {extractedItems.map(item => (
                <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto 1.5fr', gap: '1rem', padding: '1rem', backgroundColor: 'var(--surface-color)', borderRadius: '8px', border: '1px solid var(--border-color)', alignItems: 'center' }}>
                  <div>
                    <input value={item.name} onChange={e => handleUpdateItem(item.id, { name: e.target.value })} style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '4px' }} />
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      <span>Cant: {item.quantity} | Costo U: ${item.unitCost}</span>
                      {inventory.some(invItem => invItem.name.toLowerCase() === item.name.toLowerCase()) && (
                        <span style={{ color: 'var(--success-color)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', backgroundColor: 'rgba(34, 197, 94, 0.1)', padding: '0.1rem 0.4rem', borderRadius: '12px', border: '1px solid var(--success-color)' }}>
                          <CheckCircle2 size={12} />
                          En Bodega
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <select value={item.category} onChange={e => handleUpdateItem(item.id, { category: e.target.value as any })} style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                    <option value="equipments">Equipos</option>
                    <option value="materials">Materiales</option>
                    <option value="labor">Mano de Obra</option>
                    <option value="skip">❌ Descartar</option>
                  </select>

                  {mode === 'project' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={item.addToInventory} 
                          onChange={e => handleUpdateItem(item.id, { addToInventory: e.target.checked })} 
                          style={{ cursor: 'pointer' }}
                        />
                        Al inventario
                      </label>
                      {item.addToInventory && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}>
                          <span>Cant:</span>
                          <input 
                            type="number" 
                            min="1" 
                            max={item.quantity}
                            value={item.inventoryQuantity} 
                            onChange={e => handleUpdateItem(item.id, { inventoryQuantity: Number(e.target.value) })}
                            style={{ width: '60px', padding: '0.25rem', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '0.875rem' }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {mode === 'project' && (item.category === 'equipments' || item.category === 'materials') ? (
                    <select value={item.profitMargin} onChange={e => handleUpdateItem(item.id, { profitMargin: e.target.value === 'manual' ? 'manual' : Number(e.target.value) })} style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                      <option value={30}>+30% Ganancia</option>
                      <option value={50}>+50% Ganancia</option>
                      <option value="manual">Manual (Precio Fijo)</option>
                    </select>
                  ) : <div />}
                </div>
              ))}
              {extractedItems.length === 0 && <p style={{ color: 'var(--danger-color)' }}>No se encontraron ítems en la tabla. Puede que el formato del PDF no sea compatible.</p>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleConfirm}>
                <Check size={20} /> {mode === 'inventory' ? 'Guardar al Inventario' : 'Guardar al Proyecto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
