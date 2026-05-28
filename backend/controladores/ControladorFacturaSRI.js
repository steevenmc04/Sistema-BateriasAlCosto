import Logger from '../utilidades/logger.js';
import Factura from '../modelos/FacturaLegacy.js';
import { emitirFacturaDatil } from '../servicios/datilService.js';
import Auditoria from '../modelos/Auditoria.js';

/**
 * Controlador de Negocio: ControladorFacturaSRI
 * Gestiona el flujo de comunicación asíncrona y reintentos del SRI con el API de Datil.
 */
class ControladorFacturaSRI {
  /**
   * Envía o reintenta procesar una factura ante el SRI mediante la API de Datil.
   */
  static async procesarFacturaSRI(req, res) {
    const { id } = req.params;

    try {
      // 1. Obtener la factura con sus ítems de detalle asociados
      const factura = await Factura.obtenerPorId(id);
      if (!factura) {
        return res.status(404).json({ mensaje: 'La factura solicitada no existe.' });
      }

      if (factura.sri_estado === 'AUTORIZADA') {
        return res.status(400).json({ mensaje: 'Esta factura ya se encuentra autorizada por el SRI.' });
      }

      // Registrar auditoría de inicio del procesamiento SRI
      await Auditoria.registrar({
        usuario_id: req.usuario.id,
        accion: 'editar',
        tabla_afectada: 'facturas',
        registro_id: id,
        descripcion: `Iniciado proceso de envío al SRI/Datil para Factura #${factura.numero_factura}`,
        ip_direccion: req.ip
      });

      // 2. Consumir el servicio oficial de Datil
      try {
        const respuestaDatil = await emitirFacturaDatil(factura);

        // 3. Si Datil responde, actualizar cabecera de la factura en BD
        await Factura.actualizarEstadoSRI(id, {
          sri_estado: respuestaDatil.estado || 'PENDIENTE',
          sri_numero_autorizacion: respuestaDatil.numero_autorizacion,
          sri_fecha_autorizacion: respuestaDatil.fecha_autorizacion ? new Date(respuestaDatil.fecha_autorizacion) : null,
          sri_clave_acceso: respuestaDatil.clave_acceso,
          sri_ride_url: respuestaDatil.ride_url,
          sri_error: null
        });

        // Registrar log de logs XML y respuesta cruda
        await Factura.registrarComprobanteSRI(id, null, respuestaDatil);

        await Auditoria.registrar({
          usuario_id: req.usuario.id,
          accion: 'editar',
          tabla_afectada: 'facturas',
          registro_id: id,
          descripcion: `Factura #${factura.numero_factura} enviada al SRI. Estado final: ${respuestaDatil.estado}. Clave: ${respuestaDatil.clave_acceso}`,
          ip_direccion: req.ip
        });

        return res.status(200).json({
          mensaje: `Factura procesada con éxito. Estado SRI: ${respuestaDatil.estado}`,
          resultado: respuestaDatil
        });
      } catch (errorApi) {
        // Manejar errores de validación de Datil o SRI
        const mensajeError = errorApi.response?.data?.message || errorApi.message || 'Error de comunicación de red con Datil.';
        Logger.error('ControladorFacturaSRI', 'Error al emitir factura en Datil', { message: mensajeError });

        await Factura.actualizarEstadoSRI(id, {
          sri_estado: 'RECHAZADO',
          sri_numero_autorizacion: null,
          sri_fecha_autorizacion: null,
          sri_clave_acceso: null,
          sri_ride_url: null,
          sri_error: mensajeError
        });

        await Auditoria.registrar({
          usuario_id: req.usuario.id,
          accion: 'error',
          tabla_afectada: 'facturas',
          registro_id: id,
          descripcion: `Fallo al procesar Factura #${factura.numero_factura} en Datil: ${mensajeError}`,
          ip_direccion: req.ip
        });

        return res.status(400).json({
          mensaje: `La API del SRI o Datil rechazó el comprobante. Detalle: ${mensajeError}`
        });
      }
    } catch (error) {
      Logger.error('ControladorFacturaSRI', 'Error en procesarFacturaSRI', error);
      return res.status(500).json({ mensaje: 'Error interno del servidor al facturar electrónicamente.' });
    }
  }

  /**
   * Obtiene una factura por su ID.
   */
  static async obtener(req, res) {
    const { id } = req.params;
    try {
      const factura = await Factura.obtenerPorId(id);
      if (!factura) {
        return res.status(404).json({ mensaje: 'Factura no encontrada.' });
      }
      return res.status(200).json(factura);
    } catch (error) {
      return res.status(500).json({ mensaje: 'Error al obtener factura.' });
    }
  }

  /**
   * Lista de facturas de cobros para el panel SRI.
   */
  static async listar(req, res) {
    const { fechaInicio, fechaFin, buscar, sriEstado, limite, desplazamiento } = req.query;
    try {
      const facturas = await Factura.listarTodos({
        fechaInicio,
        fechaFin,
        buscar,
        sriEstado,
        limite: limite ? parseInt(limite) : 100,
        desplazamiento: desplazamiento ? parseInt(desplazamiento) : 0
      });
      return res.status(200).json(facturas);
    } catch (error) {
      return res.status(500).json({ mensaje: 'Error al obtener lista de facturas.' });
    }
  }
}

export default ControladorFacturaSRI;
