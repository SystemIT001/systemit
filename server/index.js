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
    const type = req.body.type || 'facturas'; // 'facturas' o 'pagos' o 'proyectos/PRJ-001'
    const targetPath = join(__dirname, '..', 'uploads', type);
    if (!fs.existsSync(targetPath)) {
      fs.mkdirSync(targetPath, { recursive: true });
    }
    cb(null, targetPath);
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
        expenses TEXT,
        tasks TEXT,
        clientId TEXT,
        images TEXT
      )`);

      // Intento de añadir columnas si la tabla ya existía
      db.run(`ALTER TABLE projects ADD COLUMN expenses TEXT`, () => {});
      db.run(`ALTER TABLE projects ADD COLUMN tasks TEXT`, () => {});
      db.run(`ALTER TABLE projects ADD COLUMN clientId TEXT`, () => {});
      db.run(`ALTER TABLE projects ADD COLUMN images TEXT`, () => {});
      db.run(`ALTER TABLE projects ADD COLUMN lastUpdated TEXT`, () => {});

      db.run(`CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY,
        companyName TEXT,
        address TEXT,
        phone TEXT,
        email TEXT,
        ruc TEXT,
        logo TEXT,
        defaultTax REAL
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS tickets (
        id TEXT PRIMARY KEY,
        title TEXT,
        description TEXT,
        clientName TEXT,
        date TEXT,
        status TEXT,
        priority TEXT,
        cost REAL,
        currency TEXT,
        lastUpdated INTEGER
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS purchases (
        id TEXT PRIMARY KEY,
        supplierName TEXT,
        date TEXT,
        amount REAL,
        description TEXT,
        status TEXT,
        paymentMethod TEXT
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS inventory (
        id TEXT PRIMARY KEY,
        name TEXT,
        unitCost REAL,
        stockQuantity INTEGER,
        category TEXT,
        lastUpdated TEXT
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        name TEXT,
        contactPerson TEXT,
        email TEXT,
        phone TEXT,
        address TEXT
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE,
        password TEXT,
        name TEXT,
        role TEXT,
        token TEXT
      )`, (err) => {
        if (!err) {
          db.run(`ALTER TABLE users ADD COLUMN token TEXT`, () => {});
          // Si es la primera vez (tabla recién creada/vacía), insertar admin
          db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
            if (row && row.count === 0) {
              db.run("INSERT INTO users (id, username, password, name, role) VALUES ('1', 'admin', 'admin', 'Administrador General', 'admin')");
            }
          });
        }
      });
    }
  });
}

// Iniciar DB
initDB();

// --- Rutas de Respaldo y Restauración ---
app.get('/api/backup.php', (req, res) => {
  const backup = { projects: [], inventory: [], clients: [] };
  
  db.all('SELECT * FROM projects', [], (err, projects) => {
    backup.projects = projects;
    db.all('SELECT * FROM inventory', [], (err, inventory) => {
      backup.inventory = inventory;
      db.all('SELECT * FROM clients', [], (err, clients) => {
        backup.clients = clients;
        db.all('SELECT * FROM users', [], (err, users) => {
          backup.users = users;
          const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = `SystemIT_Backup_${dateStr}.json`;
          
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          res.send(JSON.stringify(backup));
        });
      });
    });
  });
});

app.post('/api/restore.php', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded for restore' });
  }

  fs.readFile(req.file.path, 'utf8', (err, jsonString) => {
    if (err) return res.status(500).json({ error: 'Error reading file' });

    try {
      const data = JSON.parse(jsonString);
      
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        if (data.projects) {
          db.run('DELETE FROM projects');
          const stmt = db.prepare('INSERT INTO projects (id, clientName, projectName, date, status, exchangeRate, materials, equipments, labor, invoices, payments, projectCode, expenses, tasks, clientId, images) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
          data.projects.forEach(p => stmt.run(p.id, p.clientName, p.projectName, p.date, p.status, p.exchangeRate, p.materials, p.equipments, p.labor, p.invoices, p.payments, p.projectCode, p.expenses, p.tasks, p.clientId, p.images));
          stmt.finalize();
        }

        if (data.inventory) {
          db.run('DELETE FROM inventory');
          const stmt = db.prepare('INSERT INTO inventory (id, name, unitCost, stockQuantity, category, lastUpdated) VALUES (?, ?, ?, ?, ?, ?)');
          data.inventory.forEach(i => stmt.run(i.id, i.name, i.unitCost, i.stockQuantity, i.category, i.lastUpdated));
          stmt.finalize();
        }

        if (data.clients) {
          db.run('DELETE FROM clients');
          const stmt = db.prepare('INSERT INTO clients (id, name, contactPerson, email, phone, address) VALUES (?, ?, ?, ?, ?, ?)');
          data.clients.forEach(c => stmt.run(c.id, c.name, c.contactPerson, c.email, c.phone, c.address));
          stmt.finalize();
        }

        if (data.users) {
          db.run('DELETE FROM users');
          const stmt = db.prepare('INSERT INTO users (id, username, password, name, role) VALUES (?, ?, ?, ?, ?)');
          if (data.users.length > 0) {
            data.users.forEach(u => stmt.run(u.id, u.username, u.password, u.name, u.role));
          } else {
            stmt.run('1', 'admin', 'admin', 'Administrador General', 'admin');
          }
          stmt.finalize();
        }

        db.run('COMMIT', (err) => {
          if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Restore failed' });
          }
          fs.unlink(req.file.path, () => {});
          res.json({ success: true, message: 'Database restored successfully' });
        });
      });

    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON file' });
    }
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
      tasks: JSON.parse(row.tasks || '[]'),
      images: JSON.parse(row.images || '[]'),
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
  const tasks = JSON.stringify(data.tasks || []);
  const images = JSON.stringify(data.images || []);

  const currentLastUpdated = Date.now();

  const sql = `INSERT OR REPLACE INTO projects 
    (id, clientId, clientName, projectName, date, status, exchangeRate, materials, equipments, labor, invoices, payments, projectCode, expenses, tasks, images, lastUpdated) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  const params = [
    data.id, data.clientId || null, data.clientName, data.projectName, data.date, data.status, 
    data.exchangeRate || 36.62, materials, equipments, labor, invoices, payments, data.projectCode || null, expenses, tasks, images, currentLastUpdated.toString()
  ];

  db.run(sql, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, lastUpdated: currentLastUpdated });
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
  const tasks = JSON.stringify(data.tasks || []);
  const images = JSON.stringify(data.images || []);

  const currentLastUpdated = Date.now();

  db.get('SELECT lastUpdated FROM projects WHERE id = ?', [data.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    
    if (row && row.lastUpdated && data.lastUpdated && parseInt(row.lastUpdated) > data.lastUpdated) {
      return res.status(409).json({ 
        error: "Conflicto de guardado: El proyecto fue modificado por otro usuario mientras lo estabas editando. Refresca la página para ver los cambios." 
      });
    }

    const sql = `INSERT OR REPLACE INTO projects 
      (id, clientId, clientName, projectName, date, status, exchangeRate, materials, equipments, labor, invoices, payments, projectCode, expenses, tasks, images, lastUpdated) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
      data.id, data.clientId || null, data.clientName, data.projectName, data.date, data.status, 
      data.exchangeRate || 36.62, materials, equipments, labor, invoices, payments, data.projectCode || null, expenses, tasks, images, currentLastUpdated.toString()
    ];

    db.run(sql, params, function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, lastUpdated: currentLastUpdated });
    });
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

// --- Rutas para Clientes ---
app.get('/api/clients.php', (req, res) => {
  db.all('SELECT * FROM clients', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/clients.php', (req, res) => {
  const data = req.body;
  const sql = `INSERT OR REPLACE INTO clients 
    (id, name, contactPerson, email, phone, address) 
    VALUES (?, ?, ?, ?, ?, ?)`;

  const params = [data.id, data.name, data.contactPerson, data.email, data.phone, data.address];

  db.run(sql, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.put('/api/clients.php', (req, res) => {
  const data = req.body;
  const sql = `INSERT OR REPLACE INTO clients 
    (id, name, contactPerson, email, phone, address) 
    VALUES (?, ?, ?, ?, ?, ?)`;

  const params = [data.id, data.name, data.contactPerson, data.email, data.phone, data.address];

  db.run(sql, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.delete('/api/clients.php', (req, res) => {
  const { id } = req.query;
  db.run('DELETE FROM clients WHERE id = ?', id, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// --- Rutas para Usuarios ---
app.get('/api/users.php', (req, res) => {
  db.all('SELECT * FROM users', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/users.php', (req, res) => {
  const data = req.body;
  const action = req.query.action;
  console.log("POST /api/users.php", "action:", action, "body:", data);

  if (action === 'login') {
    db.get('SELECT * FROM users WHERE username = ?', [data.username], (err, user) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!user || user.username !== data.username) return res.status(401).json({ error: 'Usuario no encontrado' });
      
      // Simple hash check or plain text fallback for dev
      if (user.password === data.password || user.password === data.clave) {
        const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
        db.run('UPDATE users SET token = ? WHERE id = ?', [token, user.id], (err) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ success: true, token, user: { id: user.id, username: user.username, role: user.role, name: user.name } });
        });
      } else {
        res.status(401).json({ error: 'Contraseña incorrecta' });
      }
    });
    return;
  }

  // Verificar duplicados
  db.get('SELECT id FROM users WHERE username = ? AND id != ?', [data.username, data.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) return res.status(409).json({ error: "El nombre de usuario ya está en uso" });
    
    const sql = `INSERT OR REPLACE INTO users (id, username, password, name, role) VALUES (?, ?, ?, ?, ?)`;
    const params = [data.id, data.username, data.clave || data.password, data.name || '', data.role || 'tecnico'];

    db.run(sql, params, function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    });
  });
});

app.put('/api/users.php', (req, res) => {
  const data = req.body;
  // Verificar duplicados
  db.get('SELECT id FROM users WHERE username = ? AND id != ?', [data.username, data.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) return res.status(409).json({ error: "El nombre de usuario ya está en uso" });
    
    const sql = `INSERT OR REPLACE INTO users (id, username, password, name, role) VALUES (?, ?, ?, ?, ?)`;
    const params = [data.id, data.username, data.clave || data.password, data.name || '', data.role || 'tecnico'];

    db.run(sql, params, function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    });
  });
});

app.delete('/api/users.php', (req, res) => {
  const { id } = req.query;
  
  db.get('SELECT role FROM users WHERE id = ?', [id], (err, row) => {
    if (row && row.role === 'admin') {
      db.get("SELECT COUNT(*) as count FROM users WHERE role = 'admin'", [], (err, row2) => {
        if (row2 && row2.count <= 1) {
          return res.status(403).json({ error: "No puedes eliminar al último administrador del sistema" });
        }
        deleteUser();
      });
    } else {
      deleteUser();
    }
  });

  function deleteUser() {
    db.run('DELETE FROM users WHERE id = ?', id, function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    });
  }
});

// --- Rutas para Compras ---
app.get('/api/purchases.php', (req, res) => {
  db.all('SELECT * FROM purchases', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/purchases.php', (req, res) => {
  const data = req.body;
  const sql = `INSERT OR REPLACE INTO purchases (id, supplierName, date, amount, description, status, paymentMethod) VALUES (?, ?, ?, ?, ?, ?, ?)`;
  const params = [data.id, data.supplierName, data.date, data.amount, data.description, data.status, data.paymentMethod];
  db.run(sql, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.put('/api/purchases.php', (req, res) => {
  const data = req.body;
  const sql = `INSERT OR REPLACE INTO purchases (id, supplierName, date, amount, description, status, paymentMethod) VALUES (?, ?, ?, ?, ?, ?, ?)`;
  const params = [data.id, data.supplierName, data.date, data.amount, data.description, data.status, data.paymentMethod];
  db.run(sql, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.delete('/api/purchases.php', (req, res) => {
  const { id } = req.query;
  db.run('DELETE FROM purchases WHERE id = ?', id, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// --- Rutas para Configuraciones ---
app.get('/api/settings.php', (req, res) => {
  db.get('SELECT * FROM settings WHERE id = ?', ['global'], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) {
      res.json(row);
    } else {
      res.json({
        id: 'global',
        companyName: 'Mi Empresa IT',
        subtitle: 'Reporte de Servicios y Equipos',
        docType: 'COTIZACIÓN',
        footerText: 'Gracias por su preferencia. Este documento es válido como cotización o nota de servicio.'
      });
    }
  });
});

app.post('/api/settings', (req, res) => {
  const settings = req.body;
  const id = settings.id || 'default';
  
  db.run(`INSERT OR REPLACE INTO settings (id, companyName, address, phone, email, ruc, logo, defaultTax) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, settings.companyName, settings.address, settings.phone, settings.email, settings.ruc, settings.logo, settings.defaultTax],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Settings saved' });
    }
  );
});

// Tickets Endpoints
app.get('/api/tickets', (req, res) => {
  db.all('SELECT * FROM tickets', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/tickets', (req, res) => {
  const ticket = req.body;
  const lastUpdated = Date.now();
  db.run(`INSERT OR REPLACE INTO tickets (id, title, description, clientName, date, status, priority, cost, currency, lastUpdated) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [ticket.id, ticket.title, ticket.description, ticket.clientName, ticket.date, ticket.status, ticket.priority, ticket.cost, ticket.currency, lastUpdated],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Ticket saved', id: ticket.id, lastUpdated });
    }
  );
});

app.delete('/api/tickets/:id', (req, res) => {
  db.run('DELETE FROM tickets WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Ticket deleted' });
  });
});

app.listen(port, () => {
  console.log(`Backend Server running on http://localhost:${port}`);
});
