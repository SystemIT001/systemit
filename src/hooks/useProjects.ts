import { useState, useEffect } from 'react';
import type { Project } from '../types';

const API_URL = '/api/projects.php';

export const useProjects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar proyectos desde la API
  useEffect(() => {
    fetch(API_URL)
      .then(res => res.json())
      .then(data => {
        setProjects(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching projects:', err);
        setLoading(false);
      });
  }, []);

  const addProject = async (project: Project) => {
    // Actualizar UI primero (optimistic update)
    setProjects(prev => [project, ...prev]);
    // Guardar en backend
    await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project)
    });
  };

  const updateProject = async (updatedProject: Project) => {
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
    await fetch(API_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedProject)
    });
  };

  const deleteProject = async (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    await fetch(`${API_URL}?id=${id}`, {
      method: 'DELETE'
    });
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
    getProject
  };
};
