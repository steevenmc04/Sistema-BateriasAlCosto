import Logger from '../utilidades/logger.js';
import Chatarra from '../modelos/Chatarra.js';
import Auditoria from '../modelos/Auditoria.js';
import { resolverProducto } from '../utilidades/resolverProducto.js';

class ControladorChatarraMultiItem {

  static async crear(req, res) {
    const {
      tipo_operacion,
      sesion_caja_id,
      subtotal,
      total,
      notas,
      articulos
    } = req.body || {};

    const usuario_id = req.usuario?.id;
    const usuario_ip = req.ip;

    try {
      Logger.info('Chatarra', 'Iniciando validación de operación multi-item', {
        tipo_operacion,
        usuario_id,
        cantidad_items: articulos?.length
      });

      if (!tipo_operacion || !['entrada', 'salida'].includes(tipo_operacion)) {
        return res.status(400).json({
          ok: false,
          error: 'Tipo de operación requerido: entrada (compra) o salida (venta)'
        });
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
          const resolvedId = await resolverProducto(art);
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

      Logger.info('Chatarra', 'Guardando operación multi-item en BD');

      const resultado = await Chatarra.registrarChatarraMultiItem({
        tipo_operacion,
        usuario_id: usuario_id,
        sesion_caja_id: sesion_caja_id ? parseInt(sesion_caja_id) : null,
        subtotal: Number(subtotal),
        total: Number(total),
        notas: notas || null,
        articulos: articulos.map(art => ({
          producto_id: parseInt(art.producto_id),
          cantidad: parseInt(art.cantidad),
          precio_unitario: Number(art.precio_unitario),
          descuento: Number(art.descuento || 0),
          notas: art.notas || null
        }))
      });

      await Auditoria.registrar({
        usuario_id,
        accion: 'crear',
        tabla_afectada: 'chatarra_operaciones',
        registro_id: resultado.data.chatarra_id,
        descripcion: `Chatarra ${tipo_operacion === 'entrada' ? 'registrada' : 'vendida'} #${resultado.data.chatarra_id}. ${resultado.data.cantidad_items} items. Total: ${total}`,
        ip_direccion: usuario_ip
      });

      Logger.info('Chatarra', 'Operación multi-item creada', {
        chatarra_id: resultado.data.chatarra_id,
        usuario_id,
        cantidad_items: resultado.data.cantidad_items
      });

      return res.status(201).json(resultado);
    } catch (error) {
      Logger.error('Chatarra', 'Error al registrar operación multi-item', error);

      let mensaje = error.message || 'Error al registrar la operación';

      if ((error.sqlMessage || '').toLowerCase().includes('foreign')) {
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
      const operacion = await Chatarra.obtenerPorId(id);

      if (!operacion) {
        return res.status(404).json({
          ok: false,
          error: 'Operación de chatarra no encontrada'
        });
      }

      return res.status(200).json({
        ok: true,
        data: operacion
      });
    } catch (error) {
      Logger.error('Chatarra', 'Error al obtener operación', error);
      return res.status(500).json({
        ok: false,
        error: 'Error al obtener la operación'
      });
    }
  }

  static async listar(req, res) {
    try {
      const {
        tipoOperacion,
        fechaInicio,
        fechaFin,
        limite = 50,
        desplazamiento = 0
      } = req.query;

      const operaciones = await Chatarra.listarTodos({
        tipoOperacion,
        fechaInicio,
        fechaFin,
        limite: Math.min(parseInt(limite), 500),
        desplazamiento: parseInt(desplazamiento)
      });

      return res.status(200).json({
        ok: true,
        data: operaciones
      });
    } catch (error) {
      Logger.error('Chatarra', 'Error al listar operaciones', error);
      return res.status(500).json({
        ok: false,
        error: 'Error al listar operaciones'
      });
    }
  }

  static async anular(req, res) {
    try {
      const { id } = req.params;
      const usuario_id = req.usuario?.id;
      const usuario_ip = req.ip;

      await Chatarra.anularChatarra(id, usuario_id);

      await Auditoria.registrar({
        usuario_id,
        accion: 'anular',
        tabla_afectada: 'chatarra_operaciones',
        registro_id: id,
        descripcion: `Chatarra #${id} anulada`,
        ip_direccion: usuario_ip
      });

      Logger.info('Chatarra', 'Operación anulada', { chatarra_id: id, usuario_id });

      return res.status(200).json({
        ok: true,
        data: { chatarra_id: id },
        message: 'Operación de chatarra anulada exitosamente'
      });
    } catch (error) {
      Logger.error('Chatarra', 'Error al anular operación', error);
      return res.status(400).json({
        ok: false,
        error: error.message || 'Error al anular operación'
      });
    }
  }
}

export default ControladorChatarraMultiItem;
