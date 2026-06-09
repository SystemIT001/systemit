import sqlite3 from 'sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'database.sqlite');
const CLOUD_URL = 'http://systemit.site.je'; // Tu dominio en InfinityFree

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error abriendo la base de datos local:', err.message);
    return;
  }
  
  console.log('Conectado a la base de datos local SQLite.');

  // MIGRAR PROYECTOS
  db.all('SELECT * FROM projects', async (err, rows) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log(`🚀 Encontrados ${rows.length} proyectos. Subiendo a la nube...`);
    
    for (const row of rows) {
        try {
            const payload = {
                ...row,
                materials: JSON.parse(row.materials || '[]'),
                equipments: JSON.parse(row.equipments || '[]'),
                labor: JSON.parse(row.labor || '[]'),
                invoices: JSON.parse(row.invoices || '[]'),
                payments: JSON.parse(row.payments || '[]'),
                expenses: JSON.parse(row.expenses || '[]'),
                tasks: JSON.parse(row.tasks || '[]'),
                images: JSON.parse(row.images || '[]')
            };

            const response = await fetch(`${CLOUD_URL}/api/projects.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const text = await response.text();
            console.log(`✅ Proyecto ${row.projectName} subido.`);
        } catch (e) {
            console.error(`❌ Error subiendo proyecto ${row.projectName}:`, e);
        }
    }
    console.log('🎉 Migración de proyectos completada.');
  });

  // MIGRAR INVENTARIO
  db.all('SELECT * FROM inventory', async (err, rows) => {
    if (err) return;
    console.log(`📦 Encontrados ${rows.length} items de inventario. Subiendo a la nube...`);
    
    for (const row of rows) {
        try {
            const response = await fetch(`${CLOUD_URL}/api/inventory.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(row)
            });
            const text = await response.text();
            console.log(`✅ Inventario ${row.name} subido.`);
        } catch (e) {
            console.error(`❌ Error subiendo inventario ${row.name}:`, e);
        }
    }
    console.log('🎉 Migración de inventario completada.');
  });
});
