import { useState, useEffect } from 'react';
import type { User } from '../types';

// Usuarios por defecto (en un sistema real estarían en la BD y hasheados)
const USERS = [
  { id: '1', username: 'admin', password: 'admin', role: 'admin', name: 'Administrador General' },
  { id: '2', username: 'tecnico', password: 'tecnico', role: 'tecnico', name: 'Técnico de Obra' }
];

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    const storedAuth = localStorage.getItem('systemit_auth');
    const isLoginPage = window.location.pathname.includes('login.html');

    if (storedAuth) {
      setUser(JSON.parse(storedAuth));
      // Si estamos en login y ya hay sesión, redirigir
      if (isLoginPage) {
        window.location.href = '/views/proyectos.html';
      }
    } else if (!isLoginPage) {
      // Guardar la URL actual para retornar después de login
      const currentUrl = window.location.pathname + window.location.search;
      window.location.href = `/views/login.html?returnUrl=${encodeURIComponent(currentUrl)}`;
    }
    setLoading(false);
  };

  const login = (username: string, password: string): boolean => {
    const foundUser = USERS.find(u => u.username === username && u.password === password);
    if (foundUser) {
      const userData: User = {
        id: foundUser.id,
        username: foundUser.username,
        role: foundUser.role as 'admin' | 'tecnico',
        name: foundUser.name
      };
      localStorage.setItem('systemit_auth', JSON.stringify(userData));
      setUser(userData);
      
      const urlParams = new URLSearchParams(window.location.search);
      const returnUrl = urlParams.get('returnUrl') || '/views/proyectos.html';
      
      // Asegurarse de que no estamos ya en la página de destino para evitar bucles
      if (!window.location.pathname.includes(returnUrl)) {
        window.location.href = returnUrl;
      }
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem('systemit_auth');
    setUser(null);
    window.location.href = '/views/login.html';
  };

  return {
    user,
    loading,
    login,
    logout,
    checkAuth
  };
}
