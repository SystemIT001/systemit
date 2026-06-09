const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');
const fs = require('fs');

db.all("SELECT id, materials FROM projects", [], (err, rows) => {
  if (err) {
    console.error(err);
    return;
  }
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
        console.log(`Encontrado material en proyecto ${row.id}: ${mat.name} con costo ${mat.unitCost}`);
      }
    });
  });
});
