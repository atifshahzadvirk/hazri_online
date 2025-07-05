// backend/db.js
const mysql = require('mysql2/promise'); // <--- ÄNDERN: promise verwenden!
const dotenv = require('dotenv');

dotenv.config();

// Connection Pool statt Einzelverbindung!
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQL_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool; // <--- Pool exportieren!
