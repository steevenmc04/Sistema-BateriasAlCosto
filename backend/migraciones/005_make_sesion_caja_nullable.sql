-- Migración 005: Hacer sesion_caja_id nullable en ventas (POS multi-item no requiere caja)
-- Ejecutar contra BD existente si POST /api/ventas da error "Field 'sesion_caja_id' doesn't have a default value"

-- 1. Eliminar FK existente
SET @fk_name = (SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ventas' AND COLUMN_NAME = 'sesion_caja_id'
  AND REFERENCED_TABLE_NAME IS NOT NULL LIMIT 1);

SET @sql = IF(@fk_name IS NOT NULL,
  CONCAT('ALTER TABLE ventas DROP FOREIGN KEY ', @fk_name),
  'SELECT "FK no encontrada para sesion_caja_id" AS info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Hacer sesion_caja_id nullable
ALTER TABLE ventas MODIFY COLUMN sesion_caja_id BIGINT UNSIGNED DEFAULT NULL;

-- 3. Recrear FK con ON DELETE SET NULL
ALTER TABLE ventas ADD CONSTRAINT fk_ventas_sesion_caja
  FOREIGN KEY (sesion_caja_id) REFERENCES sesiones_caja(id) ON DELETE SET NULL;
