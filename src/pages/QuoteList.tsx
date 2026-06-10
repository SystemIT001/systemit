import React from 'react';
import { Plus, Trash2, Printer, FileText, ArrowRight } from 'lucide-react';
import { useProjects } from '../hooks/useProjects';
import { useQuotes } from '../hooks/useQuotes';
import { generateId, formatCurrency, calculateProjectTotalsDual } from '../utils';

const QuoteList: React.FC = () => {
  const { quotes, addQuote, deleteQuote } = useQuotes();
  const { projects, addProject } = useProjects();

  const handleCreateQuote = () => {
    const quoteProjects = quotes;
    const nextCode = quoteProjects.length > 0 
      ? Math.max(...quoteProjects.map(p => p.projectCode || 0)) + 1 
      : 1;

    const newQuote = {
      id: generateId(),
      projectCode: nextCode,
      clientName: '',
      projectName: 'Nueva Cotización',
      date: new Date().toISOString().split('T')[0],
      status: 'quote' as const,
      materials: [],
      equipments: [],
      labor: []
    };
    addQuote(newQuote);
    window.location.href = `/views/proyecto-detalle.html?id=${newQuote.id}&type=quote`;
  };

  const handleConvertToProject = async (quote: any) => {
    if (window.confirm(`¿Estás seguro de convertir la cotización "${quote.projectName}" en un proyecto oficial?`)) {
      const actualProjects = projects;
      const nextCode = actualProjects.length > 0 
        ? Math.max(...actualProjects.map(p => p.projectCode || 0)) + 1 
        : 1;

      const newProject = { ...quote, status: 'not_started', projectCode: nextCode };
      
      const res = await addProject(newProject);
      if (res.success) {
        await deleteQuote(quote.id);
        window.location.href = `/views/proyectos.html`;
      }
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>Cotizaciones y Prospectos</h2>
          <p style={{ color: 'var(--text-muted)' }}>Documentos presupuestarios que aún no son proyectos iniciados.</p>
        </div>
        <button className="btn-primary" onClick={handleCreateQuote}>
          <Plus size={20} />
          Nueva Cotización
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
        {quotes.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: 'var(--text-muted)' }}>No hay cotizaciones pendientes.</p>
          </div>
        ) : (
          quotes.map(project => (
            <div key={project.id} className="card project-card">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0 }}>{project.projectName}</h3>
                  <span style={{ fontSize: '0.75rem', backgroundColor: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary-color)', padding: '0.2rem 0.6rem', borderRadius: '12px', border: '1px solid var(--primary-color)', fontWeight: 500 }}>
                    Cotización
                  </span>
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  Cliente: {project.clientName || 'N/A'} | Fecha: {project.date} | Total Estimado: <strong style={{ color: 'var(--success-color)' }}>{formatCurrency(calculateProjectTotalsDual(project).totalUSD, 'USD')}</strong>
                </p>
              </div>
              <div className="project-card-actions" style={{ flexWrap: 'wrap' }}>
                <button 
                  className="btn-primary" 
                  onClick={() => handleConvertToProject(project)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, justifyContent: 'center' }}
                  title="Aprobar y convertir en Proyecto Oficial"
                >
                  <ArrowRight size={18} />
                  Convertir a Proyecto
                </button>
                <button 
                  className="btn-secondary" 
                  onClick={() => window.location.href = `/views/proyecto-detalle.html?id=${project.id}&type=quote`}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <FileText size={18} />
                  Editar
                </button>
                <button 
                  className="btn-secondary" 
                  onClick={() => window.location.href = `/views/factura.html?id=${project.id}&isQuote=true`}
                >
                  <Printer size={16} /> Imprimir
                </button>
                <button 
                  style={{ backgroundColor: 'transparent', color: 'var(--danger-color)', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--danger-color)' }}
                  onClick={() => {
                    if (window.confirm(`¿Seguro que deseas eliminar la cotización "${project.projectName}"?`)) {
                      deleteQuote(project.id);
                    }
                  }}
                  title="Eliminar"
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

export default QuoteList;
