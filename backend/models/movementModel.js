import { makeMovementEntries } from '../src/domain.js';
import { pool } from './db.js';

export async function listMovements() {
  const [rows] = await pool.query(`
    SELECT mv.*,m.code,m.name material_name,m.unit,l.name location_name,
      src.name source_location_name,u.name user_name
    FROM stock_movements mv
    JOIN materials m ON m.id=mv.material_id
    JOIN locations l ON l.id=mv.location_id
    LEFT JOIN locations src ON src.id=mv.source_location_id
    JOIN app_users u ON u.id=mv.user_id
    ORDER BY mv.movement_date DESC,mv.id DESC
    LIMIT 300
  `);
  return rows;
}

export async function createMovement(movement) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const entries = makeMovementEntries({
      movement_type: movement.movement_type,
      material_id: Number(movement.material_id),
      quantity: Number(movement.quantity),
      location_id: Number(movement.location_id),
      source_location_id: Number(movement.source_location_id),
    });
    const locationIds = [...new Set(entries.map((entry) => entry.location_id))].sort((a, b) => a - b);
    for (const locationId of locationIds) {
      await connection.execute('SELECT id FROM locations WHERE id=? FOR UPDATE', [locationId]);
    }
    for (const entry of entries) {
      const [[stock]] = await connection.execute(
        'SELECT COALESCE(SUM(quantity),0) stock FROM stock_movements WHERE material_id=? AND location_id=?',
        [entry.material_id, entry.location_id],
      );
      if (stock.stock + entry.quantity < 0) {
        throw Object.assign(new Error('Stock insuficiente en la ubicación seleccionada.'), { status: 409 });
      }
    }
    for (const entry of entries) {
      await connection.execute(
        'INSERT INTO stock_movements(material_id,movement_type,quantity,location_id,source_location_id,movement_date,user_id,reference_document,notes) VALUES(?,?,?,?,?,?,?,?,?)',
        [
          entry.material_id,
          movement.movement_type,
          entry.quantity,
          entry.location_id,
          entry.source_location_id,
          movement.movement_date || new Date(),
          movement.user_id,
          movement.reference_document,
          movement.notes || null,
        ],
      );
    }
    await connection.commit();
    return { ok: true, entries: entries.length };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function getMaterialTrace(id) {
  const [rows] = await pool.execute(`
    SELECT mv.*,m.code,m.name material_name,m.unit,l.name location_name,
      src.name source_location_name,u.name user_name,po.order_number
    FROM stock_movements mv
    JOIN materials m ON m.id=mv.material_id
    JOIN locations l ON l.id=mv.location_id
    LEFT JOIN locations src ON src.id=mv.source_location_id
    JOIN app_users u ON u.id=mv.user_id
    LEFT JOIN purchase_orders po ON po.order_number=mv.reference_document
    WHERE m.id=?
    ORDER BY mv.movement_date DESC,mv.id DESC
  `, [id]);
  return rows;
}
