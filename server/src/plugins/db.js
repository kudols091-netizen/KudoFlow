const mysql = require('mysql2/promise');
require('dotenv').config();

let pool = null;

function getPool() {
  if (!pool) {
    // Railway cung cấp MYSQL_URL, local dùng từng biến riêng
    if (process.env.MYSQL_URL) {
      pool = mysql.createPool(process.env.MYSQL_URL + '?charset=utf8mb4');
    } else {
      pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'kudotoolai',
        waitForConnections: true,
        connectionLimit: 20,
        charset: 'utf8mb4',
      });
    }
  }
  return pool;
}

async function query(sql, params = []) {
  const [rows] = await getPool().execute(sql, params);
  return rows;
}

async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

module.exports = { getPool, query, queryOne };
