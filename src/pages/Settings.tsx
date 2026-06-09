import React, { useState, useEffect, useRef } from 'react';
import { Save, Settings as SettingsIcon, Building2, Database, Download, Upload, AlertTriangle } from 'lucide-react';

const Settings: React.FC = () => {
  const [companyName, setCompanyName] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [docType, setDocType] = useState('');
  const [footerText, setFooterText] = useState('');
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'empresa' | 'basedatos'>('empresa');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState('');

  useEffect(() => {
    setCompanyName(localStorage.getItem('inv_companyName') || 'Mi Empresa IT');
    setSubtitle(localStorage.getItem('inv_subtitle') || 'Reporte de Servicios y Equipos');
    setDocType(localStorage.getItem('inv_docType') || 'COTIZACIÓN');
    setFooterText(localStorage.getItem('inv_footerText') || 'Gracias por su preferencia. Este documento es válido como cotización o nota de servicio.');
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('inv_companyName', companyName);
    localStorage.setItem('inv_subtitle', subtitle);
    localStorage.setItem('inv_docType', docType);
    localStorage.setItem('inv_footerText', footerText);
    
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleBackup = () => {
    window.location.href = '/api/backup';
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm("¡ATENCIÓN! Restaurar la base de datos reemplazará TODOS los datos actuales de forma irreversible. ¿Estás absolutamente seguro de continuar?")) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsRestoring(true);
    setRestoreError('');

    try {
      const formData = new FormData();
      formData.append('type', 'respaldos');
      formData.append('file', file);

      const response = await fetch('/api/restore', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Error al restaurar');
      }

      alert('Base de datos restaurada con éxito. El sistema se recargará.');
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      setRestoreError(err.message);
      setIsRestoring(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <SettingsIcon size={32} color="var(--primary-color)" />
        <h2>Configuraciones del Sistema</h2>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)' }}>
        <button 
          onClick={() => setActiveTab('empresa')}
          style={{ 
            padding: '1rem 1.5rem', 
            background: 'transparent', 
            border: 'none', 
            borderBottom: activeTab === 'empresa' ? '2px solid var(--primary-color)' : '2px solid transparent',
            color: activeTab === 'empresa' ? 'var(--primary-color)' : 'var(--text-muted)',
            fontWeight: activeTab === 'empresa' ? 600 : 400,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Building2 size={18} />
          Datos de la Empresa
        </button>
        <button 
          onClick={() => setActiveTab('basedatos')}
          style={{ 
            padding: '1rem 1.5rem', 
            background: 'transparent', 
            border: 'none', 
            borderBottom: activeTab === 'basedatos' ? '2px solid var(--primary-color)' : '2px solid transparent',
            color: activeTab === 'basedatos' ? 'var(--primary-color)' : 'var(--text-muted)',
            fontWeight: activeTab === 'basedatos' ? 600 : 400,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Database size={18} />
          Respaldo de Base de Datos
        </button>
      </div>

      {activeTab === 'empresa' ? (
        <div className="card" style={{ maxWidth: '800px' }}>
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 size={20} />
            Datos de la Empresa y Facturación
          </h3>
          
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Nombre de la Empresa</label>
                <input 
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}
                  placeholder="Ej: Mi Empresa IT"
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Tipo de Documento Principal</label>
                <input 
                  value={docType}
                  onChange={e => setDocType(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}
                  placeholder="Ej: COTIZACIÓN, FACTURA, PROFORMA"
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Subtítulo / Eslogan (Aparece debajo del nombre)</label>
              <input 
                value={subtitle}
                onChange={e => setSubtitle(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}
                placeholder="Ej: Reporte de Servicios y Equipos"
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Nota al pie de la Factura</label>
              <textarea 
                value={footerText}
                onChange={e => setFooterText(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', minHeight: '100px', resize: 'vertical' }}
                placeholder="Nota de agradecimiento o validez..."
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
              {saved && <span style={{ color: 'var(--success-color)' }}>¡Configuración guardada!</span>}
              <button type="submit" className="btn-primary">
                <Save size={20} />
                Guardar Cambios
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="card" style={{ maxWidth: '800px' }}>
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Database size={20} />
            Gestión de la Base de Datos
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'var(--bg-color)' }}>
              <h4 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Download size={18} /> Descargar Respaldo (Backup)
              </h4>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                Genera un archivo .sqlite con toda la información actual del sistema. Es recomendable hacer esto de manera periódica.
              </p>
              <button onClick={handleBackup} className="btn-primary" style={{ backgroundColor: 'var(--success-color)' }}>
                <Download size={18} />
                Descargar Base de Datos
              </button>
            </div>

            <div style={{ padding: '1.5rem', border: '1px solid var(--danger-color)', borderRadius: '8px', backgroundColor: 'rgba(220, 38, 38, 0.05)' }}>
              <h4 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger-color)' }}>
                <AlertTriangle size={18} /> Restaurar Sistema (Restore)
              </h4>
              <p style={{ color: 'var(--danger-color)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                <strong>CUIDADO:</strong> Al subir un archivo de respaldo previo, toda la información actual será eliminada y reemplazada irreversiblemente por la información del respaldo.
              </p>
              
              {restoreError && (
                <div style={{ padding: '1rem', backgroundColor: 'rgba(220,38,38,0.1)', color: 'var(--danger-color)', borderRadius: '6px', marginBottom: '1rem' }}>
                  {restoreError}
                </div>
              )}

              <input 
                type="file" 
                accept=".sqlite" 
                ref={fileInputRef} 
                onChange={handleRestore} 
                style={{ display: 'none' }} 
              />
              <button 
                onClick={() => fileInputRef.current?.click()} 
                className="btn-primary" 
                style={{ backgroundColor: 'var(--danger-color)' }}
                disabled={isRestoring}
              >
                <Upload size={18} />
                {isRestoring ? 'Restaurando...' : 'Subir y Restaurar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
