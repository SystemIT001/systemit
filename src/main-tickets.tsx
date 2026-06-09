import React from 'react';
import { createRoot } from 'react-dom/client';
import Layout from './components/Layout';
import TicketList from './pages/TicketList';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Layout>
      <TicketList />
    </Layout>
  </React.StrictMode>
);
