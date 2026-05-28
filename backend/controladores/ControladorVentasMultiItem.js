import Venta from '../modelos/Venta.js';
import Cliente from '../modelos/Cliente.js';
import Auditoria from '../modelos/Auditoria.js';
import Logger from '../utilidades/logger.js';
import pool from '../configuracion/baseDeDatos.js';
import { resolverProducto } from '../utilidades/resolverProducto.js';

/**
 * @class ControladorVentasMultiItem
 * @description Controlador para ventas multi-item transaccionales con validaciones exhaustivas.
 * @author OpenCode Senior Engineer
 * @version 1.0.0
 */
class ControladorVentasMultiItem {
  /**
   * POST /api/ventas
   * Crear venta multi-item transaccional
   */
  static async crear(req, res) {
    const {
      cliente_id,
      cliente_nombre,
      cliente_tipo_documento,
      cliente_documento,
      cliente_telefono,
      cliente_email,
      cliente_direccion,
      sesion_caja_id,
      numero_factura,
      subtotal,
      descuento = 0,
      base_imponible,
      monto_iva,
      total,
      iva_porcentaje = 15,
      metodo_pago = 'efectivo',
      notas,
      articulos
    } = req.body || {};

    const usuario_id = req.usuario?.id;
    const usuario_nombre = req.usuario?.nombre;
    const usuario_ip = req.ip;

    try {
      // ======= RESOLVER CLIENTE (auto-creación) =======
      let resolvedClienteId = cliente_id ? parseInt(cliente_id) : null;

      if (!resolvedClienteId) {
        if (cliente_documento) {
          const existente = await Cliente.buscarPorDocumento(cliente_documento);
          if (existente) {
            resolvedClienteId = existente.id;
          }
        }
        if (!resolvedClienteId && cliente_nombre && cliente_nombre.trim()) {
          resolvedClienteId = await Cliente.crear({
            nombre: cliente_nombre.trim(),
            tipo_documento: cliente_tipo_documento || 'cedula',
            documento: cliente_documento || '9999999999',
            telefono: cliente_telefono || null,
            email: cliente_email || null,
            direccion: cliente_direccion || null
          });
        }
      }

      if (!resolvedClienteId) {
        const [filasCf] = await pool.query(
          "SELECT id FROM clientes WHERE nombre = 'CONSUMIDOR FINAL' LIMIT 1"
        );
        if (filasCf && filasCf.length > 0) {
          resolvedClienteId = filasCf[0].id;
        } else {
          resolvedClienteId = await Cliente.crear({
            nombre: 'CONSUMIDOR FINAL',
            tipo_documento: 'cedula',
            documento: '9999999999',
            telefono: null,
            email: null,
            direccion: null
          });
        }
      }

      // ======= VALIDACIONES PRELIMINARES =======
      Logger.info('Ventas', 'Iniciando validación de venta multi-item', {
        cliente_id: resolvedClienteId,
        sesion_caja_id,
        usuario_id,
        cantidad_items: articulos?.length
      });

      // Sesión de caja es opcional. Si no se provee, se omite validación y movimiento de caja.
      let resolvedSesionCajaId = null;
      if (sesion_caja_id && Number.isInteger(parseInt(sesion_caja_id))) {
        resolvedSesionCajaId = parseInt(sesion_caja_id);
      }

      if (subtotal == null || isNaN(Number(subtotal)) || Number(subtotal) < 0) {
        return res.status(400).json({
          ok: false,
          error: 'Subtotal debe ser número >= 0'
        });
      }

      if (total == null || isNaN(Number(total)) || Number(total) < 0) {
        return res.status(400).json({
          ok: false,
          error: 'Total debe ser número >= 0'
        });
      }

      if (!Array.isArray(articulos) || articulos.length === 0) {
        return res.status(400).json({
          ok: false,
          error: 'Debe incluir al menos un artículo'
        });
      }

      // Validar cada artículo
      for (let i = 0; i < articulos.length; i++) {
        const art = articulos[i];

        if (!Number.isFinite(art.cantidad) || art.cantidad <= 0) {
          return res.status(400).json({
            ok: false,
            error: `Artículo ${i + 1}: cantidad debe ser > 0`
          });
        }

        if (!Number.isFinite(art.precio_unitario) || art.precio_unitario < 0) {
          return res.status(400).json({
            ok: false,
            error: `Artículo ${i + 1}: precio_unitario debe ser >= 0`
          });
        }

        if (!art.producto_id && !art.marca_custom && !art.tipo_caja_custom) {
          return res.status(400).json({
            ok: false,
            error: `Artículo ${i + 1}: debe tener producto_id o marca_custom/tipo_caja_custom`
          });
        }

        if (art.marca_custom || art.tipo_caja_custom) {
          const resolvedId = await resolverProducto(art, null, {
            tipoInventario: art.tipo === 'varios' ? 'varios' : 'bateria'
          });
          if (!resolvedId) {
            return res.status(400).json({
              ok: false,
              error: `Artículo ${i + 1}: no se pudo resolver producto custom`
            });
          }
          art.producto_id = resolvedId;
        }

        if (!art.producto_id || !Number.isInteger(parseInt(art.producto_id))) {
          return res.status(400).json({
            ok: false,
            error: `Artículo ${i + 1}: producto_id inválido`
          });
        }
      }

      // ======= EJECUTAR TRANSACCIÓN =======
      Logger.info('Ventas', 'Guardando venta multi-item en BD');

      const resultado = await Venta.crearVentaMultiItem({
        cliente_id: resolvedClienteId,
        usuario_id,
        sesion_caja_id: resolvedSesionCajaId,
        numero_factura: numero_factura || null,
        subtotal: Number(subtotal),
        descuento: Number(descuento || 0),
        base_imponible: Number(base_imponible || subtotal),
        monto_iva: Number(monto_iva || 0),
        total: Number(total),
        iva_porcentaje: Number(iva_porcentaje) >= 0 ? Number(iva_porcentaje) : 15,
        metodo_pago,
        notas: notas || null,
        articulos: articulos.map(art => {
          const item = {
            producto_id: parseInt(art.producto_id),
            cantidad: parseInt(art.cantidad),
            precio_unitario: Number(art.precio_unitario),
            descuento: Number(art.descuento || 0)
          };
          if (art.marca_custom) item.marca_custom = art.marca_custom;
          if (art.tipo_caja_custom) item.tipo_caja_custom = art.tipo_caja_custom;
          return item;
        })
      });

      // ======= REGISTRAR AUDITORÍA =======
      await Auditoria.registrar({
        usuario_id,
        accion: 'crear',
        tabla_afectada: 'ventas',
        registro_id: resultado.data.venta_id,
        descripcion: `Venta #${resultado.data.venta_id}. Cliente ID: ${resolvedClienteId}. ${resultado.data.cantidad_items} items. Total: ${total}`,
        ip_direccion: usuario_ip
      });

      Logger.info('Ventas', 'Venta multi-item creada exitosamente', {
        venta_id: resultado.data.venta_id,
        usuario_id,
        cantidad_items: resultado.data.cantidad_items
      });

      return res.status(201).json(resultado);
    } catch (error) {
      Logger.error('Ventas', 'Error al registrar venta multi-item', error);

      let mensaje = error.message || 'Error al registrar la venta';

      if ((error.sqlMessage || '').toLowerCase().includes('foreign')) {
        mensaje = 'Cliente o producto inexistente';
      } else if (mensaje.includes('stock insuficiente')) {
        // Dejar como está
      } else if (mensaje.includes('sesión')) {
        // Dejar como está
      }

      return res.status(400).json({
        ok: false,
        error: mensaje
      });
    }
  }

  /**
   * GET /api/ventas/:id
   * Obtener venta por ID
   */
  static async obtener(req, res) {
    try {
      const { id } = req.params;
      const venta = await Venta.obtenerPorId(id);

      if (!venta) {
        return res.status(404).json({
          ok: false,
          error: 'Venta no encontrada'
        });
      }

      return res.status(200).json({
        ok: true,
        data: venta
      });
    } catch (error) {
      Logger.error('Ventas', 'Error al obtener venta', error);
      return res.status(500).json({
        ok: false,
        error: 'Error al obtener la venta'
      });
    }
  }

  /**
   * GET /api/ventas
   * Listar ventas con filtros
   */
  static async listar(req, res) {
    try {
      const {
        fechaInicio,
        fechaFin,
        clienteId,
        estado,
        limite = 50,
        desplazamiento = 0
      } = req.query;

      const ventas = await Venta.listarTodos({
        fechaInicio,
        fechaFin,
        clienteId: clienteId ? parseInt(clienteId) : null,
        estado,
        limite: Math.min(parseInt(limite), 500),
        desplazamiento: parseInt(desplazamiento)
      });

      return res.status(200).json({
        ok: true,
        data: ventas
      });
    } catch (error) {
      Logger.error('Ventas', 'Error al listar ventas', error);
      return res.status(500).json({
        ok: false,
        error: 'Error al listar ventas'
      });
    }
  }

  /**
   * DELETE /api/ventas/:id
   * Anular venta (revertir inventario y caja)
   */
  static async anular(req, res) {
    try {
      const { id } = req.params;
      const usuario_id = req.usuario?.id;
      const usuario_ip = req.ip;

      // Obtener venta para obtener sesion_caja_id
      const venta = await Venta.obtenerPorId(id);
      if (!venta) {
        return res.status(404).json({
          ok: false,
          error: 'Venta no encontrada'
        });
      }

      await Venta.anularVenta(id, usuario_id, venta.sesion_caja_id);

      await Auditoria.registrar({
        usuario_id,
        accion: 'anular',
        tabla_afectada: 'ventas',
        registro_id: id,
        descripcion: `Venta #${id} anulada`,
        ip_direccion: usuario_ip
      });

      Logger.info('Ventas', 'Venta anulada', { venta_id: id, usuario_id });

      return res.status(200).json({
        ok: true,
        data: { venta_id: id },
        message: 'Venta anulada exitosamente'
      });
    } catch (error) {
      Logger.error('Ventas', 'Error al anular venta', error);
      return res.status(400).json({
        ok: false,
        error: error.message || 'Error al anular venta'
      });
    }
  }
}

export default ControladorVentasMultiItem;
