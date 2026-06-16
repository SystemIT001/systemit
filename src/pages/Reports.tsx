import React, { useState } from 'react';
import { useProjects } from '../hooks/useProjects';
import { useQuotes } from '../hooks/useQuotes';
import { useUsers } from '../hooks/useUsers';
import { useInventory } from '../hooks/useInventory';
import { calculateProjectTotalsDual, calculateProjectRealRevenueDual, formatCurrency } from '../utils';
import { Printer, FolderKanban, FileText, PackageSearch, TrendingUp, ArrowLeft, Calendar, Users } from 'lucide-react';

type ReportView = 'menu' | 'projects' | 'quotes' | 'inventory' | 'financial' | 'users';

const Reports: React.FC = () => {
  const { projects } = useProjects();
  const { quotes } = useQuotes();
  const { inventory } = useInventory();
  const { users } = useUsers();

  const [activeView, setActiveView] = useState<ReportView>('menu');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedReportUser, setSelectedReportUser] = useState('');

  // Helpers
  const isWithinDateRange = (dateStr?: string) => {
    if (!dateStr) return true;
    const itemDate = new Date(dateStr);
    
    // Add timezone offset to prevent off-by-one errors with UTC
    itemDate.setMinutes(itemDate.getMinutes() + itemDate.getTimezoneOffset());
    
    if (startDate) {
      const start = new Date(startDate);
      start.setMinutes(start.getMinutes() + start.getTimezoneOffset());
      start.setHours(0, 0, 0, 0);
      if (itemDate < start) return false;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setMinutes(end.getMinutes() + end.getTimezoneOffset());
      end.setHours(23, 59, 59, 999);
      if (itemDate > end) return false;
    }
    return true;
  };

  const renderDateFilters = () => (
    <div className="no-print" style={{ display: 'flex', gap: '1rem', alignItems: 'center', backgroundColor: 'var(--surface-color)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '2rem', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Calendar size={18} color="var(--text-muted)" />
        <span style={{ fontWeight: 500 }}>Filtrar por Fechas:</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <label style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Desde:</label>
        <input 
          type="date" 
          value={startDate} 
          onChange={(e) => setStartDate(e.target.value)} 
          className="form-control" 
          style={{ width: 'auto', padding: '0.4rem' }}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <label style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Hasta:</label>
        <input 
          type="date" 
          value={endDate} 
          onChange={(e) => setEndDate(e.target.value)} 
          className="form-control" 
          style={{ width: 'auto', padding: '0.4rem' }}
        />
      </div>
      {(startDate || endDate) && (
        <button 
          onClick={() => { setStartDate(''); setEndDate(''); }}
          style={{ padding: '0.4rem 0.8rem', backgroundColor: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-muted)' }}
        >
          Limpiar
        </button>
      )}
    </div>
  );

  const renderHeader = (title: string, subtitle: string) => (
    <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button 
          className="btn-secondary" 
          onClick={() => setActiveView('menu')}
          style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title="Volver al menú"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 style={{ margin: 0 }}>{title}</h2>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>{subtitle}</p>
        </div>
      </div>
      <button className="btn-primary" onClick={() => window.print()}>
        <Printer size={20} />
        Generar PDF
      </button>
    </div>
  );

  const renderPrintHeader = (title: string, subtitle?: string) => (
    <div className="print-header" style={{ display: 'none', marginBottom: '2rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: '24px', margin: 0 }}>{title}</h1>
      {subtitle && <h2 style={{ fontSize: '18px', margin: '8px 0 0 0', color: '#444' }}>{subtitle}</h2>}
      <p style={{ color: '#666', margin: '8px 0 0 0' }}>
        Generado el: {new Date().toLocaleDateString()}
        {(startDate || endDate) && ` | Período: ${startDate || 'Inicio'} al ${endDate || 'Final'}`}
      </p>
      <hr style={{ marginTop: '1rem', border: 'none', borderTop: '1px solid #ccc' }} />
    </div>
  );

  // --- VIEWS ---

  if (activeView === 'projects') {
    const filteredProjects = projects.filter(p => isWithinDateRange(p.date));
    const completed = filteredProjects.filter(p => p.status === 'completed');
    const inProgress = filteredProjects.filter(p => p.status === 'draft');
    const notStarted = filteredProjects.filter(p => !p.status || p.status === 'not_started');

    return (
      <div className="report-container">
        {renderHeader('Reporte de Proyectos', 'Análisis operativo de proyectos por fechas')}
        {renderDateFilters()}
        {renderPrintHeader('Reporte de Proyectos')}
        
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            <div style={{ padding: '1.5rem', backgroundColor: 'var(--surface-hover)', borderRadius: '8px', borderLeft: '4px solid var(--primary-color)' }}>
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>Proyectos en el Período</p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 'bold' }}>{filteredProjects.length}</p>
            </div>
            <div style={{ padding: '1.5rem', backgroundColor: 'var(--surface-hover)', borderRadius: '8px', borderLeft: '4px solid var(--success-color)' }}>
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>Completados</p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 'bold', color: 'var(--success-color)' }}>{completed.length}</p>
            </div>
            <div style={{ padding: '1.5rem', backgroundColor: 'var(--surface-hover)', borderRadius: '8px', borderLeft: '4px solid var(--warning-color)' }}>
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>En Proceso (Draft)</p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 'bold', color: 'var(--warning-color)' }}>{inProgress.length}</p>
            </div>
            <div style={{ padding: '1.5rem', backgroundColor: 'var(--surface-hover)', borderRadius: '8px', borderLeft: '4px solid #94a3b8' }}>
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>No Iniciados</p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 'bold', color: '#94a3b8' }}>{notStarted.length}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Detalle de Proyectos</h3>
          <div className="table-responsive">
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem' }}>Nombre</th>
                  <th style={{ padding: '0.75rem' }}>Cliente</th>
                  <th style={{ padding: '0.75rem' }}>Fecha</th>
                  <th style={{ padding: '0.75rem' }}>Estado</th>
                  <th style={{ padding: '0.75rem' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.75rem' }}>{p.projectName}</td>
                    <td style={{ padding: '0.75rem' }}>{p.clientName}</td>
                    <td style={{ padding: '0.75rem' }}>{p.date}</td>
                    <td style={{ padding: '0.75rem' }}>
                      {p.status === 'completed' ? 'Completado' : 
                       p.status === 'draft' ? 'En Proceso' : 'No Iniciado'}
                    </td>
                    <td style={{ padding: '0.75rem' }}>{formatCurrency(calculateProjectTotalsDual(p).totalUSD, 'USD')}</td>
                  </tr>
                ))}
                {filteredProjects.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>No hay proyectos en el período</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (activeView === 'quotes') {
    const filteredQuotes = quotes.filter(q => isWithinDateRange(q.date));
    const totalQuotesValue = filteredQuotes.reduce((acc, curr) => acc + calculateProjectTotalsDual(curr).totalUSD, 0);

    return (
      <div className="report-container">
        {renderHeader('Reporte de Cotizaciones', 'Oportunidades de venta en estado de cotización')}
        {renderDateFilters()}
        {renderPrintHeader('Reporte de Cotizaciones')}

        <div className="card" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
            <div style={{ padding: '2rem', backgroundColor: 'var(--surface-hover)', borderRadius: '8px', textAlign: 'center' }}>
              <FileText size={40} color="var(--primary-color)" style={{ marginBottom: '1rem' }} />
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>Cotizaciones en el Período</p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '2.5rem', fontWeight: 'bold' }}>{filteredQuotes.length}</p>
            </div>
            <div style={{ padding: '2rem', backgroundColor: 'var(--surface-hover)', borderRadius: '8px', textAlign: 'center' }}>
              <TrendingUp size={40} color="var(--success-color)" style={{ marginBottom: '1rem' }} />
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>Monto Total Cotizado</p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--success-color)' }}>
                {formatCurrency(totalQuotesValue, 'USD')}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Detalle de Cotizaciones</h3>
          <div className="table-responsive">
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem' }}>Nombre</th>
                  <th style={{ padding: '0.75rem' }}>Cliente</th>
                  <th style={{ padding: '0.75rem' }}>Fecha</th>
                  <th style={{ padding: '0.75rem' }}>Total Cotizado</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuotes.map(q => (
                  <tr key={q.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.75rem' }}>{q.projectName}</td>
                    <td style={{ padding: '0.75rem' }}>{q.clientName}</td>
                    <td style={{ padding: '0.75rem' }}>{q.date}</td>
                    <td style={{ padding: '0.75rem' }}>{formatCurrency(calculateProjectTotalsDual(q).totalUSD, 'USD')}</td>
                  </tr>
                ))}
                {filteredQuotes.length === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>No hay cotizaciones en el período</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (activeView === 'inventory') {
    // El inventario suele ser global (estado actual de la bodega). Omitimos el filtro de fechas o lo dejamos sólo estético.
    const totalInventoryItems = inventory.length;
    const totalInventoryValue = inventory.reduce((acc: number, curr: any) => acc + (curr.unitCost * curr.stockQuantity), 0);
    const lowStockItems = inventory.filter((i: any) => i.stockQuantity <= 5).length;

    return (
      <div className="report-container">
        {renderHeader('Reporte de Inventario', 'Estado de valorización de la bodega (Actual)')}
        {renderPrintHeader('Reporte de Inventario (Estado Actual)')}

        <div className="card" style={{ marginBottom: '2rem' }}>
          <p style={{ color: 'var(--warning-color)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
            * El inventario muestra la fotografía del momento actual, los filtros de fecha no aplican a las existencias.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            <div style={{ padding: '1.5rem', backgroundColor: 'var(--surface-hover)', borderRadius: '8px', borderLeft: '4px solid var(--primary-color)' }}>
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>Productos Únicos</p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 'bold' }}>{totalInventoryItems}</p>
            </div>
            <div style={{ padding: '1.5rem', backgroundColor: 'var(--surface-hover)', borderRadius: '8px', borderLeft: '4px solid var(--success-color)' }}>
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>Capital en Bodega</p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 'bold', color: 'var(--success-color)' }}>
                {formatCurrency(totalInventoryValue, 'USD')}
              </p>
            </div>
            <div style={{ padding: '1.5rem', backgroundColor: 'var(--surface-hover)', borderRadius: '8px', borderLeft: '4px solid var(--danger-color)' }}>
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>Productos Bajo Stock</p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 'bold', color: lowStockItems > 0 ? 'var(--danger-color)' : 'var(--text-main)' }}>
                {lowStockItems}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Detalle de Bodega</h3>
          <div className="table-responsive">
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem' }}>Item</th>
                  <th style={{ padding: '0.75rem' }}>Categoría</th>
                  <th style={{ padding: '0.75rem' }}>Costo Unit.</th>
                  <th style={{ padding: '0.75rem' }}>Stock Actual</th>
                  <th style={{ padding: '0.75rem' }}>Valor Total</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((i: any) => (
                  <tr key={i.id} style={{ borderBottom: '1px solid var(--border-color)', color: i.stockQuantity <= 5 ? 'var(--danger-color)' : 'inherit' }}>
                    <td style={{ padding: '0.75rem' }}>{i.name} {i.stockQuantity <= 5 && '⚠️'}</td>
                    <td style={{ padding: '0.75rem' }}>{i.category === 'materials' ? 'Material' : 'Equipo'}</td>
                    <td style={{ padding: '0.75rem' }}>{formatCurrency(i.unitCost, 'USD')}</td>
                    <td style={{ padding: '0.75rem' }}>{i.stockQuantity}</td>
                    <td style={{ padding: '0.75rem' }}>{formatCurrency(i.unitCost * i.stockQuantity, 'USD')}</td>
                  </tr>
                ))}
                {inventory.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>El inventario está vacío</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (activeView === 'financial') {
    const filteredProjects = projects.filter(p => isWithinDateRange(p.date) && p.status === 'completed');
    
    const completedProjectsRevenue = filteredProjects.reduce((acc, curr) => acc + calculateProjectRealRevenueDual(curr).totalUSD, 0);
    const completedProjectsTotalBilled = filteredProjects.reduce((acc, curr) => acc + calculateProjectTotalsDual(curr).totalUSD, 0);
    const completedProjectsCosts = completedProjectsTotalBilled - completedProjectsRevenue;

    return (
      <div className="report-container">
        {renderHeader('Reporte Financiero', 'Ingresos y costos de proyectos completados')}
        {renderDateFilters()}
        {renderPrintHeader('Reporte Financiero General')}

        <div className="card" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            <div style={{ padding: '2rem', backgroundColor: 'rgba(16, 185, 129, 0.05)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>Ingresos Generados (Facturado)</p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 'bold', color: 'var(--success-color)' }}>
                {formatCurrency(completedProjectsTotalBilled, 'USD')}
              </p>
            </div>
            <div style={{ padding: '2rem', backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>Costos Operativos (Proyectos)</p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 'bold', color: 'var(--danger-color)' }}>
                {formatCurrency(completedProjectsCosts, 'USD')}
              </p>
            </div>
            <div style={{ padding: '2rem', backgroundColor: 'rgba(99, 102, 241, 0.05)', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>Ganancia Neta Obtenida</p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                {formatCurrency(completedProjectsRevenue, 'USD')}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Desglose de Proyectos Completados</h3>
          <div className="table-responsive">
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem' }}>Proyecto</th>
                  <th style={{ padding: '0.75rem' }}>Fecha</th>
                  <th style={{ padding: '0.75rem' }}>Ingreso Facturado</th>
                  <th style={{ padding: '0.75rem' }}>Costo Operativo</th>
                  <th style={{ padding: '0.75rem' }}>Ganancia Neta</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map(p => {
                  const rev = calculateProjectRealRevenueDual(p).totalUSD;
                  const billed = calculateProjectTotalsDual(p).totalUSD;
                  const cost = billed - rev;
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.75rem' }}>{p.projectName}</td>
                      <td style={{ padding: '0.75rem' }}>{p.date}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--success-color)' }}>{formatCurrency(billed, 'USD')}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--danger-color)' }}>{formatCurrency(cost, 'USD')}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--primary-color)', fontWeight: 'bold' }}>{formatCurrency(rev, 'USD')}</td>
                    </tr>
                  );
                })}
                {filteredProjects.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>No hay datos financieros en este período</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (activeView === 'users') {
    const filteredProjects = projects.filter(p => isWithinDateRange(p.date) && p.status === 'completed');
    
    const userStats = users.map(user => {
      let profitUSD = 0;
      let profitNIO = 0;
      let advancesUSD = 0;
      let advancesNIO = 0;

      filteredProjects.forEach(project => {
        const exchangeRate = project.exchangeRate || 36.62;
        
        // 1. Calcular Ganancia del Proyecto
        if (project.profitUsers && project.profitUsers.includes(user.id)) {
          const rev = calculateProjectRealRevenueDual(project);
          const shareUSD = rev.totalUSD / project.profitUsers.length;
          const shareNIO = rev.totalNIO / project.profitUsers.length;
          profitUSD += shareUSD;
          profitNIO += shareNIO;
        }

        // 2. Calcular Adelantos en este Proyecto
        if (project.advances) {
          project.advances.forEach(adv => {
            if (adv.userId === user.id) {
              if (adv.currency === 'NIO') {
                advancesNIO += adv.amount;
                advancesUSD += adv.amount / exchangeRate;
              } else {
                advancesUSD += adv.amount;
                advancesNIO += adv.amount * exchangeRate;
              }
            }
          });
        }
      });

      return {
        ...user,
        profitUSD,
        profitNIO,
        advancesUSD,
        advancesNIO,
        balanceUSD: profitUSD - advancesUSD,
        balanceNIO: profitNIO - advancesNIO
      };
    });

    const finalUserStats = selectedReportUser 
      ? userStats.filter(u => u.id === selectedReportUser)
      : userStats.filter(u => u.profitUSD > 0 || u.advancesUSD > 0);

    const displayTotalProfits = finalUserStats.reduce((acc, u) => acc + u.profitUSD, 0);
    const displayTotalAdvances = finalUserStats.reduce((acc, u) => acc + u.advancesUSD, 0);
    const displayTotalBalance = displayTotalProfits - displayTotalAdvances;

    const selectedUserName = selectedReportUser ? users.find(u => u.id === selectedReportUser)?.name : undefined;

    return (
      <div className="report-container">
        {renderHeader('Reporte de Ganancias por Usuario', 'Balance de rendimientos netos y adelantos (Solo proyectos completados)')}
        {renderDateFilters()}
        
        {/* Filtro de Usuario Adicional */}
        <div className="no-print" style={{ display: 'flex', gap: '1rem', alignItems: 'center', backgroundColor: 'var(--surface-color)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={18} color="var(--text-muted)" />
            <span style={{ fontWeight: 500 }}>Filtrar por Trabajador:</span>
          </div>
          <select 
            value={selectedReportUser} 
            onChange={(e) => setSelectedReportUser(e.target.value)} 
            className="form-control" 
            style={{ width: 'auto', padding: '0.4rem', minWidth: '200px' }}
          >
            <option value="">Todos los Trabajadores</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>

        {renderPrintHeader('Reporte de Ganancias', selectedUserName ? `Trabajador: ${selectedUserName}` : 'Todos los Trabajadores')}

        <div className="card" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            <div style={{ padding: '2rem', backgroundColor: 'rgba(99, 102, 241, 0.05)', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>{selectedReportUser ? 'Ganancia Total Generada' : 'Fondo Total a Repartir'}</p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                {formatCurrency(displayTotalProfits, 'USD')}
              </p>
            </div>
            <div style={{ padding: '2rem', backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>Adelantos Entregados</p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 'bold', color: 'var(--danger-color)' }}>
                {formatCurrency(displayTotalAdvances, 'USD')}
              </p>
            </div>
            <div style={{ padding: '2rem', backgroundColor: 'rgba(16, 185, 129, 0.05)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>Saldo Pendiente de Pago</p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 'bold', color: 'var(--success-color)' }}>
                {formatCurrency(displayTotalBalance, 'USD')}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Desglose por Trabajador</h3>
          <div className="table-responsive">
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem' }}>Usuario</th>
                  <th style={{ padding: '0.75rem' }}>Ganancia Neta</th>
                  <th style={{ padding: '0.75rem' }}>Adelantos</th>
                  <th style={{ padding: '0.75rem' }}>Balance (A Pagar)</th>
                </tr>
              </thead>
              <tbody>
                {finalUserStats.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{u.name} <span style={{color: 'var(--text-muted)', fontWeight: 'normal', fontSize: '0.875rem'}}>({u.username})</span></td>
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{ color: 'var(--primary-color)' }}>{formatCurrency(u.profitUSD, 'USD')}</div>
                      <div style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>{formatCurrency(u.profitNIO, 'NIO')}</div>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{ color: 'var(--danger-color)' }}>{formatCurrency(u.advancesUSD, 'USD')}</div>
                      <div style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>{formatCurrency(u.advancesNIO, 'NIO')}</div>
                    </td>
                    <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>
                      <div style={{ color: u.balanceUSD >= 0 ? 'var(--success-color)' : 'var(--danger-color)' }}>
                        {formatCurrency(u.balanceUSD, 'USD')}
                      </div>
                      <div style={{ fontSize: '0.85em', color: 'var(--text-muted)', fontWeight: 'normal' }}>
                        {formatCurrency(u.balanceNIO, 'NIO')}
                      </div>
                    </td>
                  </tr>
                ))}
                {finalUserStats.length === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>No hay ganancias ni adelantos registrados en este período</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // --- MENU PRINCIPAL ---

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2>Módulo de Reportes</h2>
        <p style={{ color: 'var(--text-muted)' }}>Selecciona el reporte que deseas generar. Podrás filtrar por fechas y exportar a PDF en la siguiente pantalla.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
        
        <button 
          className="card menu-card" 
          onClick={() => setActiveView('projects')}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1rem', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', border: '1px solid var(--border-color)', background: 'var(--surface-color)' }}
          onMouseOver={e => e.currentTarget.style.transform = 'translateY(-4px)'}
          onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{ padding: '1.5rem', backgroundColor: 'rgba(99, 102, 241, 0.1)', borderRadius: '50%', color: 'var(--primary-color)' }}>
            <FolderKanban size={40} />
          </div>
          <div>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>Reporte de Proyectos</h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>Estadísticas de proyectos completados, en proceso y pendientes.</p>
          </div>
        </button>

        <button 
          className="card menu-card" 
          onClick={() => setActiveView('quotes')}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1rem', cursor: 'pointer', transition: 'transform 0.2s', border: '1px solid var(--border-color)', background: 'var(--surface-color)' }}
          onMouseOver={e => e.currentTarget.style.transform = 'translateY(-4px)'}
          onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{ padding: '1.5rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%', color: 'var(--success-color)' }}>
            <FileText size={40} />
          </div>
          <div>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>Reporte de Cotizaciones</h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>Resumen de prospectos, cantidad de cotizaciones y valor monetario total.</p>
          </div>
        </button>

        <button 
          className="card menu-card" 
          onClick={() => setActiveView('inventory')}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1rem', cursor: 'pointer', transition: 'transform 0.2s', border: '1px solid var(--border-color)', background: 'var(--surface-color)' }}
          onMouseOver={e => e.currentTarget.style.transform = 'translateY(-4px)'}
          onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{ padding: '1.5rem', backgroundColor: 'rgba(234, 179, 8, 0.1)', borderRadius: '50%', color: 'var(--warning-color)' }}>
            <PackageSearch size={40} />
          </div>
          <div>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>Reporte de Inventario</h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>Valorización total de la bodega actual y alertas de artículos con bajo stock.</p>
          </div>
        </button>

        <button 
          className="card menu-card" 
          onClick={() => setActiveView('financial')}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1rem', cursor: 'pointer', transition: 'transform 0.2s', border: '1px solid var(--border-color)', background: 'var(--surface-color)' }}
          onMouseOver={e => e.currentTarget.style.transform = 'translateY(-4px)'}
          onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{ padding: '1.5rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%', color: 'var(--danger-color)' }}>
            <TrendingUp size={40} />
          </div>
          <div>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>Reporte Financiero</h3>
          </div>
        </button>

        <button 
          className="card menu-card" 
          onClick={() => setActiveView('users')}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1rem', cursor: 'pointer', transition: 'transform 0.2s', border: '1px solid var(--border-color)', background: 'var(--surface-color)' }}
          onMouseOver={e => e.currentTarget.style.transform = 'translateY(-4px)'}
          onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{ padding: '1.5rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '50%', color: '#3b82f6' }}>
            <Users size={40} />
          </div>
          <div>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>Reporte por Usuario</h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>Balance de ganancias y adelantos por trabajador.</p>
          </div>
        </button>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .menu-card:hover {
          box-shadow: var(--shadow-md) !important;
          border-color: var(--primary-color) !important;
        }
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-header {
            display: block !important;
          }
          .card {
            box-shadow: none !important;
            border: 1px solid #ddd !important;
            break-inside: avoid;
            background-color: white !important;
          }
          .layout-container {
            display: block !important;
          }
          .sidebar {
            display: none !important;
          }
          .main-content {
            margin-left: 0 !important;
            padding: 0 !important;
          }
          .content-wrapper {
            padding: 0 !important;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          th {
            background-color: #f3f4f6 !important;
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
        }
      `}} />
    </div>
  );
};

export default Reports;
