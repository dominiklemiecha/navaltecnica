const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'navaltecnica',
  password: process.env.DB_PASSWORD || 'navaltecnica_db_2026',
  database: process.env.DB_NAME || 'navaltecnica',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
