import { useState, useEffect } from 'react';
import type { Visit } from '../types';
import { apiFetch } from '../utils/api';

export function useVisits() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  const loadVisits = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/api/visits.php');
      if (!response.ok) throw new Error('Failed to load visits');
      const data = await response.json();
      setVisits(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading visits from API:', error);
      const stored = localStorage.getItem('systemit_visits');
      if (stored) {
        setVisits(JSON.parse(stored));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVisits();
  }, []);

  const saveVisit = async (visit: Visit) => {
    try {
      const response = await apiFetch('/api/visits.php', {
        method: 'POST',
        body: JSON.stringify(visit)
      });
      
      if (!response.ok) throw new Error('Failed to save visit');
      
      const newVisits = visits.find(v => v.id === visit.id)
        ? visits.map(v => v.id === visit.id ? visit : v)
        : [...visits, visit];
        
      setVisits(newVisits);
      localStorage.setItem('systemit_visits', JSON.stringify(newVisits));
    } catch (error) {
      console.error('Error saving visit:', error);
      throw error;
    }
  };

  const deleteVisit = async (id: string) => {
    try {
      const response = await apiFetch(`/api/visits.php?id=${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete visit');
      
      const newVisits = visits.filter(v => v.id !== id);
      setVisits(newVisits);
      localStorage.setItem('systemit_visits', JSON.stringify(newVisits));
    } catch (error) {
      console.error('Error deleting visit:', error);
      throw error;
    }
  };

  return { visits, loading, saveVisit, deleteVisit, refresh: loadVisits };
}
