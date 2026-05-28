/**
 * Permisos del perfil del usuario en sesión (los define el administrador en Roles).
 * Mapeo de compatibilidad backward entre claves del frontend legacy y nuevos permisos granulados de la DB.
 */
const MAPA_COMPATIBILIDAD = {
  'inventario_ver': 'inventario.ver',
  'inventario_crear': 'inventario.crear',
  'inventario_editar': 'inventario.editar',
  'inventario_eliminar': 'inventario.eliminar',
  'ventas_baterias': 'ventas.crear',
  'compras_baterias': 'compras.crear',
  'operaciones_chatarra': 'inventario.ver',
  'historial_ventas_propias': 'ventas.ver',
  'historial_ventas_todos': 'ventas.ver',
  'reportes_ver': 'reportes.ver',
  'reportes_pdf': 'reportes.ver',
  'usuarios_ver': 'usuarios.gestionar',
  'usuarios_editar': 'usuarios.gestionar',
  'roles_admin': 'roles.gestionar',
  'facturacion_ver': 'ventas.ver',
  'facturacion_emitir': 'ventas.crear',
  'facturacion_anular': 'ventas.anular'
};

export function esAdministrador(usuario) {
  const rol = usuario?.rol_nombre || usuario?.rol || '';
  return usuario?.esAdmin === true || String(rol).toLowerCase() === 'administrador';
}

export function tienePermiso(usuario, clave) {
  if (esAdministrador(usuario)) return true;

  const permisos = usuario?.permisos || [];
  
  // Si el backend envió la clave en su formato con punto (ej: 'inventario.ver')
  if (permisos.includes(clave)) return true;

  // Si el frontend está usando una clave legacy, traducir a la nueva clave relacional
  const nuevaClave = MAPA_COMPATIBILIDAD[clave];
  if (nuevaClave && permisos.includes(nuevaClave)) return true;

  return false;
}

/** True si el perfil tiene al menos un módulo del menú asignado. */
export function usuarioTieneAlgunModulo(usuario) {
  const claves = Object.keys(MAPA_COMPATIBILIDAD);
  return claves.some((k) => tienePermiso(usuario, k));
}
