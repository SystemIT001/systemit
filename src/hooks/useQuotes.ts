import { useState, useEffect } from 'react';
import type { Project } from '../types';
import { apiFetch } from '../utils/api';

const API_URL = '/api/quotes.php';

export const useQuotes = () => {
  const [quotes, setQuotes] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const loadQuotes = () => {
    setLoading(true);
    apiFetch(API_URL)
      .then(res => res.json())
      .then(data => {
        setQuotes(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching projects:', err);
        setLoading(false);
      });
  };

  // Cargar proyectos desde la API
  useEffect(() => {
    loadQuotes();
  }, []);

  const addQuote = async (project: Project) => {
    try {
      const response = await apiFetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error saving');
      
      const newProject = { ...project, lastUpdated: data.lastUpdated };
      setQuotes(prev => [newProject, ...prev]);
      return { success: true };
    } catch (error: any) {
      alert(`Error: ${error.message}`);
      return { success: false };
    }
  };

  const updateQuote = async (updatedProject: Project) => {
    try {
      const response = await apiFetch(API_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProject)
      });
      const data = await response.json();
      
      if (response.status === 409) {
        alert(data.error);
        loadQuotes(); // Refresh to get the latest
        return { success: false, conflict: true };
      }
      if (!response.ok) throw new Error(data.error || 'Error saving');

      const savedProject = { ...updatedProject, lastUpdated: data.lastUpdated };
      setQuotes(prev => prev.map(p => p.id === savedProject.id ? savedProject : p));
      return { success: true };
    } catch (error: any) {
      alert(`Error: ${error.message}`);
      return { success: false };
    }
  };

  const deleteQuote = async (id: string) => {
    try {
      const response = await apiFetch(`${API_URL}?id=${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Error deleting');
      setQuotes(prev => prev.filter(p => p.id !== id));
      return { success: true };
    } catch (error: any) {
      alert(`Error: ${error.message}`);
      return { success: false };
    }
  };

  const getQuote = (id: string) => {
    return quotes.find(p => p.id === id);
  };

  return {
    quotes,
    loading,
    addQuote,
    updateQuote,
    deleteQuote,
    getQuote,
    refreshQuotes: loadQuotes
  };
};
