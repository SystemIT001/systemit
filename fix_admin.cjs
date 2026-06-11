const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('database.sqlite');
db.run("UPDATE users SET role = 'admin', name = 'Administrador General', id = '1' WHERE username = 'admin'", (err) => {
  if (err) console.error(err);
  else console.log('Admin user updated successfully');
});
