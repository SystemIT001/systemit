import { useState, useEffect } from 'react';
import type { Project } from '../types';
import { apiFetch } from '../utils/api';

const API_URL = '/api/projects.php';

export const useProjects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProjects = () => {
    setLoading(true);
    apiFetch(API_URL)
      .then(res => res.json())
      .then(data => {
        setProjects(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching projects:', err);
        setLoading(false);
      });
  };

  // Cargar proyectos desde la API
  useEffect(() => {
    loadProjects();
  }, []);

  const addProject = async (project: Project) => {
    try {
      const response = await apiFetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error saving');
      
      const newProject = { ...project, lastUpdated: data.lastUpdated };
      setProjects(prev => [newProject, ...prev]);
      return { success: true };
    } catch (error: any) {
      alert(`Error: ${error.message}`);
      return { success: false };
    }
  };

  const updateProject = async (updatedProject: Project) => {
    try {
      const response = await apiFetch(API_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProject)
      });
      const data = await response.json();
      
      if (response.status === 409) {
        alert(data.error);
        loadProjects(); // Refresh to get the latest
        return { success: false, conflict: true };
      }
      if (!response.ok) throw new Error(data.error || 'Error saving');

      const savedProject = { ...updatedProject, lastUpdated: data.lastUpdated };
      setProjects(prev => prev.map(p => p.id === savedProject.id ? savedProject : p));
      return { success: true };
    } catch (error: any) {
      alert(`Error: ${error.message}`);
      return { success: false };
    }
  };

  const deleteProject = async (id: string) => {
    try {
      const response = await apiFetch(`${API_URL}?id=${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Error deleting');
      setProjects(prev => prev.filter(p => p.id !== id));
      return { success: true };
    } catch (error: any) {
      alert(`Error: ${error.message}`);
      return { success: false };
    }
  };

  const getProject = (id: string) => {
    return projects.find(p => p.id === id);
  };

  return {
    projects,
    loading,
    addProject,
    updateProject,
    deleteProject,
    getProject,
    refreshProjects: loadProjects
  };
};
