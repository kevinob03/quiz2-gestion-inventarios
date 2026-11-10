import {
  archiveMaterial,
  createMaterial,
  listMaterials,
  updateMaterial,
} from '../models/materialModel.js';

export async function list(_req, res) {
  res.json(await listMaterials());
}

export async function create(req, res) {
  const {
    code, name, category, unit, min_stock, max_stock,
    avg_daily_demand, max_daily_demand, lead_time_days,
  } = req.body;
  if (!code || !name || !category || !unit) {
    return res.status(400).json({ error: 'Código, nombre, categoría y unidad son obligatorios.' });
  }
  const fields = {
    'stock mínimo': min_stock,
    'stock máximo': max_stock,
    'demanda promedio': avg_daily_demand,
    'demanda máxima': max_daily_demand,
    plazo: lead_time_days,
  };
  for (const [label, value] of Object.entries(fields)) {
    if (!Number.isFinite(Number(value)) || Number(value) < 0) {
      return res.status(400).json({ error: `${label} debe ser un número no negativo.` });
    }
  }
  if (Number(max_daily_demand) < Number(avg_daily_demand) || Number(max_stock) < Number(min_stock)) {
    return res.status(400).json({
      error: 'Los máximos deben ser iguales o mayores que los promedios y mínimos.',
    });
  }
  const [result] = await createMaterial(req.body);
  res.status(201).json({ id: result.insertId });
}

export async function update(req, res) {
  const [result] = await updateMaterial(req.params.id, req.body);
  if (!result.affectedRows) return res.status(404).json({ error: 'Material no encontrado.' });
  res.json({ ok: true });
}

export async function archive(req, res) {
  const result = await archiveMaterial(req.params.id);
  if (result.hasHistory) {
    return res.status(409).json({
      error: 'Este material tiene historial. Desactívelo para conservar la trazabilidad.',
    });
  }
  if (!result.affectedRows) return res.status(404).json({ error: 'Material no encontrado.' });
  res.status(204).end();
}
