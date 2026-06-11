const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');

db.serialize(() => {
  db.all("SELECT * FROM projects WHERE projectName = 'Nueva Cotización'", [], (err, rows) => {
    if (err) { console.error(err); return; }
    if (rows.length === 0) { console.log('No encontrado'); return; }
    
    console.log(`Encontrados ${rows.length} registros. Procesando el primero...`);
    const row = rows.find(r => r.clientName.toLowerCase().includes('ana')) || rows[0];
    
    console.log("Moviendo:", row.id, row.projectName, row.clientName);
    
    const stmt = db.prepare(`INSERT OR REPLACE INTO quotes 
      (id, clientId, clientName, projectName, date, status, exchangeRate, materials, equipments, labor, projectCode, expenses, tasks, lastUpdated) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      
    stmt.run(
      row.id, row.clientId, row.clientName, row.projectName, row.date, 'draft', 
      row.exchangeRate, row.materials, row.equipments, row.labor, row.projectCode, row.expenses, row.tasks, Date.now()
    );
    stmt.finalize();

    db.run("DELETE FROM projects WHERE id = ?", [row.id], (err) => {
      if (err) console.error(err);
      else console.log("¡Registro devuelto a cotizaciones exitosamente!");
    });
  });
});
