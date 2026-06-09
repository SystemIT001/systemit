import { useState, useEffect } from 'react';
import type { SupplierPurchase } from '../types';
import { apiFetch } from '../utils/api';

const API_URL = '/api/purchases.php';

export const usePurchases = () => {
  const [purchases, setPurchases] = useState<SupplierPurchase[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPurchases = async () => {
    try {
      setLoading(true);
      const response = await apiFetch(API_URL);
      if (!response.ok) throw new Error('Failed to load purchases');
      const data = await response.json();
      setPurchases(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading purchases from API:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPurchases();
  }, []);

  const addPurchase = async (purchase: SupplierPurchase) => {
    try {
      const response = await apiFetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(purchase)
      });
      if (!response.ok) throw new Error('Failed to add purchase');
      setPurchases([...purchases, purchase]);
    } catch (error) {
      console.error('Error saving purchase:', error);
      alert('Error guardando en el servidor');
    }
  };

  const deletePurchase = async (id: string) => {
    try {
      const response = await apiFetch(`${API_URL}?id=${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete purchase');
      
      const updated = purchases.filter(p => p.id !== id);
      setPurchases(updated);
    } catch (error) {
      console.error('Error deleting purchase:', error);
      alert('Error eliminando en el servidor');
    }
  };

  return {
    purchases,
    loading,
    addPurchase,
    deletePurchase,
  };
};
