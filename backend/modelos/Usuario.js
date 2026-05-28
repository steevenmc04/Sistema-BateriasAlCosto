/**
 * @class Usuario
 * @description Modelo de datos para usuarios y autenticación.
 * @tabla usuarios
 * @autor Equipo Desarrollo
 * @version 1.0.0
 */
import pool from '../configuracion/baseDeDatos.js';
import bcrypt from 'bcryptjs';

/**
 * Modelo de Datos: Usuario (usuarios) y Control de Acceso (RBAC)
 * Gestiona la autenticación, roles, permisos y usuarios del sistema.
 */
class Usuario {
  /**
   * Busca un usuario activo por su nombre de usuario.
   * Trae los detalles del rol y el array de códigos de permisos asignados.
   */
  static async buscarPorNombreUsuario(nombreUsuario) {
    const [filas] = await pool.query(
      `SELECT u.id, u.rol_id, u.nombre, u.nombre_usuario, u.clave_hash, u.estado, r.nombre AS rol_nombre
       FROM usuarios u
       JOIN roles r ON u.rol_id = r.id
       WHERE u.nombre_usuario = ? AND u.estado = 'activo'`,
      [nombreUsuario]
    );

    const usuario = filas[0] || null;
    if (usuario) {
      usuario.permisos = await this.obtenerCodigosPermisos(usuario.rol_id);
    }
    return usuario;
  }

  /**
   * Obtiene un usuario con su rol y permisos por su ID.
   */
  static async obtenerPorId(id) {
    const [filas] = await pool.query(
      `SELECT u.id, u.rol_id, u.nombre, u.nombre_usuario, u.estado, r.nombre AS rol_nombre
       FROM usuarios u
       JOIN roles r ON u.rol_id = r.id
       WHERE u.id = ? AND u.estado = 'activo'`,
      [id]
    );

    const usuario = filas[0] || null;
    if (usuario) {
      usuario.permisos = await this.obtenerCodigosPermisos(usuario.rol_id);
    }
    return usuario;
  }

  /**
   * Obtiene la lista de códigos de permisos (ej: ['inventario.ver', 'ventas.crear']) para un rol.
   */
  static async obtenerCodigosPermisos(rolId) {
    const [permisosFilas] = await pool.query(
      `SELECT p.codigo
       FROM permisos p
       JOIN rol_permisos rp ON p.id = rp.permiso_id
       WHERE rp.rol_id = ?`,
      [rolId]
    );
    return permisosFilas.map((p) => p.codigo);
  }

  /**
   * Verifica la contraseña del usuario utilizando Bcrypt.
   */
  static async verificarClave(usuario, clavePlana) {
    if (!usuario || !usuario.clave_hash) return false;
    return await bcrypt.compare(clavePlana, usuario.clave_hash);
  }

  /**
   * Lista todos los usuarios con su rol para el panel de administración.
   */
  static async listarTodos() {
    const [filas] = await pool.query(
      `SELECT u.id, u.nombre, u.nombre_usuario, u.rol_id, u.estado, r.nombre AS rol_nombre
       FROM usuarios u
       JOIN roles r ON u.rol_id = r.id
       ORDER BY u.nombre ASC`
    );
    return filas;
  }

  /**
   * Crea un nuevo usuario con la contraseña encriptada.
   */
  static async crear({ nombre, nombre_usuario, clave, rol_id }) {
    const clave_hash = await bcrypt.hash(clave, 10);
    const [resultado] = await pool.query(
      `INSERT INTO usuarios (nombre, nombre_usuario, clave_hash, rol_id, estado) 
       VALUES (?, ?, ?, ?, 'activo')`,
      [nombre, nombre_usuario, clave_hash, rol_id]
    );
    return resultado.insertId;
  }

  /**
   * Actualiza los datos de un usuario existente.
   */
  static async actualizar(id, { nombre, nombre_usuario, rol_id, estado }) {
    await pool.query(
      `UPDATE usuarios 
       SET nombre = ?, nombre_usuario = ?, rol_id = ?, estado = ? 
       WHERE id = ?`,
      [nombre, nombre_usuario, rol_id, estado, id]
    );
  }

  /**
   * Cambia la contraseña de un usuario.
   */
  static async actualizarClave(id, nuevaClave) {
    const clave_hash = await bcrypt.hash(nuevaClave, 10);
    await pool.query(
      `UPDATE usuarios 
       SET clave_hash = ? 
       WHERE id = ?`,
      [clave_hash, id]
    );
  }

  /**
   * Lista todos los roles del sistema.
   */
  static async listarRoles() {
    const [filas] = await pool.query(
      'SELECT id, nombre, descripcion FROM roles ORDER BY nombre ASC'
    );
    return filas;
  }
}

export default Usuario;
