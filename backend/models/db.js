import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'del_valle_inventario',
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true,
});
