const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');

db.serialize(() => {
  db.run("UPDATE quotes SET status = 'quote'", function(err) {
    if (err) {
      console.error(err.message);
    } else {
      console.log(`Updated ${this.changes} quotes to have status 'quote'.`);
    }
  });
});
db.close();
