import {
  archiveSupplier,
  createSupplier,
  listSuppliers,
  updateSupplier,
} from '../models/supplierModel.js';

export async function list(_req, res) {
  res.json(await listSuppliers());
}

export async function create(req, res) {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'El nombre del proveedor es obligatorio.' });
  const [result] = await createSupplier(req.body);
  res.status(201).json({ id: result.insertId });
}

export async function update(req, res) {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'El nombre del proveedor es obligatorio.' });
  const [result] = await updateSupplier(req.params.id, req.body);
  if (!result.affectedRows) return res.status(404).json({ error: 'Proveedor no encontrado.' });
  res.json({ ok: true });
}

export async function archive(req, res) {
  const result = await archiveSupplier(req.params.id);
  if (result.hasOrders) {
    return res.status(409).json({
      error: 'Este proveedor tiene órdenes relacionadas. Desactívelo para conservar la trazabilidad.',
    });
  }
  if (!result.affectedRows) return res.status(404).json({ error: 'Proveedor no encontrado.' });
  res.status(204).end();
}
