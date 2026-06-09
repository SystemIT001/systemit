import React, { useState } from 'react';
import { Plus, Trash2, Save, Edit, Search } from 'lucide-react';
import { useTickets } from '../hooks/useTickets';
import { useClients } from '../hooks/useClients';
import { generateId, formatCurrency } from '../utils';
import { Ticket } from '../types';

const TicketList: React.FC = () => {
  const { tickets, addTicket, deleteTicket, loading } = useTickets();
  const { clients } = useClients();
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState<Partial<Ticket>>({});

  const handleCreateNew = () => {
    setFormData({
      id: generateId(),
      title: '',
      description: '',
      clientName: '',
      date: new Date().toISOString().split('T')[0],
      status: 'open',
      priority: 'normal',
      cost: 0,
      currency: 'NIO'
    });
    setIsCreating(true);
    setEditingId(null);
  };

  const handleEdit = (ticket: Ticket) => {
    setFormData({ ...ticket });
    setEditingId(ticket.id);
    setIsCreating(true);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.clientName) {
      alert('Por favor ingrese el título y el cliente.');
      return;
    }
    await addTicket(formData as Ticket);
    setIsCreating(false);
    setEditingId(null);
  };

  const filteredTickets = tickets.filter(t => 
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.clientName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>Tickets de Soporte</h2>
          <p style={{ color: 'var(--text-muted)' }}>Mantenimientos rápidos, salidas a terreno y fallas menores.</p>
        </div>
        <button className="btn-primary" onClick={handleCreateNew}>
          <Plus size={20} /> Nuevo Ticket
        </button>
      </div>

      {isCreating && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3>{editingId ? 'Editar Ticket' : 'Crear Ticket'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Asunto / Falla</label>
              <input 
                type="text" 
                value={formData.title || ''}
                onChange={e => setFormData({...formData, title: e.target.value})}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Cliente</label>
              <select 
                value={formData.clientName || ''}
                onChange={e => setFormData({...formData, clientName: e.target.value})}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)' }}
              >
                <option value="">Seleccione un cliente...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Fecha</label>
              <input 
                type="date" 
                value={formData.date || ''}
                onChange={e => setFormData({...formData, date: e.target.value})}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Estado</label>
              <select 
                value={formData.status || 'open'}
                onChange={e => setFormData({...formData, status: e.target.value as any})}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)' }}
              >
                <option value="open">Abierto</option>
                <option value="in_progress">En Proceso</option>
                <option value="resolved">Resuelto</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Prioridad</label>
              <select 
                value={formData.priority || 'normal'}
                onChange={e => setFormData({...formData, priority: e.target.value as any})}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)' }}
              >
                <option value="low">Baja</option>
                <option value="normal">Normal</option>
                <option value="high">Alta / Urgente</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Costo (0 si es gratis)</label>
                <input 
                  type="number" 
                  value={formData.cost || 0}
                  onChange={e => setFormData({...formData, cost: parseFloat(e.target.value)})}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)' }}
                />
              </div>
              <div style={{ width: '100px' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Moneda</label>
                <select 
                  value={formData.currency || 'NIO'}
                  onChange={e => setFormData({...formData, currency: e.target.value as any})}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)' }}
                >
                  <option value="NIO">NIO</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>
          </div>
          <div style={{ marginTop: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Descripción / Notas de la visita</label>
            <textarea 
              value={formData.description || ''}
              onChange={e => setFormData({...formData, description: e.target.value})}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', minHeight: '80px' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
            <button className="btn-secondary" onClick={() => setIsCreating(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleSave}>
              <Save size={18} /> Guardar Ticket
            </button>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ position: 'relative' }}>
          <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Buscar por cliente o asunto..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 3rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', fontSize: '1rem', color: 'var(--text-main)' }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
        {loading ? (
          <p>Cargando tickets...</p>
        ) : filteredTickets.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: 'var(--text-muted)' }}>No se encontraron tickets.</p>
          </div>
        ) : (
          filteredTickets.map(ticket => (
            <div key={ticket.id} className="card project-card" style={{ borderLeft: ticket.priority === 'high' ? '4px solid var(--danger-color)' : ticket.status === 'resolved' ? '4px solid var(--success-color)' : '4px solid var(--primary-color)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0 }}>{ticket.title}</h3>
                  {ticket.status === 'resolved' && (
                    <span style={{ fontSize: '0.75rem', backgroundColor: 'rgba(34, 197, 94, 0.1)', color: 'var(--success-color)', padding: '0.2rem 0.6rem', borderRadius: '12px', border: '1px solid var(--success-color)', fontWeight: 500 }}>
                      Resuelto
                    </span>
                  )}
                  {ticket.status === 'in_progress' && (
                    <span style={{ fontSize: '0.75rem', backgroundColor: 'rgba(234, 179, 8, 0.1)', color: 'var(--warning-color)', padding: '0.2rem 0.6rem', borderRadius: '12px', border: '1px solid var(--warning-color)', fontWeight: 500 }}>
                      En Proceso
                    </span>
                  )}
                  {ticket.status === 'open' && (
                    <span style={{ fontSize: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)', padding: '0.2rem 0.6rem', borderRadius: '12px', border: '1px solid var(--danger-color)', fontWeight: 500 }}>
                      Abierto
                    </span>
                  )}
                  {ticket.priority === 'high' && (
                    <span style={{ fontSize: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)', padding: '0.2rem 0.6rem', borderRadius: '12px', border: '1px solid var(--danger-color)', fontWeight: 500 }}>
                      Urgente
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  Cliente: {ticket.clientName} | Fecha: {ticket.date}
                </p>
                <p style={{ fontSize: '0.9rem' }}>{ticket.description}</p>
                {ticket.cost > 0 && (
                  <p style={{ marginTop: '0.5rem', fontWeight: 600, color: 'var(--success-color)' }}>
                    Costo: {formatCurrency(ticket.cost, ticket.currency)}
                  </p>
                )}
              </div>
              <div className="project-card-actions" style={{ flexDirection: 'column', gap: '0.5rem' }}>
                <button 
                  className="btn-secondary" 
                  onClick={() => handleEdit(ticket)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}
                >
                  <Edit size={16} /> Editar
                </button>
                <button 
                  style={{ backgroundColor: 'transparent', color: 'var(--danger-color)', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--danger-color)', width: '100%' }}
                  onClick={() => {
                    if (window.confirm('¿Eliminar este ticket?')) deleteTicket(ticket.id);
                  }}
                >
                  <Trash2 size={16} style={{ margin: '0 auto' }} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TicketList;
