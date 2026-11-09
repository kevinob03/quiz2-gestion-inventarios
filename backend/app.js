import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import { calcSafetyStock, calcReorderPoint, findDuplicateOrders, makeMovementEntries } from './src/domain.js';
import { askInventoryAgent } from './src/inventory-agent.js';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });

const app = express();
const allowedOrigins = new Set([process.env.CORS_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'].filter(Boolean));
app.use(cors({ origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin)) }));
app.use(express.json());
export const pool = mysql.createPool({ host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '', database: process.env.DB_NAME || 'del_valle_inventario', waitForConnections: true, connectionLimit: 10, decimalNumbers: true });
const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

app.get('/api/health', asyncRoute(async (_req, res) => { await pool.query('SELECT 1'); res.json({ ok: true, database: 'connected' }); }));
app.get('/api/assistant/status',(_req,res)=>res.json({configured:Boolean(process.env.GEMINI_API_KEY)}));
const assistantRate=new Map();
app.post('/api/assistant/chat',asyncRoute(async(req,res)=>{
 const now=Date.now(),ip=req.ip||req.socket.remoteAddress||'local',rate=assistantRate.get(ip);
 if(rate&&rate.until>now&&rate.count>=10)return res.status(429).json({error:'Alcanzaste el límite de 10 consultas por minuto. Intenta de nuevo en un momento.'});
 assistantRate.set(ip,rate&&rate.until>now?{count:rate.count+1,until:rate.until}:{count:1,until:now+60000});
 for(const[key,value]of assistantRate)if(value.until<=now)assistantRate.delete(key);
 const messages=req.body?.messages;
 if(!Array.isArray(messages)||messages.length<1||messages.length>12)return res.status(400).json({error:'Envía entre 1 y 12 mensajes de conversación.'});
 const valid=messages.every(m=>['user','assistant'].includes(m?.role)&&typeof m.content==='string'&&m.content.trim().length>0&&m.content.length<=1200);
 if(!valid||messages[messages.length-1].role!=='user')return res.status(400).json({error:'La conversación contiene mensajes inválidos.'});
 try{res.json({reply:await askInventoryAgent({pool,messages})})}catch(error){if(error.code==='GEMINI_KEY_MISSING')return res.status(503).json({error:error.message});console.error('Asistente Gemini: fallo del proveedor (HTTP '+(error.status||'sin estado')+').');if(error.status===429)return res.status(429).json({error:'Gemini alcanzó su límite de uso o cuota. Revisa la cuota de tu proyecto e inténtalo más tarde.'});if(error.status===503||error.status===504)return res.status(error.status).json({error:'Gemini está tardando en responder por alta demanda. Espera un momento y vuelve a intentar.'});if(error.status===401||error.status===403)return res.status(502).json({error:'Gemini rechazó la clave o el acceso al modelo. Revisa la clave y los permisos en Google AI Studio.'});res.status(502).json({error:'No se pudo consultar Gemini. Revisa la clave, el modelo y la configuración de la API.'})}
}));
app.get('/api/dashboard', asyncRoute(async (_req, res) => {
  const [[{ materials }]] = await pool.query('SELECT COUNT(*) materials FROM materials WHERE active=1');
  const [[{ locations }]] = await pool.query('SELECT COUNT(*) locations FROM locations WHERE active=1');
  const [lowStock] = await pool.query(`SELECT m.id,m.code,m.name,m.unit,m.reorder_point,m.min_stock,COALESCE(SUM(signed.quantity),0) stock FROM materials m LEFT JOIN (SELECT material_id,location_id,SUM(quantity) quantity FROM stock_movements GROUP BY material_id,location_id) signed ON signed.material_id=m.id WHERE m.active=1 GROUP BY m.id HAVING stock < m.reorder_point ORDER BY stock/reorder_point ASC`);
  const [movements] = await pool.query(`SELECT mv.id,mv.movement_type,mv.quantity,mv.movement_date,m.name material_name,m.unit,l.name location_name,mv.reference_document FROM stock_movements mv JOIN materials m ON m.id=mv.material_id JOIN locations l ON l.id=mv.location_id ORDER BY mv.movement_date DESC,mv.id DESC LIMIT 6`);
  const [duplicates] = await getDuplicateRows();
  res.json({ indicators: { materials, locations, alerts: lowStock.length, duplicateOrders: duplicates.length }, lowStock, movements, duplicates: duplicates.slice(0,5) });
}));

async function materialRows() {
 const [rows] = await pool.query(`SELECT m.*,COALESCE(st.stock,0) stock FROM materials m LEFT JOIN (SELECT material_id,SUM(quantity) stock FROM stock_movements GROUP BY material_id) st ON st.material_id=m.id WHERE m.active=1 ORDER BY m.name`);
 return rows.map(row=>({...row,safety_stock:calcSafetyStock(row.avg_daily_demand,row.max_daily_demand,row.lead_time_days),reorder_point:calcReorderPoint(row.avg_daily_demand,row.max_daily_demand,row.lead_time_days)}));
}
app.get('/api/materials', asyncRoute(async (_req,res)=>res.json(await materialRows())));
app.post('/api/materials', asyncRoute(async (req,res)=>{
 const {code,name,category,unit,min_stock,max_stock,avg_daily_demand,max_daily_demand,lead_time_days}=req.body;
 if(!code||!name||!category||!unit) return res.status(400).json({error:'Código, nombre, categoría y unidad son obligatorios.'});
 for(const [label,value] of Object.entries({'stock mínimo':min_stock,'stock máximo':max_stock,'demanda promedio':avg_daily_demand,'demanda máxima':max_daily_demand,'plazo':lead_time_days})) if(!Number.isFinite(Number(value))||Number(value)<0) return res.status(400).json({error:`${label} debe ser un número no negativo.`});
 if(Number(max_daily_demand)<Number(avg_daily_demand)||Number(max_stock)<Number(min_stock)) return res.status(400).json({error:'Los máximos deben ser iguales o mayores que los promedios y mínimos.'});
 const [result]=await pool.execute('INSERT INTO materials(code,name,category,unit,min_stock,max_stock,avg_daily_demand,max_daily_demand,lead_time_days) VALUES(?,?,?,?,?,?,?,?,?)',[code,name,category,unit,min_stock,max_stock,avg_daily_demand,max_daily_demand,lead_time_days]); res.status(201).json({id:result.insertId});
}));
app.put('/api/materials/:id', asyncRoute(async (req,res)=>{
 const {code,name,category,unit,min_stock,max_stock,avg_daily_demand,max_daily_demand,lead_time_days}=req.body;
 const [result]=await pool.execute('UPDATE materials SET code=?,name=?,category=?,unit=?,min_stock=?,max_stock=?,avg_daily_demand=?,max_daily_demand=?,lead_time_days=? WHERE id=?',[code,name,category,unit,min_stock,max_stock,avg_daily_demand,max_daily_demand,lead_time_days,req.params.id]);
 if(!result.affectedRows)return res.status(404).json({error:'Material no encontrado.'}); res.json({ok:true});
}));
app.delete('/api/materials/:id', asyncRoute(async (req,res)=>{ const [[{moves}]] = await pool.execute('SELECT COUNT(*) moves FROM stock_movements WHERE material_id=?',[req.params.id]); if(moves) return res.status(409).json({error:'Este material tiene historial. Desactívelo para conservar la trazabilidad.'}); const [r]=await pool.execute('UPDATE materials SET active=0 WHERE id=?',[req.params.id]); if(!r.affectedRows)return res.status(404).json({error:'Material no encontrado.'}); res.status(204).end(); }));
app.get('/api/locations', asyncRoute(async (_req,res)=>{const [r]=await pool.query('SELECT * FROM locations WHERE active=1 ORDER BY name');res.json(r)}));
app.post('/api/locations',asyncRoute(async(req,res)=>{const {code,name,location_type,site_name}=req.body;if(!code||!name||!location_type)return res.status(400).json({error:'Código, nombre y tipo son obligatorios.'});const [r]=await pool.execute('INSERT INTO locations(code,name,location_type,site_name) VALUES(?,?,?,?)',[code,name,location_type,site_name||null]);res.status(201).json({id:r.insertId})}));
app.get('/api/inventory',asyncRoute(async(_req,res)=>{const [r]=await pool.query(`SELECT l.id location_id,l.name location_name,l.site_name,m.id material_id,m.code,m.name material_name,m.unit,m.reorder_point,COALESCE(SUM(mv.quantity),0) stock FROM locations l CROSS JOIN materials m LEFT JOIN stock_movements mv ON mv.location_id=l.id AND mv.material_id=m.id WHERE l.active=1 AND m.active=1 GROUP BY l.id,m.id ORDER BY l.name,m.name`);res.json(r)}));
app.get('/api/movements',asyncRoute(async(req,res)=>{const [r]=await pool.query(`SELECT mv.*,m.code,m.name material_name,m.unit,l.name location_name,src.name source_location_name,u.name user_name FROM stock_movements mv JOIN materials m ON m.id=mv.material_id JOIN locations l ON l.id=mv.location_id LEFT JOIN locations src ON src.id=mv.source_location_id JOIN app_users u ON u.id=mv.user_id ORDER BY mv.movement_date DESC,mv.id DESC LIMIT 300`);res.json(r)}));
app.post('/api/movements',asyncRoute(async(req,res)=>{
 const {material_id,movement_type,quantity,location_id,source_location_id,movement_date,user_id,reference_document,notes}=req.body;
 if(!['entrada','salida','traslado','ajuste'].includes(movement_type)||!Number.isFinite(Number(quantity))||Number(quantity)<=0||!material_id||!location_id||!user_id||!reference_document)return res.status(400).json({error:'Tipo, material, cantidad positiva, ubicación, usuario y documento de origen son obligatorios.'});
 const conn=await pool.getConnection();try{await conn.beginTransaction();const entries=makeMovementEntries({movement_type,material_id:Number(material_id),quantity:Number(quantity),location_id:Number(location_id),source_location_id:Number(source_location_id)});for(const loc of [...new Set(entries.map(e=>e.location_id))].sort((a,b)=>a-b))await conn.execute('SELECT id FROM locations WHERE id=? FOR UPDATE',[loc]);for(const e of entries){const [[s]]=await conn.execute('SELECT COALESCE(SUM(quantity),0) stock FROM stock_movements WHERE material_id=? AND location_id=?',[e.material_id,e.location_id]);if(s.stock+e.quantity<0)throw Object.assign(new Error('Stock insuficiente en la ubicación seleccionada.'),{status:409});}
 for(const e of entries)await conn.execute('INSERT INTO stock_movements(material_id,movement_type,quantity,location_id,source_location_id,movement_date,user_id,reference_document,notes) VALUES(?,?,?,?,?,?,?,?,?)',[e.material_id,movement_type,e.quantity,e.location_id,e.source_location_id,movement_date||new Date(),user_id,reference_document,notes||null]);await conn.commit();res.status(201).json({ok:true,entries:entries.length});}catch(err){await conn.rollback();throw err}finally{conn.release()}
}));
app.get('/api/suppliers',asyncRoute(async(_req,res)=>{const[r]=await pool.query('SELECT * FROM suppliers WHERE active=1 ORDER BY name');res.json(r)}));
app.post('/api/suppliers',asyncRoute(async(req,res)=>{const{name,tax_id,contact_name,email,phone}=req.body;if(!name)return res.status(400).json({error:'El nombre del proveedor es obligatorio.'});const[r]=await pool.execute('INSERT INTO suppliers(name,tax_id,contact_name,email,phone) VALUES(?,?,?,?,?)',[name,tax_id||null,contact_name||null,email||null,phone||null]);res.status(201).json({id:r.insertId})}));
app.put('/api/suppliers/:id',asyncRoute(async(req,res)=>{const{name,tax_id,contact_name,email,phone}=req.body;if(!name)return res.status(400).json({error:'El nombre del proveedor es obligatorio.'});const[r]=await pool.execute('UPDATE suppliers SET name=?,tax_id=?,contact_name=?,email=?,phone=? WHERE id=?',[name,tax_id||null,contact_name||null,email||null,phone||null,req.params.id]);if(!r.affectedRows)return res.status(404).json({error:'Proveedor no encontrado.'});res.json({ok:true})}));
app.delete('/api/suppliers/:id',asyncRoute(async(req,res)=>{const[[{orders}]]=await pool.execute('SELECT COUNT(*) orders FROM purchase_orders WHERE supplier_id=?',[req.params.id]);if(orders)return res.status(409).json({error:'Este proveedor tiene órdenes relacionadas. Desactívelo para conservar la trazabilidad.'});const[r]=await pool.execute('UPDATE suppliers SET active=0 WHERE id=?',[req.params.id]);if(!r.affectedRows)return res.status(404).json({error:'Proveedor no encontrado.'});res.status(204).end()}));
app.get('/api/orders',asyncRoute(async(_req,res)=>{const[r]=await pool.query(`SELECT po.*,s.name supplier_name,COUNT(li.id) item_count,SUM(li.quantity*li.unit_price) total FROM purchase_orders po JOIN suppliers s ON s.id=po.supplier_id LEFT JOIN purchase_order_items li ON li.purchase_order_id=po.id GROUP BY po.id ORDER BY po.order_date DESC`);res.json(r)}));
app.post('/api/orders',asyncRoute(async(req,res)=>{const{order_number,supplier_id,order_date,items}=req.body;if(!order_number||!supplier_id||!Array.isArray(items)||!items.length)return res.status(400).json({error:'Número, proveedor y al menos un artículo son obligatorios.'});const c=await pool.getConnection();try{await c.beginTransaction();const[r]=await c.execute('INSERT INTO purchase_orders(order_number,supplier_id,order_date,status) VALUES(?,?,?,?)',[order_number,supplier_id,order_date||new Date(),'registrada']);for(const i of items){if(!i.material_id||Number(i.quantity)<=0||Number(i.unit_price)<0)throw Object.assign(new Error('Cada línea necesita material, cantidad positiva y precio válido.'),{status:400});await c.execute('INSERT INTO purchase_order_items(purchase_order_id,material_id,quantity,unit_price) VALUES(?,?,?,?)',[r.insertId,i.material_id,i.quantity,i.unit_price]);}await c.commit();res.status(201).json({id:r.insertId});}catch(e){await c.rollback();throw e}finally{c.release()}}));
async function getDuplicateRows(){const days=Number(process.env.DUPLICATE_WINDOW_DAYS||3),tolerance=Number(process.env.DUPLICATE_QTY_TOLERANCE||0.10);const[r]=await pool.query(`SELECT a.id order_a_id,a.order_number order_a,b.id order_b_id,b.order_number order_b,s.name supplier_name,m.name material_name,ia.quantity qty_a,ib.quantity qty_b,a.order_date date_a,b.order_date date_b,ABS(DATEDIFF(a.order_date,b.order_date)) days_apart FROM purchase_orders a JOIN purchase_orders b ON a.id<b.id AND a.supplier_id=b.supplier_id JOIN suppliers s ON s.id=a.supplier_id JOIN purchase_order_items ia ON ia.purchase_order_id=a.id JOIN purchase_order_items ib ON ib.purchase_order_id=b.id AND ib.material_id=ia.material_id JOIN materials m ON m.id=ia.material_id WHERE ABS(DATEDIFF(a.order_date,b.order_date))<=? AND ABS(ia.quantity-ib.quantity)/GREATEST(ia.quantity,ib.quantity)<=? ORDER BY days_apart` ,[days,tolerance]);return[r.map(x=>({...x,reason:`Mismo proveedor y artículo; cantidades dentro de ${tolerance*100}% y fechas separadas por ${x.days_apart} día(s).`}))]}
app.get('/api/orders/possible-duplicates',asyncRoute(async(_req,res)=>{const[r]=await getDuplicateRows();res.json(r)}));
app.get('/api/alerts/reorder',asyncRoute(async(_req,res)=>{const m=await materialRows();res.json(m.filter(x=>x.stock<x.reorder_point).map(x=>({...x,shortage:Number((x.reorder_point-x.stock).toFixed(2))})))}));
app.get('/api/materials/:id/trace',asyncRoute(async(req,res)=>{const[r]=await pool.execute(`SELECT mv.*,m.code,m.name material_name,m.unit,l.name location_name,src.name source_location_name,u.name user_name,po.order_number FROM stock_movements mv JOIN materials m ON m.id=mv.material_id JOIN locations l ON l.id=mv.location_id LEFT JOIN locations src ON src.id=mv.source_location_id JOIN app_users u ON u.id=mv.user_id LEFT JOIN purchase_orders po ON po.order_number=mv.reference_document WHERE m.id=? ORDER BY mv.movement_date DESC,mv.id DESC`,[req.params.id]);res.json(r)}));
app.use((err,_req,res,_next)=>{console.error(err);res.status(err.status|| (err.code==='ER_DUP_ENTRY'?409:500)).json({error:err.code==='ER_DUP_ENTRY'?'El código o número ya existe.':err.message||'Error interno del servidor.'})});
const port=Number(process.env.PORT||3001);if(process.env.NODE_ENV!=='test')app.listen(port,()=>console.log(`API de inventario en http://localhost:${port}`));
