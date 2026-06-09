import { useState, useEffect } from 'react';
import type { Client } from '../types';

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/clients.php');
      if (!response.ok) throw new Error('Failed to load clients');
      const data = await response.json();
      setClients(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading clients from API:', error);
      // Fallback a localStorage por si acaso
      const stored = localStorage.getItem('systemit_clients');
      if (stored) {
        setClients(JSON.parse(stored));
      }
    } finally {
      setLoading(false);
    }
  };

  const addClient = async (client: Client) => {
    try {
      const response = await fetch('/api/clients.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(client)
      });
      if (!response.ok) throw new Error('Failed to add client');
      setClients([...clients, client]);
    } catch (error) {
      console.error('Error saving client:', error);
      alert('Error guardando en el servidor');
    }
  };

  const updateClient = async (updatedClient: Client) => {
    try {
      const response = await fetch('/api/clients.php', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedClient)
      });
      if (!response.ok) throw new Error('Failed to update client');
      
      const newClients = clients.map(c => 
        c.id === updatedClient.id ? updatedClient : c
      );
      setClients(newClients);
    } catch (error) {
      console.error('Error updating client:', error);
      alert('Error actualizando en el servidor');
    }
  };

  const deleteClient = async (id: string) => {
    try {
      const response = await fetch(`/api/clients.php?id=${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete client');
      
      const newClients = clients.filter(c => c.id !== id);
      setClients(newClients);
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Error eliminando en el servidor');
    }
  };

  const getClient = (id: string) => {
    return clients.find(c => c.id === id);
  };

  return {
    clients,
    loading,
    addClient,
    updateClient,
    deleteClient,
    getClient,
    refreshClients: loadClients
  };
}
