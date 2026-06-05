import React, { useState } from 'react';
import { ShoppingCart, Plus, FileText, ArrowLeft, Trash2, Download, Eye } from 'lucide-react';
import { InvoiceImporter } from '../components/InvoiceImporter';
import { useInventory } from '../hooks/useInventory';
import { usePurchases } from '../hooks/usePurchases';
import { generateId, formatCurrency } from '../utils';

const Purchases: React.FC = () => {
  const { inventory, addInventoryItem, updateInventoryItem } = useInventory();
  const { purchases, addPurchase, deletePurchase } = usePurchases();
  
  const [isCreating, setIsCreating] = useState(false);
  
  // New Purchase Form State
  const [providerName, setProviderName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Tab State
  const [activeTab, setActiveTab] = useState<'import' | 'manual'>('import');
  const [manualItems, setManualItems] = useState<any[]>([]);
  const [newItem, setNewItem] = useState({ name: '', category: 'Materiales Ferreteros', unitCost: 0, quantity: 1 });

  const handleAddManualItem = () => {
    if (!newItem.name) return;
    setManualItems([...manualItems, { ...newItem, id: generateId() }]);
    setNewItem({ name: '', category: 'Materiales Ferreteros', unitCost: 0, quantity: 1 });
  };

  const handleSaveManualPurchase = () => {
    if (!providerName.trim() || !invoiceNumber.trim()) {
      alert('Por favor completa el nombre del proveedor y número de factura antes de guardar.');
      return;
    }
    if (manualItems.length === 0) {
      alert('Debes agregar al menos un artículo a la compra.');
      return;
    }

    const mappedItems = manualItems.map(item => ({
      ...item,
      inventoryQuantity: item.quantity
    }));
    handleImportPurchases(mappedItems, null);
  };

  const handleImportPurchases = (items: any[], invoiceData: any) => {
    if (!providerName.trim() || !invoiceNumber.trim()) {
      alert('Por favor completa el nombre del proveedor y número de factura antes de guardar.');
      return;
    }

    let importedCount = 0;
    let totalAmount = 0;
    
    const purchaseItems: any[] = [];

    items.forEach(item => {
      if (item.inventoryQuantity > 0) {
        // Add to purchase record
        purchaseItems.push({
          id: item.id,
          name: item.name,
          quantity: item.inventoryQuantity,
          unitCost: item.unitCost,
          category: item.category
        });
        
        totalAmount += (item.inventoryQuantity * item.unitCost);

        // Add to inventory stock
        const existingInvItem = inventory.find(inv => inv.name.toLowerCase() === item.name.toLowerCase());
        if (existingInvItem) {
          updateInventoryItem({
            ...existingInvItem,
            stockQuantity: existingInvItem.stockQuantity + item.inventoryQuantity,
            unitCost: item.unitCost, 
            lastUpdated: new Date().toISOString().split('T')[0]
          });
        } else {
          addInventoryItem({
            id: generateId(),
            name: item.name,
            category: item.category,
            unitCost: item.unitCost,
            stockQuantity: item.inventoryQuantity,
            lastUpdated: new Date().toISOString().split('T')[0]
          });
        }
        importedCount++;
      }
    });

    // Save Purchase Record ALWAYS, even if 0 items were imported (e.g. it was an image or unparseable PDF)
    addPurchase({
      id: generateId(),
      providerName,
      invoiceNumber,
      date,
      items: purchaseItems,
      totalAmount,
      invoiceFile: invoiceData
    });

    if (importedCount > 0) {
      alert(`Compra guardada exitosamente. Se han agregado ${importedCount} artículos al inventario.`);
    } else {
      alert('Documento guardado en el historial de compras (no se extrajeron artículos).');
    }

    // Reset form
    setProviderName('');
    setInvoiceNumber('');
    setDate(new Date().toISOString().split('T')[0]);
    setManualItems([]);
    setIsCreating(false);
  };

  const handleDownloadPDF = (purchase: any) => {
    if (!purchase.invoiceFile?.dataUrl) {
      alert('El archivo PDF no está disponible.');
      return;
    }
    const link = document.createElement('a');
    link.href = purchase.invoiceFile.dataUrl;
    
    // Extraer la extensión original del archivo o asumir pdf por defecto
    const extension = purchase.invoiceFile.fileName?.split('.').pop() || 'pdf';
    link.download = `Factura_${purchase.invoiceNumber}.${extension}`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleViewFile = (dataUrl: string | undefined) => {
    if (!dataUrl) {
      alert('El archivo no está disponible.');
      return;
    }
    fetch(dataUrl)
      .then(res => res.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      })
      .catch(() => {
        const newWindow = window.open();
        if (newWindow) {
          if (dataUrl.startsWith('data:image')) {
            newWindow.document.write(`<img src="${dataUrl}" style="max-width:100%;" />`);
          } else {
            newWindow.document.write(`<iframe src="${dataUrl}" width="100%" height="100%" style="border:none;"></iframe>`);
          }
        }
      });
  };

  if (isCreating) {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <button className="btn-secondary" onClick={() => setIsCreating(false)} style={{ padding: '0.5rem' }}>
            <ArrowLeft size={20} />
          </button>
          <h2>Nueva Compra a Proveedor</h2>
        </div>

        <div className="card">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Proveedor / Tienda</label>
              <input 
                type="text" 
                required
                value={providerName} 
                onChange={e => setProviderName(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)' }}
                placeholder="Ej. Sinsa, Comtech..."
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Número de Factura</label>
              <input 
                type="text" 
                required
                value={invoiceNumber} 
                onChange={e => setInvoiceNumber(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)' }}
                placeholder="Ej. FCT-12345"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Fecha de Compra</label>
              <input 
                type="date" 
                required
                value={date} 
                onChange={e => setDate(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
            <button 
              onClick={() => setActiveTab('import')}
              className={`btn-${activeTab === 'import' ? 'primary' : 'secondary'}`}
            >
              Importar Factura PDF
            </button>
            <button 
              onClick={() => setActiveTab('manual')}
              className={`btn-${activeTab === 'manual' ? 'primary' : 'secondary'}`}
            >
              Ingreso Manual
            </button>
          </div>

          {activeTab === 'import' ? (
            <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-color)', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem' }}>
                <div style={{ padding: '1rem', backgroundColor: 'rgba(99, 102, 241, 0.1)', borderRadius: '50%', color: 'var(--primary-color)' }}>
                  <FileText size={32} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ marginBottom: '0.5rem' }}>Importar Artículos (Factura PDF)</h3>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.5, fontSize: '0.875rem' }}>
                    Sube el PDF de la factura. El sistema leerá los artículos y sumará el stock a tu bodega general automáticamente al confirmar.
                  </p>
                  
                  {providerName && invoiceNumber ? (
                    <InvoiceImporter mode="inventory" onImport={handleImportPurchases} />
                  ) : (
                    <div style={{ color: 'var(--warning-color)', fontSize: '0.875rem', padding: '0.75rem', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: '4px' }}>
                      Por favor, completa el nombre del proveedor y el número de factura arriba para poder subir el PDF.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <h3 style={{ marginBottom: '1.5rem' }}>Ingresar Artículos Manualmente</h3>
              
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '2rem' }}>
                <div style={{ flex: 2 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Descripción</label>
                  <input 
                    type="text" 
                    value={newItem.name} 
                    onChange={e => setNewItem({...newItem, name: e.target.value})}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Categoría</label>
                  <select 
                    value={newItem.category} 
                    onChange={e => setNewItem({...newItem, category: e.target.value})}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)' }}
                  >
                    <option value="Materiales Ferreteros">Materiales</option>
                    <option value="Equipos">Equipos</option>
                    <option value="Mano de Obra">Mano de Obra</option>
                  </select>
                </div>
                <div style={{ width: '120px' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Costo Unit. ($)</label>
                  <input 
                    type="number" 
                    min="0" step="0.01"
                    value={newItem.unitCost} 
                    onChange={e => setNewItem({...newItem, unitCost: parseFloat(e.target.value) || 0})}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)' }}
                  />
                </div>
                <div style={{ width: '100px' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Cant.</label>
                  <input 
                    type="number" 
                    min="1"
                    value={newItem.quantity} 
                    onChange={e => setNewItem({...newItem, quantity: parseInt(e.target.value) || 1})}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)' }}
                  />
                </div>
                <button className="btn-primary" onClick={handleAddManualItem}>
                  <Plus size={20} />
                </button>
              </div>

              {manualItems.length > 0 && (
                <>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ padding: '0.75rem', textAlign: 'left' }}>Descripción</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left' }}>Categoría</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center' }}>Cant.</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right' }}>Costo Unit.</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right' }}>Subtotal</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {manualItems.map((item, i) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '0.75rem' }}>{item.name}</td>
                          <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>{item.category}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'center' }}>{item.quantity}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'right' }}>${item.unitCost.toFixed(2)}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'right' }}>${(item.quantity * item.unitCost).toFixed(2)}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                            <button onClick={() => setManualItems(manualItems.filter((_, index) => index !== i))} style={{ color: 'var(--danger-color)' }}>
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'right', padding: '1rem', fontWeight: 600 }}>Total Compra:</td>
                        <td style={{ textAlign: 'right', padding: '1rem', fontWeight: 700, color: 'var(--success-color)' }}>
                          ${manualItems.reduce((sum, i) => sum + (i.quantity * i.unitCost), 0).toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>

                  <div style={{ textAlign: 'right' }}>
                    <button className="btn-primary" onClick={handleSaveManualPurchase}>
                      <ShoppingCart size={20} /> Guardar Compra Manual
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Historial de Compras (Proveedores)</h2>
        <button className="btn-primary" onClick={() => setIsCreating(true)}>
          <Plus size={20} /> Nueva Compra
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)' }}>
                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>Fecha</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>Proveedor</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>Factura</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>Total (USD)</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 500, textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map(purchase => (
                <tr key={purchase.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem' }}>{new Date(purchase.date).toLocaleDateString()}</td>
                  <td style={{ padding: '1rem', fontWeight: 500 }}>{purchase.providerName}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{purchase.invoiceNumber}</td>
                  <td style={{ padding: '1rem' }}>{formatCurrency(purchase.totalAmount)}</td>
                  <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    {purchase.invoiceFile && (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          className="btn-secondary" 
                          onClick={() => handleViewFile(purchase.invoiceFile?.dataUrl)}
                          style={{ padding: '0.5rem' }}
                          title="Ver Documento"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          className="btn-secondary" 
                          onClick={() => handleDownloadPDF(purchase)}
                          style={{ padding: '0.5rem' }}
                          title="Descargar Factura Original"
                        >
                          <Download size={18} />
                        </button>
                      </div>
                    )}
                    <button 
                      className="btn-secondary" 
                      onClick={() => {
                        if(window.confirm('¿Eliminar registro de esta compra? (El stock ya ingresado al inventario NO se restará)')) {
                          deletePurchase(purchase.id);
                        }
                      }}
                      style={{ padding: '0.5rem', color: 'var(--danger-color)', borderColor: 'var(--danger-color)' }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {purchases.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <ShoppingCart size={48} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
                    <p>No tienes compras registradas aún.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Purchases;
