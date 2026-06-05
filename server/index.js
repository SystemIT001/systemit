import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';
import fs from 'fs';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));

// Configuración de Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = req.body.type || 'facturas'; // 'facturas' o 'pagos'
    cb(null, join(__dirname, '..', 'uploads', type));
  },
  filename: (req, file, cb) => {
    let baseName = 'archivo';
    if (req.body.customName) {
      baseName = req.body.customName.replace(/[^a-zA-Z0-9_\-\u00C0-\u017F]/g, '-').replace(/-+/g, '-');
    } else {
      // Remover extensión del nombre original para no duplicarla
      baseName = file.originalname.substring(0, file.originalname.lastIndexOf('.')) || file.originalname;
      baseName = baseName.replace(/[^a-zA-Z0-9_\-\u00C0-\u017F]/g, '-').replace(/-+/g, '-');
    }
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E4);
    cb(null, `${baseName}-${uniqueSuffix}${extname(file.originalname)}`);
  }
});
const upload = multer({ storage });

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const type = req.body.type || 'facturas';
  const fileUrl = `/uploads/${type}/${req.file.filename}`;
  // Devolvemos el customName si vino, o el original
  res.json({ url: fileUrl, fileName: req.body.customName || req.file.originalname });
});

// Inicializar SQLite
const dbPath = join(__dirname, '..', 'database.sqlite');
let db;

function initDB() {
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database', err.message);
    } else {
      console.log('Connected to the SQLite database.');
      
      // Crear tablas si no existen
      db.run(`CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        clientName TEXT,
        projectName TEXT,
        date TEXT,
        status TEXT,
        exchangeRate REAL,
        materials TEXT,
        equipments TEXT,
        labor TEXT,
        invoices TEXT,
        payments TEXT,
        projectCode TEXT,
        expenses TEXT
      )`);

      // Intento de añadir columna si la tabla ya existía
      db.run(`ALTER TABLE projects ADD COLUMN expenses TEXT`, () => {});

      db.run(`CREATE TABLE IF NOT EXISTS inventory (
        id TEXT PRIMARY KEY,
        name TEXT,
        unitCost REAL,
        stockQuantity INTEGER,
        category TEXT,
        lastUpdated TEXT
      )`);
    }
  });
}

// Iniciar DB
initDB();

// --- Rutas de Respaldo y Restauración ---
app.get('/api/backup', (req, res) => {
  const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
  res.download(dbPath, `SystemIT_Backup_${dateStr}.sqlite`);
});

app.post('/api/restore', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded for restore' });
  }

  // 1. Cerrar conexión a la Base de Datos actual
  db.close((err) => {
    if (err) {
      console.error('Error cerrando BD para restaurar:', err);
      return res.status(500).json({ error: 'Error cerrando la base de datos actual.' });
    }

    // 2. Reemplazar archivo de BD
    fs.copyFile(req.file.path, dbPath, (copyErr) => {
      if (copyErr) {
        console.error('Error sobreescribiendo BD:', copyErr);
        // Si falla, intentamos reconectar la vieja
        initDB();
        return res.status(500).json({ error: 'Error sobreescribiendo el archivo de base de datos.' });
      }

      // 3. Borrar el archivo subido temporalmente
      fs.unlink(req.file.path, () => {});

      // 4. Reconectar a la nueva BD
      initDB();
      res.json({ success: true, message: 'Base de datos restaurada correctamente.' });
    });
  });
});

// --- Rutas para Proyectos ---
app.get('/api/projects.php', (req, res) => {
  db.all('SELECT * FROM projects', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const projects = rows.map(row => ({
      ...row,
      materials: JSON.parse(row.materials || '[]'),
      equipments: JSON.parse(row.equipments || '[]'),
      labor: JSON.parse(row.labor || '[]'),
      invoices: JSON.parse(row.invoices || '[]'),
      payments: JSON.parse(row.payments || '[]'),
      expenses: JSON.parse(row.expenses || '[]'),
      projectCode: row.projectCode || null,
    }));
    res.json(projects);
  });
});

app.post('/api/projects.php', (req, res) => {
  const data = req.body;
  const materials = JSON.stringify(data.materials || []);
  const equipments = JSON.stringify(data.equipments || []);
  const labor = JSON.stringify(data.labor || []);
  const invoices = JSON.stringify(data.invoices || []);
  const payments = JSON.stringify(data.payments || []);
  const expenses = JSON.stringify(data.expenses || []);

  const sql = `INSERT OR REPLACE INTO projects 
    (id, clientName, projectName, date, status, exchangeRate, materials, equipments, labor, invoices, payments, projectCode, expenses) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  const params = [
    data.id, data.clientName, data.projectName, data.date, data.status, 
    data.exchangeRate || 36.62, materials, equipments, labor, invoices, payments, data.projectCode || null, expenses
  ];

  db.run(sql, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.put('/api/projects.php', (req, res) => {
  const data = req.body;
  const materials = JSON.stringify(data.materials || []);
  const equipments = JSON.stringify(data.equipments || []);
  const labor = JSON.stringify(data.labor || []);
  const invoices = JSON.stringify(data.invoices || []);
  const payments = JSON.stringify(data.payments || []);
  const expenses = JSON.stringify(data.expenses || []);

  const sql = `INSERT OR REPLACE INTO projects 
    (id, clientName, projectName, date, status, exchangeRate, materials, equipments, labor, invoices, payments, projectCode, expenses) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  const params = [
    data.id, data.clientName, data.projectName, data.date, data.status, 
    data.exchangeRate || 36.62, materials, equipments, labor, invoices, payments, data.projectCode || null, expenses
  ];

  db.run(sql, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.delete('/api/projects.php', (req, res) => {
  const { id } = req.query;
  db.run('DELETE FROM projects WHERE id = ?', id, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// --- Rutas para Inventario ---
app.get('/api/inventory.php', (req, res) => {
  db.all('SELECT * FROM inventory', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/inventory.php', (req, res) => {
  const data = req.body;
  const sql = `INSERT OR REPLACE INTO inventory 
    (id, name, unitCost, stockQuantity, category, lastUpdated) 
    VALUES (?, ?, ?, ?, ?, ?)`;

  const params = [data.id, data.name, data.unitCost, data.stockQuantity, data.category, data.lastUpdated];

  db.run(sql, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.put('/api/inventory.php', (req, res) => {
  const data = req.body;
  const sql = `INSERT OR REPLACE INTO inventory 
    (id, name, unitCost, stockQuantity, category, lastUpdated) 
    VALUES (?, ?, ?, ?, ?, ?)`;

  const params = [data.id, data.name, data.unitCost, data.stockQuantity, data.category, data.lastUpdated];

  db.run(sql, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.delete('/api/inventory.php', (req, res) => {
  const { id } = req.query;
  db.run('DELETE FROM inventory WHERE id = ?', id, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.listen(port, () => {
  console.log(`Backend Server running on http://localhost:${port}`);
});
