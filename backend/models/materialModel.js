import { calcReorderPoint, calcSafetyStock } from '../src/domain.js';
import { pool } from './db.js';

export async function listMaterials() {
  const [rows] = await pool.query(`
    SELECT m.*, COALESCE(st.stock, 0) stock
    FROM materials m
    LEFT JOIN (
      SELECT material_id, SUM(quantity) stock
      FROM stock_movements
      GROUP BY material_id
    ) st ON st.material_id = m.id
    WHERE m.active = 1
    ORDER BY m.name
  `);
  return rows.map((row) => ({
    ...row,
    safety_stock: calcSafetyStock(row.avg_daily_demand, row.max_daily_demand, row.lead_time_days),
    reorder_point: calcReorderPoint(row.avg_daily_demand, row.max_daily_demand, row.lead_time_days),
  }));
}

export function createMaterial(material) {
  const { code, name, category, unit, min_stock, max_stock, avg_daily_demand, max_daily_demand, lead_time_days } = material;
  return pool.execute(
    'INSERT INTO materials(code,name,category,unit,min_stock,max_stock,avg_daily_demand,max_daily_demand,lead_time_days) VALUES(?,?,?,?,?,?,?,?,?)',
    [code, name, category, unit, min_stock, max_stock, avg_daily_demand, max_daily_demand, lead_time_days],
  );
}

export function updateMaterial(id, material) {
  const { code, name, category, unit, min_stock, max_stock, avg_daily_demand, max_daily_demand, lead_time_days } = material;
  return pool.execute(
    'UPDATE materials SET code=?,name=?,category=?,unit=?,min_stock=?,max_stock=?,avg_daily_demand=?,max_daily_demand=?,lead_time_days=? WHERE id=?',
    [code, name, category, unit, min_stock, max_stock, avg_daily_demand, max_daily_demand, lead_time_days, id],
  );
}

export async function archiveMaterial(id) {
  const [[{ moves }]] = await pool.execute(
    'SELECT COUNT(*) moves FROM stock_movements WHERE material_id=?',
    [id],
  );
  if (moves) return { hasHistory: true, affectedRows: 0 };
  const [result] = await pool.execute('UPDATE materials SET active=0 WHERE id=?', [id]);
  return { hasHistory: false, affectedRows: result.affectedRows };
}
