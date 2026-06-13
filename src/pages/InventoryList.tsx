import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Edit, Save, X, PackageSearch, QrCode, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { useInventory } from '../hooks/useInventory';
import type { InventoryItem } from '../types';
import { generateId, formatCurrency, exportToCSV } from '../utils';
import QRScanner from '../components/QRScanner';

const InventoryList: React.FC = () => {
  const { inventory, addInventoryItem, updateInventoryItem, deleteInventoryItem } = useInventory();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<InventoryItem>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [isScanningSearch, setIsScanningSearch] = useState(false);
  const [isScanningItem, setIsScanningItem] = useState(false);
  
  // Pagination & Filters
  const [currentPage, setCurrentPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const itemsPerPage = 10;

  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (item.barcode && item.barcode.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [inventory, searchTerm, categoryFilter]);

  const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);
  const currentItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredInventory.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredInventory, currentPage]);

  const handleExport = () => {
    const dataToExport = filteredInventory.map(item => ({
      ID: item.id,
      Nombre: item.name,
      'Código de Barras/QR': item.barcode || 'N/A',
      Categoría: item.category === 'equipments' ? 'Equipo' : 'Material',
      Moneda: item.currency || 'USD',
      'Costo Unitario': item.unitCost,
      'Stock Disponible': item.stockQuantity,
      'Última Actualización': new Date(item.lastUpdated).toLocaleDateString()
    }));
    exportToCSV(dataToExport, 'Inventario_CC_System');
  };

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter]);

  const handleStartAdd = () => {
    setIsAdding(true);
    setEditForm({ name: '', unitCost: 0, stockQuantity: 1, category: 'equipments', currency: 'USD' });
  };

  const handleStartEdit = (item: InventoryItem) => {
    setEditingId(item.id);
    setEditForm({ ...item });
  };

  const handleSave = () => {
    if (!editForm.name || editForm.unitCost === undefined || editForm.stockQuantity === undefined) return;

    if (isAdding) {
      addInventoryItem({
        id: generateId(),
        name: editForm.name,
        unitCost: Number(editForm.unitCost),
        stockQuantity: Number(editForm.stockQuantity),
        category: editForm.category as 'materials' | 'equipments',
        currency: editForm.currency as 'USD' | 'NIO',
        barcode: editForm.barcode,
        lastUpdated: new Date().toISOString()
      });
      setIsAdding(false);
    } else if (editingId) {
      updateInventoryItem({
        ...editForm,
        unitCost: Number(editForm.unitCost),
        stockQuantity: Number(editForm.stockQuantity),
        lastUpdated: new Date().toISOString()
      } as InventoryItem);
      setEditingId(null);
    }
    setEditForm({});
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2>Bodega / Inventario</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button className="btn-secondary" onClick={handleExport} title="Exportar a Excel (CSV)">
            <Download size={20} />
            Exportar
          </button>
          <button className="btn-primary" onClick={handleStartAdd} disabled={isAdding}>
            <Plus size={20} />
            Nuevo Artículo
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 300px', display: 'flex', gap: '0.5rem', alignItems: 'center', backgroundColor: 'var(--bg-color)', padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
          <PackageSearch size={20} color="var(--text-muted)" />
          <input 
            type="text" 
            placeholder="Buscar por nombre o código QR/Barras..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-main)' }}
          />
        </div>
        <button className="btn-secondary" onClick={() => setIsScanningSearch(true)} title="Buscar con QR">
          <QrCode size={20} />
          Escanear
        </button>
        <select 
          className="form-input" 
          value={categoryFilter} 
          onChange={e => setCategoryFilter(e.target.value)}
          style={{ padding: '0.5rem 1rem' }}
        >
          <option value="all">Todas las Categorías</option>
          <option value="equipments">Equipos</option>
          <option value="materials">Materiales</option>
        </select>
      </div>

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--surface-hover)', textAlign: 'left' }}>
              <th style={{ padding: '1rem' }}>Nombre del Artículo</th>
              <th style={{ padding: '1rem' }}>Código/QR</th>
              <th style={{ padding: '1rem' }}>Categoría</th>
              <th style={{ padding: '1rem' }}>Moneda</th>
              <th style={{ padding: '1rem' }}>Costo Unitario</th>
              <th style={{ padding: '1rem' }}>Stock Disponible</th>
              <th style={{ padding: '1rem', textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isAdding && (
              <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(99, 102, 241, 0.1)' }}>
                <td style={{ padding: '1rem' }}>
                  <input autoFocus type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--primary-color)', backgroundColor: 'var(--bg-color)' }} placeholder="Ej: Cable UTP" />
                </td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input type="text" value={editForm.barcode || ''} onChange={e => setEditForm({...editForm, barcode: e.target.value})} style={{ width: '100px', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)' }} placeholder="Opcional" />
                    <button className="btn-secondary" style={{ padding: '0.5rem' }} onClick={() => setIsScanningItem(true)} title="Escanear QR"><QrCode size={16} /></button>
                  </div>
                </td>
                <td style={{ padding: '1rem' }}>
                  <select value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value as any})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)' }}>
                    <option value="equipments">Equipo</option>
                    <option value="materials">Material</option>
                  </select>
                </td>
                <td style={{ padding: '1rem' }}>
                  <select value={editForm.currency} onChange={e => setEditForm({...editForm, currency: e.target.value as any})} style={{ width: '80px', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)' }}>
                    <option value="USD">USD</option>
                    <option value="NIO">NIO</option>
                  </select>
                </td>
                <td style={{ padding: '1rem' }}>
                  <input type="number" min="0" step="0.01" value={editForm.unitCost} onChange={e => setEditForm({...editForm, unitCost: Number(e.target.value)})} style={{ width: '100px', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)' }} />
                </td>
                <td style={{ padding: '1rem' }}>
                  <input type="number" min="0" value={editForm.stockQuantity} onChange={e => setEditForm({...editForm, stockQuantity: Number(e.target.value)})} style={{ width: '80px', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)' }} />
                </td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button className="btn-primary" style={{ padding: '0.5rem' }} onClick={handleSave}><Save size={16} /></button>
                    <button className="btn-secondary" style={{ padding: '0.5rem' }} onClick={() => setIsAdding(false)}><X size={16} /></button>
                  </div>
                </td>
              </tr>
            )}

            {filteredInventory.length === 0 && !isAdding && (
              <tr>
                <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No se encontraron productos en bodega.
                </td>
              </tr>
            )}

            {currentItems.map(item => {
              const isEditing = editingId === item.id;
              return (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem' }}>
                    {isEditing ? (
                      <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--primary-color)', backgroundColor: 'var(--bg-color)' }} />
                    ) : (
                      item.name
                    )}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input type="text" value={editForm.barcode || ''} onChange={e => setEditForm({...editForm, barcode: e.target.value})} style={{ width: '100px', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)' }} placeholder="Opcional" />
                        <button className="btn-secondary" style={{ padding: '0.5rem' }} onClick={() => setIsScanningItem(true)} title="Escanear QR"><QrCode size={16} /></button>
                      </div>
                    ) : (
                      item.barcode ? <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{item.barcode}</span> : <span style={{ color: 'var(--text-muted)' }}>-</span>
                    )}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {isEditing ? (
                      <select value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value as any})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)' }}>
                        <option value="equipments">Equipo</option>
                        <option value="materials">Material</option>
                      </select>
                    ) : (
                      <span style={{ padding: '0.25rem 0.5rem', borderRadius: '12px', fontSize: '0.75rem', backgroundColor: 'var(--surface-hover)', border: '1px solid var(--border-color)' }}>
                        {item.category === 'equipments' ? 'Equipo' : 'Material'}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {isEditing ? (
                      <select value={editForm.currency || 'USD'} onChange={e => setEditForm({...editForm, currency: e.target.value as any})} style={{ width: '80px', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)' }}>
                        <option value="USD">USD</option>
                        <option value="NIO">NIO</option>
                      </select>
                    ) : (
                      <span style={{ padding: '0.25rem 0.5rem', borderRadius: '12px', fontSize: '0.75rem', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)' }}>
                        {item.currency || 'USD'}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {isEditing ? (
                      <input type="number" min="0" step="0.01" value={editForm.unitCost} onChange={e => setEditForm({...editForm, unitCost: Number(e.target.value)})} style={{ width: '100px', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)' }} />
                    ) : (
                      formatCurrency(item.unitCost, item.currency || 'USD')
                    )}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {isEditing ? (
                      <input type="number" min="0" value={editForm.stockQuantity} onChange={e => setEditForm({...editForm, stockQuantity: Number(e.target.value)})} style={{ width: '80px', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)' }} />
                    ) : (
                      <span style={{ color: item.stockQuantity <= 0 ? 'var(--danger-color)' : 'inherit', fontWeight: item.stockQuantity <= 0 ? 'bold' : 'normal' }}>
                        {item.stockQuantity} unid.
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button className="btn-primary" style={{ padding: '0.5rem' }} onClick={handleSave}><Save size={16} /></button>
                        <button className="btn-secondary" style={{ padding: '0.5rem' }} onClick={() => setEditingId(null)}><X size={16} /></button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button className="btn-secondary" style={{ padding: '0.5rem' }} onClick={() => handleStartEdit(item)}><Edit size={16} /></button>
                        <button style={{ backgroundColor: 'transparent', color: 'var(--danger-color)', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--danger-color)' }} onClick={() => { if(window.confirm('¿Seguro que deseas eliminar este producto de la bodega?')) deleteInventoryItem(item.id) }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredInventory.length)} de {filteredInventory.length} artículos
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                className="btn-secondary" 
                style={{ padding: '0.5rem' }} 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{ display: 'flex', alignItems: 'center', padding: '0 0.5rem', fontSize: '0.875rem' }}>
                Página {currentPage} de {totalPages}
              </span>
              <button 
                className="btn-secondary" 
                style={{ padding: '0.5rem' }} 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {isScanningSearch && (
        <QRScanner 
          onScan={(text) => {
            setSearchTerm(text);
            setIsScanningSearch(false);
          }}
          onClose={() => setIsScanningSearch(false)}
        />
      )}

      {isScanningItem && (
        <QRScanner 
          onScan={(text) => {
            setEditForm({...editForm, barcode: text});
            setIsScanningItem(false);
          }}
          onClose={() => setIsScanningItem(false)}
        />
      )}
    </div>
  );
};

export default InventoryList;
