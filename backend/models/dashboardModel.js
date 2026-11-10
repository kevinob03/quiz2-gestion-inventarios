import { pool } from './db.js';
import { listPossibleDuplicates } from './purchaseOrderModel.js';

export async function getDashboard() {
  const [[{ materials }]] = await pool.query('SELECT COUNT(*) materials FROM materials WHERE active=1');
  const [[{ locations }]] = await pool.query('SELECT COUNT(*) locations FROM locations WHERE active=1');
  const [lowStock] = await pool.query(`
    SELECT m.id,m.code,m.name,m.unit,m.reorder_point,m.min_stock,
      COALESCE(SUM(signed.quantity),0) stock
    FROM materials m
    LEFT JOIN (
      SELECT material_id,location_id,SUM(quantity) quantity
      FROM stock_movements
      GROUP BY material_id,location_id
    ) signed ON signed.material_id=m.id
    WHERE m.active=1
    GROUP BY m.id
    HAVING stock < m.reorder_point
    ORDER BY stock/reorder_point ASC
  `);
  const [movements] = await pool.query(`
    SELECT mv.id,mv.movement_type,mv.quantity,mv.movement_date,
      m.name material_name,m.unit,l.name location_name,mv.reference_document
    FROM stock_movements mv
    JOIN materials m ON m.id=mv.material_id
    JOIN locations l ON l.id=mv.location_id
    ORDER BY mv.movement_date DESC,mv.id DESC
    LIMIT 6
  `);
  const duplicates = await listPossibleDuplicates();
  return {
    indicators: { materials, locations, alerts: lowStock.length, duplicateOrders: duplicates.length },
    lowStock,
    movements,
    duplicates: duplicates.slice(0, 5),
  };
}
