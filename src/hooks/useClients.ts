import { useState, useEffect } from 'react';
import type { Client } from '../types';

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = () => {
    try {
      const stored = localStorage.getItem('systemit_clients');
      if (stored) {
        setClients(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveClients = (newClients: Client[]) => {
    try {
      localStorage.setItem('systemit_clients', JSON.stringify(newClients));
      setClients(newClients);
    } catch (error) {
      console.error('Error saving clients:', error);
      alert('Error guardando en memoria local');
    }
  };

  const addClient = (client: Client) => {
    saveClients([...clients, client]);
  };

  const updateClient = (updatedClient: Client) => {
    const newClients = clients.map(c => 
      c.id === updatedClient.id ? updatedClient : c
    );
    saveClients(newClients);
  };

  const deleteClient = (id: string) => {
    const newClients = clients.filter(c => c.id !== id);
    saveClients(newClients);
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
    getClient
  };
}
