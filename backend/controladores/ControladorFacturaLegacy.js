import Logger from '../utilidades/logger.js';
import FacturaLegacy from '../modelos/FacturaLegacy.js';
import { generarFacturaPDF } from '../utilidades/generarFacturaPDF.js';

/**
 * @controlador ControladorFactura
 * @descripcion Endpoints REST para el módulo de facturación local/legacy.
 *              Gestiona creación, consulta, anulación y generación de PDF.
 * @ruta-base /api/facturas
 */

// ─────────────────────────────────────────────────────────────
// GET /api/facturas
// ─────────────────────────────────────────────────────────────
export const listar = async (req, res) => {
  try {
    const { desde, hasta, estado } = req.query;
    const facturas = await FacturaLegacy.listarTodas({ desde, hasta, estado });
    res.json(facturas);
  } catch (error) {
    Logger.error('ControladorFacturaLegacy', 'listar facturas:', error);
    res.status(500).json({ mensaje: 'Error interno al listar facturas.' });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/facturas/venta/:venta_id
// ─────────────────────────────────────────────────────────────
export const verificarPorVenta = async (req, res) => {
  try {
    const factura = await FacturaLegacy.obtenerPorVentaId(req.params.venta_id);
    if (factura) {
      res.json({ existe: true, factura });
    } else {
      res.json({ existe: false });
    }
  } catch (error) {
    Logger.error('ControladorFacturaLegacy', 'verificar factura por venta:', error);
    res.status(500).json({ mensaje: 'Error interno al verificar factura.' });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/facturas/:id
// ─────────────────────────────────────────────────────────────
export const obtener = async (req, res) => {
  try {
    const factura = await FacturaLegacy.obtenerPorId(req.params.id);
    if (!factura) {
      return res.status(404).json({ mensaje: 'Factura no encontrada.' });
    }
    res.json(factura);
  } catch (error) {
    Logger.error('ControladorFacturaLegacy', 'obtener factura:', error);
    res.status(500).json({ mensaje: 'Error interno al obtener factura.' });
  }
};

/**
 * @endpoint POST /api/facturas
 * @descripcion Crea una nueva factura local en el sistema.
 *              Valida que el cliente tenga nombre y que
 *              haya al menos un ítem antes de procesar.
 * @acceso Requiere permiso: facturacion_emitir
 * @body {object} cliente   - Datos del cliente
 * @body {Array}  items     - Líneas de detalle
 * @body {boolean} con_iva  - Si aplica IVA
 * @respuesta-201 { mensaje, factura }
 * @respuesta-400 { mensaje } - Datos incompletos
 * @respuesta-500 { mensaje } - Error interno
 */
export const crear = async (req, res) => {
  try {
    const { cliente, items } = req.body;

    // Validaciones básicas antes de tocar la BD
    if (!cliente || !cliente.nombre || !cliente.nombre.trim()) {
      return res.status(400).json({
        mensaje: 'El nombre del cliente es obligatorio.'
      });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        mensaje: 'Debe agregar al menos un ítem a la factura.'
      });
    }

    const nuevaFactura = await FacturaLegacy.crear({
      ...req.body,
      usuario_id: req.usuario.id
    });

    res.status(201).json({
      mensaje: 'Factura generada exitosamente.',
      factura: nuevaFactura
    });

  } catch (error) {
    Logger.error('ControladorFacturaLegacy', 'Error al crear factura', { message: error.message });

    // Errores de negocio (mensaje claro para el usuario)
    const erroresNegocio = [
      'configuración de empresa',
      'nombre del cliente',
      'al menos un ítem',
      'usuario que emite'
    ];
    const esErrorNegocio = erroresNegocio.some(e =>
      error.message.toLowerCase().includes(e.toLowerCase())
    );

    if (esErrorNegocio) {
      return res.status(400).json({ mensaje: error.message });
    }

    res.status(500).json({
      mensaje: 'Error interno al generar la factura. ' + error.message
    });
  }
};

// ─────────────────────────────────────────────────────────────
// PATCH /api/facturas/:id/anular
// ─────────────────────────────────────────────────────────────
export const anular = async (req, res) => {
  try {
    await FacturaLegacy.anular(req.params.id, req.usuario.id);
    res.json({ mensaje: 'Factura anulada exitosamente.' });
  } catch (error) {
    Logger.error('ControladorFacturaLegacy', 'anular factura:', error);
    res.status(500).json({ mensaje: error.message || 'Error interno al anular la factura.' });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/facturas/config
// ─────────────────────────────────────────────────────────────
export const getConfig = async (req, res) => {
  try {
    const config = await FacturaLegacy.obtenerConfigEmpresa();
    if (!config) {
      return res.status(404).json({
        mensaje: 'No hay configuración de empresa. Configúrala primero.'
      });
    }
    res.json(config);
  } catch (error) {
    Logger.error('ControladorFacturaLegacy', 'obtener config empresa:', error);
    res.status(500).json({ mensaje: 'Error interno al obtener configuración.' });
  }
};

// ─────────────────────────────────────────────────────────────
// PUT /api/facturas/config
// ─────────────────────────────────────────────────────────────
export const updateConfig = async (req, res) => {
  try {
    const actualizado = await FacturaLegacy.actualizarConfigEmpresa(req.body);
    if (actualizado) {
      res.json({ mensaje: 'Configuración actualizada exitosamente.' });
    } else {
      res.status(400).json({
        mensaje: 'No se enviaron datos válidos para actualizar.'
      });
    }
  } catch (error) {
    Logger.error('ControladorFacturaLegacy', 'actualizar config empresa:', error);
    res.status(500).json({
      mensaje: 'Error interno al actualizar configuración.'
    });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/facturas/:id/pdf
// ─────────────────────────────────────────────────────────────
export const generarPDF = async (req, res) => {
  try {
    const factura = await FacturaLegacy.obtenerPorId(req.params.id);
    if (!factura) {
      return res.status(404).json({ mensaje: 'Factura no encontrada.' });
    }

    const pdfBuffer = await generarFacturaPDF(factura);

    const fechaStr = new Date(factura.fecha_emision).toISOString().split('T')[0];
    const filename = `Factura_${factura.numero_factura}_${fechaStr}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`
    );
    res.send(pdfBuffer);

  } catch (error) {
    Logger.error('ControladorFacturaLegacy', 'generar PDF de factura:', error);
    res.status(500).json({
      mensaje: 'Error interno al generar PDF. ' + error.message
    });
  }
};