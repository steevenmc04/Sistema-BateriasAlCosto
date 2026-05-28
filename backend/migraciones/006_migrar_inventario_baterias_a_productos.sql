-- Migración 006: Copiar datos de inventario_baterias a productos + inventario_stock
-- Ejecutar solo si productos está vacío y hay datos en inventario_baterias

INSERT INTO productos (codigo, nombre, marca, tipo_caja, condicion, categoria_id, tipo, precio_costo, precio_venta, activo)
SELECT 
  ib.codigo,
  CONCAT(ib.marca, ' ', ib.tipo_caja) AS nombre,
  ib.marca,
  ib.tipo_caja,
  ib.condicion,
  1 AS categoria_id,
  'bateria' AS tipo,
  ib.precio AS precio_costo,
  ib.precio AS precio_venta,
  1 AS activo
FROM inventario_baterias ib
WHERE NOT EXISTS (SELECT 1 FROM productos p WHERE p.codigo = ib.codigo);

INSERT INTO inventario_stock (producto_id, cantidad)
SELECT p.id, ib.cantidad
FROM productos p
INNER JOIN inventario_baterias ib ON ib.codigo = p.codigo
WHERE NOT EXISTS (SELECT 1 FROM inventario_stock s WHERE s.producto_id = p.id);
