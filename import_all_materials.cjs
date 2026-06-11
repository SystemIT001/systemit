const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');
function generateId() { return Math.random().toString(36).substring(2, 10); }

db.serialize(() => {
  db.all('SELECT materials FROM projects UNION ALL SELECT materials FROM quotes', [], (err, rows) => {
    if (err) return console.error("Error reading projects/quotes:", err);
    db.all('SELECT name FROM inventory', [], (err, inventoryRows) => {
      if (err) return console.error("Error reading inventory:", err);
      
      const existingNames = new Set((inventoryRows || []).map(r => r.name.toLowerCase().trim()));
      const itemsToAdd = new Map();
      
      rows.forEach(p => {
        if (!p.materials) return;
        try {
          const mats = JSON.parse(p.materials);
          mats.forEach(mat => {
            const matName = (mat.name || '').trim();
            if (matName && !existingNames.has(matName.toLowerCase()) && !itemsToAdd.has(matName.toLowerCase())) {
              itemsToAdd.set(matName.toLowerCase(), { name: matName, unitCost: mat.unitCost || 0 });
            }
          });
        } catch (e) {}
      });
      
      if (itemsToAdd.size === 0) { console.log('No new materials found in projects or quotes.'); return; }
      
      console.log('Found ' + itemsToAdd.size + ' new materials.');
      const stmt = db.prepare('INSERT INTO inventory (id, name, unitCost, stockQuantity, category, lastUpdated) VALUES (?, ?, ?, ?, ?, ?)');
      let count = 0;
      itemsToAdd.forEach(item => {
        stmt.run('inv_' + generateId(), item.name, item.unitCost, 0, 'materials', Date.now().toString());
        count++;
      });
      stmt.finalize();
      console.log('Successfully inserted ' + count + ' new materials into inventory.');
      db.close();
    });
  });
});
