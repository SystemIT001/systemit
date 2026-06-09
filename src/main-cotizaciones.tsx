import React from 'react';
import { createRoot } from 'react-dom/client';
import Layout from './components/Layout';
import QuoteList from './pages/QuoteList';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Layout>
      <QuoteList />
    </Layout>
  </React.StrictMode>
);
