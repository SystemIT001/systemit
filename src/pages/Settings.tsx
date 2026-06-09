import React, { useState, useEffect, useRef } from 'react';
import { Save, Settings as SettingsIcon, Building2, Database, Download, Upload, AlertTriangle, Users, Plus, Trash2, Edit2 } from 'lucide-react';
import { useUsers } from '../hooks/useUsers';
import { useAuth } from '../hooks/useAuth';

const Settings: React.FC = () => {
  const [companyName, setCompanyName] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [docType, setDocType] = useState('');
  const [footerText, setFooterText] = useState('');
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'empresa' | 'basedatos' | 'usuarios'>('empresa');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState('');

  // Users module state
  const { users, addUser, updateUser, deleteUser, loading: usersLoading } = useUsers();
  const { user: currentUser } = useAuth();
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userForm, setUserForm] = useState({ id: '', username: '', password: '', name: '', role: 'tecnico' });
  const [userError, setUserError] = useState('');

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
    window.location.href = '/api/backup.php';
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

      const response = await fetch('/api/restore.php', {
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

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError('');
    
    const isNew = !editingUser;
    const userToSave = { ...userForm, id: isNew ? Date.now().toString() : userForm.id };
    
    const res = isNew ? await addUser(userToSave) : await updateUser(userToSave);
    
    if (res.success) {
      setShowUserForm(false);
      setEditingUser(null);
    } else {
      setUserError(res.error || 'Error al guardar el usuario');
    }
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setUserForm({ id: user.id, username: user.username, password: user.password, name: user.name, role: user.role });
    setShowUserForm(true);
    setUserError('');
  };

  const handleDeleteUser = async (id: string) => {
    if (id === currentUser?.id) {
      alert('No puedes eliminar tu propio usuario mientras estás en sesión.');
      return;
    }
    if (window.confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
      const res = await deleteUser(id);
      if (!res.success) {
        alert(res.error || 'Error al eliminar');
      }
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
        <button 
          onClick={() => setActiveTab('usuarios')}
          style={{ 
            padding: '1rem 1.5rem', 
            background: 'transparent', 
            border: 'none', 
            borderBottom: activeTab === 'usuarios' ? '2px solid var(--primary-color)' : '2px solid transparent',
            color: activeTab === 'usuarios' ? 'var(--primary-color)' : 'var(--text-muted)',
            fontWeight: activeTab === 'usuarios' ? 600 : 400,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Users size={18} />
          Usuarios y Accesos
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
      ) : activeTab === 'basedatos' ? (
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
                Genera un archivo .json con toda la información actual del sistema. Es recomendable hacer esto de manera periódica.
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
                accept=".json" 
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
      ) : (
        <div className="card" style={{ maxWidth: '800px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <Users size={20} />
              Gestión de Usuarios y Roles
            </h3>
            {!showUserForm && (
              <button onClick={() => {
                setEditingUser(null);
                setUserForm({ id: '', username: '', password: '', name: '', role: 'tecnico' });
                setShowUserForm(true);
                setUserError('');
              }} className="btn-primary" style={{ padding: '0.5rem 1rem' }}>
                <Plus size={18} /> Nuevo Usuario
              </button>
            )}
          </div>

          {showUserForm ? (
            <div style={{ border: '1px solid var(--border-color)', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
              <h4 style={{ margin: '0 0 1rem 0' }}>{editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</h4>
              
              {userError && (
                <div style={{ padding: '0.75rem', backgroundColor: 'rgba(220,38,38,0.1)', color: 'var(--danger-color)', borderRadius: '4px', marginBottom: '1rem' }}>
                  {userError}
                </div>
              )}

              <form onSubmit={handleUserSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Nombre Completo</label>
                    <input 
                      required
                      value={userForm.name}
                      onChange={e => setUserForm({...userForm, name: e.target.value})}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Nombre de Usuario (Login)</label>
                    <input 
                      required
                      value={userForm.username}
                      onChange={e => setUserForm({...userForm, username: e.target.value})}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Contraseña</label>
                    <input 
                      required
                      type="text"
                      value={userForm.password}
                      onChange={e => setUserForm({...userForm, password: e.target.value})}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Rol / Nivel de Acceso</label>
                    <select 
                      value={userForm.role}
                      onChange={e => setUserForm({...userForm, role: e.target.value})}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}
                    >
                      <option value="tecnico">Técnico (Solo Proyectos e Inventario)</option>
                      <option value="admin">Administrador (Acceso Total)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowUserForm(false)} className="btn-secondary" style={{ padding: '0.5rem 1rem' }}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn-primary" style={{ padding: '0.5rem 1rem' }}>
                    <Save size={18} /> {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              {usersLoading ? (
                <p>Cargando usuarios...</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '1rem 0.5rem' }}>Nombre</th>
                      <th style={{ padding: '1rem 0.5rem' }}>Usuario</th>
                      <th style={{ padding: '1rem 0.5rem' }}>Rol</th>
                      <th style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '1rem 0.5rem' }}>{u.name}</td>
                        <td style={{ padding: '1rem 0.5rem' }}><strong>{u.username}</strong></td>
                        <td style={{ padding: '1rem 0.5rem' }}>
                          <span style={{ 
                            padding: '0.25rem 0.5rem', 
                            borderRadius: '4px', 
                            fontSize: '0.75rem',
                            backgroundColor: u.role === 'admin' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                            color: u.role === 'admin' ? 'var(--primary-color)' : 'var(--success-color)'
                          }}>
                            {u.role === 'admin' ? 'Administrador' : 'Técnico'}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <button 
                              onClick={() => handleEditUser(u)}
                              style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', padding: '0.25rem' }}
                              title="Editar"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button 
                              onClick={() => handleDeleteUser(u.id)}
                              style={{ background: 'none', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', padding: '0.25rem' }}
                              title="Eliminar"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Settings;
