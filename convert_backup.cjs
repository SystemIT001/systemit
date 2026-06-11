const fs = require('fs');
const path = require('path');

// Buscar el archivo de respaldo más reciente en el directorio actual
const files = fs.readdirSync(__dirname);
const backupFiles = files.filter(f => f.startsWith('SystemIT_Backup_') && f.endsWith('.json'));

if (backupFiles.length === 0) {
  console.error("❌ No se encontró ningún archivo de respaldo (SystemIT_Backup_*.json) en esta carpeta.");
  process.exit(1);
}

// Tomar el último (por orden alfabético que incluye fecha)
const backupFile = backupFiles.sort().reverse()[0];
console.log(`📄 Leyendo respaldo: ${backupFile}`);

const data = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
let sql = '';

if (data.projects && data.projects.length > 0) {
    sql += "DELETE FROM projects;\n";
    for (const p of data.projects) {
        const pDate = p.date || '';
        const pCode = p.projectCode || '';
        sql += `INSERT INTO projects (id, clientName, projectName, date, status, exchangeRate, materials, equipments, labor, invoices, payments, projectCode, expenses, tasks, clientId, images) VALUES ('${p.id}', '${p.clientName.replace(/'/g, "''")}', '${p.projectName.replace(/'/g, "''")}', '${pDate}', '${p.status}', ${p.exchangeRate}, '${(p.materials||'[]').replace(/'/g, "''")}', '${(p.equipments||'[]').replace(/'/g, "''")}', '${(p.labor||'[]').replace(/'/g, "''")}', '${(p.invoices||'[]').replace(/'/g, "''")}', '${(p.payments||'[]').replace(/'/g, "''")}', '${pCode}', '${(p.expenses||'[]').replace(/'/g, "''")}', '${(p.tasks||'[]').replace(/'/g, "''")}', '${p.clientId||''}', '${(p.images||'[]').replace(/'/g, "''")}');\n`;
    }
}

if (data.inventory && data.inventory.length > 0) {
    sql += "DELETE FROM inventory;\n";
    for (const i of data.inventory) {
        sql += `INSERT INTO inventory (id, name, unitCost, stockQuantity, category, lastUpdated) VALUES ('${i.id}', '${i.name.replace(/'/g, "''")}', ${i.unitCost}, ${i.stockQuantity}, '${i.category}', '${i.lastUpdated||''}');\n`;
    }
}

if (data.clients && data.clients.length > 0) {
    sql += "DELETE FROM clients;\n";
    for (const c of data.clients) {
        sql += `INSERT INTO clients (id, name, contactPerson, email, phone, address) VALUES ('${c.id}', '${c.name.replace(/'/g, "''")}', '${(c.contactPerson||'').replace(/'/g, "''")}', '${(c.email||'').replace(/'/g, "''")}', '${(c.phone||'').replace(/'/g, "''")}', '${(c.address||'').replace(/'/g, "''")}');\n`;
    }
}

if (data.users && data.users.length > 0) {
    sql += "DELETE FROM users;\n";
    for (const u of data.users) {
        sql += `INSERT INTO users (id, username, password, name, role) VALUES ('${u.id}', '${u.username.replace(/'/g, "''")}', '${u.password.replace(/'/g, "''")}', '${(u.name||'').replace(/'/g, "''")}', '${(u.role||'tecnico').replace(/'/g, "''")}');\n`;
    }
}

fs.writeFileSync('restaurar_infinity.sql', sql);
console.log("✅ Archivo 'restaurar_infinity.sql' generado exitosamente.");
console.log("👉 Ahora ve a InfinityFree, dale clic a 'phpMyAdmin', selecciona tu base de datos y usa la pestaña 'Importar' para subir este archivo.");
