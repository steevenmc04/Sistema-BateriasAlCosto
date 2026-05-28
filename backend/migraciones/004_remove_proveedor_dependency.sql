-- Migración 004: Hacer proveedor_id nullable con manejo dinámico de FK
-- La migración detecta automáticamente el nombre real de la FK (sea auto-generado o manual)
-- y la recrea con ON DELETE SET NULL.
-- Ejecutar contra BD existente si POST /api/compras da error
-- "Field 'proveedor_id' doesn't have a default value"

SET @fk_name = (SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'compras' AND COLUMN_NAME = 'proveedor_id'
  AND REFERENCED_TABLE_NAME IS NOT NULL LIMIT 1);

SET @sql = IF(@fk_name IS NOT NULL,
  CONCAT('ALTER TABLE compras DROP FOREIGN KEY ', @fk_name),
  'SELECT "FK no encontrada para proveedor_id, continuando..." AS info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE compras MODIFY COLUMN proveedor_id BIGINT UNSIGNED DEFAULT NULL;

ALTER TABLE compras ADD CONSTRAINT fk_compras_proveedor
  FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE SET NULL;
