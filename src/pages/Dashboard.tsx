import React from 'react';
import { useProjects } from '../hooks/useProjects';
import { FolderKanban, TrendingUp, CheckCircle } from 'lucide-react';
import { calculateProjectRealRevenueDual, formatCurrency } from '../utils';

const Dashboard: React.FC = () => {
  const { projects } = useProjects();

  const totalProjects = projects.length;
  const completedProjects = projects.filter(p => p.status === 'completed').length;
  
  const estimatedRevenue = projects.reduce((acc, curr) => {
    return acc + calculateProjectRealRevenueDual(curr).totalUSD;
  }, 0);

  return (
    <div>
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

      <div className="card">
        <h2>Proyectos Recientes</h2>
        {projects.length === 0 ? (
          <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>No tienes proyectos creados todavía. Empieza agregando uno desde la sección Proyectos.</p>
        ) : (
          <ul style={{ marginTop: '1rem', listStyle: 'none' }}>
            {projects.slice(0, 5).map(p => (
              <li key={p.id} style={{ padding: '1rem 0', borderBottom: '1px solid var(--border-color)' }}>
                <strong>{p.projectName || 'Sin nombre'}</strong> - {p.clientName || 'Cliente no definido'}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
