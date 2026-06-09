import sqlite3 from 'sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error', err.message);
    return;
  }
  
  const backup = { projects: [], inventory: [] };

  db.all('SELECT * FROM projects', (err, rows) => {
    if (!err) {
        backup.projects = rows.map(row => ({
            ...row,
            materials: row.materials || '[]',
            equipments: row.equipments || '[]',
            labor: row.labor || '[]',
            invoices: row.invoices || '[]',
            payments: row.payments || '[]',
            expenses: row.expenses || '[]',
            tasks: row.tasks || '[]',
            images: row.images || '[]'
        }));
    }

    db.all('SELECT * FROM inventory', (err, rows) => {
        if (!err) {
            backup.inventory = rows;
        }

        fs.writeFileSync('backup_to_upload.json', JSON.stringify(backup, null, 2));
        console.log('✅ backup_to_upload.json generado con éxito.');
    });
  });
});
