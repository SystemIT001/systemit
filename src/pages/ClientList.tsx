import React, { useState } from 'react';
import { Plus, Trash2, Edit, Save, X, Users } from 'lucide-react';
import { useClients } from '../hooks/useClients';
import type { Client } from '../types';
import { generateId } from '../utils';

const ClientList: React.FC = () => {
  const { clients, addClient, updateClient, deleteClient } = useClients();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Users size={28} color="var(--primary-color)" />
          <h2>Directorio de Clientes</h2>
        </div>
        {!isFormOpen && (
          <button className="btn-primary" onClick={() => handleOpenForm()}>
            <Plus size={20} /> Nuevo Cliente
          </button>
        )}
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
        {clients.length === 0 ? (
          <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 2rem' }}>
            <Users size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem', opacity: 0.5 }} />
            <h3 style={{ marginBottom: '0.5rem' }}>No hay clientes registrados</h3>
            <p style={{ color: 'var(--text-muted)' }}>Agrega tu primer cliente para usarlo en tus proyectos.</p>
          </div>
        ) : (
          clients.map(client => (
            <div key={client.id} className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.125rem', color: 'var(--primary-color)', margin: 0 }}>{client.name}</h3>
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
    </div>
  );
};

export default ClientList;
