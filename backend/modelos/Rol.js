/**
 * @class Rol
 * @description Modelo de datos para roles y permisos.
 * @tabla roles
 * @autor Equipo Desarrollo
 * @version 1.0.0
 */
import pool from '../configuracion/baseDeDatos.js';

/**
 * Mapa entre las claves del frontend (CLAVES_PERMISOS) y los códigos reales en la BD.
 * Esto permite que la UI guarde {ventas_baterias: true} y se persista en rol_permisos.
 */
const MAPA_FRONTEND_A_BD = {
  inventario_ver:           'inventario.ver',
  inventario_crear:         'inventario.crear',
  inventario_editar:        'inventario.editar',
  inventario_eliminar:      'inventario.eliminar',
  ventas_baterias:          'ventas.crear',
  compras_baterias:         'compras.crear',
  historial_ventas_propias: 'ventas.ver',
  historial_ventas_todos:   'ventas.ver',
  reportes_ver:             'reportes.ver',
  reportes_pdf:             'reportes.ver',
  facturacion_ver:          'ventas.ver',
  facturacion_emitir:       'ventas.crear',
  facturacion_anular:       'ventas.anular',
  usuarios_ver:             'usuarios.gestionar',
  usuarios_editar:          'usuarios.gestionar',
  roles_admin:              'roles.gestionar',
  operaciones_chatarra:     'inventario.ver',
};

/**
 * Modelo de persistencia para roles y permisos (tabla rol_permisos relacional).
 */
class Rol {
  /**
   * Lista todos los roles con sus permisos como objeto {clave: bool}.
   */
  static async listarTodos() {
    const [roles] = await pool.query('SELECT id, nombre, descripcion FROM roles ORDER BY id ASC');

    for (const rol of roles) {
      const [rp] = await pool.query(
        `SELECT p.codigo FROM permisos p
         JOIN rol_permisos rp ON p.id = rp.permiso_id
         WHERE rp.rol_id = ?`,
        [rol.id]
      );
      // Construir objeto de permisos en formato frontend
      const permisosObj = {};
      const codigosAsignados = rp.map(r => r.codigo);
      for (const [claveFrontend, codigoBD] of Object.entries(MAPA_FRONTEND_A_BD)) {
        permisosObj[claveFrontend] = codigosAsignados.includes(codigoBD);
      }
      // También añadir array de códigos reales para compatibilidad
      rol.permisos = permisosObj;
      rol._codigosBD = codigosAsignados;
    }

    return roles;
  }

  static async obtenerPorId(id) {
    const [filas] = await pool.query('SELECT id, nombre, descripcion FROM roles WHERE id = ?', [id]);
    const rol = filas[0] || null;
    if (rol) {
      const [rp] = await pool.query(
        `SELECT p.codigo FROM permisos p
         JOIN rol_permisos rp ON p.id = rp.permiso_id
         WHERE rp.rol_id = ?`,
        [rol.id]
      );
      const codigosAsignados = rp.map(r => r.codigo);
      const permisosObj = {};
      for (const [claveFrontend, codigoBD] of Object.entries(MAPA_FRONTEND_A_BD)) {
        permisosObj[claveFrontend] = codigosAsignados.includes(codigoBD);
      }
      rol.permisos = permisosObj;
    }
    return rol;
  }

  /**
   * Inserta un rol nuevo y asigna sus permisos en rol_permisos.
   */
  static async crear({ nombre, descripcion, permisos }) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [res] = await conn.query(
        'INSERT INTO roles (nombre, descripcion) VALUES (?, ?)',
        [nombre, descripcion || null]
      );
      const rolId = res.insertId;

      await Rol._sincronizarPermisos(conn, rolId, permisos || {});

      await conn.commit();
      return rolId;
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }

  /**
   * Actualiza nombre, descripción y permisos de un rol existente.
   */
  static async actualizar(id, { nombre, descripcion, permisos }) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.query(
        'UPDATE roles SET nombre = ?, descripcion = ? WHERE id = ?',
        [nombre, descripcion || null, id]
      );

      await Rol._sincronizarPermisos(conn, id, permisos || {});

      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }

  /**
   * Sincroniza los permisos del rol en rol_permisos a partir del objeto {clave: bool} del frontend.
   */
  static async _sincronizarPermisos(conn, rolId, permisosObj) {
    // Obtener todos los permisos disponibles en la BD
    const [todosPermisos] = await conn.query('SELECT id, codigo FROM permisos');
    const mapaCodigoAId = Object.fromEntries(todosPermisos.map(p => [p.codigo, p.id]));

    // Calcular qué códigos de BD deben quedar activos (deduplicados)
    const codigosActivos = new Set();
    for (const [claveFrontend, activo] of Object.entries(permisosObj)) {
      if (activo) {
        const codigoBD = MAPA_FRONTEND_A_BD[claveFrontend];
        if (codigoBD && mapaCodigoAId[codigoBD]) {
          codigosActivos.add(codigoBD);
        }
      }
    }

    // Borrar asignaciones previas y reinsertar
    await conn.query('DELETE FROM rol_permisos WHERE rol_id = ?', [rolId]);

    if (codigosActivos.size > 0) {
      const inserts = [...codigosActivos].map(codigo => [rolId, mapaCodigoAId[codigo]]);
      await conn.query('INSERT INTO rol_permisos (rol_id, permiso_id) VALUES ?', [inserts]);
    }
  }

  /** No elimina rol Administrador (id 1) ni si hay usuarios asignados */
  static async eliminar(id) {
    if (Number(id) === 1) {
      throw new Error('No se puede eliminar el rol Administrador');
    }
    const [usu] = await pool.query('SELECT COUNT(*) AS c FROM usuarios WHERE rol_id = ?', [id]);
    if (usu[0].c > 0) throw new Error('No se puede eliminar: hay usuarios asignados a este rol');
    await pool.query('DELETE FROM rol_permisos WHERE rol_id = ?', [id]);
    await pool.query('DELETE FROM roles WHERE id = ?', [id]);
  }
}

export default Rol;
