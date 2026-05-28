-- Migración 001: Correcciones de schema para POS multi-item
-- Ejecutar contra BD existente

-- 1. Hacer sesion_caja_id nullable en ventas
ALTER TABLE ventas MODIFY COLUMN sesion_caja_id BIGINT UNSIGNED DEFAULT NULL;
ALTER TABLE ventas DROP FOREIGN KEY fk_ventas_sesion_caja;
ALTER TABLE ventas ADD CONSTRAINT fk_ventas_sesion_caja FOREIGN KEY (sesion_caja_id) REFERENCES sesiones_caja(id) ON DELETE SET NULL;

-- 2. Hacer proveedor_id nullable en compras y agregar columnas faltantes
ALTER TABLE compras MODIFY COLUMN proveedor_id BIGINT UNSIGNED DEFAULT NULL;
ALTER TABLE compras DROP FOREIGN KEY fk_compras_proveedor;
ALTER TABLE compras ADD CONSTRAINT fk_compras_proveedor FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE SET NULL;
ALTER TABLE compras ADD COLUMN sesion_caja_id BIGINT UNSIGNED DEFAULT NULL AFTER usuario_id;
ALTER TABLE compras ADD COLUMN descuento DECIMAL(12, 2) NOT NULL DEFAULT 0 AFTER subtotal;
ALTER TABLE compras ADD COLUMN base_imponible DECIMAL(12, 2) NOT NULL DEFAULT 0 AFTER descuento;
ALTER TABLE compras ADD COLUMN iva_porcentaje DECIMAL(5, 2) NOT NULL DEFAULT 15.00 AFTER monto_iva;

-- 3. Agregar columnas faltantes a detalle_compras
ALTER TABLE detalle_compras ADD COLUMN precio_unitario DECIMAL(12, 2) NOT NULL DEFAULT 0 AFTER cantidad;
ALTER TABLE detalle_compras ADD COLUMN descuento DECIMAL(12, 2) NOT NULL DEFAULT 0 AFTER costo_unitario;
ALTER TABLE detalle_compras ADD COLUMN iva_porcentaje DECIMAL(5, 2) NOT NULL DEFAULT 15.00 AFTER descuento;
ALTER TABLE detalle_compras ADD COLUMN total DECIMAL(12, 2) NOT NULL DEFAULT 0 AFTER subtotal;
ALTER TABLE detalle_compras ADD COLUMN condicion VARCHAR(50) DEFAULT 'Nueva' AFTER total;

-- 4. Crear tablas de chatarra normalizada (si no existen)
CREATE TABLE IF NOT EXISTS chatarra_operaciones (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tipo_operacion ENUM('entrada','salida') NOT NULL,
  usuario_id BIGINT UNSIGNED NOT NULL,
  sesion_caja_id BIGINT UNSIGNED DEFAULT NULL,
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total DECIMAL(12, 2) NOT NULL DEFAULT 0,
  estado ENUM('registrada','anulada') NOT NULL DEFAULT 'registrada',
  notas TEXT,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_chatarra_operaciones_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  CONSTRAINT fk_chatarra_operaciones_sesion FOREIGN KEY (sesion_caja_id) REFERENCES sesiones_caja(id) ON DELETE SET NULL,
  INDEX idx_chatarra_operaciones_tipo (tipo_operacion),
  INDEX idx_chatarra_operaciones_fecha (creado_en)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS chatarra_detalles (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  chatarra_id BIGINT UNSIGNED NOT NULL,
  producto_id BIGINT UNSIGNED NOT NULL,
  cantidad INT NOT NULL DEFAULT 1,
  precio_unitario DECIMAL(12, 2) NOT NULL,
  descuento DECIMAL(12, 2) NOT NULL DEFAULT 0,
  subtotal DECIMAL(12, 2) NOT NULL,
  notas TEXT,
  CONSTRAINT fk_chatarra_detalles_operacion FOREIGN KEY (chatarra_id) REFERENCES chatarra_operaciones(id) ON DELETE CASCADE,
  CONSTRAINT fk_chatarra_detalles_producto FOREIGN KEY (producto_id) REFERENCES productos(id)
) ENGINE=InnoDB;

-- 5. Agregar FK de sesion_caja_id en compras
ALTER TABLE compras ADD CONSTRAINT fk_compras_sesion_caja FOREIGN KEY (sesion_caja_id) REFERENCES sesiones_caja(id) ON DELETE SET NULL;
