import Logger from '../utilidades/logger.js';
import pool from '../configuracion/baseDeDatos.js';

/**
 * @class Auditoria
 * @description Modelo de datos para auditoría del sistema. Registra logs de seguridad, eventos de inicio de sesión y trazabilidad de cambios en la base de datos.
 * @tabla auditoria
 * @autor Equipo Desarrollo
 * @version 1.0.0
 */
class Auditoria {
  /**
   * @metodo registrar
   * @descripcion Registra una acción de auditoría en la base de datos de manera segura y controlada.
   * @param {object} parametros - Objeto con los parámetros de la auditoría.
   * @param {number|null} [parametros.usuario_id=null] - ID del usuario que realiza la acción.
   * @param {string} parametros.tabla_afectada - Nombre de la tabla afectada por el cambio.
   * @param {number|null} [parametros.registro_id=null] - ID del registro afectado.
   * @param {string} parametros.accion - Acción realizada ('crear', 'editar', 'eliminar', 'login', 'logout', 'error').
   * @param {string} parametros.descripcion - Detalle de la acción realizada.
   * @param {object|null} [parametros.datos_anteriores=null] - JSON u objeto de los datos previos al cambio.
   * @param {object|null} [parametros.datos_nuevos=null] - JSON u objeto de los datos posteriores al cambio.
   * @param {string|null} [parametros.ip_direccion=null] - Dirección IP desde la cual se realizó la solicitud.
   * @returns {Promise<number|null>} ID del registro de auditoría insertado, o null si ocurre un error.
   * @throws {Error} No lanza excepciones (las captura internamente para evitar interrumpir el flujo principal).
   */
  static async registrar({
    usuario_id = null,
    tabla_afectada,
    registro_id = null,
    accion, // 'crear', 'editar', 'eliminar', 'login', 'logout', 'error'
    descripcion,
    datos_anteriores = null,
    datos_nuevos = null,
    ip_direccion = null
  }) {
    try {
      const [resultado] = await pool.query(
        `INSERT INTO auditoria (
          usuario_id, tabla_afectada, registro_id, accion, descripcion, 
          datos_anteriores, datos_nuevos, ip_direccion, creado_en
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          usuario_id,
          tabla_afectada,
          registro_id,
          accion,
          descripcion,
          datos_anteriores ? JSON.stringify(datos_anteriores) : null,
          datos_nuevos ? JSON.stringify(datos_nuevos) : null,
          ip_direccion
        ]
      );
      return resultado.insertId;
    } catch (error) {
      Logger.error('Auditoria', 'Error al registrar auditoría en BD', error);
      // No lanzamos error para evitar romper el flujo principal si falla la auditoría
      return null;
    }
  }

  /**
   * @metodo listar
   * @descripcion Lista los eventos del historial de auditoría aplicando filtros de búsqueda y paginación.
   * @param {object} [filtros={}] - Filtros aplicables a la búsqueda.
   * @param {string|null} [filtros.fechaInicio=null] - Fecha inicial en formato YYYY-MM-DD.
   * @param {string|null} [filtros.fechaFin=null] - Fecha final en formato YYYY-MM-DD.
   * @param {number|null} [filtros.usuarioId=null] - ID del usuario a filtrar.
   * @param {string|null} [filtros.accion=null] - Acción de auditoría específica.
   * @param {string|null} [filtros.tablaAfectada=null] - Nombre de la tabla a filtrar.
   * @param {number} [filtros.limite=200] - Cantidad máxima de registros a retornar.
   * @param {number} [filtros.desplazamiento=0] - Número de registros a omitir (offset).
   * @returns {Promise<Array<object>>} Listado de logs de auditoría encontrados.
   * @throws {Error} Si ocurre un error en la consulta a la base de datos.
   */
  static async listar({
    fechaInicio = null,
    fechaFin = null,
    usuarioId = null,
    accion = null,
    tablaAfectada = null,
    limite = 200,
    desplazamiento = 0
  } = {}) {
    let sql = `
      SELECT a.id, a.usuario_id, u.nombre AS usuario_nombre, u.nombre_usuario, 
             a.tabla_afectada, a.registro_id, a.accion, a.descripcion, 
             a.datos_anteriores, a.datos_nuevos, a.ip_direccion, a.creado_en
      FROM auditoria a
      LEFT JOIN usuarios u ON a.usuario_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (fechaInicio) {
      sql += ' AND a.creado_en >= ?';
      params.push(`${fechaInicio} 00:00:00`);
    }

    if (fechaFin) {
      sql += ' AND a.creado_en <= ?';
      params.push(`${fechaFin} 23:59:59`);
    }

    if (usuarioId) {
      sql += ' AND a.usuario_id = ?';
      params.push(usuarioId);
    }

    if (accion) {
      sql += ' AND a.accion = ?';
      params.push(accion);
    }

    if (tablaAfectada) {
      sql += ' AND a.tabla_afectada = ?';
      params.push(tablaAfectada);
    }

    sql += ' ORDER BY a.id DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limite), parseInt(desplazamiento));

    const [filas] = await pool.query(sql, params);
    return filas;
  }
}

export default Auditoria;
