const fs = require('fs');
const path = require('path');

const pages = [
  { html: 'index.html', tsx: 'src/main.tsx', component: 'Dashboard' },
  { html: 'proyectos.html', tsx: 'src/main-proyectos.tsx', component: 'ProjectList' },
  { html: 'proyecto-detalle.html', tsx: 'src/main-proyecto-detalle.tsx', component: 'ProjectDetail' },
  { html: 'inventario.html', tsx: 'src/main-inventario.tsx', component: 'InventoryList' },
  { html: 'compras.html', tsx: 'src/main-compras.tsx', component: 'Purchases' },
  { html: 'configuraciones.html', tsx: 'src/main-configuraciones.tsx', component: 'Settings' },
  { html: 'factura.html', tsx: 'src/main-factura.tsx', component: 'InvoiceView' }
];

const htmlTemplate = (tsxFile) => `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <title>SystemIT - Proyectos & Facturación</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/${tsxFile}"></script>
  </body>
</html>`;

const tsxTemplate = (component) => `import React from 'react';
import { createRoot } from 'react-dom/client';
import Layout from './components/Layout';
import ${component} from './pages/${component}';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Layout>
      <${component} />
    </Layout>
  </React.StrictMode>
);`;

pages.forEach(p => {
  fs.writeFileSync(path.join(__dirname, p.html), htmlTemplate(p.tsx));
  if (p.component !== 'Dashboard') {
    fs.writeFileSync(path.join(__dirname, p.tsx), tsxTemplate(p.component));
  } else {
    fs.writeFileSync(path.join(__dirname, 'src/main.tsx'), tsxTemplate('Dashboard'));
  }
});

console.log("Archivos generados correctamente.");
