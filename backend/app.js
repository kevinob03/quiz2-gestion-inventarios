import cors from 'cors';
import express from 'express';
import { pool } from './models/db.js';
import apiRoutes from './routes/apiRoutes.js';

const app = express();
const allowedOrigins = new Set([
  process.env.CORS_ORIGIN,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
].filter(Boolean));

app.use(cors({
  origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin)),
}));
app.use(express.json());
app.use('/api', apiRoutes);

app.use((error, _req, res, _next) => {
  console.error(error);
  const status = error.status || (error.code === 'ER_DUP_ENTRY' ? 409 : 500);
  const message = error.code === 'ER_DUP_ENTRY'
    ? 'El código o número ya existe.'
    : error.message || 'Error interno del servidor.';
  res.status(status).json({ error: message });
});

const port = Number(process.env.PORT || 3001);
if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => console.log(`API de inventario en http://localhost:${port}`));
}

export default app;
