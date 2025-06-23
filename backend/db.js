// backend/db.js
const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

const connection = mysql.createConnection({
    host: process.env.MYSQL_HOST,           // aus .env
    user: process.env.MYSQL_USER,           // aus .env
    password: process.env.MYSQL_PASSWORD,   // aus .env
    database: process.env.MYSQL_DATABASE,   // aus .env
    port: process.env.MYSQL_PORT            // aus .env
});

connection.connect(err => {
    if (err) throw err;
    console.log('MySQL connected');
});

module.exports = connection;
