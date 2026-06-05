import React from 'react';
import { createRoot } from 'react-dom/client';
import Layout from './components/Layout';
import InventoryList from './pages/InventoryList';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Layout>
      <InventoryList />
    </Layout>
  </React.StrictMode>
);