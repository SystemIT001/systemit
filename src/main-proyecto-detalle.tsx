import React from 'react';
import { createRoot } from 'react-dom/client';
import Layout from './components/Layout';
import ProjectDetail from './pages/ProjectDetail';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Layout>
      <ProjectDetail />
    </Layout>
  </React.StrictMode>
);