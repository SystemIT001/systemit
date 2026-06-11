import React, { useState, useEffect } from 'react';
import { formatCurrency, calculateProjectTotalsDual } from '../utils';
import type { Project } from '../types';
import { FileText, CheckCircle, Clock, AlertTriangle, Send } from 'lucide-react';

const Portal: React.FC = () => {
  const [project, setProject] = useState<Project | null>(null);
  const [isQuote, setIsQuote] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  
  // Soporte
  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketDesc, setTicketDesc] = useState('');
  const [ticketSuccess, setTicketSuccess] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      setError('Enlace inválido. No se proporcionó un token de acceso.');
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        const response = await fetch(`/api/portal.php?token=${token}`);
        if (!response.ok) {
          throw new Error('No se encontró información o el enlace ha expirado.');
        }
        const data = await response.json();
        setProject(data as Project);
        setIsQuote(data.isQuote);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleApprove = async () => {
    if (!window.confirm('¿Está seguro de que desea aprobar esta cotización? Esto notificará a nuestro equipo para iniciar el proyecto.')) {
      return;
    }

    setActionLoading(true);
    try {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      const response = await fetch(`/api/portal.php?action=approve&token=${token}`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Error al aprobar la cotización');
      
      alert('¡Cotización aprobada con éxito! Nos pondremos en contacto pronto.');
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      const response = await fetch(`/api/portal.php?action=ticket&token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: ticketTitle, description: ticketDesc })
      });
      if (!response.ok) throw new Error('Error al enviar el ticket');
      
      setTicketSuccess(true);
      setTicketTitle('');
      setTicketDesc('');
      setTimeout(() => setTicketSuccess(false), 5000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
        <p style={{ fontSize: '1.2rem', color: '#64748b' }}>Cargando información...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f8fafc', padding: '1rem' }}>
        <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', textAlign: 'center', maxWidth: '400px' }}>
          <AlertTriangle size={48} color="#ef4444" style={{ marginBottom: '1rem' }} />
          <h2 style={{ color: '#0f172a', marginBottom: '0.5rem' }}>Acceso Denegado</h2>
          <p style={{ color: '#64748b' }}>{error || 'No se pudo cargar la información.'}</p>
        </div>
      </div>
    );
  }

  const totals = calculateProjectTotalsDual(project);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '2rem 1rem', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        {/* Header */}
        <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <h1 style={{ color: '#0f172a', margin: '0 0 0.5rem 0', fontSize: '2rem' }}>Portal del Cliente</h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '1.1rem' }}>Hola, {project.clientName}</p>
        </header>

        {/* Project/Quote Summary */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '2rem', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <FileText size={24} color="#3b82f6" />
                <h2 style={{ margin: 0, color: '#0f172a' }}>{project.projectName}</h2>
              </div>
              <p style={{ color: '#64748b', margin: 0 }}>
                {isQuote ? 'Cotización' : `Proyecto #${project.projectCode}`} • Fecha: {project.date}
              </p>
            </div>
            
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: '0 0 0.5rem 0', color: '#64748b', fontSize: '0.9rem' }}>Monto Total</p>
              <h3 style={{ margin: 0, color: '#059669', fontSize: '1.5rem' }}>
                {formatCurrency(totals.totalUSD, 'USD')}
              </h3>
            </div>
          </div>

          <div style={{ backgroundColor: '#f8fafc', borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#0f172a', fontSize: '1.1rem' }}>Estado Actual</h3>
            
            {isQuote ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Clock size={24} color="#f59e0b" />
                <div>
                  <p style={{ margin: 0, fontWeight: 500, color: '#b45309' }}>Pendiente de Aprobación</p>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Revisa la propuesta. Si estás de acuerdo, puedes aprobarla aquí mismo.</p>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <CheckCircle size={24} color="#10b981" />
                <div>
                  <p style={{ margin: 0, fontWeight: 500, color: '#047857' }}>
                    {project.status === 'not_started' && 'No Iniciado'}
                    {project.status === 'completed' && 'Completado'}
                  </p>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>El proyecto ha sido aprobado y está en nuestros registros.</p>
                </div>
              </div>
            )}
          </div>

          {isQuote && (
            <div style={{ textAlign: 'center' }}>
              <button 
                onClick={handleApprove}
                disabled={actionLoading}
                style={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  padding: '1rem 2rem',
                  borderRadius: '8px',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  opacity: actionLoading ? 0.7 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'background-color 0.2s'
                }}
              >
                <CheckCircle size={20} />
                {actionLoading ? 'Procesando...' : 'Aprobar Cotización e Iniciar Proyecto'}
              </button>
            </div>
          )}
        </div>

        {/* Support Ticket Section (Only if project is approved) */}
        {!isQuote && (
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '2rem', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 1.5rem 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Send size={20} color="#3b82f6" />
              ¿Necesitas soporte? Envía un Ticket
            </h3>
            
            {ticketSuccess && (
              <div style={{ backgroundColor: '#d1fae5', color: '#065f46', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                ¡Ticket enviado con éxito! Nos pondremos en contacto a la brevedad.
              </div>
            )}

            <form onSubmit={handleSendTicket}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#475569', fontWeight: 500 }}>Asunto</label>
                <input 
                  required
                  value={ticketTitle}
                  onChange={e => setTicketTitle(e.target.value)}
                  placeholder="Ej: Problema con la red, Mantenimiento requerido..."
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '1rem' }}
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#475569', fontWeight: 500 }}>Descripción detallada</label>
                <textarea 
                  required
                  value={ticketDesc}
                  onChange={e => setTicketDesc(e.target.value)}
                  placeholder="Describe el problema o solicitud con la mayor cantidad de detalles posible..."
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '1rem', minHeight: '120px', resize: 'vertical' }}
                />
              </div>
              <div style={{ textAlign: 'right' }}>
                <button 
                  type="submit"
                  disabled={actionLoading}
                  style={{
                    backgroundColor: '#0f172a',
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    fontWeight: 500,
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                    opacity: actionLoading ? 0.7 : 1
                  }}
                >
                  {actionLoading ? 'Enviando...' : 'Enviar Ticket'}
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};

export default Portal;
