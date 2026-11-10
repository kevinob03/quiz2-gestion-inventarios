import { pool } from './db.js';

export async function listSuppliers() {
  const [rows] = await pool.query('SELECT * FROM suppliers WHERE active=1 ORDER BY name');
  return rows;
}

export function createSupplier({ name, tax_id, contact_name, email, phone }) {
  return pool.execute(
    'INSERT INTO suppliers(name,tax_id,contact_name,email,phone) VALUES(?,?,?,?,?)',
    [name, tax_id || null, contact_name || null, email || null, phone || null],
  );
}

export function updateSupplier(id, { name, tax_id, contact_name, email, phone }) {
  return pool.execute(
    'UPDATE suppliers SET name=?,tax_id=?,contact_name=?,email=?,phone=? WHERE id=?',
    [name, tax_id || null, contact_name || null, email || null, phone || null, id],
  );
}

export async function archiveSupplier(id) {
  const [[{ orders }]] = await pool.execute(
    'SELECT COUNT(*) orders FROM purchase_orders WHERE supplier_id=?',
    [id],
  );
  if (orders) return { hasOrders: true, affectedRows: 0 };
  const [result] = await pool.execute('UPDATE suppliers SET active=0 WHERE id=?', [id]);
  return { hasOrders: false, affectedRows: result.affectedRows };
}
