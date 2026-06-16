import React, { useState, useMemo } from 'react';

import { Plus, Trash2, Printer, FolderKanban, Search, ChevronLeft, ChevronRight, LayoutList, KanbanSquare } from 'lucide-react';
import { useProjects } from '../hooks/useProjects';
import { useAuth } from '../hooks/useAuth';
import { generateId, formatCurrency, calculateProjectTotalsDual } from '../utils';
import KanbanBoard from '../components/KanbanBoard';

const ProjectList: React.FC = () => {
  const { projects, addProject, deleteProject, updateProject } = useProjects();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const itemsPerPage = 10;

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

  const filteredProjects = useMemo(() => {
    return projects.filter(p => p.status !== 'quote').filter(project => {
      // Role filtering: Técnicos solo ven proyectos donde están asignados en profitUsers
      if (user?.role === 'tecnico') {
        if (!project.profitUsers?.includes(user.id)) {
          return false;
        }
      }

      const query = searchQuery.toLowerCase();
      const matchesSearch = (project.projectName?.toLowerCase() || '').includes(query) || 
                            (project.clientName?.toLowerCase() || '').includes(query) ||
                            (project.projectCode?.toString() || '').includes(query);
      
      const pStatus = project.status || 'not_started';
      const matchesStatus = statusFilter === 'all' || pStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [projects, searchQuery, statusFilter, user]);

  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
  const currentItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredProjects.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProjects, currentPage]);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2>Tus Proyectos</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', backgroundColor: 'var(--surface-color)', borderRadius: '8px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
            <button 
              onClick={() => setViewMode('list')}
              style={{ padding: '0.5rem 1rem', background: viewMode === 'list' ? 'var(--primary-color)' : 'transparent', color: viewMode === 'list' ? 'var(--bg-color)' : 'var(--text-main)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <LayoutList size={18} />
            </button>
            <button 
              onClick={() => setViewMode('kanban')}
              style={{ padding: '0.5rem 1rem', background: viewMode === 'kanban' ? 'var(--primary-color)' : 'transparent', color: viewMode === 'kanban' ? 'var(--bg-color)' : 'var(--text-main)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <KanbanSquare size={18} />
            </button>
          </div>
          
          <div style={{ position: 'relative', flex: '1 1 200px' }}>
            <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Buscar proyecto o cliente..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '35px', width: '100%' }}
            />
          </div>
          
          {viewMode === 'list' && (
            <select 
              className="form-input" 
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="all">Todos los estados</option>
              <option value="not_started">No Iniciado</option>
              <option value="draft">En Proceso</option>
              <option value="completed">Completado</option>
            </select>
          )}

          <button className="btn-primary" onClick={handleCreateProject}>
            <Plus size={20} />
            Nuevo Proyecto
          </button>
        </div>
      </div>

      {viewMode === 'kanban' ? (
        <KanbanBoard 
          columns={[
            { id: 'not_started', title: 'No Iniciado', items: filteredProjects.filter(p => !p.status || p.status === 'not_started') },
            { id: 'draft', title: 'En Proceso', items: filteredProjects.filter(p => p.status === 'draft') },
            { id: 'completed', title: 'Completado', items: filteredProjects.filter(p => p.status === 'completed') }
          ]}
          onMoveItem={async (projectId, newStatus) => {
            const project = projects.find(p => p.id === projectId);
            if (project && project.status !== newStatus) {
              await updateProject({ ...project, status: newStatus as any });
            }
          }}
          renderCard={(item: any) => (
            <div className="card" style={{ padding: '1rem', cursor: 'grab', marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.9rem' }}>{item.projectName}</h4>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                  #{item.projectCode || ''}
                </span>
              </div>
              <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {item.clientName || 'Sin Cliente'}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '0.85rem', color: 'var(--success-color)' }}>
                  {formatCurrency(calculateProjectTotalsDual(item).totalUSD, 'USD')}
                </strong>
                <button 
                  onClick={(e) => { e.stopPropagation(); window.location.href = `/views/proyecto-detalle.html?id=${item.id}`; }}
                  style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', padding: '0.2rem' }}
                >
                  <FolderKanban size={16} />
                </button>
              </div>
            </div>
          )}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
        {filteredProjects.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: 'var(--text-muted)' }}>No hay proyectos encontrados.</p>
          </div>
        ) : (
          currentItems.map(project => (
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
      )}

      {viewMode === 'kanban' ? null : (
        <>
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', marginTop: '2rem', backgroundColor: 'var(--surface-color)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredProjects.length)} de {filteredProjects.length} proyectos
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
        </>
      )}
    </div>
  );
};

export default ProjectList;
