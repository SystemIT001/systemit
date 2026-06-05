import React, { useEffect } from 'react';
import { LayoutDashboard, FolderKanban, ReceiptText, PackageSearch, ShoppingCart, Settings, Users, LogOut, User as UserIcon, Sun, Moon } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const path = window.location.pathname;
  const { user, loading, logout, checkAuth } = useAuth();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    checkAuth();
  }, []);

  if (loading) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Cargando sistema...</div>;
  }

  // Si no está en login.html y no hay usuario, redirigir
  if (!user && !path.includes('login.html')) {
    window.location.href = '/views/login.html';
    return null;
  }

  const getPageTitle = () => {
    if (path === '/' || path.endsWith('index.html')) return 'Dashboard';
    if (path.includes('proyecto')) return 'Gestión de Proyectos';
    if (path.includes('inventario')) return 'Inventario / Bodega';
    if (path.includes('compras')) return 'Compras a Proveedores';
    if (path.includes('clientes')) return 'Directorio de Clientes';
    return 'SystemIT';
  };

  const isActive = (matchPath: string) => {
    if (matchPath === 'index.html' && (path === '/' || path.endsWith('index.html'))) return true;
    return path.includes(matchPath);
  };

  return (
    <div className="layout-container">
      {/* Sidebar */}
      <aside className="sidebar no-print">
        <div className="brand">
          <ReceiptText className="brand-icon" size={28} />
          <span>SystemIT</span>
        </div>

        <nav className="nav-links">
          <a href="/views/index.html" className={`nav-item ${isActive('index.html') ? 'active' : ''}`}>
            <LayoutDashboard size={20} />
            Dashboard
          </a>
          <a href="/views/proyectos.html" className={`nav-item ${isActive('proyecto') ? 'active' : ''}`}>
            <FolderKanban size={20} />
            Proyectos
          </a>
          <a href="/views/clientes.html" className={`nav-item ${isActive('clientes') ? 'active' : ''}`}>
            <Users size={20} />
            Clientes
          </a>
          <a href="/views/inventario.html" className={`nav-item ${isActive('inventario') ? 'active' : ''}`}>
            <PackageSearch size={20} />
            Inventario / Bodega
          </a>
          {user?.role === 'admin' && (
            <>
              <a href="/views/compras.html" className={`nav-item ${isActive('compras') ? 'active' : ''}`}>
                <ShoppingCart size={20} />
                Compras a Prov.
              </a>
              <a href="/views/configuraciones.html" className={`nav-item ${isActive('configuracion') ? 'active' : ''}`}>
                <Settings size={20} />
                Configuraciones
              </a>
            </>
          )}
        </nav>

        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', marginTop: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserIcon size={16} color="var(--bg-color)" />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{user?.name}</p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {user?.role === 'admin' ? 'Administrador' : 'Técnico'}
              </p>
            </div>
          </div>
          <button 
            onClick={logout}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', backgroundColor: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'}
            onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <LogOut size={18} />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="topbar no-print">
          <h1>{getPageTitle()}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginLeft: 'auto' }}>
            <button 
              onClick={toggleTheme} 
              style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--surface-color)', boxShadow: 'var(--shadow-sm)' }}
              title="Cambiar Tema"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </header>
        <div className="content-wrapper">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
