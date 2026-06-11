import React from 'react';
import ReactDOM from 'react-dom/client';
import Layout from './components/Layout';
import Reports from './pages/Reports';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Layout>
      <Reports />
    </Layout>
  </React.StrictMode>,
);
