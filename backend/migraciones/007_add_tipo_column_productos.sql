-- Migración 007: garantizar columna productos.tipo para POS unificado
-- Ejecutar una sola vez sobre la base de datos activa.

SET @db_name := DATABASE();
SET @has_tipo := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'productos'
    AND COLUMN_NAME = 'tipo'
);

SET @sql_add_tipo := IF(
  @has_tipo = 0,
  "ALTER TABLE productos ADD COLUMN tipo ENUM('bateria','varios','chatarra') NOT NULL DEFAULT 'bateria' AFTER categoria_id",
  "SELECT 'productos.tipo ya existe' AS mensaje"
);

PREPARE stmt_add_tipo FROM @sql_add_tipo;
EXECUTE stmt_add_tipo;
DEALLOCATE PREPARE stmt_add_tipo;

-- Backfill seguro en caso de datos previos.
UPDATE productos p
LEFT JOIN inventario_varios iv ON iv.codigo = p.codigo
SET p.tipo = CASE
  WHEN UPPER(COALESCE(p.codigo, '')) LIKE 'CHAT-%' THEN 'chatarra'
  WHEN iv.codigo IS NOT NULL THEN 'varios'
  WHEN COALESCE(NULLIF(TRIM(p.tipo_caja), ''), '-') <> '-' THEN 'bateria'
  ELSE 'varios'
END;
