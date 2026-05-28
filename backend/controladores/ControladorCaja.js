import Logger from '../utilidades/logger.js';
import Caja from '../modelos/Caja.js';
import Auditoria from '../modelos/Auditoria.js';

/**
 * @controlador ControladorCaja
 * @descripcion Controlador que maneja el flujo de caja diario (POS), aperturas de turno, arqueos físicos y movimientos directos de efectivo.
 */
class ControladorCaja {
  // ============================================================================
  // CAJAS REGISTRADORAS
  // ============================================================================

  /**
   * @route GET /api/cajas
   * @descripcion Obtiene el listado de todas las cajas registradoras configuradas en el sistema.
   * @param {Object} req - Objeto de petición de Express.
   * @param {Object} res - Objeto de respuesta de Express.
   * @returns {Promise<Object>} 200 - Lista de cajas registradoras.
   * @returns {Promise<Object>} 500 - Error al obtener cajas registradoras.
   */
  static async listarCajas(req, res) {
    try {
      const cajas = await Caja.listarCajas();
      return res.status(200).json(cajas);
    } catch (error) {
      return res.status(500).json({ mensaje: 'Error al obtener cajas registradoras.' });
    }
  }

  /**
   * @route POST /api/cajas
   * @descripcion Registra una nueva caja registradora en el sistema.
   * @param {Object} req - Objeto de petición de Express.
   * @param {Object} req.body - Cuerpo de la petición con datos de la caja.
   * @param {string} req.body.nombre - Nombre identificador único de la caja.
   * @param {string} [req.body.estado] - Estado inicial de la caja (ej. 'activo').
   * @param {Object} res - Objeto de respuesta de Express.
   * @returns {Promise<Object>} 201 - Caja registradora creada exitosamente con su ID asignado.
   * @returns {Promise<Object>} 400 - Petición inválida si el nombre está ausente.
   * @returns {Promise<Object>} 500 - Error interno al crear la caja registradora.
   */
  static async crearCaja(req, res) {
    const { nombre, estado } = req.body;
    if (!nombre) {
      return res.status(400).json({ mensaje: 'El nombre de la caja es obligatorio.' });
    }
    try {
      const nuevoId = await Caja.crearCaja({ nombre, estado });
      return res.status(201).json({ mensaje: 'Caja registradora creada exitosamente.', id: nuevoId });
    } catch (error) {
      return res.status(500).json({ mensaje: 'Error al crear caja registradora.' });
    }
  }

  /**
   * @route PUT /api/cajas/:id
   * @descripcion Modifica los datos de una caja registradora existente.
   * @param {Object} req - Objeto de petición de Express.
   * @param {Object} req.params - Parámetros de la ruta.
   * @param {string} req.params.id - ID único de la caja registradora a actualizar.
   * @param {Object} req.body - Cuerpo de la petición con los datos a actualizar.
   * @param {string} [req.body.nombre] - Nuevo nombre de la caja.
   * @param {string} [req.body.estado] - Nuevo estado de la caja.
   * @param {Object} res - Objeto de respuesta de Express.
   * @returns {Promise<Object>} 200 - Caja registradora actualizada correctamente.
   * @returns {Promise<Object>} 500 - Error al actualizar la caja registradora.
   */
  static async actualizarCaja(req, res) {
    const { id } = req.params;
    const { nombre, estado } = req.body;
    try {
      await Caja.actualizarCaja(id, { nombre, estado });
      return res.status(200).json({ mensaje: 'Caja registradora actualizada correctamente.' });
    } catch (error) {
      return res.status(500).json({ mensaje: 'Error al actualizar caja registradora.' });
    }
  }

  // ============================================================================
  // TURNOS / SESIONES DE CAJA
  // ============================================================================

  /**
   * @route GET /api/caja/estado
   * @descripcion Consulta el estado de caja del usuario autenticado (si tiene una sesión abierta).
   * @param {Object} req - Objeto de petición de Express.
   * @param {Object} req.usuario - Información del usuario autenticado.
   * @param {number} req.usuario.id - ID del usuario autenticado.
   * @param {Object} res - Objeto de respuesta de Express.
   * @returns {Promise<Object>} 200 - Indica si la caja está abierta y los datos de la sesión activa en caso afirmativo.
   * @returns {Promise<Object>} 500 - Error interno al consultar estado de caja.
   */
  static async obtenerEstadoCaja(req, res) {
    try {
      const sesion = await Caja.obtenerSesionActivaPorUsuario(req.usuario.id);
      if (!sesion) {
        return res.status(200).json({ abierta: false, sesion: null });
      }
      return res.status(200).json({ abierta: true, sesion });
    } catch (error) {
      Logger.error('ControladorCaja', 'Error al obtener estado de caja', error);
      return res.status(500).json({ mensaje: 'Error al consultar estado de caja.' });
    }
  }

  /**
   * @route POST /api/caja/abrir
   * @descripcion Abre un turno/sesión de caja registradora y registra la acción en auditoría.
   * @param {Object} req - Objeto de petición de Express.
   * @param {Object} req.usuario - Información del usuario autenticado.
   * @param {number} req.usuario.id - ID del usuario que abre el turno.
   * @param {Object} req.body - Parámetros de apertura de caja.
   * @param {number} req.body.caja_registradora_id - ID de la caja registradora física a abrir.
   * @param {number|string} req.body.monto_apertura - Monto en efectivo con el que se inicia la caja.
   * @param {string} req.ip - Dirección IP de la petición para auditoría.
   * @param {Object} res - Objeto de respuesta de Express.
   * @returns {Promise<Object>} 201 - Turno/sesión de caja abierto con éxito.
   * @returns {Promise<Object>} 400 - Campos de apertura incompletos o error lógico.
   */
  static async abrirCaja(req, res) {
    const { caja_registradora_id, monto_apertura } = req.body;

    if (!caja_registradora_id || monto_apertura === undefined) {
      return res.status(400).json({ mensaje: 'Campos de apertura incompletos.' });
    }

    try {
      const sesionId = await Caja.abrirSesion({
        caja_registradora_id,
        abierto_por: req.usuario.id,
        monto_apertura: parseFloat(monto_apertura)
      });

      await Auditoria.registrar({
        usuario_id: req.usuario.id,
        accion: 'crear',
        tabla_afectada: 'sesiones_caja',
        registro_id: sesionId,
        descripcion: `Sesión de caja abierta (Caja ID: ${caja_registradora_id}, Apertura: $${monto_apertura})`,
        ip_direccion: req.ip
      });

      return res.status(201).json({ mensaje: 'Caja abierta con éxito.', sesionId });
    } catch (error) {
      Logger.error('ControladorCaja', 'Error al abrir caja', error);
      return res.status(400).json({ mensaje: error.message || 'Error al abrir caja.' });
    }
  }

  /**
   * @route POST /api/caja/cerrar
   * @descripcion Cierra el turno de caja, registra el arqueo físico detallado y documenta el resultado en auditoría.
   * @param {Object} req - Objeto de petición de Express.
   * @param {Object} req.usuario - Información del usuario autenticado.
   * @param {number} req.usuario.id - ID del usuario que cierra el turno.
   * @param {Object} req.body - Cuerpo de la petición con datos del arqueo de cierre.
   * @param {number} req.body.sesion_caja_id - ID de la sesión a cerrar.
   * @param {number|string} req.body.arqueo_efectivo - Total de efectivo contado físicamente.
   * @param {number|string} req.body.arqueo_tarjeta - Total de cobros por tarjeta contados.
   * @param {number|string} req.body.arqueo_transferencia - Total de cobros por transferencia contados.
   * @param {string} [req.body.observaciones] - Comentarios o notas adicionales sobre el arqueo.
   * @param {string} req.ip - Dirección IP de la petición.
   * @param {Object} res - Objeto de respuesta de Express.
   * @returns {Promise<Object>} 200 - Caja cerrada y arqueada con éxito, retornando diferencias calculadas.
   * @returns {Promise<Object>} 400 - Campos de arqueo incompletos o error lógico.
   */
  static async cerrarCaja(req, res) {
    const { sesion_caja_id, arqueo_efectivo, arqueo_tarjeta, arqueo_transferencia, observaciones } = req.body;

    if (!sesion_caja_id || arqueo_efectivo === undefined || arqueo_tarjeta === undefined || arqueo_transferencia === undefined) {
      return res.status(400).json({ mensaje: 'Campos de arqueo de cierre incompletos.' });
    }

    try {
      const resultado = await Caja.cerrarSesion({
        sesion_caja_id,
        cerrado_por: req.usuario.id,
        arqueo_efectivo: parseFloat(arqueo_efectivo),
        arqueo_tarjeta: parseFloat(arqueo_tarjeta),
        arqueo_transferencia: parseFloat(arqueo_transferencia),
        observaciones
      });

      await Auditoria.registrar({
        usuario_id: req.usuario.id,
        accion: 'editar',
        tabla_afectada: 'sesiones_caja',
        registro_id: sesion_caja_id,
        descripcion: `Sesión de caja cerrada. Esperado: $${resultado.monto_esperado}, Contado: $${resultado.monto_contado}, Diferencia: $${resultado.diferencia}`,
        ip_direccion: req.ip
      });

      return res.status(200).json({
        mensaje: 'Caja cerrada y arqueada con éxito.',
        arqueo: resultado
      });
    } catch (error) {
      Logger.error('ControladorCaja', 'Error al cerrar caja', error);
      return res.status(400).json({ mensaje: error.message || 'Error al cerrar caja.' });
    }
  }

  /**
   * @route GET /api/caja/sesiones
   * @descripcion Obtiene el histórico de sesiones de caja en un rango de fechas.
   * @param {Object} req - Objeto de petición de Express.
   * @param {Object} req.query - Filtros de consulta.
   * @param {string} [req.query.fechaInicio] - Fecha inicial del rango de búsqueda (YYYY-MM-DD).
   * @param {string} [req.query.fechaFin] - Fecha final del rango de búsqueda (YYYY-MM-DD).
   * @param {Object} res - Objeto de respuesta de Express.
   * @returns {Promise<Object>} 200 - Listado de sesiones de caja encontradas.
   * @returns {Promise<Object>} 500 - Error al listar las sesiones de caja.
   */
  static async listarSesiones(req, res) {
    const { fechaInicio, fechaFin } = req.query;
    try {
      const sesiones = await Caja.listarSesiones({ fechaInicio, fechaFin });
      return res.status(200).json(sesiones);
    } catch (error) {
      return res.status(500).json({ mensaje: 'Error al listar sesiones de caja.' });
    }
  }

  /**
   * @route GET /api/caja/sesiones/:id
   * @descripcion Obtiene los detalles y arqueo completo de una sesión de caja específica por su ID.
   * @param {Object} req - Objeto de petición de Express.
   * @param {Object} req.params - Parámetros de ruta.
   * @param {string} req.params.id - ID único de la sesión de caja.
   * @param {Object} res - Objeto de respuesta de Express.
   * @returns {Promise<Object>} 200 - Detalles completos de la sesión.
   * @returns {Promise<Object>} 404 - Sesión de caja no encontrada.
   * @returns {Promise<Object>} 500 - Error interno al obtener detalles de la sesión.
   */
  static async obtenerSesion(req, res) {
    const { id } = req.params;
    try {
      const sesion = await Caja.obtenerSesionDetallada(id);
      if (!sesion) {
        return res.status(404).json({ mensaje: 'Sesión de caja no encontrada.' });
      }
      return res.status(200).json(sesion);
    } catch (error) {
      return res.status(500).json({ mensaje: 'Error al obtener detalles de la sesión.' });
    }
  }

  // ============================================================================
  // MOVIMIENTOS DIRECTOS DE EFECTIVO
  // ============================================================================

  /**
   * @route POST /api/caja/movimientos
   * @descripcion Registra un ingreso o egreso manual directo de efectivo en la caja activa y audita el movimiento.
   * @param {Object} req - Objeto de petición de Express.
   * @param {Object} req.usuario - Información del usuario autenticado.
   * @param {number} req.usuario.id - ID del usuario que realiza la transacción.
   * @param {Object} req.body - Datos del movimiento de efectivo.
   * @param {number} req.body.sesion_caja_id - ID de la sesión de caja activa.
   * @param {string} req.body.tipo_movimiento - Tipo de movimiento ('ingreso' o 'egreso').
   * @param {string} req.body.concepto - Concepto o justificación de la transacción.
   * @param {number|string} req.body.monto - Monto de efectivo transaccionado.
   * @param {string} [req.body.notas] - Notas descriptivas adicionales.
   * @param {string} req.ip - Dirección IP de la petición.
   * @param {Object} res - Objeto de respuesta de Express.
   * @returns {Promise<Object>} 201 - Movimiento registrado con éxito.
   * @returns {Promise<Object>} 400 - Campos incompletos o error lógico.
   */
  static async registrarMovimiento(req, res) {
    const { sesion_caja_id, tipo_movimiento, concepto, monto, notas } = req.body;

    if (!sesion_caja_id || !tipo_movimiento || monto === undefined || !concepto) {
      return res.status(400).json({ mensaje: 'Campos de transacción de caja incompletos.' });
    }

    try {
      const movId = await Caja.registrarMovimiento({
        sesion_caja_id,
        usuario_id: req.usuario.id,
        tipo_movimiento,
        concepto,
        monto: parseFloat(monto),
        notas
      });

      await Auditoria.registrar({
        usuario_id: req.usuario.id,
        accion: 'crear',
        tabla_afectada: 'movimientos_caja',
        registro_id: movId,
        descripcion: `Movimiento manual de caja registrado (${tipo_movimiento}): ${concepto} por $${monto}`,
        ip_direccion: req.ip
      });

      return res.status(201).json({ mensaje: 'Movimiento de caja registrado exitosamente.', movimientoId: movId });
    } catch (error) {
      Logger.error('ControladorCaja', 'Error al registrar movimiento manual en caja', error);
      return res.status(400).json({ mensaje: error.message || 'Error al registrar movimiento manual.' });
    }
  }

  /**
   * @route GET /api/caja/sesiones/:sesionCajaId/movimientos
   * @descripcion Obtiene todos los movimientos de caja asociados a una sesión de caja específica.
   * @param {Object} req - Objeto de petición de Express.
   * @param {Object} req.params - Parámetros de ruta.
   * @param {string} req.params.sesionCajaId - ID único de la sesión de caja.
   * @param {Object} res - Objeto de respuesta de Express.
   * @returns {Promise<Object>} 200 - Listado de movimientos de caja asociados a la sesión.
   * @returns {Promise<Object>} 500 - Error al obtener movimientos de la sesión.
   */
  static async listarMovimientos(req, res) {
    const { sesionCajaId } = req.params;
    try {
      const movimientos = await Caja.obtenerMovimientosPorSesion(sesionCajaId);
      return res.status(200).json(movimientos);
    } catch (error) {
      return res.status(500).json({ mensaje: 'Error al obtener movimientos de la sesión.' });
    }
  }
}

export default ControladorCaja;ControladorCaja;
