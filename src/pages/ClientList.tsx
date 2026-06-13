import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Edit, Save, X, Users, Search, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { useClients } from '../hooks/useClients';
import type { Client } from '../types';
import { generateId, exportToCSV } from '../utils';

const ClientList: React.FC = () => {
  const { clients, addClient, updateClient, deleteClient } = useClients();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const filteredClients = useMemo(() => {
    return clients.filter(client => 
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.documentId && client.documentId.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (client.phone && client.phone.includes(searchTerm)) ||
      (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [clients, searchTerm]);

  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const currentItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredClients.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredClients, currentPage]);

  const handleExport = () => {
    const dataToExport = filteredClients.map(client => ({
      ID: client.id,
      Nombre: client.name,
      'Documento/RUC': client.documentId || 'N/A',
      Teléfono: client.phone || 'N/A',
      Email: client.email || 'N/A',
      Dirección: client.address || 'N/A'
    }));
    exportToCSV(dataToExport, 'Clientes_CC_System');
  };

  // Reset page when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const [formData, setFormData] = useState({
    name: '',
    documentId: '',
    phone: '',
    email: '',
    address: ''
  });

  const handleOpenForm = (client?: Client) => {
    if (client) {
      setFormData({
        name: client.name,
        documentId: client.documentId,
        phone: client.phone,
        email: client.email,
        address: client.address
      });
      setEditingId(client.id);
    } else {
      setFormData({
        name: '',
        documentId: '',
        phone: '',
        email: '',
        address: ''
      });
      setEditingId(null);
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    if (editingId) {
      updateClient({
        id: editingId,
        ...formData
      });
    } else {
      addClient({
        id: generateId(),
        ...formData
      });
    }
    handleCloseForm();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Users size={28} color="var(--primary-color)" />
          <h2>Directorio de Clientes</h2>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button className="btn-secondary" onClick={handleExport} title="Exportar a Excel (CSV)">
            <Download size={20} />
            Exportar
          </button>
          {!isFormOpen && (
            <button className="btn-primary" onClick={() => handleOpenForm()}>
              <Plus size={20} /> Nuevo Cliente
            </button>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={20} color="var(--text-muted)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="Buscar por nombre, RUC, teléfono o email..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="form-input"
            style={{ width: '100%', paddingLeft: '3rem' }}
          />
        </div>
      </div>

      {isFormOpen && (
        <div className="card" style={{ marginBottom: '2rem', borderLeft: '4px solid var(--primary-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3>{editingId ? 'Editar Cliente' : 'Agregar Nuevo Cliente'}</h3>
            <button onClick={handleCloseForm} style={{ backgroundColor: 'transparent', color: 'var(--text-muted)' }}>
              <X size={24} />
            </button>
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Nombre Completo o Empresa *</label>
              <input 
                type="text" 
                required 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>RUC o Cédula</label>
              <input 
                type="text" 
                value={formData.documentId}
                onChange={e => setFormData({...formData, documentId: e.target.value})}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Teléfono</label>
              <input 
                type="tel" 
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Correo Electrónico</label>
              <input 
                type="email" 
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Dirección</label>
              <input 
                type="text" 
                value={formData.address}
                onChange={e => setFormData({...formData, address: e.target.value})}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)' }}
              />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
              <button type="button" className="btn-secondary" onClick={handleCloseForm}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary">
                <Save size={20} /> {editingId ? 'Guardar Cambios' : 'Registrar Cliente'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {filteredClients.length === 0 ? (
          <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 2rem' }}>
            <Users size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem', opacity: 0.5 }} />
            <h3 style={{ marginBottom: '0.5rem' }}>No hay clientes encontrados</h3>
            <p style={{ color: 'var(--text-muted)' }}>Intenta con otra búsqueda o agrega un nuevo cliente.</p>
          </div>
        ) : (
          currentItems.map(client => (
            <div key={client.id} className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.125rem', color: 'var(--text-main)', margin: 0 }}>{client.name}</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button style={{ color: 'var(--text-color)', backgroundColor: 'transparent', padding: '4px' }} onClick={() => handleOpenForm(client)}>
                    <Edit size={16} />
                  </button>
                  <button style={{ color: 'var(--danger-color)', backgroundColor: 'transparent', padding: '4px' }} onClick={() => {
                    if (window.confirm('¿Seguro que deseas eliminar este cliente?')) deleteClient(client.id);
                  }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                {client.documentId && <p><strong>RUC/Cédula:</strong> {client.documentId}</p>}
                {client.phone && <p><strong>Tel:</strong> {client.phone}</p>}
                {client.email && <p><strong>Email:</strong> {client.email}</p>}
                {client.address && <p><strong>Dir:</strong> {client.address}</p>}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', marginTop: '2rem', backgroundColor: 'var(--surface-color)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredClients.length)} de {filteredClients.length} clientes
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
  );
};

export default ClientList;
