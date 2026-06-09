const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');
const fs = require('fs');

db.all("SELECT * FROM inventory", [], (err, invRows) => {
  if (err) return console.error(err);
  
  const inventoryDict = {};
  invRows.forEach(inv => {
    inventoryDict[inv.name.toLowerCase()] = inv.unitCost;
  });

  db.all("SELECT id, materials FROM projects", [], (err, rows) => {
    if (err) return console.error(err);
    
    rows.forEach(row => {
      let materials;
      try {
        materials = JSON.parse(row.materials);
      } catch(e) {
        return;
      }
      
      let modified = false;
      materials.forEach(mat => {
        if (mat.unitCost === 0 || mat.unitCost === "0" || mat.unitCost === null || mat.unitCost === undefined) {
          const invCost = inventoryDict[mat.name.toLowerCase()];
          if (invCost !== undefined) {
            mat.unitCost = invCost;
            modified = true;
            console.log(`Restaurado ${mat.name} a costo ${invCost}`);
          } else {
            console.log(`No se encontro costo para ${mat.name} en el inventario`);
          }
        }
      });
      
      if (modified) {
        db.run("UPDATE projects SET materials = ? WHERE id = ?", [JSON.stringify(materials), row.id], (err) => {
          if (err) console.error(err);
          else console.log(`Proyecto ${row.id} actualizado.`);
        });
      }
    });
  });
});
