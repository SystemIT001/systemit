const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

db.serialize(() => {
  db.all("SELECT materials FROM projects", [], (err, projects) => {
    if (err) { console.error(err); return; }
    
    db.all("SELECT name FROM inventory", [], (err, inventoryRows) => {
      if (err) { console.error(err); return; }
      
      const existingNames = new Set(inventoryRows.map(r => r.name.toLowerCase().trim()));
      const itemsToAdd = new Map(); 

      projects.forEach(p => {
        if (!p.materials) return;
        try {
          const mats = JSON.parse(p.materials);
          mats.forEach(mat => {
            const matName = (mat.name || '').trim();
            if (matName && !existingNames.has(matName.toLowerCase())) {
              if (!itemsToAdd.has(matName.toLowerCase())) {
                itemsToAdd.set(matName.toLowerCase(), {
                  name: matName,
                  unitCost: mat.unitCost || 0,
                  category: 'materials'
                });
              }
            }
          });
        } catch (e) {
          console.error("Error parsing materials", e);
        }
      });

      if (itemsToAdd.size === 0) {
        console.log("No hay materiales nuevos en los proyectos que no estén ya en el inventario.");
        return;
      }

      console.log(`Encontrados ${itemsToAdd.size} materiales únicos en proyectos. Importando al inventario...`);
      
      const stmt = db.prepare(`INSERT INTO inventory (id, name, unitCost, stockQuantity, category, lastUpdated) VALUES (?, ?, ?, ?, ?, ?)`);
      
      let count = 0;
      for (const item of itemsToAdd.values()) {
        stmt.run('inv_' + generateId(), item.name, item.unitCost, 0, item.category, Date.now().toString());
        count++;
      }
      
      stmt.finalize();
      console.log(`¡Éxito! Se agregaron ${count} materiales al inventario, todos con cantidad 0.`);
    });
  });
});
