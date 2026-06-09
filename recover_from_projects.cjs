const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');
const fs = require('fs');

db.all("SELECT id, materials FROM projects", [], (err, rows) => {
  if (err) return console.error(err);
  
  const priceDict = {};
  rows.forEach(row => {
    let materials;
    try { materials = JSON.parse(row.materials); } catch(e) { return; }
    materials.forEach(mat => {
      if (mat.unitCost && mat.unitCost > 0) {
        priceDict[mat.name.toLowerCase()] = mat.unitCost;
      }
    });
  });

  console.log("Precios encontrados en otros proyectos:", priceDict);

  rows.forEach(row => {
    let materials;
    try { materials = JSON.parse(row.materials); } catch(e) { return; }
    let modified = false;
    materials.forEach(mat => {
      if (!mat.unitCost || mat.unitCost === 0 || mat.unitCost === "0") {
        const foundCost = priceDict[mat.name.toLowerCase()];
        if (foundCost !== undefined) {
          mat.unitCost = foundCost;
          modified = true;
          console.log(`Restaurado ${mat.name} a costo ${foundCost} en proyecto ${row.id}`);
        }
      }
    });
    
    if (modified) {
      db.run("UPDATE projects SET materials = ? WHERE id = ?", [JSON.stringify(materials), row.id], (err) => {
        if (err) console.error(err);
        else console.log(`Proyecto ${row.id} actualizado con precios historicos.`);
      });
    }
  });
});
