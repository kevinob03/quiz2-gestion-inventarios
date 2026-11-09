# Plan de trabajo · Quiz #2 Gestión de Inventarios

## Objetivo y alcance

Construir la opción 2 del trabajo del curso: una aplicación Node.js conectada a MySQL para manejar materiales por bodega/obra, movimientos, reposición, proveedores, órdenes y trazabilidad; preparar además la resolución académica A1–A5 y los guiones. El repositorio se trabaja localmente; no se publica ni se hace push sin autorización explícita.

## Fases y checklist

### Fase 1 — Análisis y planificación

- [x] Leer las nueve páginas del PDF y extraer requisitos.
- [x] Revisar workspace: solo había un `app.js` vacío; no había código reutilizable.
- [x] Definir React/Vite + Express + MySQL 8 y modelo relacional.
- [x] Registrar regla inicial de duplicado: proveedor + artículo, hasta 10 % de diferencia de cantidad, máximo 3 días.

### Fase 2 — Base de datos y backend

- [x] Crear tablas relacionadas y script SQL reproducible.
- [x] Crear semilla del caso (materiales, ubicaciones, órdenes y saldos iniciales).
- [x] Implementar API para materiales, ubicaciones, movimientos, proveedores, OC, alertas, duplicados y traza.
- [x] Añadir endpoints de asistente con consultas de inventario de solo lectura y límite de uso.
- [x] Calcular SS/PR; saldo se deriva de movimientos.
- [x] Implementar rechazo de stock insuficiente y traslado en transacción.
- [x] Mantener credenciales en `.env`, excluido por Git.
- [x] Configurar MySQL local y ejecutar schema/seed contra una instancia.

### Fase 3 — Frontend

- [x] Crear dashboard adaptable en español con indicadores, alertas, duplicados y movimientos recientes.
- [x] Implementar vistas de materiales, inventario por ubicación, movimientos, proveedores, órdenes, alertas y trazabilidad.
- [x] Añadir formularios para material, ubicación, movimiento, proveedor y orden; edición/archivo seguro de materiales.
- [x] Conectar vistas a la API y mostrar errores/estado de conexión.
- [x] Añadir panel de asistente IA con preguntas sugeridas y aviso de transmisión de datos.
- [ ] Revisar la interfaz visualmente contra una base de datos activa.

### Fase 4 — Integración y pruebas

- [x] Pruebas unitarias de SS/PR, regla de duplicados y traslados.
- [x] `node --check app.js` y `node --check src/domain.js`.
- [x] `npm test`: 3 aprobadas, 0 fallidas.
- [x] `npm run build`: compilación Vite exitosa.
- [x] Prueba integrada API + MySQL: conexión correcta; dashboard, alertas y duplicados responden.
- [x] Verificar endpoint de estado: `GEMINI_API_KEY` está cargada; no se expone su valor.
- [x] Probar consulta Gemini; el proveedor devolvió 503/504 por alta demanda/timeout y la API ahora muestra un aviso temporal.
- [ ] Demostración manual de alerta, salida insuficiente y traza con base activa.
- [ ] Probar respuesta del asistente cuando se configure `GEMINI_API_KEY`.

### Fase 5 — Documentación y entregables

- [x] Informe Markdown A1–A5 con cálculos y supuestos señalados.
- [x] Diagrama entidad-relación Mermaid.
- [x] README de instalación, ejecución, API y regla configurable.
- [x] Guion de video de máximo 5 minutos.
- [x] Guion de presentación de 10 minutos.
- [x] Exportar informe a PDF (3 páginas) y revisar las páginas renderizadas; corregidos símbolos de moneda/desigualdad.
- [ ] Configurar conexión del repositorio GitHub y publicar solo tras autorización.

## Problemas pendientes / acciones manuales

1. MySQL y `.env` ya están configurados para la aplicación.
2. Reintentar una consulta del asistente cuando Gemini responda; la clave está configurada, pero las pruebas recientes devolvieron 503/504 temporal.
3. Ejecutar `npm run server` y `npm run dev`; validar `/api/health` y el flujo de demostración.
4. El directorio local no tiene `origin` configurado. El chequeo de referencias al URL recibido no devolvió ramas. No se intentó push; revisar que GitHub tenga el repositorio accesible y configurar `git remote add origin ...` manualmente si corresponde.
5. Para un despliegue real faltan autenticación/roles efectivos y aprobación de OC. Los usuarios/roles semilla son de demostración; no se protege la API con login.

## Resultados de pruebas

- `npm test`: correcto (3/3).
- `npm run build`: correcto (Vite 6.4.6).
- Comprobación sintáctica Node para API y reglas: correcta.
- MySQL conectado desde `.env`; schema y seed están cargados: 7 tablas, 1 usuario de demostración, 3 ubicaciones, 6 materiales, 7 OC, 7 líneas, 6 movimientos y 4 proveedores.
- API: `/api/health` HTTP 200; dashboard informa 2 alertas y 2 pares de OC sospechosas; endpoints de alertas y duplicados HTTP 200.
- CORS: se aceptan los dos orígenes locales (`localhost:5173` y `127.0.0.1:5173`); GET y preflight OPTIONS verificados con HTTP 200/204.
- Informe PDF: 3 páginas; se comprobó presencia de A1–A5 y cálculos clave, sin caracteres de sustitución ni guiones tipográficos problemáticos; render revisado visualmente.
- No se imprimieron ni copiaron credenciales del `.env` a la salida.

## Entregables pendientes

- Revisión visual de la demo en el navegador; evidencia real (si se requiere).
- Video de demostración grabado por el equipo y ensayo de la presentación.
- Conexión del remote GitHub si se pretende trabajar sobre ese repositorio remoto.
