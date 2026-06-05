import { useState, useEffect } from 'react';
import type { InventoryItem } from '../types';

const API_URL = '/api/inventory.php';

export const useInventory = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(API_URL)
      .then(res => res.json())
      .then(data => {
        setInventory(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching inventory:', err);
        setLoading(false);
      });
  }, []);

  const addInventoryItem = async (item: InventoryItem) => {
    setInventory(prev => [...prev, item]);
    await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
  };

  const updateInventoryItem = async (item: InventoryItem) => {
    setInventory(prev => prev.map(i => i.id === item.id ? item : i));
    await fetch(API_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
  };

  const deleteInventoryItem = async (id: string) => {
    setInventory(prev => prev.filter(i => i.id !== id));
    await fetch(`${API_URL}?id=${id}`, {
      method: 'DELETE'
    });
  };

  return {
    inventory,
    loading,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem
  };
};
