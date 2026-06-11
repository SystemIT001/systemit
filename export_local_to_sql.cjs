const sqlite3 = require('sqlite3');
const fs = require('fs');

const db = new sqlite3.Database('database.sqlite', (err) => {
    if (err) {
        console.error("❌ Error al abrir la base de datos local:", err);
        process.exit(1);
    }
});

let sql = '';

const processTable = (tableName, callback) => {
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM ${tableName}`, (err, rows) => {
            if (err) return reject(err);
            if (rows && rows.length > 0) {
                sql += `DELETE FROM ${tableName};\n`;
                for (const row of rows) {
                    callback(row);
                }
                sql += '\n';
            }
            resolve();
        });
    });
};

const escapeSql = (val) => {
    if (val === null || val === undefined) return '';
    return String(val).replace(/'/g, "''");
};

async function generateSql() {
    try {
        await processTable('projects', (p) => {
            sql += `INSERT INTO projects (id, clientName, projectName, date, status, exchangeRate, materials, equipments, labor, invoices, payments, projectCode, expenses, tasks, clientId, images) VALUES ('${p.id}', '${escapeSql(p.clientName)}', '${escapeSql(p.projectName)}', '${escapeSql(p.date)}', '${escapeSql(p.status)}', ${p.exchangeRate}, '${escapeSql(p.materials)}', '${escapeSql(p.equipments)}', '${escapeSql(p.labor)}', '${escapeSql(p.invoices)}', '${escapeSql(p.payments)}', '${escapeSql(p.projectCode)}', '${escapeSql(p.expenses)}', '${escapeSql(p.tasks)}', '${escapeSql(p.clientId)}', '${escapeSql(p.images)}');\n`;
        });

        await processTable('inventory', (i) => {
            sql += `INSERT INTO inventory (id, name, unitCost, stockQuantity, category, lastUpdated) VALUES ('${i.id}', '${escapeSql(i.name)}', ${i.unitCost}, ${i.stockQuantity}, '${escapeSql(i.category)}', '${escapeSql(i.lastUpdated)}');\n`;
        });

        await processTable('clients', (c) => {
            sql += `INSERT INTO clients (id, name, contactPerson, email, phone, address) VALUES ('${c.id}', '${escapeSql(c.name)}', '${escapeSql(c.contactPerson)}', '${escapeSql(c.email)}', '${escapeSql(c.phone)}', '${escapeSql(c.address)}');\n`;
        });

        await processTable('users', (u) => {
            sql += `INSERT INTO users (id, username, password, name, role) VALUES ('${u.id}', '${escapeSql(u.username)}', '${escapeSql(u.password)}', '${escapeSql(u.name)}', '${escapeSql(u.role)}');\n`;
        });

        fs.writeFileSync('restaurar_infinity.sql', sql);
        console.log("✅ Archivo 'restaurar_infinity.sql' generado exitosamente.");
    } catch (e) {
        console.error("❌ Error generando SQL:", e);
    } finally {
        db.close();
    }
}

generateSql();
