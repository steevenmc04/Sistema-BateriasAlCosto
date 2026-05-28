USE sistema_baterias;

-- 1. Roles
INSERT INTO roles (id, nombre, descripcion) VALUES 
(1, 'Administrador', 'Acceso total a la configuración y reportes'),
(2, 'Vendedor', 'Ventas, chatarra y consulta de inventario');

-- 2. Catálogo de permisos
INSERT INTO permisos (id, codigo, nombre, descripcion) VALUES
(1, 'inventario.ver', 'Ver Inventario', 'Visualizar lista de productos y stock'),
(2, 'inventario.crear', 'Crear Producto', 'Agregar nuevos productos'),
(3, 'inventario.editar', 'Editar Producto', 'Modificar productos existentes'),
(4, 'inventario.eliminar', 'Eliminar Producto', 'Dar de baja productos'),
(5, 'ventas.ver', 'Ver Historial de Ventas', 'Consultar ventas ejecutadas'),
(6, 'ventas.crear', 'Crear Nueva Venta', 'Registrar transacciones de venta'),
(7, 'ventas.anular', 'Anular Ventas', 'Revertir transacciones de venta'),
(8, 'compras.ver', 'Ver Compras', 'Consultar compras a proveedores'),
(9, 'compras.crear', 'Crear Compra', 'Registrar compras de inventario'),
(10, 'caja.ver', 'Ver Módulo de Caja', 'Consultar sesiones y arqueos'),
(11, 'caja.abrir', 'Abrir Sesión de Caja', 'Aperturar sesión diaria'),
(12, 'caja.cerrar', 'Cerrar Sesión de Caja', 'Realizar arqueo y cierre'),
(13, 'caja.movimientos', 'Gestionar Mov. Caja', 'Registrar ingresos/egresos'),
(14, 'usuarios.gestionar', 'Gestionar Usuarios', 'Crear, editar usuarios'),
(15, 'roles.gestionar', 'Gestionar Roles', 'Redefinir perfiles de acceso'),
(16, 'reportes.ver', 'Ver Reportes', 'Acceso a balances y KPIs'),
(17, 'facturas.sri', 'Procesamiento SRI', 'Envío de facturas al SRI');

-- 3. Asignación de permisos a roles
INSERT INTO rol_permisos (rol_id, permiso_id) VALUES
(1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (1, 6), (1, 7),
(1, 8), (1, 9), (1, 10), (1, 11), (1, 12), (1, 13),
(1, 14), (1, 15), (1, 16), (1, 17);

INSERT INTO rol_permisos (rol_id, permiso_id) VALUES
(2, 1), (2, 2), (2, 5), (2, 6), (2, 7),
(2, 8), (2, 9),
(2, 10), (2, 11), (2, 12), (2, 13);

-- 4. Usuario Administrador (clave: admin123)
INSERT INTO usuarios (rol_id, nombre, nombre_usuario, clave_hash, estado) 
VALUES (1, 'Administrador Principal', 'admin', '$2a$10$X5mmjKP7X5dzBRuxjnFg7eALGBhDkbD5Yv74DxNQK5tzX16wrrGzK', 'activo');

-- 5. Configuración de empresa
INSERT IGNORE INTO empresa_config
  (razon_social, ruc, direccion, telefono, email, iva_porcentaje, prefijo_factura, secuencial_factura, sri_ambiente, sri_modo)
VALUES
  ('BATERÍAS AL COSTO', '0999999999001', 'Guayaquil, Ecuador',
   '0999999999', 'info@bateriasalcosto.com', 15.00, 'FAC', 1, 1, 'off');

-- 6. Categorías de productos
INSERT INTO categorias (nombre, descripcion) VALUES 
('Nuevas', 'Baterías con garantía de fábrica'),
('Usadas', 'Baterías de segunda mano probadas'),
('Chatarra', 'Baterías para reciclaje');
