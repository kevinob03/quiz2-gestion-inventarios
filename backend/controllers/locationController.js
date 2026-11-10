import { createLocation, listLocations } from '../models/locationModel.js';

export async function list(_req, res) {
  res.json(await listLocations());
}

export async function create(req, res) {
  const { code, name, location_type } = req.body;
  if (!code || !name || !location_type) {
    return res.status(400).json({ error: 'Código, nombre y tipo son obligatorios.' });
  }
  const [result] = await createLocation(req.body);
  res.status(201).json({ id: result.insertId });
}
