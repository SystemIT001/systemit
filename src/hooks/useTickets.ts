import { useState, useEffect } from 'react';
import { Ticket } from '../types';
import { apiFetch } from '../utils/api';

export const useTickets = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = async () => {
    try {
      const data = await apiFetch('/api/tickets');
      setTickets(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const addTicket = async (ticket: Ticket) => {
    try {
      const response = await apiFetch('/api/tickets', {
        method: 'POST',
        body: JSON.stringify(ticket)
      });
      if (response.lastUpdated) {
        ticket.lastUpdated = response.lastUpdated;
      }
      setTickets(prev => {
        const index = prev.findIndex(t => t.id === ticket.id);
        if (index !== -1) {
          const updated = [...prev];
          updated[index] = ticket;
          return updated;
        }
        return [...prev, ticket];
      });
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const updateTicket = async (ticket: Ticket) => {
    await addTicket(ticket);
  };

  const deleteTicket = async (id: string) => {
    try {
      await apiFetch(`/api/tickets/${id}`, {
        method: 'DELETE'
      });
      setTickets(prev => prev.filter(t => t.id !== id));
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  return {
    tickets,
    loading,
    error,
    addTicket,
    updateTicket,
    deleteTicket,
    refreshTickets: fetchTickets
  };
};
