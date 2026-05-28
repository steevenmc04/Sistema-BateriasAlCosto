import Compra from '../modelos/Compra.js';
import Auditoria from '../modelos/Auditoria.js';
import Logger from '../utilidades/logger.js';
import { resolverProducto } from '../utilidades/resolverProducto.js';

class ControladorComprasMultiItem {
  static async crear(req, res) {
    const {
      numero_factura,
      total,
      notas,
      articulos
    } = req.body || {};

    const usuario_id = req.usuario?.id;
    const usuario_nombre = req.usuario?.nombre;
    const usuario_ip = req.ip;

    try {
      console.log('PAYLOAD COMPRA:', JSON.stringify(req.body, null, 2));

      Logger.info('Compras', 'Iniciando validacion de compra multi-item', {
        numero_factura,
        usuario_id,
        cantidad_items: articulos?.length
      });

      const resolvedFactura = (numero_factura && typeof numero_factura === 'string' && numero_factura.trim() !== '')
        ? numero_factura.trim() : 'S/N';

      if (total == null || isNaN(Number(total)) || Number(total) < 0) {
        return res.status(400).json({
          ok: false,
          error: 'Total debe ser numero >= 0'
        });
      }

      if (!Array.isArray(articulos) || articulos.length === 0) {
        return res.status(400).json({
          ok: false,
          error: 'Debe incluir al menos un articulo'
        });
      }

      for (let i = 0; i < articulos.length; i++) {
        const art = articulos[i];

        if (!Number.isFinite(art.cantidad) || art.cantidad <= 0) {
          return res.status(400).json({
            ok: false,
            error: `Articulo ${i + 1}: cantidad debe ser > 0`
          });
        }

        if (!Number.isFinite(art.precio_unitario) || art.precio_unitario < 0) {
          return res.status(400).json({
            ok: false,
            error: `Articulo ${i + 1}: precio_unitario debe ser >= 0`
          });
        }

        if (!art.producto_id && !art.marca_custom && !art.tipo_caja_custom) {
          return res.status(400).json({
            ok: false,
            error: `Articulo ${i + 1}: debe tener producto_id o marca_custom/tipo_caja_custom`
          });
        }

        if (art.marca_custom || art.tipo_caja_custom) {
          const resolvedId = await resolverProducto(art);
          if (!resolvedId) {
            return res.status(400).json({
              ok: false,
              error: `Articulo ${i + 1}: no se pudo resolver producto custom`
            });
          }
          art.producto_id = resolvedId;
        }

        if (!art.producto_id || !Number.isInteger(parseInt(art.producto_id))) {
          return res.status(400).json({
            ok: false,
            error: `Articulo ${i + 1}: producto_id invalido`
          });
        }
      }

      Logger.info('Compras', 'Guardando compra multi-item en BD');

      const resultado = await Compra.registrarCompraMultiItem({
        usuario_id,
        numero_factura: resolvedFactura,
        total: Number(total),
        notas: notas || null,
        articulos: articulos.map(art => ({
          producto_id: parseInt(art.producto_id),
          cantidad: parseInt(art.cantidad),
          precio_unitario: Number(art.precio_unitario),
        }))
      });

      await Auditoria.registrar({
        usuario_id,
        accion: 'crear',
        tabla_afectada: 'compras',
        registro_id: resultado.data.compra_id,
        descripcion: `Compra #${resultado.data.compra_id} registrada. Fac: ${numero_factura}. ${resultado.data.cantidad_items} items. Total: ${total}`,
        ip_direccion: usuario_ip
      });

      Logger.info('Compras', 'Compra multi-item creada exitosamente', {
        compra_id: resultado.data.compra_id,
        usuario_id,
        cantidad_items: resultado.data.cantidad_items
      });

      return res.status(201).json(resultado);
    } catch (error) {
      Logger.error('Compras', 'Error al registrar compra multi-item', error);

      let mensaje = error.message || 'Error al registrar la compra';

      if (error.code === 'ER_DUP_ENTRY') {
        mensaje = 'Compra duplicada (entrada unica en numero de factura)';
      } else if ((error.sqlMessage || '').toLowerCase().includes('foreign')) {
        mensaje = 'Producto inexistente';
      }

      return res.status(400).json({
        ok: false,
        error: mensaje
      });
    }
  }

  static async obtener(req, res) {
    try {
      const { id } = req.params;
      const compra = await Compra.obtenerPorId(id);

      if (!compra) {
        return res.status(404).json({
          ok: false,
          error: 'Compra no encontrada'
        });
      }

      return res.status(200).json({
        ok: true,
        data: compra
      });
    } catch (error) {
      Logger.error('Compras', 'Error al obtener compra', error);
      return res.status(500).json({
        ok: false,
        error: 'Error al obtener la compra'
      });
    }
  }

  static async listar(req, res) {
    try {
      const {
        fechaInicio,
        fechaFin,
        estado,
        limite = 50,
        desplazamiento = 0
      } = req.query;

      const compras = await Compra.listarTodos({
        fechaInicio,
        fechaFin,
        estado,
        limite: Math.min(parseInt(limite), 500),
        desplazamiento: parseInt(desplazamiento)
      });

      return res.status(200).json({
        ok: true,
        data: compras
      });
    } catch (error) {
      Logger.error('Compras', 'Error al listar compras', error);
      return res.status(500).json({
        ok: false,
        error: 'Error al listar compras'
      });
    }
  }

  static async anular(req, res) {
    try {
      const { id } = req.params;
      const usuario_id = req.usuario?.id;
      const usuario_ip = req.ip;

      await Compra.anularCompra(id, usuario_id);

      await Auditoria.registrar({
        usuario_id,
        accion: 'anular',
        tabla_afectada: 'compras',
        registro_id: id,
        descripcion: `Compra #${id} anulada`,
        ip_direccion: usuario_ip
      });

      Logger.info('Compras', 'Compra anulada', { compra_id: id, usuario_id });

      return res.status(200).json({
        ok: true,
        data: { compra_id: id },
        message: 'Compra anulada exitosamente'
      });
    } catch (error) {
      Logger.error('Compras', 'Error al anular compra', error);
      return res.status(400).json({
        ok: false,
        error: error.message || 'Error al anular compra'
      });
    }
  }
}

export default ControladorComprasMultiItem;
