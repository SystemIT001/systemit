import React from 'react';
import { useProjects } from '../hooks/useProjects';
import { useTickets } from '../hooks/useTickets';
import { useVisits } from '../hooks/useVisits';
import { FolderKanban, TrendingUp, CheckCircle, Calendar, AlertCircle, Plus } from 'lucide-react';
import { calculateProjectRealRevenueDual, formatCurrency } from '../utils';

const Dashboard: React.FC = () => {
  const { projects } = useProjects();
  const { tickets } = useTickets();
  const { visits } = useVisits();

  const totalProjects = projects.length;
  const completedProjects = projects.filter(p => p.status === 'completed').length;
  
  const estimatedRevenue = projects.reduce((acc, curr) => {
    return acc + calculateProjectRealRevenueDual(curr).totalUSD;
  }, 0);

  const pendingTickets = tickets.filter(t => t.status === 'open' || t.status === 'in_progress');
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const todaysVisits = visits.filter(v => {
    const visitDate = new Date(v.date);
    return visitDate >= today && visitDate < tomorrow;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2>Resumen General</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
           <button className="btn-primary" onClick={() => window.location.href = '/views/proyectos.html'}>
             <Plus size={18} /> Nuevo Proyecto
           </button>
           <button className="btn-secondary" onClick={() => window.location.href = '/views/calendario.html'}>
             <Calendar size={18} /> Agendar Visita
           </button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', backgroundColor: 'rgba(99, 102, 241, 0.1)', borderRadius: '50%', color: 'var(--primary-color)' }}>
            <FolderKanban size={28} />
          </div>
          <div>
            <h3 style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>Total Proyectos</h3>
            <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{totalProjects}</p>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%', color: 'var(--success-color)' }}>
            <TrendingUp size={28} />
          </div>
          <div>
            <h3 style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>Ingreso Real (Ganancia)</h3>
            <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{formatCurrency(estimatedRevenue)}</p>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%', color: 'var(--danger-color)' }}>
            <CheckCircle size={28} />
          </div>
          <div>
            <h3 style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>Completados</h3>
            <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{completedProjects}</p>
          </div>
        </div>

      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem', marginTop: '2rem' }}>
        
        {/* Recent Projects */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Proyectos Recientes</h2>
            <a href="/views/proyectos.html" style={{ fontSize: '0.875rem', color: 'var(--primary-color)' }}>Ver todos</a>
          </div>
          
          {projects.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>No tienes proyectos creados todavía.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {projects.slice(0, 5).map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: 'var(--bg-main)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div>
                    <strong style={{ display: 'block', color: 'var(--text-main)' }}>{p.projectName || 'Sin nombre'}</strong>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{p.clientName || 'Cliente no definido'}</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '12px', 
                    backgroundColor: p.status === 'completed' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                    color: p.status === 'completed' ? 'var(--success-color)' : 'var(--warning-color)',
                    border: `1px solid ${p.status === 'completed' ? 'var(--success-color)' : 'var(--warning-color)'}`
                  }}>
                    {p.status === 'completed' ? 'Completado' : 'En Proceso'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Today's Visits */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={20} color="var(--primary-color)" />
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Citas de Hoy</h2>
            </div>
            <a href="/views/calendario.html" style={{ fontSize: '0.875rem', color: 'var(--primary-color)' }}>Abrir agenda</a>
          </div>

          {todaysVisits.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>No tienes visitas programadas para hoy.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {todaysVisits.map(visit => (
                <div key={visit.id} style={{ padding: '0.75rem', backgroundColor: 'var(--bg-main)', borderRadius: '8px', borderLeft: '4px solid var(--primary-color)' }}>
                  <strong style={{ display: 'block', color: 'var(--text-main)' }}>{visit.title}</strong>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{visit.date.substring(11, 16)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Tickets */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={20} color="var(--danger-color)" />
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Tickets Pendientes</h2>
            </div>
            <a href="/views/tickets.html" style={{ fontSize: '0.875rem', color: 'var(--primary-color)' }}>Ver todos</a>
          </div>

          {pendingTickets.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>¡Todo en orden! No hay tickets pendientes.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {pendingTickets.slice(0, 5).map(ticket => (
                <div key={ticket.id} style={{ padding: '0.75rem', backgroundColor: 'var(--bg-main)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong style={{ color: 'var(--text-main)' }}>{ticket.title}</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--danger-color)' }}>{ticket.priority === 'high' ? 'Alta' : 'Normal'}</span>
                  </div>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Cliente: {ticket.clientName}</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
