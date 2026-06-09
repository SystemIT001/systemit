import { useState, useEffect } from 'react';
import type { User } from '../types';

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users.php');
      if (!response.ok) throw new Error('Failed to load users');
      const data = await response.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading users from API:', error);
    } finally {
      setLoading(false);
    }
  };

  const addUser = async (user: User) => {
    try {
      const response = await fetch('/api/users.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add user');
      }
      setUsers([...users, user]);
      return { success: true };
    } catch (error: any) {
      console.error('Error saving user:', error);
      return { success: false, error: error.message };
    }
  };

  const updateUser = async (updatedUser: User) => {
    try {
      const response = await fetch('/api/users.php', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedUser)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user');
      }
      
      const newUsers = users.map(u => 
        u.id === updatedUser.id ? updatedUser : u
      );
      setUsers(newUsers);
      return { success: true };
    } catch (error: any) {
      console.error('Error updating user:', error);
      return { success: false, error: error.message };
    }
  };

  const deleteUser = async (id: string) => {
    try {
      const response = await fetch(`/api/users.php?id=${id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete user');
      }
      
      const newUsers = users.filter(u => u.id !== id);
      setUsers(newUsers);
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting user:', error);
      return { success: false, error: error.message };
    }
  };

  return {
    users,
    loading,
    addUser,
    updateUser,
    deleteUser,
    refreshUsers: loadUsers
  };
}
