import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ProjectList from './pages/ProjectList';
import ProjectDetail from './pages/ProjectDetail';
import InvoiceView from './pages/InvoiceView';
import InventoryList from './pages/InventoryList';
import Purchases from './pages/Purchases';
import Settings from './pages/Settings';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/projects" element={<ProjectList />} />
          <Route path="/inventory" element={<InventoryList />} />
          <Route path="/purchases" element={<Purchases />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/projects/:id/invoice" element={<InvoiceView />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
