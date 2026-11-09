# Control de inventario · Constructora Del Valle

Prototipo web para registrar existencias por bodega u obra, documentar movimientos, calcular reposición y revisar órdenes potencialmente duplicadas. La API es Node.js + Express; el cliente es React + Vite; la persistencia usa MySQL 8.

## Requisitos

- Node.js 20 o superior y npm.
- MySQL 8 accesible localmente.

## Instalación

1. Cree la base y cargue los datos de ejemplo en una terminal MySQL:

   ```sql
   SOURCE database/schema.sql;
   SOURCE database/seed.sql;
   ```

2. Copie `.env.example` a `.env` y configure `DB_USER`, `DB_PASSWORD` y, si aplica, host/puerto. No comparta ni suba `.env`.
3. Instale dependencias: `npm install`.
4. Abra dos terminales en la raíz del proyecto y ejecute `npm run server` y `npm run dev`.
5. Abra la URL de Vite (normalmente `http://localhost:5173`). La API usa `http://localhost:3001`; compruebe `/api/health`.

## Funciones principales

- Materiales con mínimo, máximo, demanda promedio/máxima y plazo; SS y PR salen de la fórmula del enunciado. El stock se deriva de movimientos con cantidad firmada.
- Entradas, salidas, ajustes y traslados atómicos entre ubicaciones. Una salida no puede dejar stock negativo; las filas de ubicación se bloquean durante la operación.
- Inventario agrupado por material y ubicación, alertas en `/api/alerts/reorder` y trazabilidad en `/api/materials/:id/trace`.
- Órdenes vinculadas a proveedor y artículos. Las entradas aceptan el número de OC como documento de origen.
- Coincidencia potencial: proveedor y material iguales, fechas a no más de `DUPLICATE_WINDOW_DAYS` (3 por defecto) y diferencia de cantidad no mayor a `DUPLICATE_QTY_TOLERANCE` (10 % por defecto). La API explica la coincidencia y no cancela ni elimina nada.

## API

`GET /api/health`, `GET /api/dashboard`, `GET/POST /api/materials`, `PUT/DELETE /api/materials/:id`, `GET/POST /api/locations`, `GET /api/inventory`, `GET/POST /api/movements`, `GET/POST /api/suppliers`, `GET/POST /api/orders`, `GET /api/orders/possible-duplicates`, `GET /api/alerts/reorder`, `GET /api/materials/:id/trace`.

El asistente añade `GET /api/assistant/status` y `POST /api/assistant/chat`. Configura `GEMINI_API_KEY` en `.env`; `GEMINI_MODEL` permite cambiar el modelo. El agente usa herramientas de solo lectura para consultar alertas, stock por material/ubicación, posibles duplicados e historial. Los mensajes y resultados de inventario necesarios para responder se envían a Gemini. El chat no se guarda en MySQL y la clave nunca se envía al navegador.

Si Gemini devuelve un error de clave, modelo o cuota, el panel muestra una explicación para revisar la configuración del proyecto en Google AI Studio.

## Verificaciones

`npm test` ejecuta pruebas de fórmulas, criterio duplicado y traslados; `npm run build` compila el cliente. La conexión requiere MySQL instalado y configurado; se valida con `GET /api/health`.

## Estructura

- `app.js`: API y transacciones MySQL.
- `src/domain.js`: reglas de cálculo y movimientos.
- `src/main.jsx`, `src/style.css`: interfaz en español.
- `database/schema.sql`, `database/seed.sql`: tablas y datos de demostración.
- `docs/INFORME.md`: resolución académica con cálculos y supuestos señalados.
- `output/pdf/Informe_Quiz_2_Gestion_Inventarios.pdf`: informe final exportado, 3 páginas.
- `PLAN_TRABAJO.md`: avance y resultados comprobados.
