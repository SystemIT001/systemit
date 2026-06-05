import React from 'react';
import { createRoot } from 'react-dom/client';
import Layout from './components/Layout';
import Settings from './pages/Settings';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Layout>
      <Settings />
    </Layout>
  </React.StrictMode>
);