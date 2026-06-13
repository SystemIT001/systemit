import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Building2, Lock, User, LogIn, Palette } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useSettings } from '../hooks/useSettings';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { theme, setTheme } = useTheme();
  const { settings } = useSettings();
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const result = await login(username, password);
    if (result.success) {
      const urlParams = new URLSearchParams(window.location.search);
      const returnUrl = urlParams.get('returnUrl') || '/views/proyectos.html';
      if (!window.location.pathname.includes(returnUrl)) {
        window.location.href = returnUrl;
      }
    } else {
      setError(result.error || 'Usuario o contraseña incorrectos');
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg-color)',
      position: 'relative'
    }}>
      <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', zIndex: 100 }}>
        <button 
          onClick={() => setIsThemeDropdownOpen(!isThemeDropdownOpen)} 
          style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--surface-color)', boxShadow: 'var(--shadow-sm)' }}
          title="Cambiar Paleta de Colores"
        >
          <Palette size={20} />
        </button>
        {isThemeDropdownOpen && (
          <div style={{ position: 'absolute', top: '120%', right: 0, backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: '180px' }}>
            <button 
              type="button"
              onClick={() => { setTheme('cyberpunk'); setIsThemeDropdownOpen(false); }}
              style={{ textAlign: 'left', padding: '0.5rem', borderRadius: '4px', backgroundColor: theme === 'cyberpunk' ? 'var(--surface-hover)' : 'transparent', color: 'var(--text-main)', border: 'none', cursor: 'pointer' }}
            >
              🚀 Cyberpunk Neon
            </button>
            <button 
              type="button"
              onClick={() => { setTheme('light'); setIsThemeDropdownOpen(false); }}
              style={{ textAlign: 'left', padding: '0.5rem', borderRadius: '4px', backgroundColor: theme === 'light' ? 'var(--surface-hover)' : 'transparent', color: 'var(--text-main)', border: 'none', cursor: 'pointer' }}
            >
              ☀️ Claro Minimalista
            </button>
            <button 
              type="button"
              onClick={() => { setTheme('oceanic'); setIsThemeDropdownOpen(false); }}
              style={{ textAlign: 'left', padding: '0.5rem', borderRadius: '4px', backgroundColor: theme === 'oceanic' ? 'var(--surface-hover)' : 'transparent', color: 'var(--text-main)', border: 'none', cursor: 'pointer' }}
            >
              🌊 Azul Profundo
            </button>
          </div>
        )}
      </div>
      
      <div className="card" style={{
        width: '100%',
        maxWidth: '400px',
        padding: '2.5rem',
        textAlign: 'center'
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem', color: 'var(--primary-color)' }}>
          <Building2 size={48} />
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', letterSpacing: '-0.5px', marginBottom: '0.5rem' }}>
          <span style={{ 
            fontWeight: 900, 
            background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--success-color) 100%)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent',
            display: 'inline-block',
            fontSize: '1.75rem'
          }}>C&C</span>
          <span style={{ 
            fontWeight: 300, 
            letterSpacing: '2px',
            color: 'var(--text-main)',
            marginLeft: '8px',
            fontSize: '1.75rem'
          }}>SYSTEM</span>
        </div>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Inicia sesión para continuar</p>

        {error && (
          <div style={{
            backgroundColor: 'rgba(220, 38, 38, 0.1)',
            border: '1px solid var(--danger-color)',
            color: 'var(--danger-color)',
            padding: '0.75rem',
            borderRadius: '6px',
            marginBottom: '1.5rem',
            fontSize: '0.875rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Usuario"
                value={username}
                onChange={e => setUsername(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.5rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-color)',
                  color: 'var(--text-main)',
                  fontSize: '1rem'
                }}
                required
              />
            </div>
          </div>
          
          <div>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="password" 
                placeholder="Contraseña"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.5rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-color)',
                  color: 'var(--text-main)',
                  fontSize: '1rem'
                }}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" style={{ marginTop: '1rem', justifyContent: 'center', padding: '0.75rem' }} disabled={loading}>
            <LogIn size={20} />
            {loading ? 'Iniciando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
