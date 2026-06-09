const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');
const fs = require('fs');

const estimatedPrices = {
  'tubos 3/4': 75,
  'conectores 3/4': 10,
  'curvas 3/4': 15,
  'uniones 3/4': 12,
  'bridas metalicas 3/4 una oreja': 5,
  'bridas metalicas 1/2 una oreja': 4,
  'conectores 1/2': 8,
  'cajas 2*4': 25,
  'tapas 2*4': 15,
  'cajas 4*4': 30,
  'tapas 4*4': 20,
  'lb de alambre calvanizado': 35,
  'teype': 20,
  'golosos de 1': 1,
  'tornillos para gysum 1/4x1 punta broca': 1,
  'espiches 3/8 2 pulgadas': 2,
  'golosos 2 pulgadas punta broca': 1.5
};

db.all("SELECT id, materials FROM projects", [], (err, rows) => {
  if (err) return console.error(err);
  
  rows.forEach(row => {
    let materials;
    try { materials = JSON.parse(row.materials); } catch(e) { return; }
    let modified = false;
    
    materials.forEach(mat => {
      if (!mat.unitCost || mat.unitCost === 0 || mat.unitCost === "0") {
        const foundCost = estimatedPrices[mat.name.toLowerCase()];
        if (foundCost !== undefined) {
          mat.unitCost = foundCost;
          mat.currency = 'NIO';
          if (!mat.profitMargin) {
             mat.profitMargin = 30; // Agregando ganancia por defecto
          }
          modified = true;
          console.log(`Fijado ${mat.name} a costo C$ ${foundCost} en proyecto ${row.id}`);
        } else {
           // Default fallback
           mat.unitCost = 15;
           mat.currency = 'NIO';
           if (!mat.profitMargin) {
             mat.profitMargin = 30;
           }
           modified = true;
           console.log(`Fijado fallback para ${mat.name} a costo C$ 15 en proyecto ${row.id}`);
        }
      }
    });
    
    if (modified) {
      db.run("UPDATE projects SET materials = ? WHERE id = ?", [JSON.stringify(materials), row.id], (err) => {
        if (err) console.error(err);
        else console.log(`Proyecto ${row.id} actualizado con precios estimados.`);
      });
    }
  });
});
