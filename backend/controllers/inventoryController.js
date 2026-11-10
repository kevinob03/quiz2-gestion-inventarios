import { listInventory } from '../models/locationModel.js';
import {
  createMovement,
  getMaterialTrace,
  listMovements,
} from '../models/movementModel.js';
import { listMaterials } from '../models/materialModel.js';

export async function inventory(_req, res) {
  res.json(await listInventory());
}

export async function movements(_req, res) {
  res.json(await listMovements());
}

export async function createMovementEntry(req, res) {
  const {
    material_id, movement_type, quantity, location_id, user_id, reference_document,
  } = req.body;
  if (
    !['entrada', 'salida', 'traslado', 'ajuste'].includes(movement_type)
    || !Number.isFinite(Number(quantity))
    || Number(quantity) <= 0
    || !material_id
    || !location_id
    || !user_id
    || !reference_document
  ) {
    return res.status(400).json({
      error: 'Tipo, material, cantidad positiva, ubicación, usuario y documento de origen son obligatorios.',
    });
  }
  res.status(201).json(await createMovement(req.body));
}

export async function reorderAlerts(_req, res) {
  const materials = await listMaterials();
  res.json(materials
    .filter((material) => material.stock < material.reorder_point)
    .map((material) => ({
      ...material,
      shortage: Number((material.reorder_point - material.stock).toFixed(2)),
    })));
}

export async function trace(req, res) {
  res.json(await getMaterialTrace(req.params.id));
}
