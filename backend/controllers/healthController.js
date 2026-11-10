import { pool } from '../models/db.js';

export async function health(_req, res) {
  await pool.query('SELECT 1');
  res.json({ ok: true, database: 'connected' });
}
