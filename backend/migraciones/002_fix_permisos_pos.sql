-- Migración 002: Asignar permisos necesarios para POS (Ventas/Compras/Chatarra)
-- Ejecutar contra BD existente y luego RECARGAR (F5) el frontend + re-login

-- 1. Asegurar que existan TODOS los códigos de permiso necesarios
INSERT IGNORE INTO permisos (codigo, nombre, descripcion) VALUES
('inventario.ver', 'Ver Inventario', 'Visualizar lista de productos y stock'),
('inventario.crear', 'Crear Producto', 'Agregar nuevos productos'),
('inventario.editar', 'Editar Producto', 'Modificar productos existentes'),
('inventario.eliminar', 'Eliminar Producto', 'Dar de baja productos'),
('ventas.ver', 'Ver Historial de Ventas', 'Consultar ventas ejecutadas'),
('ventas.crear', 'Crear Nueva Venta', 'Registrar transacciones de venta'),
('ventas.anular', 'Anular Ventas', 'Revertir transacciones de venta'),
('compras.ver', 'Ver Compras', 'Consultar compras a proveedores'),
('compras.crear', 'Crear Compra', 'Registrar compras de inventario'),
('caja.ver', 'Ver Módulo de Caja', 'Consultar sesiones y arqueos'),
('caja.abrir', 'Abrir Sesión de Caja', 'Aperturar sesión diaria'),
('caja.cerrar', 'Cerrar Sesión de Caja', 'Realizar arqueo y cierre'),
('caja.movimientos', 'Gestionar Mov. Caja', 'Registrar ingresos/egresos'),
('usuarios.gestionar', 'Gestionar Usuarios', 'Crear, editar usuarios'),
('roles.gestionar', 'Gestionar Roles', 'Redefinir perfiles de acceso'),
('reportes.ver', 'Ver Reportes', 'Acceso a balances y KPIs'),
('facturas.sri', 'Procesamiento SRI', 'Envío de facturas al SRI');

-- 2. Asignar inventario.ver a TODOS los roles existentes
-- (todos necesitan ver productos en el POS)
INSERT IGNORE INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r, permisos p
WHERE p.codigo = 'inventario.ver';

-- 3. Asignar permisos POS completos al rol Vendedor (y similares)
INSERT IGNORE INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r, permisos p
WHERE LOWER(r.nombre) IN ('vendedor', 'vendedora', 'cajero', 'cajera')
  AND p.codigo IN (
    'ventas.ver', 'ventas.crear',
    'compras.ver', 'compras.crear',
    'inventario.crear',
    'caja.ver', 'caja.abrir', 'caja.cerrar', 'caja.movimientos'
  );

-- 4. Asignar TODOS los permisos al rol Administrador
INSERT IGNORE INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r, permisos p
WHERE LOWER(r.nombre) = 'administrador';

-- 5. Si existe rol Admin con otro nombre (admin, superadmin, etc), darle todos los permisos también
INSERT IGNORE INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r, permisos p
WHERE LOWER(r.nombre) IN ('admin', 'superadmin', 'super administrador', 'dueño', 'propietario');

-- 6. Verificar qué permisos tiene CADA rol (consulta de diagnóstico)
-- Descomentar para depurar:
-- SELECT r.nombre AS rol, GROUP_CONCAT(p.codigo ORDER BY p.codigo SEPARATOR ', ') AS permisos
-- FROM roles r
-- LEFT JOIN rol_permisos rp ON r.id = rp.rol_id
-- LEFT JOIN permisos p ON rp.permiso_id = p.id
-- GROUP BY r.id, r.nombre
-- ORDER BY r.nombre;
