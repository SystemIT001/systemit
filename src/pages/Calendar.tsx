import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { useVisits } from '../hooks/useVisits';
import { useClients } from '../hooks/useClients';
import { useProjects } from '../hooks/useProjects';
import type { Visit } from '../types';

export default function Calendar() {
  const { visits, saveVisit, deleteVisit } = useVisits();
  const { clients } = useClients();
  const { projects } = useProjects();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDateStr, setSelectedDateStr] = useState<string>('');
  const [selectedTimeStr, setSelectedTimeStr] = useState<string>('09:00');
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);

  const [formData, setFormData] = useState<Partial<Visit>>({
    title: '',
    clientId: '',
    projectId: '',
    description: '',
    status: 'pending',
    technician: ''
  });

  // Calendar logic
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const today = () => setCurrentDate(new Date());

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  const getVisitsForDate = (day: number) => {
    const targetDateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return visits.filter(v => v.date.startsWith(targetDateStr));
  };

  const handleDayClick = (day: number) => {
    const targetDateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDateStr(targetDateStr);
    setSelectedTimeStr('09:00');
    setEditingVisit(null);
    setFormData({
      title: '',
      clientId: '',
      projectId: '',
      description: '',
      status: 'pending',
      technician: ''
    });
    setIsModalOpen(true);
  };

  const handleVisitClick = (e: React.MouseEvent, visit: Visit) => {
    e.stopPropagation();
    setEditingVisit(visit);
    
    // visit.date format is YYYY-MM-DDTHH:MM
    const [d, t] = visit.date.split('T');
    setSelectedDateStr(d || '');
    setSelectedTimeStr(t || '09:00');

    setFormData({
      title: visit.title,
      clientId: visit.clientId || '',
      projectId: visit.projectId || '',
      description: visit.description || '',
      status: visit.status,
      technician: visit.technician || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDateStr || !selectedTimeStr) return;

    // selectedDateStr: YYYY-MM-DD
    // selectedTimeStr: HH:MM
    const dateStr = `${selectedDateStr}T${selectedTimeStr}`;
    
    // Calculate end time (assume 1 hour later)
    const [h, m] = selectedTimeStr.split(':').map(Number);
    const endH = String((h + 1) % 24).padStart(2, '0');
    const endDateStr = `${selectedDateStr}T${endH}:${String(m).padStart(2, '0')}`;

    const newVisit: Visit = {
      id: editingVisit ? editingVisit.id : crypto.randomUUID(),
      title: formData.title || 'Visita',
      clientId: formData.clientId,
      projectId: formData.projectId,
      date: dateStr,
      endDate: endDateStr,
      description: formData.description || '',
      status: formData.status as 'pending' | 'completed' | 'cancelled',
      technician: formData.technician
    };

    await saveVisit(newVisit);
    setIsModalOpen(false);
  };

  const handleDelete = async () => {
    if (editingVisit && confirm('¿Estás seguro de eliminar esta visita?')) {
      await deleteVisit(editingVisit.id);
      setIsModalOpen(false);
    }
  };

  const isToday = (day: number) => {
    const todayDate = new Date();
    return day === todayDate.getDate() && currentDate.getMonth() === todayDate.getMonth() && currentDate.getFullYear() === todayDate.getFullYear();
  };

  const formatTimeAMPM = (dateString: string) => {
    if (!dateString) return '';
    const timePart = dateString.split('T')[1];
    if (!timePart) return '';
    const [hours, minutes] = timePart.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${String(h12).padStart(2, '0')}:${minutes} ${ampm}`;
  };

  const formatFriendlyDate = (dateString: string) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    // Adjusting for timezone offset to show correct local day
    const localDate = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
    return localDate.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const upcomingVisits = visits
    .filter(v => new Date(v.date).getTime() >= new Date().setHours(0, 0, 0, 0))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="calendar-container" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <CalendarIcon size={32} style={{ color: 'var(--primary-color)' }} />
          Agenda de Visitas
        </h1>
        <button className="btn-primary" onClick={() => handleDayClick(new Date().getDate())}>
          <Plus size={20} />
          Nueva Visita
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'flex-start' }}>
        {/* Main Calendar Area */}
        <div className="card" style={{ flex: '1 1 600px', padding: '1.5rem', backgroundColor: 'var(--card-bg)' }}>
        {/* Calendar Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-secondary" onClick={today} style={{ padding: '0.5rem 1rem' }}>Hoy</button>
            <div style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
              <button onClick={prevMonth} style={{ padding: '0.5rem', background: 'transparent', border: 'none', borderRight: '1px solid var(--border-color)', color: 'var(--text-main)', cursor: 'pointer' }}><ChevronLeft size={20} /></button>
              <button onClick={nextMonth} style={{ padding: '0.5rem', background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}><ChevronRight size={20} /></button>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', backgroundColor: 'var(--border-color)', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
          {/* Days of week */}
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
            <div key={day} style={{ padding: '1rem 0.5rem', textAlign: 'center', fontWeight: 600, backgroundColor: 'var(--bg-main)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              {day}
            </div>
          ))}

          {/* Empty cells for first day */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} style={{ backgroundColor: 'var(--bg-main)', minHeight: '120px' }}></div>
          ))}

          {/* Days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayVisits = getVisitsForDate(day);
            return (
              <div 
                key={day} 
                onClick={() => handleDayClick(day)}
                style={{ 
                  backgroundColor: 'var(--card-bg)', 
                  minHeight: '120px', 
                  padding: '0.5rem',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  position: 'relative'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-main)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--card-bg)'}
              >
                <div style={{ 
                  width: '28px', 
                  height: '28px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  borderRadius: '50%',
                  backgroundColor: isToday(day) ? 'var(--primary-color)' : 'transparent',
                  color: isToday(day) ? 'white' : 'var(--text-main)',
                  fontWeight: isToday(day) ? 'bold' : 'normal',
                  marginBottom: '0.5rem'
                }}>
                  {day}
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {dayVisits.map(visit => (
                    <div 
                      key={visit.id}
                      onClick={(e) => handleVisitClick(e, visit)}
                      style={{
                        padding: '4px 6px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        backgroundColor: visit.status === 'completed' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                        color: visit.status === 'completed' ? '#16a34a' : '#2563eb',
                        borderLeft: `3px solid ${visit.status === 'completed' ? '#16a34a' : '#2563eb'}`
                      }}
                      title={visit.title}
                    >
                      {formatTimeAMPM(visit.date)} {visit.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        </div>

        {/* Sidebar: Upcoming Visits */}
        <div className="card" style={{ flex: '1 1 300px', minWidth: '300px', padding: '1.5rem', backgroundColor: 'var(--card-bg)', display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '800px', overflowY: 'auto' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', margin: 0, borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
            Próximas Visitas
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {upcomingVisits.length > 0 ? (
              upcomingVisits.map(visit => (
                <div 
                  key={visit.id} 
                  onClick={(e) => handleVisitClick(e, visit)}
                  style={{ 
                    padding: '1rem', 
                    borderRadius: '8px', 
                    borderLeft: `4px solid ${visit.status === 'completed' ? '#16a34a' : '#2563eb'}`, 
                    backgroundColor: 'var(--bg-main)',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--bg-main)'}
                >
                  <div style={{ fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '0.25rem' }}>{visit.title}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    {formatFriendlyDate(visit.date)} • {formatTimeAMPM(visit.date)}
                  </div>
                  {visit.description && (
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {visit.description}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '2rem 0' }}>
                No hay visitas programadas.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>{editingVisit ? 'Editar Visita' : 'Nueva Visita'}</h2>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="form-label">Título de la Visita</label>
                <input 
                  type="text" 
                  className="form-control" 
                  required
                  value={formData.title} 
                  onChange={e => setFormData({...formData, title: e.target.value})} 
                  placeholder="Ej. Instalación de Cámaras"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="form-label">Fecha</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    required
                    value={selectedDateStr}
                    onChange={e => setSelectedDateStr(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Hora</label>
                  <input 
                    type="time" 
                    className="form-control" 
                    required
                    value={selectedTimeStr}
                    onChange={e => setSelectedTimeStr(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Estado</label>
                <select 
                  className="form-control"
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value as any})}
                >
                  <option value="pending">Pendiente</option>
                  <option value="completed">Completado</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>

              <div>
                <label className="form-label">Cliente Asociado (Opcional)</label>
                <select 
                  className="form-control"
                  value={formData.clientId}
                  onChange={e => setFormData({...formData, clientId: e.target.value})}
                >
                  <option value="">-- Sin Cliente --</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Proyecto Asociado (Opcional)</label>
                <select 
                  className="form-control"
                  value={formData.projectId}
                  onChange={e => setFormData({...formData, projectId: e.target.value})}
                >
                  <option value="">-- Sin Proyecto --</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.projectName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Descripción</label>
                <textarea 
                  className="form-control" 
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Detalles sobre lo que se hará en la visita..."
                ></textarea>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
                {editingVisit ? (
                  <button type="button" className="btn-secondary" style={{ color: '#ef4444', borderColor: '#ef4444' }} onClick={handleDelete}>
                    Eliminar
                  </button>
                ) : <div></div>}
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn-primary">
                    Guardar
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
