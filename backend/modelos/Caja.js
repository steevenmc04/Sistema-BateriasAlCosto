import pool from '../configuracion/baseDeDatos.js';

/**
 * @modelo Caja
 * @descripcion Administra el flujo de efectivo, arqueos, control de turnos de venta y sesiones de caja registradora (Caja POS).
 * @tabla cajas_registradoras, sesiones_caja, movimientos_caja, cierres_caja
 */
class Caja {
  // ============================================================================
  // 1. GESTIÓN DE CAJAS REGISTRADORAS (FISICAS / VIRTUALES)
  // ============================================================================

  /**
   * @metodo crearCaja
   * @descripcion Crea una nueva caja registradora física o virtual.
   * @param {object} parametros - Parámetros de la caja.
   * @param {string} parametros.nombre - Nombre identificativo de la caja.
   * @param {string} [parametros.estado='activa'] - Estado inicial ('activa', 'inactiva').
   * @returns {Promise<number>} ID de la caja registradora creada.
   * @throws {Error} Si ocurre un error en la base de datos.
   */
  static async crearCaja({ nombre, estado = 'activa' }) {
    const [resultado] = await pool.query(
      'INSERT INTO cajas_registradoras (nombre, estado) VALUES (?, ?)',
      [nombre, estado]
    );
    return resultado.insertId;
  }

  /**
   * @metodo listarCajas
   * @descripcion Obtiene el listado completo de cajas registradoras configuradas en el sistema.
   * @returns {Promise<Array<object>>} Listado de cajas registradoras.
   * @throws {Error} Si ocurre un error en la base de datos.
   */
  static async listarCajas() {
    const [filas] = await pool.query('SELECT id, nombre, estado, creado_en FROM cajas_registradoras ORDER BY nombre ASC');
    return filas;
  }

  /**
   * @metodo obtenerCajaPorId
   * @descripcion Obtiene la información detallada de una caja registradora por su ID.
   * @param {number} id - ID de la caja registradora a buscar.
   * @returns {Promise<object|null>} Objeto de la caja o null si no se encuentra.
   * @throws {Error} Si ocurre un error en la base de datos.
   */
  static async obtenerCajaPorId(id) {
    const [filas] = await pool.query('SELECT id, nombre, estado, creado_en FROM cajas_registradoras WHERE id = ?', [id]);
    return filas[0] || null;
  }

  /**
   * @metodo actualizarCaja
   * @descripcion Actualiza el nombre y estado de una caja registradora existente.
   * @param {number} id - ID de la caja registradora.
   * @param {object} parametros - Campos a actualizar.
   * @param {string} parametros.nombre - Nuevo nombre.
   * @param {string} parametros.estado - Nuevo estado.
   * @returns {Promise<void>}
   * @throws {Error} Si ocurre un error en la base de datos.
   */
  static async actualizarCaja(id, { nombre, estado }) {
    await pool.query('UPDATE cajas_registradoras SET nombre = ?, estado = ? WHERE id = ?', [nombre, estado, id]);
  }

  // ============================================================================
  // 2. SESIONES DE CAJA (APERTURA Y ARQUEO / CIERRE)
  // ============================================================================

  /**
   * @metodo obtenerSesionActivaPorUsuario
   * @descripcion Obtiene la sesión de caja activa (estado 'abierta') asignada a un usuario específico.
   * @param {number} usuarioId - ID del usuario.
   * @returns {Promise<object|null>} Objeto con los datos de la sesión activa o null si no posee ninguna abierta.
   * @throws {Error} Si ocurre un error en la base de datos.
   */
  static async obtenerSesionActivaPorUsuario(usuarioId) {
    const [filas] = await pool.query(
      `SELECT s.id, s.caja_registradora_id, cr.nombre AS caja_nombre, s.abierto_por,
              s.monto_apertura, s.monto_ingresos, s.monto_egresos, s.monto_esperado, 
              s.estado, s.abierto_en
       FROM sesiones_caja s
       JOIN cajas_registradoras cr ON s.caja_registradora_id = cr.id
       WHERE s.abierto_por = ? AND s.estado = 'abierta'`,
      [usuarioId]
    );
    return filas[0] || null;
  }

  /**
   * @metodo abrirSesion
   * @descripcion Abre una nueva sesión de caja registradora validando que el usuario no tenga otra abierta.
   * @param {object} parametros - Datos para la apertura de sesión.
   * @param {number} parametros.caja_registradora_id - ID de la caja física/virtual.
   * @param {number} parametros.abierto_por - ID del usuario cajero.
   * @param {number} parametros.monto_apertura - Monto en efectivo con el que abre la caja.
   * @returns {Promise<number>} ID de la sesión de caja creada.
   * @throws {Error} Si el usuario ya cuenta con una sesión abierta o falla la base de datos.
   */
  static async abrirSesion({ caja_registradora_id, abierto_por, monto_apertura }) {
    // Validar si el usuario ya posee una sesión activa para prevenir doble apertura
    const sesionActiva = await this.obtenerSesionActivaPorUsuario(abierto_por);
    if (sesionActiva) {
      throw new Error('El usuario ya cuenta con una sesión de caja abierta en este momento.');
    }

    const [resultado] = await pool.query(
      `INSERT INTO sesiones_caja (caja_registradora_id, abierto_por, monto_apertura, monto_ingresos, monto_egresos, monto_esperado, estado, abierto_en)
       VALUES (?, ?, ?, 0.00, 0.00, ?, 'abierta', CURRENT_TIMESTAMP)`,
      [caja_registradora_id, abierto_por, monto_apertura, monto_apertura]
    );

    return resultado.insertId;
  }

  /**
   * @metodo cerrarSesion
   * @descripcion Cierra una sesión de caja de manera transaccional, registrando el arqueo de efectivo y otros métodos de pago.
   * @param {object} parametros - Parámetros del arqueo y cierre.
   * @param {number} parametros.sesion_caja_id - ID de la sesión de caja a cerrar.
   * @param {number} parametros.cerrado_por - ID del usuario que efectúa el cierre.
   * @param {number} parametros.arqueo_efectivo - Monto físico de efectivo contado.
   * @param {number} parametros.arqueo_tarjeta - Monto de transacciones por tarjeta reportadas.
   * @param {number} parametros.arqueo_transferencia - Monto de transferencias reportadas.
   * @param {string|null} [parametros.observaciones=null] - Observaciones o notas adicionales sobre el arqueo.
   * @returns {Promise<object>} Objeto que contiene monto_esperado, monto_contado y la diferencia resultante.
   * @throws {Error} Si la sesión no existe, ya está cerrada o hay error en la transacción.
   */
  static async cerrarSesion({
    sesion_caja_id,
    cerrado_por,
    arqueo_efectivo,
    arqueo_tarjeta,
    arqueo_transferencia,
    observaciones = null
  }) {
    const conexion = await pool.getConnection();

    try {
      await conexion.beginTransaction();

      // 1. Obtener datos actuales de la sesión con bloqueo de lectura
      const [sesionFilas] = await conexion.query(
        'SELECT monto_apertura, monto_ingresos, monto_egresos, monto_esperado, estado FROM sesiones_caja WHERE id = ? FOR UPDATE',
        [sesion_caja_id]
      );

      const sesion = sesionFilas[0];
      if (!sesion) {
        throw new Error('La sesión de caja especificada no existe.');
      }
      if (sesion.estado === 'cerrada') {
        throw new Error('Esta sesión de caja ya se encuentra cerrada.');
      }

      const monto_esperado = sesion.monto_esperado;
      const monto_contado = parseFloat(arqueo_efectivo) + parseFloat(arqueo_tarjeta) + parseFloat(arqueo_transferencia);
      const diferencia = monto_contado - monto_esperado; // Diferencia (positivo = sobrante, negativo = faltante)

      // 2. Registrar el arqueo detallado en la tabla cierres_caja
      await conexion.query(
        `INSERT INTO cierres_caja (sesion_caja_id, arqueo_efectivo, arqueo_tarjeta, arqueo_transferencia, monto_total_cierre, observaciones)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [sesion_caja_id, arqueo_efectivo, arqueo_tarjeta, arqueo_transferencia, monto_contado, observaciones]
      );

      // 3. Actualizar la cabecera de la sesión de caja a cerrada
      await conexion.query(
        `UPDATE sesiones_caja 
         SET cerrado_por = ?, cerrado_en = CURRENT_TIMESTAMP, monto_contado = ?, diferencia = ?, estado = 'cerrada'
         WHERE id = ?`,
        [cerrado_por, monto_contado, diferencia, sesion_caja_id]
      );

      await conexion.commit();
      return { monto_esperado, monto_contado, diferencia };
    } catch (error) {
      await conexion.rollback();
      throw error;
    } finally {
      conexion.release();
    }
  }

  /**
   * @metodo obtenerSesionDetallada
   * @descripcion Obtiene los detalles de una sesión de caja incluyendo su arqueo de cierre si lo tiene.
   * @param {number} id - ID de la sesión de caja.
   * @returns {Promise<object|null>} Detalles de la sesión y arqueos correspondientes.
   * @throws {Error} Si ocurre un error en la base de datos.
   */
  static async obtenerSesionDetallada(id) {
    const [filas] = await pool.query(
      `SELECT s.id, s.caja_registradora_id, cr.nombre AS caja_nombre, 
              s.abierto_por, u_ap.nombre AS abierto_por_nombre,
              s.cerrado_por, u_ce.nombre AS cerrado_por_nombre,
              s.monto_apertura, s.monto_ingresos, s.monto_egresos, s.monto_esperado, 
              s.monto_contado, s.diferencia, s.estado, s.abierto_en, s.cerrado_en,
              cc.arqueo_efectivo, cc.arqueo_tarjeta, cc.arqueo_transferencia, cc.observaciones
       FROM sesiones_caja s
       JOIN cajas_registradoras cr ON s.caja_registradora_id = cr.id
       JOIN usuarios u_ap ON s.abierto_por = u_ap.id
       LEFT JOIN usuarios u_ce ON s.cerrado_por = u_ce.id
       LEFT JOIN cierres_caja cc ON s.id = cc.sesion_caja_id
       WHERE s.id = ?`,
      [id]
    );
    return filas[0] || null;
  }

  /**
   * @metodo listarSesiones
   * @descripcion Lista el histórico de sesiones de cajas registradoras con filtros por fechas.
   * @param {object} [filtros={}] - Filtros de búsqueda.
   * @param {string|null} [filtros.fechaInicio=null] - Fecha de inicio YYYY-MM-DD.
   * @param {string|null} [filtros.fechaFin=null] - Fecha de fin YYYY-MM-DD.
   * @returns {Promise<Array<object>>} Listado histórico de sesiones de caja.
   * @throws {Error} Si ocurre un error en la base de datos.
   */
  static async listarSesiones({ fechaInicio = null, fechaFin = null } = {}) {
    let sql = `
      SELECT s.id, cr.nombre AS caja_nombre, u_ap.nombre AS abierto_por_nombre, 
             s.monto_apertura, s.monto_esperado, s.monto_contado, s.diferencia, s.estado, 
             s.abierto_en, s.cerrado_en
      FROM sesiones_caja s
      JOIN cajas_registradoras cr ON s.caja_registradora_id = cr.id
      JOIN usuarios u_ap ON s.abierto_por = u_ap.id
      WHERE 1=1
    `;
    const params = [];

    if (fechaInicio) {
      sql += ' AND s.abierto_en >= ?';
      params.push(`${fechaInicio} 00:00:00`);
    }
    if (fechaFin) {
      sql += ' AND s.abierto_en <= ?';
      params.push(`${fechaFin} 23:59:59`);
    }

    sql += ' ORDER BY s.id DESC';

    const [filas] = await pool.query(sql, params);
    return filas;
  }

  // ============================================================================
  // 3. MOVIMIENTOS DE CAJA (INGRESOS, EGRESOS)
  // ============================================================================

  /**
   * @metodo registrarMovimiento
   * @descripcion Registra un movimiento manual o automatizado de caja (ingreso / egreso) y actualiza los totales transaccionales en la sesión de caja activa.
   * @param {object} parametros - Datos del movimiento.
   * @param {number} parametros.sesion_caja_id - ID de la sesión de caja afectada.
   * @param {number} parametros.usuario_id - ID del usuario ejecutor del movimiento.
   * @param {string} parametros.tipo_movimiento - Tipo de movimiento ('ingreso', 'egreso').
   * @param {string} parametros.concepto - Descripción corta del concepto del movimiento.
   * @param {number} parametros.monto - Monto a ingresar o egresar de la caja.
   * @param {string|null} [parametros.referencia_tabla=null] - Nombre de la tabla relacionada (e.g. 'ventas', 'compras').
   * @param {number|null} [parametros.referencia_id=null] - ID de la fila relacionada en la tabla de referencia.
   * @param {string|null} [parametros.notas=null] - Notas adicionales detallando la transacción.
   * @param {object|null} [conexionTransaccional=null] - Conexión de pool de base de datos activa para soportar transacciones externas.
   * @returns {Promise<number>} ID del movimiento registrado.
   * @throws {Error} Si la sesión de caja está cerrada o hay error de ejecución en base de datos.
   */
  static async registrarMovimiento({
    sesion_caja_id,
    usuario_id,
    tipo_movimiento, // 'ingreso', 'egreso'
    concepto,
    monto,
    referencia_tabla = null,
    referencia_id = null,
    notas = null
  }, conexionTransaccional = null) {
    const conn = conexionTransaccional || await pool.getConnection();

    try {
      if (!conexionTransaccional) {
        await conn.beginTransaction();
      }

      // 1. Validar que la sesión esté abierta
      const [sesionFilas] = await conn.query(
        'SELECT estado FROM sesiones_caja WHERE id = ? FOR UPDATE',
        [sesion_caja_id]
      );
      if (!sesionFilas[0] || sesionFilas[0].estado !== 'abierta') {
        throw new Error('La sesión de caja está cerrada o no existe. No se pueden registrar movimientos.');
      }

      // 2. Insertar el movimiento
      const [resultado] = await conn.query(
        `INSERT INTO movimientos_caja (sesion_caja_id, usuario_id, tipo_movimiento, concepto, monto, referencia_tabla, referencia_id, notas)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [sesion_caja_id, usuario_id, tipo_movimiento, concepto, monto, referencia_tabla, referencia_id, notas]
      );

      // 3. Actualizar los acumulados en la cabecera de la sesión de caja
      if (tipo_movimiento === 'ingreso') {
        await conn.query(
          `UPDATE sesiones_caja 
           SET monto_ingresos = monto_ingresos + ?, monto_esperado = monto_esperado + ?
           WHERE id = ?`,
          [monto, monto, sesion_caja_id]
        );
      } else if (tipo_movimiento === 'egreso') {
        await conn.query(
          `UPDATE sesiones_caja 
           SET monto_egresos = monto_egresos + ?, monto_esperado = monto_esperado - ?
           WHERE id = ?`,
          [monto, monto, sesion_caja_id]
        );
      }

      if (!conexionTransaccional) {
        await conn.commit();
      }

      return resultado.insertId;
    } catch (error) {
      if (!conexionTransaccional) {
        await conn.rollback();
      }
      throw error;
    } finally {
      if (!conexionTransaccional) {
        conn.release();
      }
    }
  }

  /**
   * @metodo obtenerMovimientosPorSesion
   * @descripcion Obtiene la lista ordenada de movimientos registrados para una sesión de caja en específico.
   * @param {number} sesionCajaId - ID de la sesión de caja.
   * @returns {Promise<Array<object>>} Listado de movimientos de caja.
   * @throws {Error} Si ocurre un error en la base de datos.
   */
  static async obtenerMovimientosPorSesion(sesionCajaId) {
    const [filas] = await pool.query(
      `SELECT mc.id, mc.usuario_id, u.nombre AS usuario_nombre, 
              mc.tipo_movimiento, mc.concepto, mc.monto, mc.referencia_tabla, 
              mc.referencia_id, mc.notas, mc.creado_en
       FROM movimientos_caja mc
       JOIN usuarios u ON mc.usuario_id = u.id
       WHERE mc.sesion_caja_id = ?
       ORDER BY mc.id DESC`,
      [sesionCajaId]
    );
    return filas;
  }
}

export default Caja;
