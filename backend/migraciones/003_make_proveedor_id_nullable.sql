-- Migración 003: Hacer proveedor_id nullable en compras (POS multi-compra no usa proveedores)
-- Ejecutar contra BD existente si POST /api/compras falla con "Field 'proveedor_id' doesn't have a default value"

-- 1. Eliminar FK existente (ignorar error si no existe)
-- Si da error "Can't DROP ... check that foreign key exists", continuar con paso 2
ALTER TABLE compras DROP FOREIGN KEY fk_compras_proveedor;

-- 2. Hacer proveedor_id nullable
ALTER TABLE compras MODIFY COLUMN proveedor_id BIGINT UNSIGNED DEFAULT NULL;

-- 3. Recrear FK con ON DELETE SET NULL
ALTER TABLE compras ADD CONSTRAINT fk_compras_proveedor
  FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE SET NULL;

-- 4. Verificación: mostrar estructura actual
-- DESCOMENTAR para depurar:
-- DESCRIBE compras;
