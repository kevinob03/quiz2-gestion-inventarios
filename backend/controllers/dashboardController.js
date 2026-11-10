import { getDashboard } from '../models/dashboardModel.js';

export async function dashboard(_req, res) {
  res.json(await getDashboard());
}
