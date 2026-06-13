import React, { useEffect, useState } from 'react';

import { ArrowLeft, Printer, Building2, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useProjects } from '../hooks/useProjects';
import { useQuotes } from '../hooks/useQuotes';
import type { Project } from '../types';
import { useSettings } from '../hooks/useSettings';
import { formatCurrency, calculateItemTotal, calculateProjectTotalsDual, calculateItemsTotalsDual } from '../utils';

const InvoiceView: React.FC = () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const type = params.get('type') || 'detallada';
  const isSummary = type === 'resumida';
  
  const { projects, loading: projectsLoading } = useProjects();
  const { quotes, loading: quotesLoading } = useQuotes();
  
  const loading = projectsLoading || quotesLoading;
  const [project, setProject] = useState<Project | null>(null);

  const isQuote = project?.status === 'quote';

  const { settings, loading: settingsLoading } = useSettings();
  const { subtitle, docType, footerText } = settings;

  useEffect(() => {
    if (id && !loading) {
      const p = projects.find(p => p.id === id) || quotes.find(q => q.id === id);
      if (p) setProject(p);
    }
  }, [id, projects, quotes, loading]);

  if (loading || settingsLoading) return <div style={{ padding: '2rem' }}>Cargando factura...</div>;
  if (!project) return <div style={{ padding: '2rem' }}>Proyecto no encontrado.</div>;

  const handleDownloadPDF = async () => {
    const input = document.getElementById('invoice-paper');
    if (!input) return;

    // Removemos temporalmente las sombras o estilos que puedan afectar a html2canvas si fuera necesario
    const originalBoxShadow = input.style.boxShadow;
    input.style.boxShadow = 'none';

    try {
      const canvas = await html2canvas(input, {
        scale: 2, // Mayor calidad
        useCORS: true,
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      let finalWidth = pdfWidth;
      let finalHeight = (canvas.height * pdfWidth) / canvas.width;

      if (finalHeight > pageHeight) {
        const ratio = pageHeight / finalHeight;
        finalHeight = pageHeight;
        finalWidth = finalWidth * ratio;
      }

      const marginX = (pdfWidth - finalWidth) / 2;

      pdf.addImage(imgData, 'PNG', marginX, 0, finalWidth, finalHeight);
      pdf.save(`${docType}_${project.status === 'quote' ? 'CTZ-' : 'PRJ-'}${String(project.projectCode || 0).padStart(3, '0')}_${project.clientName || 'Cliente'}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Hubo un error al generar el PDF.');
    } finally {
      input.style.boxShadow = originalBoxShadow;
    }
  };

  const renderInvoiceTable = (items: any[], title: string) => {
    if (items.length === 0) return null;

    const totals = calculateItemsTotalsDual(items, project.exchangeRate);

    return (
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.875rem', letterSpacing: '0.05em' }}>
          {title}
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ color: 'var(--text-muted)', textAlign: 'left' }}>
              <th style={{ padding: '0.5rem 0', width: '50%' }}>Descripción</th>
              <th style={{ padding: '0.5rem 0', textAlign: 'center' }}>Cant.</th>
              <th style={{ padding: '0.5rem 0', textAlign: 'right' }}>P. Unitario</th>
              <th style={{ padding: '0.5rem 0', textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              // Si es un equipo, el precio unitario de venta incluye la ganancia.
              const sellPrice = item.profitMargin ? item.unitCost * (1 + item.profitMargin / 100) : item.unitCost;
              return (
                <tr key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '0.75rem 0' }}>
                    {item.name}
                    {item.clientProvides && <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', padding: '0.1rem 0.3rem', backgroundColor: '#f1f5f9', border: '1px solid #94a3b8', color: '#64748b', borderRadius: '4px', whiteSpace: 'nowrap' }}>Cliente compra</span>}
                    {item.serialNumber && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>S/N: {item.serialNumber}</div>}
                  </td>
                  <td style={{ padding: '0.75rem 0', textAlign: 'center' }}>{item.quantity}</td>
                  <td style={{ padding: '0.75rem 0', textAlign: 'right' }}>
                    {item.clientProvides ? <span style={{ color: '#94a3b8' }}>-</span> : formatCurrency(sellPrice, item.currency)}
                  </td>
                  <td style={{ padding: '0.75rem 0', textAlign: 'right' }}>
                    {item.clientProvides ? <span style={{ color: '#94a3b8' }}>-</span> : formatCurrency(calculateItemTotal(item), item.currency)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} style={{ textAlign: 'right', padding: '1rem 0', fontWeight: 600, color: 'var(--text-muted)' }}>Subtotal {title}</td>
              <td style={{ textAlign: 'right', padding: '1rem 0', fontWeight: 600 }}>
                <span style={{ display: 'block' }}>{formatCurrency(totals.totalNIO, 'NIO')}</span>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatCurrency(totals.totalUSD, 'USD')}</span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  const renderExpensesTable = (expenses: any[]) => {
    if (!expenses || expenses.length === 0) return null;

    const simulatedItems = expenses.map(p => ({ quantity: 1, unitCost: p.amount, currency: p.currency }));
    const totals = calculateItemsTotalsDual(simulatedItems, project.exchangeRate);

    return (
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.875rem', letterSpacing: '0.05em' }}>
          Gastos Operativos
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ color: 'var(--text-muted)', textAlign: 'left' }}>
              <th style={{ padding: '0.5rem 0', width: '20%' }}>Categoría</th>
              <th style={{ padding: '0.5rem 0', width: '60%' }}>Descripción</th>
              <th style={{ padding: '0.5rem 0', textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((exp, index) => (
              <tr key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '0.75rem 0' }}>{exp.category}</td>
                <td style={{ padding: '0.75rem 0' }}>{exp.description}</td>
                <td style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: 600 }}>
                  {formatCurrency(exp.amount, exp.currency)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} style={{ textAlign: 'right', padding: '1rem 0', fontWeight: 600, color: 'var(--text-muted)' }}>Subtotal Gastos Operativos</td>
              <td style={{ textAlign: 'right', padding: '1rem 0', fontWeight: 600 }}>
                <span style={{ display: 'block' }}>{formatCurrency(totals.totalNIO, 'NIO')}</span>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatCurrency(totals.totalUSD, 'USD')}</span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  const renderPaymentsTable = (payments: any[]) => {
    if (!payments || payments.length === 0) return null;

    const simulatedItems = payments.map(p => ({ quantity: 1, unitCost: p.amount, currency: p.currency }));
    const totals = calculateItemsTotalsDual(simulatedItems, project.exchangeRate);

    return (
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.875rem', letterSpacing: '0.05em' }}>
          Pagos y Adelantos
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ color: 'var(--text-muted)', textAlign: 'left' }}>
              <th style={{ padding: '0.5rem 0', width: '20%' }}>Fecha</th>
              <th style={{ padding: '0.5rem 0', width: '60%' }}>Descripción</th>
              <th style={{ padding: '0.5rem 0', textAlign: 'right' }}>Monto</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p, index) => (
              <tr key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '0.75rem 0' }}>{p.date}</td>
                <td style={{ padding: '0.75rem 0' }}>{p.description}</td>
                <td style={{ padding: '0.75rem 0', textAlign: 'right', color: 'var(--success-color)' }}>{formatCurrency(p.amount, p.currency)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} style={{ textAlign: 'right', padding: '1rem 0', fontWeight: 600, color: 'var(--text-muted)' }}>Total Pagado</td>
              <td style={{ textAlign: 'right', padding: '1rem 0', fontWeight: 600, color: 'var(--success-color)' }}>
                <span style={{ display: 'block' }}>{formatCurrency(totals.totalNIO, 'NIO')}</span>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatCurrency(totals.totalUSD, 'USD')}</span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  const renderSummaryTable = () => {
    const materialsTotals = calculateItemsTotalsDual(project.materials, project.exchangeRate);
    const equipmentsTotals = calculateItemsTotalsDual(project.equipments, project.exchangeRate);
    const laborTotals = calculateItemsTotalsDual(project.labor, project.exchangeRate);

    const hasMaterials = project.materials.length > 0;
    const hasEquipments = project.equipments.length > 0;
    const hasLabor = project.labor.length > 0;

    if (!hasMaterials && !hasEquipments && !hasLabor) return null;

    const totalUSD = materialsTotals.totalUSD + equipmentsTotals.totalUSD + laborTotals.totalUSD;
    const totalNIO = materialsTotals.totalNIO + equipmentsTotals.totalNIO + laborTotals.totalNIO;

    return (
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.875rem', letterSpacing: '0.05em' }}>
          Resumen de Costos
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ color: 'var(--text-muted)', textAlign: 'left' }}>
              <th style={{ padding: '0.5rem 0', width: '70%' }}>Concepto</th>
              <th style={{ padding: '0.5rem 0', textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {hasMaterials && (
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '0.75rem 0' }}>Materiales ferreteros</td>
                <td style={{ padding: '0.75rem 0', textAlign: 'right' }}>{formatCurrency(materialsTotals.totalUSD, 'USD')}</td>
              </tr>
            )}
            {hasEquipments && (
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '0.75rem 0' }}>Equipos</td>
                <td style={{ padding: '0.75rem 0', textAlign: 'right' }}>{formatCurrency(equipmentsTotals.totalUSD, 'USD')}</td>
              </tr>
            )}
            {hasLabor && (
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '0.75rem 0' }}>Mano de obra</td>
                <td style={{ padding: '0.75rem 0', textAlign: 'right' }}>{formatCurrency(laborTotals.totalUSD, 'USD')}</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td style={{ textAlign: 'right', padding: '1rem 0', fontWeight: 600, color: 'var(--text-muted)' }}>Subtotal</td>
              <td style={{ textAlign: 'right', padding: '1rem 0', fontWeight: 600 }}>
                <span style={{ display: 'block' }}>{formatCurrency(totalNIO, 'NIO')}</span>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatCurrency(totalUSD, 'USD')}</span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  return (
    <div className="invoice-container">
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <a href={`/views/proyecto-detalle.html?id=${project.id}${isQuote ? '&type=quote' : ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
          <ArrowLeft size={20} />
          {isQuote ? 'Volver a la Cotización' : 'Volver al Proyecto'}
        </a>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn-secondary" onClick={() => window.print()}>
            <Printer size={20} />
            Imprimir
          </button>
          <button className="btn-primary" onClick={handleDownloadPDF}>
            <Download size={20} />
            Descargar PDF
          </button>
        </div>
      </div>

      <div id="invoice-paper" className="card invoice-paper" style={{ backgroundColor: 'white', color: 'black', padding: '2rem 2.5rem' }}>
        {/* Header de Factura */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #e2e8f0', paddingBottom: '2rem', marginBottom: '2rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1rem' }}>
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" style={{ width: 'auto', height: '80px', maxWidth: '200px', objectFit: 'contain' }} />
              ) : (
                <Building2 size={40} style={{ color: '#0f1117' }} />
              )}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', letterSpacing: '-0.5px' }}>
                  <span style={{ 
                    fontWeight: 900, 
                    background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--success-color) 100%)', 
                    WebkitBackgroundClip: 'text', 
                    WebkitTextFillColor: 'transparent',
                    display: 'inline-block',
                    fontSize: '1.75rem',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact'
                  }}>C&C</span>
                  <span style={{ 
                    fontWeight: 300, 
                    letterSpacing: '1px',
                    color: '#0f1117',
                    marginLeft: '8px',
                    fontSize: '1.25rem'
                  }}>System</span>
                </div>
                <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>{subtitle}</p>
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right', width: '300px' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f1117', textTransform: 'uppercase' }}>{docType}</h2>
            <p style={{ color: '#64748b', marginTop: '0.5rem' }}><strong>Ref:</strong> {project.status === 'quote' ? 'CTZ-' : 'PRJ-'}{String(project.projectCode || 0).padStart(3, '0')}</p>
            <p style={{ color: '#64748b' }}><strong>Fecha:</strong> {new Date(project.date).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Info del Cliente */}
        <div style={{ marginBottom: '3rem' }}>
          <h3 style={{ color: '#64748b', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Facturar A:</h3>
          <p style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0f1117' }}>{project.clientName || 'Cliente no especificado'}</p>
          <p style={{ color: '#475569', marginTop: '0.25rem' }}>Proyecto: {project.projectName}</p>
        </div>

        {/* Tablas de Items */}
        <div style={{ minHeight: '300px' }}>
          {isSummary ? renderSummaryTable() : (
            <>
              {renderInvoiceTable(project.materials, 'Materiales')}
              {renderInvoiceTable(project.equipments, 'Equipos')}
              {renderInvoiceTable(project.labor, 'Mano de Obra')}
              {renderExpensesTable(project.expenses || [])}
            </>
          )}
          {renderPaymentsTable(project.payments || [])}
        </div>

        {/* Total Final */}
        <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '2px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#64748b' }}>
              <span>Tasa de Cambio</span>
              <span>C$ {project.exchangeRate || 36.62} / USD</span>
            </div>
            
            {(() => {
              const totalCost = calculateProjectTotalsDual(project);
              const simulatedItems = (project.payments || []).map(p => ({ quantity: 1, unitCost: p.amount, currency: p.currency }));
              const totalPaid = calculateItemsTotalsDual(simulatedItems, project.exchangeRate);
              const balanceUSD = totalCost.totalUSD - totalPaid.totalUSD;
              const balanceNIO = totalCost.totalNIO - totalPaid.totalNIO;

              if (project.payments && project.payments.length > 0) {
                return (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #cbd5e1' }}>
                      <span style={{ fontSize: '1rem', fontWeight: 600, color: '#64748b' }}>Costo Total (NIO)</span>
                      <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f1117' }}>{formatCurrency(totalCost.totalNIO, 'NIO')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                      <span style={{ fontSize: '1rem', fontWeight: 600, color: '#64748b' }}>Costo Total (USD)</span>
                      <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f1117' }}>{formatCurrency(totalCost.totalUSD, 'USD')}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', color: '#16a34a' }}>
                      <span style={{ fontSize: '1rem', fontWeight: 600 }}>Total Pagado (USD)</span>
                      <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>{formatCurrency(totalPaid.totalUSD, 'USD')}</span>
                    </div>

                    {balanceUSD < 0 ? (
                      <>
                        <></>
                      </>
                    ) : (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '2px solid #0f1117' }}>
                          <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#dc2626' }}>SALDO (NIO)</span>
                          <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#dc2626' }}>{formatCurrency(balanceNIO, 'NIO')}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                          <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#dc2626' }}>SALDO (USD)</span>
                          <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#dc2626' }}>{formatCurrency(balanceUSD, 'USD')}</span>
                        </div>
                      </>
                    )}
                  </>
                );
              }

              return (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #cbd5e1' }}>
                    <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f1117' }}>TOTAL (NIO)</span>
                    <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f1117' }}>{formatCurrency(totalCost.totalNIO, 'NIO')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                    <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f1117' }}>TOTAL (USD)</span>
                    <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f1117' }}>{formatCurrency(totalCost.totalUSD, 'USD')}</span>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
        
        {/* Client Purchases Note */}
        {(project.materials.some(i => i.clientProvides) || project.equipments.some(i => i.clientProvides) || project.labor.some(i => i.clientProvides)) && (
          <div style={{ marginTop: '3rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', borderLeft: '4px solid #64748b' }}>
            <p style={{ color: '#475569', fontSize: '0.875rem', margin: 0 }}>
              <strong>Nota importante:</strong> Ciertos materiales o equipos han sido marcados para que el cliente los adquiera por su cuenta. Estos ítems no se incluyen en el costo total de este documento y su compra será asumida directamente por el cliente.
            </p>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: '4rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
          <p>{footerText}</p>
        </div>
      </div>
    </div>
  );
};

export default InvoiceView;
