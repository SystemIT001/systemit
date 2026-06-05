import React from 'react';
import { createRoot } from 'react-dom/client';
import Layout from './components/Layout';
import ClientList from './pages/ClientList';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Layout>
      <ClientList />
    </Layout>
  </React.StrictMode>
);
