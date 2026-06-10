import React from 'react';

import { Plus, Trash2, Printer, FolderKanban } from 'lucide-react';
import { useProjects } from '../hooks/useProjects';
import { generateId, formatCurrency, calculateProjectTotalsDual } from '../utils';

const ProjectList: React.FC = () => {
  const { projects, addProject, deleteProject } = useProjects();


  const handleCreateProject = async () => {
    const actualProjects = projects.filter(p => p.status !== 'quote');
    const nextCode = actualProjects.length > 0 
      ? Math.max(...actualProjects.map(p => p.projectCode || 0)) + 1 
      : 1;

    const newProject = {
      id: generateId(),
      projectCode: nextCode,
      clientName: '',
      projectName: 'Nuevo Proyecto',
      date: new Date().toISOString().split('T')[0],
      status: 'not_started' as const,
      materials: [],
      equipments: [],
      labor: []
    };
    const res = await addProject(newProject);
    if (res.success) {
      window.location.href = `/views/proyecto-detalle.html?id=${newProject.id}`;
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Tus Proyectos</h2>
        <button className="btn-primary" onClick={handleCreateProject}>
          <Plus size={20} />
          Nuevo Proyecto
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
        {projects.filter(p => p.status !== 'quote').length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: 'var(--text-muted)' }}>No hay proyectos creados todavía.</p>
          </div>
        ) : (
          projects.filter(p => p.status !== 'quote').map(project => (
            <div key={project.id} className="card project-card">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0 }}>{project.projectName}</h3>
                  {project.status === 'completed' && (
                    <span style={{ fontSize: '0.75rem', backgroundColor: 'rgba(34, 197, 94, 0.1)', color: 'var(--success-color)', padding: '0.2rem 0.6rem', borderRadius: '12px', border: '1px solid var(--success-color)', fontWeight: 500 }}>
                      Completado
                    </span>
                  )}
                  {project.status === 'draft' && (
                    <span style={{ fontSize: '0.75rem', backgroundColor: 'rgba(234, 179, 8, 0.1)', color: 'var(--warning-color)', padding: '0.2rem 0.6rem', borderRadius: '12px', border: '1px solid var(--warning-color)', fontWeight: 500 }}>
                      En Proceso
                    </span>
                  )}
                  {(!project.status || project.status === 'not_started') && (
                    <span style={{ fontSize: '0.75rem', backgroundColor: 'rgba(100, 116, 139, 0.1)', color: '#94a3b8', padding: '0.2rem 0.6rem', borderRadius: '12px', border: '1px solid #94a3b8', fontWeight: 500 }}>
                      No Iniciado
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  Cliente: {project.clientName || 'N/A'} | Fecha: {project.date} | Total: <strong style={{ color: 'var(--success-color)' }}>{formatCurrency(calculateProjectTotalsDual(project).totalUSD, 'USD')}</strong>
                </p>
              </div>
              <div className="project-card-actions">
                <button 
                  className="btn-secondary" 
                  onClick={() => window.location.href = `/views/proyecto-detalle.html?id=${project.id}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, justifyContent: 'center' }}
                >
                  <FolderKanban size={18} />
                  Ver Detalles
                </button>
                <button 
                  className="btn-secondary" 
                  onClick={() => window.location.href = `/views/factura.html?id=${project.id}`}
                >
                  <Printer size={16} /> Imprimir
                </button>
                <button 
                  style={{ backgroundColor: 'transparent', color: 'var(--danger-color)', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--danger-color)' }}
                  onClick={() => deleteProject(project.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ProjectList;
