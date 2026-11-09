USE del_valle_inventario;
INSERT INTO materials(code,name,category,unit,min_stock,max_stock,avg_daily_demand,max_daily_demand,lead_time_days) VALUES
('MAT-CEM-050','Cemento gris 50 kg','Materiales de construcción / Cemento y agregados','sacos',80,400,40,55,3),
('MAT-VAR-003','Varilla #3 grado 40 (3/8 × 6 m)','Materiales de construcción / Acero de refuerzo','unidades',300,1200,120,160,5),
('MAT-BLK-122040','Block 12 × 20 × 40','Materiales de construcción / Mampostería','unidades',1000,5000,600,900,4),
('MAT-ARE-M3','Arena','Materiales de construcción / Cemento y agregados','m³',10,60,6,10,2),
('MAT-GUA-NIT-L','Guantes de nitrilo talla L','Seguridad y protección / Guantes desechables','pares',30,200,8,12,4),
('MAT-PVC-012','Tubo PVC 1/2 SDR 13.5','Plomería / Tubería PVC','unidades',10,100,3,5,4)
ON DUPLICATE KEY UPDATE name=VALUES(name);
INSERT INTO locations(code,name,location_type,site_name) VALUES
('BOD-CEN','Bodega Central','bodega',NULL),('OB-ALAJ','Obra Alajuela','obra','Proyecto Alajuela'),('OB-CART','Obra Cartago','obra','Proyecto Cartago')
ON DUPLICATE KEY UPDATE name=VALUES(name);
INSERT INTO app_users(name,email,role) VALUES('Usuario de bodega','bodega@delvalle.local','bodega') ON DUPLICATE KEY UPDATE name=VALUES(name);
INSERT INTO suppliers(name,tax_id,contact_name,email,phone) VALUES
('Proveedor A','310100001','Ventas','ventas.a@example.test','2200-0001'),('Proveedor B','310100002','Ventas','ventas.b@example.test','2200-0002'),
('Proveedor C','310100003','Ventas','ventas.c@example.test','2200-0003'),('Proveedor D','310100004','Ventas','ventas.d@example.test','2200-0004')
ON DUPLICATE KEY UPDATE name=VALUES(name);
INSERT INTO purchase_orders(order_number,supplier_id,order_date,status) VALUES
('OC-1041',1,'2026-10-02','recibida'),('OC-1042',1,'2026-10-02','recibida'),('OC-1047',2,'2026-10-06','recibida'),
('OC-1050',3,'2026-10-08','recibida'),('OC-1053',3,'2026-10-09','recibida'),('OC-1058',4,'2026-10-13','recibida'),('OC-1061',1,'2026-10-15','recibida')
ON DUPLICATE KEY UPDATE order_number=VALUES(order_number);
INSERT INTO purchase_order_items(purchase_order_id,material_id,quantity,unit_price)
SELECT po.id,m.id,v.qty,v.price FROM (SELECT 'OC-1041' oc,'MAT-CEM-050' mat,200 qty,6450 price UNION ALL SELECT 'OC-1042','MAT-CEM-050',200,6450 UNION ALL SELECT 'OC-1047','MAT-CEM-050',40,7100 UNION ALL SELECT 'OC-1050','MAT-VAR-003',500,2150 UNION ALL SELECT 'OC-1053','MAT-VAR-003',480,2150 UNION ALL SELECT 'OC-1058','MAT-VAR-003',60,2600 UNION ALL SELECT 'OC-1061','MAT-CEM-050',300,6300) v JOIN purchase_orders po ON po.order_number=v.oc JOIN materials m ON m.code=v.mat
WHERE NOT EXISTS(SELECT 1 FROM purchase_order_items old WHERE old.purchase_order_id=po.id AND old.material_id=m.id);
INSERT INTO stock_movements(material_id,movement_type,quantity,location_id,movement_date,user_id,reference_document,notes)
SELECT m.id,'ajuste',v.qty,l.id,'2026-11-01 08:00:00',u.id,CONCAT('INV-INICIAL-',m.code),'Saldo inicial de demostración; basado en valores del caso académico.'
FROM (SELECT 'MAT-CEM-050' code,190 qty,'BOD-CEN' loc UNION ALL SELECT 'MAT-VAR-003',850,'BOD-CEN' UNION ALL SELECT 'MAT-BLK-122040',2800,'BOD-CEN' UNION ALL SELECT 'MAT-ARE-M3',14,'BOD-CEN' UNION ALL SELECT 'MAT-GUA-NIT-L',100,'BOD-CEN' UNION ALL SELECT 'MAT-PVC-012',25,'BOD-CEN') v JOIN materials m ON m.code=v.code JOIN locations l ON l.code=v.loc JOIN app_users u ON u.email='bodega@delvalle.local'
WHERE NOT EXISTS(SELECT 1 FROM stock_movements old WHERE old.reference_document=CONCAT('INV-INICIAL-',m.code));
