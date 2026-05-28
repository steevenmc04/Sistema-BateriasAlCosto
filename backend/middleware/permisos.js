const MAPA_PERMISOS_COMPATIBLES = {
  inventario_ver: 'inventario.ver',
  inventario_crear: 'inventario.crear',
  inventario_editar: 'inventario.editar',
  inventario_eliminar: 'inventario.eliminar',
  ventas_baterias: 'ventas.crear',
  compras_baterias: 'compras.crear',
  operaciones_chatarra: 'inventario.ver',
  historial_ventas_propias: 'ventas.ver',
  historial_ventas_todos: 'ventas.ver',
  reportes_ver: 'reportes.ver',
  reportes_pdf: 'reportes.ver',
  usuarios_ver: 'usuarios.gestionar',
  usuarios_editar: 'usuarios.gestionar',
  roles_admin: 'roles.gestionar',
  facturacion_ver: 'ventas.ver',
  facturacion_emitir: 'ventas.crear',
  facturacion_anular: 'ventas.anular'
};

function tienePermiso(usuario, codigoPermiso) {
  const permisos = usuario.permisos || [];
  const codigoCompatible = MAPA_PERMISOS_COMPATIBLES[codigoPermiso];

  return permisos.includes(codigoPermiso) || (codigoCompatible && permisos.includes(codigoCompatible));
}

/**
 * Middleware: Exige un permiso especifico.
 * Compara contra los codigos de permisos asignados al usuario en su token JWT.
 */
export function exigirPermiso(codigoPermiso) {
  return (req, res, next) => {
    const usuario = req.usuario;
    if (!usuario) {
      return res.status(401).json({ mensaje: 'No autenticado. Por favor inicie sesion.' });
    }

    const rolLower = String(usuario.rol_nombre || '').toLowerCase();
    const ES_ADMIN = ['administrador', 'admin', 'superadmin', 'dueño', 'propietario'].includes(rolLower);
    if (ES_ADMIN) {
      return next();
    }

    if (tienePermiso(usuario, codigoPermiso)) {
      return next();
    }

    return res.status(403).json({ mensaje: `Acceso denegado: No cuenta con el permiso requerido (${codigoPermiso}).` });
  };
}

/**
 * Middleware: Pasa si el usuario tiene al menos uno de los permisos listados.
 */
export function exigirAlgunPermiso(...codigosPermisos) {
  return (req, res, next) => {
    const usuario = req.usuario;
    if (!usuario) {
      return res.status(401).json({ mensaje: 'No autenticado. Por favor inicie sesion.' });
    }

    const rolLower = String(usuario.rol_nombre || '').toLowerCase();
    const ES_ADMIN = ['administrador', 'admin', 'superadmin', 'dueño', 'propietario'].includes(rolLower);
    if (ES_ADMIN) {
      return next();
    }

    const tieneAlguno = codigosPermisos.some((codigo) => tienePermiso(usuario, codigo));

    if (tieneAlguno) {
      return next();
    }

    return res.status(403).json({ mensaje: 'Acceso denegado: No cuenta con ninguno de los permisos requeridos para esta seccion.' });
  };
}
