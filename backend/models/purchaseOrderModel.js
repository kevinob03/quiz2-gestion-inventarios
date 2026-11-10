import { pool } from './db.js';

export async function listOrders() {
  const [rows] = await pool.query(`
    SELECT po.*,s.name supplier_name,COUNT(li.id) item_count,
      SUM(li.quantity*li.unit_price) total
    FROM purchase_orders po
    JOIN suppliers s ON s.id=po.supplier_id
    LEFT JOIN purchase_order_items li ON li.purchase_order_id=po.id
    GROUP BY po.id
    ORDER BY po.order_date DESC
  `);
  return rows;
}

export async function createOrder({ order_number, supplier_id, order_date, items }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.execute(
      'INSERT INTO purchase_orders(order_number,supplier_id,order_date,status) VALUES(?,?,?,?)',
      [order_number, supplier_id, order_date || new Date(), 'registrada'],
    );
    for (const item of items) {
      if (!item.material_id || Number(item.quantity) <= 0 || Number(item.unit_price) < 0) {
        throw Object.assign(
          new Error('Cada línea necesita material, cantidad positiva y precio válido.'),
          { status: 400 },
        );
      }
      await connection.execute(
        'INSERT INTO purchase_order_items(purchase_order_id,material_id,quantity,unit_price) VALUES(?,?,?,?)',
        [result.insertId, item.material_id, item.quantity, item.unit_price],
      );
    }
    await connection.commit();
    return { id: result.insertId };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function listPossibleDuplicates() {
  const days = Number(process.env.DUPLICATE_WINDOW_DAYS || 3);
  const tolerance = Number(process.env.DUPLICATE_QTY_TOLERANCE || 0.10);
  const [rows] = await pool.query(`
    SELECT a.id order_a_id,a.order_number order_a,b.id order_b_id,b.order_number order_b,
      s.name supplier_name,m.name material_name,ia.quantity qty_a,ib.quantity qty_b,
      a.order_date date_a,b.order_date date_b,
      ABS(DATEDIFF(a.order_date,b.order_date)) days_apart
    FROM purchase_orders a
    JOIN purchase_orders b ON a.id<b.id AND a.supplier_id=b.supplier_id
    JOIN suppliers s ON s.id=a.supplier_id
    JOIN purchase_order_items ia ON ia.purchase_order_id=a.id
    JOIN purchase_order_items ib ON ib.purchase_order_id=b.id AND ib.material_id=ia.material_id
    JOIN materials m ON m.id=ia.material_id
    WHERE ABS(DATEDIFF(a.order_date,b.order_date))<=?
      AND ABS(ia.quantity-ib.quantity)/GREATEST(ia.quantity,ib.quantity)<=?
    ORDER BY days_apart
  `, [days, tolerance]);
  return rows.map((row) => ({
    ...row,
    reason: `Mismo proveedor y artículo; cantidades dentro de ${tolerance * 100}% y fechas separadas por ${row.days_apart} día(s).`,
  }));
}
