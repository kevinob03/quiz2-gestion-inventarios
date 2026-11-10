import { listOrders, createOrder, listPossibleDuplicates } from '../models/purchaseOrderModel.js';

export async function list(_req, res) {
  res.json(await listOrders());
}

export async function create(req, res) {
  const { order_number, supplier_id, items } = req.body;
  if (!order_number || !supplier_id || !Array.isArray(items) || !items.length) {
    return res.status(400).json({
      error: 'Número, proveedor y al menos un artículo son obligatorios.',
    });
  }
  res.status(201).json(await createOrder(req.body));
}

export async function possibleDuplicates(_req, res) {
  res.json(await listPossibleDuplicates());
}
