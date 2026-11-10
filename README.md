# Control de inventario · Constructora Del Valle

Aplicación de inventarios con cliente React + Vite, API Node.js + Express y base de datos MySQL 8. El asistente de inventario consulta datos usando Gemini.

## Estructura

- backend/app.js configura Express y conecta las rutas.
- backend/routes/ define los endpoints de la API.
- backend/controllers/ valida solicitudes y prepara respuestas.
- backend/models/ concentra las consultas y transacciones de MySQL.
- backend/src/ contiene reglas del dominio y el asistente Gemini.
- frontend/src/components/ contiene piezas reutilizables de interfaz.
- frontend/src/pages/ contiene las vistas del sistema.
- frontend/src/routes/ asocia la navegación con las vistas.
- frontend/src/App.jsx integra la aplicación; frontend/src/main.jsx la monta en el navegador.
- docs/ y output/ conservan el informe y los guiones del quiz.

## Requisitos

- Node.js 20 o superior y npm.
- MySQL 8 accesible localmente.

## Instalación y ejecución

1. Desde una terminal MySQL, ejecutar backend/database/schema.sql y después backend/database/seed.sql.
2. Copiar .env.example a .env en la raíz del repositorio y configurar DB_USER, DB_PASSWORD y GEMINI_API_KEY.
3. En la raíz del repositorio, ejecutar npm install.
4. Abrir dos terminales en la raíz. Ejecutar npm run server en una y npm run dev en la otra.
5. Abrir la URL de Vite, normalmente http://localhost:5173. La API escucha en http://localhost:3001; comprobar /api/health.

Los comandos npm de la raíz delegan el trabajo al workspace correspondiente. También se puede ejecutar npm run server --workspace backend y npm run dev --workspace frontend.

## Funciones

- Materiales, existencias por ubicación, movimientos, proveedores y órdenes de compra.
- Cálculo de stock de seguridad y punto de reorden; alertas y trazabilidad.
- Detección de posibles órdenes duplicadas por proveedor, material, cantidad y fecha.
- Asistente Gemini de solo lectura para consultar datos del inventario.

La clave Gemini se mantiene en el servidor y no se envía al navegador. Las preguntas y los datos de inventario usados para responder se transmiten a Gemini.

## Verificaciones

- npm test ejecuta pruebas de las reglas del dominio.
- npm run build compila el frontend.

## Rutas de la API

GET /api/health, GET /api/dashboard, GET/POST /api/materials, PUT/DELETE /api/materials/:id, GET/POST /api/locations, GET /api/inventory, GET/POST /api/movements, GET/POST /api/suppliers, GET/POST /api/orders, GET /api/orders/possible-duplicates, GET /api/alerts/reorder y GET /api/materials/:id/trace.

El asistente añade GET /api/assistant/status y POST /api/assistant/chat.
