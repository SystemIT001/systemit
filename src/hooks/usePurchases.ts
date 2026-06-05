import { useState, useEffect } from 'react';
import type { SupplierPurchase } from '../types';

export const usePurchases = () => {
  const [purchases, setPurchases] = useState<SupplierPurchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPurchases();
  }, []);

  const loadPurchases = () => {
    try {
      const stored = localStorage.getItem('systemit_purchases');
      if (stored) {
        setPurchases(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading purchases:', error);
    } finally {
      setLoading(false);
    }
  };

  const addPurchase = (purchase: SupplierPurchase) => {
    const updated = [...purchases, purchase];
    setPurchases(updated);
    localStorage.setItem('systemit_purchases', JSON.stringify(updated));
  };

  const deletePurchase = (id: string) => {
    const updated = purchases.filter(p => p.id !== id);
    setPurchases(updated);
    localStorage.setItem('systemit_purchases', JSON.stringify(updated));
  };

  return {
    purchases,
    loading,
    addPurchase,
    deletePurchase,
  };
};
