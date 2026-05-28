CREATE DATABASE IF NOT EXISTS sistema_baterias
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE sistema_baterias;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS cierres_caja, movimientos_caja, sesiones_caja, cajas_registradoras, chatarra_detalles, chatarra_operaciones, detalle_compras, compras, detalle_ventas, ventas, factura_detalles, facturas, comprobantes_sri, compras_inventario, chatarra_inventario, ventas_inventario, inventario_varios, inventario_baterias, movimientos_inventario, inventario_stock, productos, categorias, proveedores, clientes, auditoria, rol_permisos, permisos, usuarios, roles, empresa_config;
SET FOREIGN_KEY_CHECKS = 1;

-- Roles de usuario
CREATE TABLE roles (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(60) NOT NULL UNIQUE,
  descripcion TEXT,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Catálogo de permisos
CREATE TABLE permisos (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(80) NOT NULL UNIQUE,
  nombre VARCHAR(120) NOT NULL,
  descripcion TEXT
) ENGINE=InnoDB;

-- Asignación rol-permiso
CREATE TABLE rol_permisos (
  rol_id BIGINT UNSIGNED NOT NULL,
  permiso_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (rol_id, permiso_id),
  CONSTRAINT fk_rol_permisos_rol FOREIGN KEY (rol_id) REFERENCES roles(id) ON DELETE CASCADE,
  CONSTRAINT fk_rol_permisos_permiso FOREIGN KEY (permiso_id) REFERENCES permisos(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Usuarios del sistema
CREATE TABLE usuarios (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  rol_id BIGINT UNSIGNED NOT NULL,
  nombre VARCHAR(120) NOT NULL,
  nombre_usuario VARCHAR(50) NOT NULL UNIQUE,
  clave_hash VARCHAR(255) NOT NULL,
  estado ENUM('activo','inactivo') NOT NULL DEFAULT 'activo',
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_usuarios_rol FOREIGN KEY (rol_id) REFERENCES roles(id)
) ENGINE=InnoDB;

-- Configuración de la empresa
CREATE TABLE empresa_config (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  razon_social VARCHAR(150) NOT NULL DEFAULT 'BATERÍAS AL COSTO',
  ruc VARCHAR(13) NOT NULL DEFAULT '0999999999001',
  direccion TEXT,
  telefono VARCHAR(40),
  email VARCHAR(150),
  iva_porcentaje DECIMAL(5,2) NOT NULL DEFAULT 15.00,
  prefijo_factura VARCHAR(10) NOT NULL DEFAULT 'FAC',
  secuencial_factura INT UNSIGNED NOT NULL DEFAULT 1,
  firma_certificado LONGTEXT,
  firma_clave VARCHAR(150),
  sri_ambiente TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1: Pruebas, 2: Produccion',
  sri_modo VARCHAR(20) NOT NULL DEFAULT 'off' COMMENT 'datil, directo, off',
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Categorías de productos
CREATE TABLE categorias (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Productos (sistema normalizado POS)
-- tipo: 'bateria' | 'varios' | 'chatarra' — unifica todos los tipos de item
CREATE TABLE productos (
   id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
   categoria_id BIGINT UNSIGNED NOT NULL,
   tipo ENUM('bateria','varios','chatarra') NOT NULL DEFAULT 'bateria',
   codigo VARCHAR(60) NOT NULL UNIQUE,
   nombre VARCHAR(160) NOT NULL,
   descripcion TEXT,
   marca VARCHAR(80) NOT NULL,
   modelo VARCHAR(80),
   condicion VARCHAR(50) NOT NULL DEFAULT 'Nueva',
   tipo_caja VARCHAR(80),
   precio_costo DECIMAL(12, 2) NOT NULL DEFAULT 0,
   precio_venta DECIMAL(12, 2) NOT NULL DEFAULT 0,
   stock_minimo INT NOT NULL DEFAULT 3,
   activo TINYINT(1) NOT NULL DEFAULT 1,
   creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
   actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
   CONSTRAINT fk_productos_categoria FOREIGN KEY (categoria_id) REFERENCES categorias(id),
   INDEX idx_productos_codigo (codigo),
   INDEX idx_productos_marca_modelo (marca, modelo),
   INDEX idx_productos_activo (activo)
) ENGINE=InnoDB;

-- Stock (sistema normalizado POS, 1:1 con productos)
CREATE TABLE inventario_stock (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  producto_id BIGINT UNSIGNED NOT NULL UNIQUE,
  cantidad INT NOT NULL DEFAULT 0,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_inventario_stock_producto FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Kardex / movimientos de inventario
CREATE TABLE movimientos_inventario (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  producto_id BIGINT UNSIGNED NOT NULL,
  usuario_id BIGINT UNSIGNED NOT NULL,
  tipo_movimiento ENUM('entrada','salida','ajuste') NOT NULL,
  concepto VARCHAR(160) NOT NULL,
  cantidad INT NOT NULL,
  costo_unitario DECIMAL(12, 2) NOT NULL DEFAULT 0,
  precio_venta DECIMAL(12, 2) NOT NULL DEFAULT 0,
  stock_anterior INT NOT NULL DEFAULT 0,
  stock_posterior INT NOT NULL DEFAULT 0,
  notas TEXT,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_movimientos_inv_producto FOREIGN KEY (producto_id) REFERENCES productos(id),
  CONSTRAINT fk_movimientos_inv_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  INDEX idx_movimientos_inv_fecha (creado_en)
) ENGINE=InnoDB;

-- Cajas registradoras
CREATE TABLE cajas_registradoras (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  estado ENUM('activa','inactiva') NOT NULL DEFAULT 'activa',
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Sesiones de caja (apertura/cierre diario)
CREATE TABLE sesiones_caja (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  caja_registradora_id BIGINT UNSIGNED NOT NULL,
  abierto_por BIGINT UNSIGNED NOT NULL,
  cerrado_por BIGINT UNSIGNED,
  monto_apertura DECIMAL(12, 2) NOT NULL DEFAULT 0,
  monto_ingresos DECIMAL(12, 2) NOT NULL DEFAULT 0,
  monto_egresos DECIMAL(12, 2) NOT NULL DEFAULT 0,
  monto_esperado DECIMAL(12, 2) NOT NULL DEFAULT 0,
  monto_contado DECIMAL(12, 2),
  diferencia DECIMAL(12, 2),
  estado ENUM('abierta','cerrada') NOT NULL DEFAULT 'abierta',
  abierto_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cerrado_en TIMESTAMP NULL,
  CONSTRAINT fk_sesiones_caja_registradora FOREIGN KEY (caja_registradora_id) REFERENCES cajas_registradoras(id),
  CONSTRAINT fk_sesiones_caja_abierto_por FOREIGN KEY (abierto_por) REFERENCES usuarios(id),
  CONSTRAINT fk_sesiones_caja_cerrado_por FOREIGN KEY (cerrado_por) REFERENCES usuarios(id),
  INDEX idx_sesiones_caja_estado (estado)
) ENGINE=InnoDB;

-- Movimientos de caja (ingresos/egresos)
CREATE TABLE movimientos_caja (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sesion_caja_id BIGINT UNSIGNED NOT NULL,
  usuario_id BIGINT UNSIGNED NOT NULL,
  tipo_movimiento ENUM('ingreso','egreso') NOT NULL,
  concepto VARCHAR(160) NOT NULL,
  monto DECIMAL(12, 2) NOT NULL,
  referencia_tabla VARCHAR(40),
  referencia_id BIGINT UNSIGNED,
  notas TEXT,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_movimientos_caja_sesion FOREIGN KEY (sesion_caja_id) REFERENCES sesiones_caja(id) ON DELETE CASCADE,
  CONSTRAINT fk_movimientos_caja_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  INDEX idx_movimientos_caja_tipo (tipo_movimiento)
) ENGINE=InnoDB;

-- Cierres de caja (arqueo detallado)
CREATE TABLE cierres_caja (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sesion_caja_id BIGINT UNSIGNED NOT NULL UNIQUE,
  arqueo_efectivo DECIMAL(12, 2) NOT NULL DEFAULT 0,
  arqueo_tarjeta DECIMAL(12, 2) NOT NULL DEFAULT 0,
  arqueo_transferencia DECIMAL(12, 2) NOT NULL DEFAULT 0,
  monto_total_cierre DECIMAL(12, 2) NOT NULL DEFAULT 0,
  observaciones TEXT,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cierres_caja_sesion FOREIGN KEY (sesion_caja_id) REFERENCES sesiones_caja(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Clientes
CREATE TABLE clientes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(160) NOT NULL,
  tipo_documento ENUM('cedula','ruc','pasaporte','consumidor_final') NOT NULL DEFAULT 'cedula',
  documento VARCHAR(30) NOT NULL UNIQUE,
  telefono VARCHAR(40),
  email VARCHAR(120),
  direccion TEXT,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_clientes_documento (documento),
  INDEX idx_clientes_nombre (nombre)
) ENGINE=InnoDB;

-- Proveedores
CREATE TABLE proveedores (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  razon_social VARCHAR(160) NOT NULL,
  ruc VARCHAR(20) NOT NULL UNIQUE,
  telefono VARCHAR(40),
  email VARCHAR(120),
  direccion TEXT,
  contacto_nombre VARCHAR(120),
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_proveedores_ruc (ruc)
) ENGINE=InnoDB;

-- Ventas (sistema normalizado POS)
CREATE TABLE ventas (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  cliente_id BIGINT UNSIGNED NOT NULL,
  usuario_id BIGINT UNSIGNED NOT NULL,
  sesion_caja_id BIGINT UNSIGNED DEFAULT NULL,
  numero_factura VARCHAR(40) UNIQUE,
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  descuento DECIMAL(12, 2) NOT NULL DEFAULT 0,
  base_imponible DECIMAL(12, 2) NOT NULL DEFAULT 0,
  monto_iva DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total DECIMAL(12, 2) NOT NULL DEFAULT 0,
  iva_porcentaje DECIMAL(5, 2) NOT NULL DEFAULT 15.00,
  metodo_pago ENUM('efectivo','tarjeta','transferencia') NOT NULL DEFAULT 'efectivo',
  estado ENUM('pagada','anulada') NOT NULL DEFAULT 'pagada',
  notas TEXT,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ventas_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id),
  CONSTRAINT fk_ventas_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  CONSTRAINT fk_ventas_sesion_caja FOREIGN KEY (sesion_caja_id) REFERENCES sesiones_caja(id) ON DELETE SET NULL,
  INDEX idx_ventas_estado (estado)
) ENGINE=InnoDB;

-- Detalle de ventas
CREATE TABLE detalle_ventas (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  venta_id BIGINT UNSIGNED NOT NULL,
  producto_id BIGINT UNSIGNED NOT NULL,
  cantidad INT NOT NULL DEFAULT 1,
  precio_unitario DECIMAL(12, 2) NOT NULL,
  descuento DECIMAL(12, 2) NOT NULL DEFAULT 0,
  iva_porcentaje DECIMAL(5, 2) NOT NULL DEFAULT 15.00,
  subtotal DECIMAL(12, 2) NOT NULL,
  total DECIMAL(12, 2) NOT NULL,
  CONSTRAINT fk_detalle_ventas_venta FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
  CONSTRAINT fk_detalle_ventas_producto FOREIGN KEY (producto_id) REFERENCES productos(id)
) ENGINE=InnoDB;

-- Compras (sistema normalizado POS)
CREATE TABLE compras (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  proveedor_id BIGINT UNSIGNED DEFAULT NULL,
  usuario_id BIGINT UNSIGNED NOT NULL,
  sesion_caja_id BIGINT UNSIGNED DEFAULT NULL,
  numero_factura VARCHAR(40) NOT NULL,
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  descuento DECIMAL(12, 2) NOT NULL DEFAULT 0,
  base_imponible DECIMAL(12, 2) NOT NULL DEFAULT 0,
  monto_iva DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total DECIMAL(12, 2) NOT NULL DEFAULT 0,
  iva_porcentaje DECIMAL(5, 2) NOT NULL DEFAULT 15.00,
  estado ENUM('registrada','anulada') NOT NULL DEFAULT 'registrada',
  notas TEXT,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_compras_proveedor FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE SET NULL,
  CONSTRAINT fk_compras_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  INDEX idx_compras_numero (numero_factura)
) ENGINE=InnoDB;

-- Detalle de compras
CREATE TABLE detalle_compras (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  compra_id BIGINT UNSIGNED NOT NULL,
  producto_id BIGINT UNSIGNED NOT NULL,
  cantidad INT NOT NULL DEFAULT 1,
  precio_unitario DECIMAL(12, 2) NOT NULL DEFAULT 0,
  costo_unitario DECIMAL(12, 2) NOT NULL DEFAULT 0,
  descuento DECIMAL(12, 2) NOT NULL DEFAULT 0,
  iva_porcentaje DECIMAL(5, 2) NOT NULL DEFAULT 15.00,
  subtotal DECIMAL(12, 2) NOT NULL,
  total DECIMAL(12, 2) NOT NULL DEFAULT 0,
  condicion VARCHAR(50) DEFAULT 'Nueva',
  CONSTRAINT fk_detalle_compras_compra FOREIGN KEY (compra_id) REFERENCES compras(id) ON DELETE CASCADE,
  CONSTRAINT fk_detalle_compras_producto FOREIGN KEY (producto_id) REFERENCES productos(id)
) ENGINE=InnoDB;

-- Chatarra (sistema normalizado POS)
CREATE TABLE chatarra_operaciones (
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

CREATE TABLE chatarra_detalles (
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

-- ═══════════════════════════════════════════════════════════
-- Módulo inventario legacy (OperacionesInventario)
-- ═══════════════════════════════════════════════════════════

-- Inventario de baterías (legacy)
CREATE TABLE inventario_baterias (
   id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
   codigo VARCHAR(80) NOT NULL UNIQUE,
   marca VARCHAR(80) NOT NULL,
   condicion VARCHAR(50) NOT NULL DEFAULT 'Nueva',
   tipo_caja VARCHAR(80) NOT NULL,
   cantidad INT NOT NULL DEFAULT 0,
   estado_stock VARCHAR(20) NOT NULL DEFAULT 'normal',
   precio DECIMAL(12, 2) NOT NULL DEFAULT 0,
   fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
   fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
   INDEX idx_inv_bat_marca (marca),
   INDEX idx_inv_bat_combo (marca, tipo_caja, condicion)
) ENGINE=InnoDB;

-- Inventario de varios (legacy)
CREATE TABLE inventario_varios (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(30) NOT NULL UNIQUE,
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT,
  cantidad INT NOT NULL DEFAULT 0,
  estado_stock VARCHAR(20) NOT NULL DEFAULT 'normal',
  precio DECIMAL(12, 2) NOT NULL DEFAULT 0,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_inv_var_codigo (codigo)
) ENGINE=InnoDB;

-- Ventas legacy (OperacionesInventario)
CREATE TABLE ventas_inventario (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tipo ENUM('bateria','varios','chatarra') NOT NULL,
  codigo_item VARCHAR(120) NOT NULL,
  marca VARCHAR(120),
  tipo_caja VARCHAR(120),
  condicion VARCHAR(40),
  cantidad INT NOT NULL DEFAULT 1,
  precio_unitario DECIMAL(12, 2) NOT NULL,
  con_iva TINYINT(1) NOT NULL DEFAULT 0,
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  monto_iva DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total DECIMAL(12, 2) NOT NULL DEFAULT 0,
  nombre_cliente VARCHAR(200),
  notas TEXT,
  usuario_id BIGINT UNSIGNED NOT NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ventas_inv_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  INDEX idx_ventas_inv_fecha (fecha),
  INDEX idx_ventas_inv_tipo (tipo)
) ENGINE=InnoDB;

-- Compras legacy (OperacionesInventario)
CREATE TABLE compras_inventario (
   id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
   marca VARCHAR(80) NOT NULL,
   tipo_caja VARCHAR(80) NOT NULL,
   condicion VARCHAR(50) NOT NULL DEFAULT 'Nueva',
   cantidad INT NOT NULL,
   precio_unitario DECIMAL(12, 2) NOT NULL,
   total DECIMAL(12, 2) NOT NULL,
   proveedor VARCHAR(200) NOT NULL,
   usuario_id BIGINT UNSIGNED NOT NULL,
   fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
   CONSTRAINT fk_compras_inv_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
   INDEX idx_compras_inv_fecha (fecha)
) ENGINE=InnoDB;

-- Chatarra (OperacionesInventario)
CREATE TABLE chatarra_inventario (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tipo_operacion ENUM('compra','venta') NOT NULL,
  cantidad INT NOT NULL,
  tipo_caja VARCHAR(120) NOT NULL,
  precio_unitario DECIMAL(12, 2) NOT NULL,
  total DECIMAL(12, 2) NOT NULL,
  nombre_cliente_proveedor VARCHAR(200) NOT NULL,
  notas TEXT,
  usuario_id BIGINT UNSIGNED NOT NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_chat_inv_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  INDEX idx_chat_inv_fecha (fecha)
) ENGINE=InnoDB;

-- ═══════════════════════════════════════════════════════════
-- Facturación
-- ═══════════════════════════════════════════════════════════

-- Facturas (FK a ventas_inventario legacy)
CREATE TABLE facturas (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  venta_id BIGINT UNSIGNED,
  venta_pos_id BIGINT UNSIGNED,
  usuario_id BIGINT UNSIGNED NOT NULL,
  numero_factura VARCHAR(30) NOT NULL UNIQUE,
  cliente_nombre VARCHAR(160) NOT NULL,
  cliente_documento VARCHAR(30) NOT NULL,
  cliente_email VARCHAR(120),
  cliente_telefono VARCHAR(40),
  cliente_direccion TEXT,
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  descuento DECIMAL(12, 2) NOT NULL DEFAULT 0,
  base_imponible DECIMAL(12, 2) NOT NULL DEFAULT 0,
  monto_iva DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total DECIMAL(12, 2) NOT NULL DEFAULT 0,
  iva_porcentaje DECIMAL(5, 2) NOT NULL DEFAULT 15.00,
  estado ENUM('emitida','anulada') NOT NULL DEFAULT 'emitida',
  notas TEXT,
  fecha_emision TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sri_estado VARCHAR(30) NOT NULL DEFAULT 'SIN ENVIAR',
  sri_numero_autorizacion VARCHAR(49),
  sri_fecha_autorizacion DATETIME,
  sri_clave_acceso VARCHAR(49),
  sri_ride_url VARCHAR(255),
  sri_error TEXT,
  numero_secuencial INT UNSIGNED,
  CONSTRAINT fk_facturas_venta FOREIGN KEY (venta_id) REFERENCES ventas_inventario(id),
  CONSTRAINT fk_facturas_venta_pos FOREIGN KEY (venta_pos_id) REFERENCES ventas(id),
  CONSTRAINT fk_facturas_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  INDEX idx_facturas_fecha (fecha_emision),
  INDEX idx_facturas_sri_estado (sri_estado),
  INDEX idx_facturas_venta_pos (venta_pos_id)
) ENGINE=InnoDB;

-- Detalle de facturas
CREATE TABLE factura_detalles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  factura_id BIGINT UNSIGNED NOT NULL,
  descripcion VARCHAR(500) NOT NULL,
  cantidad DECIMAL(10,2) NOT NULL DEFAULT 1.00,
  precio_unitario DECIMAL(12, 2) NOT NULL DEFAULT 0,
  descuento DECIMAL(12, 2) NOT NULL DEFAULT 0,
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  CONSTRAINT fk_factura_det_factura FOREIGN KEY (factura_id) REFERENCES facturas(id) ON DELETE CASCADE,
  INDEX idx_factura_id (factura_id)
) ENGINE=InnoDB;

-- Comprobantes SRI
CREATE TABLE comprobantes_sri (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  factura_id BIGINT UNSIGNED NOT NULL,
  xml_firmado LONGTEXT,
  respuesta_sri JSON,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_comprobantes_sri_factura FOREIGN KEY (factura_id) REFERENCES facturas(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Auditoría
CREATE TABLE auditoria (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id BIGINT UNSIGNED,
  tabla_afectada VARCHAR(60) NOT NULL,
  registro_id BIGINT UNSIGNED,
  accion ENUM('crear','editar','eliminar','login','logout','error') NOT NULL,
  descripcion TEXT NOT NULL,
  datos_anteriores JSON,
  datos_nuevos JSON,
  ip_direccion VARCHAR(45),
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_auditoria_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_auditoria_tabla_registro (tabla_afectada, registro_id),
  INDEX idx_auditoria_fecha (creado_en)
) ENGINE=InnoDB;

-- Índices adicionales para rendimiento
CREATE INDEX idx_productos_nombre ON productos(nombre);
CREATE INDEX idx_clientes_email ON clientes(email);
CREATE INDEX idx_inventario_stock_cantidad ON inventario_stock(cantidad);
CREATE INDEX idx_movimientos_inventario_producto ON movimientos_inventario(producto_id);
CREATE INDEX idx_ventas_cliente ON ventas(cliente_id);
CREATE INDEX idx_ventas_usuario ON ventas(usuario_id);
CREATE INDEX idx_ventas_creado_en ON ventas(creado_en);
CREATE INDEX idx_compras_proveedor ON compras(proveedor_id);
CREATE INDEX idx_compras_creado_en ON compras(creado_en);
CREATE INDEX idx_facturas_venta ON facturas(venta_id);
CREATE INDEX idx_detalle_ventas_venta ON detalle_ventas(venta_id);
CREATE INDEX idx_detalle_ventas_producto ON detalle_ventas(producto_id);
CREATE INDEX idx_detalle_compras_compra ON detalle_compras(compra_id);
CREATE INDEX idx_detalle_compras_producto ON detalle_compras(producto_id);
