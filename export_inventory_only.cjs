const sqlite3 = require('sqlite3');
const fs = require('fs');

const db = new sqlite3.Database('database.sqlite', (err) => {
    if (err) {
        console.error("❌ Error al abrir la base de datos local:", err);
        process.exit(1);
    }
});

let sql = '';

const escapeSql = (val) => {
    if (val === null || val === undefined) return '';
    return String(val).replace(/'/g, "''");
};

db.all(`SELECT * FROM inventory`, (err, rows) => {
    if (err) return console.error(err);
    if (rows && rows.length > 0) {
        for (const i of rows) {
            sql += `REPLACE INTO inventory (id, name, unitCost, stockQuantity, category, lastUpdated) VALUES ('${i.id}', '${escapeSql(i.name)}', ${i.unitCost}, ${i.stockQuantity}, '${escapeSql(i.category)}', '${escapeSql(i.lastUpdated)}');\n`;
        }
    }
    fs.writeFileSync('actualizar_inventario_web.sql', sql);
    console.log(`✅ Archivo 'actualizar_inventario_web.sql' generado exitosamente con ${rows.length} registros de inventario.`);
});
