import { pool } from './db.js';

export async function listLocations() {
  const [rows] = await pool.query('SELECT * FROM locations WHERE active=1 ORDER BY name');
  return rows;
}

export function createLocation({ code, name, location_type, site_name }) {
  return pool.execute(
    'INSERT INTO locations(code,name,location_type,site_name) VALUES(?,?,?,?)',
    [code, name, location_type, site_name || null],
  );
}

export async function listInventory() {
  const [rows] = await pool.query(`
    SELECT l.id location_id,l.name location_name,l.site_name,m.id material_id,m.code,
      m.name material_name,m.unit,m.reorder_point,COALESCE(SUM(mv.quantity),0) stock
    FROM locations l
    CROSS JOIN materials m
    LEFT JOIN stock_movements mv ON mv.location_id=l.id AND mv.material_id=m.id
    WHERE l.active=1 AND m.active=1
    GROUP BY l.id,m.id
    ORDER BY l.name,m.name
  `);
  return rows;
}
