import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Layout from './components/Layout';
import PipingCalculatorPilot from './pages/PipingCalculatorPilot';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Layout>
      <PipingCalculatorPilot />
    </Layout>
  </StrictMode>
);
