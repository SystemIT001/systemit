import { useState } from 'react';
import type { User } from '../types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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

  const login = async (username: string, password: string): Promise<{success: boolean, error?: string}> => {
    try {
      const response = await fetch('/api/users.php?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, clave: password })
      });
      
      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || `Error del servidor: ${response.status}` };
      }
      
      if (data.success && data.token) {
        const userData = { ...data.user, token: data.token };
        localStorage.setItem('systemit_auth', JSON.stringify(userData));
        setUser(userData);
        return { success: true };
      }
      
      return { success: false, error: 'Usuario o contraseña incorrectos' };
    } catch (error: any) {
      console.error("Error en login:", error);
      return { success: false, error: `Error de red: ${error.message}` };
    }
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
