import React from 'react';
import { createRoot } from 'react-dom/client';
import Layout from './components/Layout';
import Purchases from './pages/Purchases';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Layout>
      <Purchases />
    </Layout>
  </React.StrictMode>
);