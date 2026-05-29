-- Agrega codigo_manual en detalle_ventas si no existe.
-- Permite priorizar el código digitado manualmente en reportes/facturas.

SET @col_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'detalle_ventas'
    AND COLUMN_NAME = 'codigo_manual'
);

SET @ddl := IF(
  @col_exists = 0,
  'ALTER TABLE detalle_ventas ADD COLUMN codigo_manual VARCHAR(100) NULL AFTER producto_id',
  'SELECT 1'
);

PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
