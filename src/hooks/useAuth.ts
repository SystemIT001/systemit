import { useState, useEffect } from 'react';
import type { User } from '../types';

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

  const login = async (username: string, password: string): Promise<{success: boolean, error?: string}> => {
    try {
      const response = await fetch('/api/users.php');
      if (!response.ok) {
        const text = await response.text();
        return { success: false, error: `Error del servidor: ${response.status} - ${text.substring(0, 50)}` };
      }
      
      const text = await response.text();
      let users: any[];
      try {
        users = JSON.parse(text);
      } catch (e) {
        return { success: false, error: `Respuesta no es JSON: ${text.substring(0, 100)}` };
      }
      
      const foundUser = users.find(u => u.username === username && (u.password === password || u.clave === password));
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
        
        if (!window.location.pathname.includes(returnUrl)) {
          window.location.href = returnUrl;
        }
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
