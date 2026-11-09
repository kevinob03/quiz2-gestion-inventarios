import { GoogleGenAI } from '@google/genai';

const instructions = `Eres el asistente de inventario de Constructora Del Valle. Responde siempre en español claro y breve. Para hablar de existencias, reorden, historial o posibles órdenes duplicadas, consulta las herramientas antes de responder y basa tus afirmaciones en esos resultados. Distingue datos observados de recomendaciones. Una coincidencia de compra solo es sospechosa y requiere revisión humana; nunca afirmes fraude ni digas que una compra fue cancelada. No inventes precios, fechas, cantidades ni movimientos. Eres de solo lectura: no puedes registrar, editar ni cancelar operaciones. Si no hay datos suficientes, dilo y pide el código del material o la ubicación.`;

const tools = [
  {name:'get_reorder_alerts',description:'Consulta materiales cuyo stock agregado actual está debajo del punto de reorden. Úsalo cuando pregunten qué reponer o por alertas.',parametersJsonSchema:{type:'object',properties:{},required:[]}},
  {name:'get_possible_duplicate_orders',description:'Consulta pares de órdenes sospechosas con proveedor, artículo, cantidades, fechas y regla de coincidencia. Úsalo para preguntar por duplicados.',parametersJsonSchema:{type:'object',properties:{},required:[]}},
  {name:'search_inventory',description:'Busca existencias actuales de materiales por código o nombre, desglosadas por bodega/obra, con punto de reorden.',parametersJsonSchema:{type:'object',properties:{query:{type:'string',description:'Código o parte del nombre del material. Usa cadena vacía para consultar todos.'}},required:['query']}},
  {name:'get_material_trace',description:'Consulta los movimientos más recientes de un material a partir de su código exacto.',parametersJsonSchema:{type:'object',properties:{material_code:{type:'string',description:'Código interno exacto del material.'}},required:['material_code']}}
];

async function runTool(pool,name,args){
  if(name==='get_reorder_alerts'){
    const [rows]=await pool.query(`SELECT m.code,m.name,m.unit,m.reorder_point,COALESCE(SUM(mv.quantity),0) stock,m.avg_daily_demand,m.max_daily_demand,m.lead_time_days FROM materials m LEFT JOIN stock_movements mv ON mv.material_id=m.id WHERE m.active=1 GROUP BY m.id HAVING stock < m.reorder_point ORDER BY stock/m.reorder_point ASC`);
    return rows.map(x=>({...x,shortage:Number((x.reorder_point-x.stock).toFixed(2))}));
  }
  if(name==='get_possible_duplicate_orders'){
    const days=Number(process.env.DUPLICATE_WINDOW_DAYS||3),tolerance=Number(process.env.DUPLICATE_QTY_TOLERANCE||0.10);
    const [rows]=await pool.query(`SELECT a.order_number order_a,b.order_number order_b,s.name supplier_name,m.code material_code,m.name material_name,ia.quantity qty_a,ib.quantity qty_b,a.order_date date_a,b.order_date date_b,ABS(DATEDIFF(a.order_date,b.order_date)) days_apart FROM purchase_orders a JOIN purchase_orders b ON a.id<b.id AND a.supplier_id=b.supplier_id JOIN suppliers s ON s.id=a.supplier_id JOIN purchase_order_items ia ON ia.purchase_order_id=a.id JOIN purchase_order_items ib ON ib.purchase_order_id=b.id AND ib.material_id=ia.material_id JOIN materials m ON m.id=ia.material_id WHERE ABS(DATEDIFF(a.order_date,b.order_date))<=? AND ABS(ia.quantity-ib.quantity)/GREATEST(ia.quantity,ib.quantity)<=? ORDER BY days_apart`,[days,tolerance]);
    return rows.map(x=>({...x,rule:`Mismo proveedor y material, diferencia de cantidad hasta ${tolerance*100}% y hasta ${days} días.`}));
  }
  if(name==='search_inventory'){
    const term=`%${String(args.query||'').trim().slice(0,80)}%`;
    const [rows]=await pool.execute(`SELECT m.code,m.name material_name,m.unit,m.reorder_point,l.name location_name,l.site_name,COALESCE(SUM(mv.quantity),0) stock FROM materials m JOIN locations l ON l.active=1 LEFT JOIN stock_movements mv ON mv.material_id=m.id AND mv.location_id=l.id WHERE m.active=1 AND (?='%%' OR m.code LIKE ? OR m.name LIKE ?) GROUP BY m.id,l.id ORDER BY m.name,l.name LIMIT 30`,[term,term,term]);
    return rows;
  }
  if(name==='get_material_trace'){
    const [rows]=await pool.execute(`SELECT mv.movement_type,mv.quantity,mv.movement_date,m.name material_name,m.code,m.unit,l.name location_name,src.name source_location_name,u.name user_name,mv.reference_document,po.order_number FROM stock_movements mv JOIN materials m ON m.id=mv.material_id JOIN locations l ON l.id=mv.location_id LEFT JOIN locations src ON src.id=mv.source_location_id JOIN app_users u ON u.id=mv.user_id LEFT JOIN purchase_orders po ON po.order_number=mv.reference_document WHERE m.code=? ORDER BY mv.movement_date DESC,mv.id DESC LIMIT 30`,[args.material_code]);
    return rows.length?rows:{message:'No se encontró historial con ese código.'};
  }
  throw new Error('La herramienta solicitada no está disponible.');
}

export async function askInventoryAgent({pool,messages}){
  if(!process.env.GEMINI_API_KEY)throw Object.assign(new Error('Falta configurar GEMINI_API_KEY en el archivo .env.'),{status:503,code:'GEMINI_KEY_MISSING'});
  const client=new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY,httpOptions:{timeout:30000,retryOptions:{attempts:1}}});
  const contents=messages.slice(-8).map(m=>({role:m.role==='assistant'?'model':'user',parts:[{text:m.content.slice(0,1200)}]}));
  const model=process.env.GEMINI_MODEL||'gemini-3.8-flash';
  const config={systemInstruction:instructions,tools:[{functionDeclarations:tools}],maxOutputTokens:600,temperature:0.3};
  let response=await client.models.generateContent({model,contents,config});
  for(let turn=0;turn<4;turn++){
    const calls=response.functionCalls||[];
    if(!calls.length)break;
    const modelTurn=response.candidates?.[0]?.content;
    if(modelTurn)contents.push(modelTurn);
    const outputs=await Promise.all(calls.map(async call=>{
      try{return{functionResponse:{id:call.id,name:call.name,response:{output:await runTool(pool,call.name,call.args||{})}}}}
      catch{return{functionResponse:{id:call.id,name:call.name,response:{error:'No se pudo consultar esa información.'}}}}
    }));
    contents.push({role:'user',parts:outputs});
    response=await client.models.generateContent({model,contents,config});
  }
  const reply=response.text?.trim();
  if(!reply)throw Object.assign(new Error('El asistente no generó una respuesta. Intenta de nuevo.'),{status:502});
  return reply;
}
