import OperacionesInventario from '../modelos/OperacionesInventario.js';

/**
 * Punto HTTP para ventas, compras proveedor/particular y chatarra (transacciones en modelo).
 */
class ControladorOperacionesInventario {
  static async venderBateria(req, res) {
    try {
      const r = await OperacionesInventario.venderBateria(req.body, req.usuario.id);
      res.status(201).json({ mensaje: 'Venta registrada', ...r });
    } catch (e) {
      res.status(400).json({ mensaje: e.message });
    }
  }

  static async venderVarios(req, res) {
    try {
      const r = await OperacionesInventario.venderVarios(req.body, req.usuario.id);
      res.status(201).json({ mensaje: 'Venta varios registrada', ...r });
    } catch (e) {
      res.status(400).json({ mensaje: e.message });
    }
  }

  static async comprarBaterias(req, res) {
    try {
      const items = Array.isArray(req.body) ? req.body : [req.body];
      let totalAcumulado = 0;
      for (const item of items) {
        const r = await OperacionesInventario.comprarBaterias(item, req.usuario.id);
        totalAcumulado += r.total || 0;
      }
      res.status(201).json({ mensaje: `Compra(s) registrada(s): ${items.length} ítem(s)`, total: totalAcumulado });
    } catch (e) {
      res.status(400).json({ mensaje: e.message });
    }
  }

  static async comprarVarios(req, res) {
    try {
      const r = await OperacionesInventario.comprarVarios(req.body, req.usuario.id);
      res.status(201).json({ mensaje: 'Compra varios registrada', ...r });
    } catch (e) {
      res.status(400).json({ mensaje: e.message });
    }
  }

  static async chatarra(req, res) {
    try {
      const r = await OperacionesInventario.registrarChatarra(req.body, req.usuario.id);
      res.status(201).json({ mensaje: 'Movimiento de chatarra guardado', ...r });
    } catch (e) {
      res.status(400).json({ mensaje: e.message });
    }
  }

  /**
   * Historial ventas_inventario: permisos granular en rutas controlan acceso genérico;
   * aquí se filtra por usuario salvo historial_todos.
   */
  static async historialVentas(req, res) {
    try {
      const { desde, hasta } = req.query;
      const verTodos = req.usuario?.esAdmin === true || Boolean(req.usuario?.permisos?.historial_ventas_todos);
      const usuarioId = verTodos ? null : req.usuario.id;
      const filas = await OperacionesInventario.listarVentasInventario({
        desde: desde || undefined,
        hasta: hasta || undefined,
        usuarioFiltradoId: usuarioId === null ? undefined : usuarioId,
      });
      res.json(filas);
    } catch (e) {
      res.status(500).json({ mensaje: e.message });
    }
  }

  /** Listado histórico de compras inventario desde compras_inventario. */
  static async historialCompras(req, res) {
    try {
      const { desde, hasta } = req.query;
      const filas = await OperacionesInventario.listarComprasInv({
        desde: desde || undefined,
        hasta: hasta || undefined,
      });
      res.json(filas);
    } catch (e) {
      res.status(500).json({ mensaje: e.message });
    }
  }

  static async historialChatarra(req, res) {
    try {
      const { desde, hasta } = req.query;
      const filas = await OperacionesInventario.listarChatarraInv({
        desde: desde || undefined,
        hasta: hasta || undefined,
      });
      res.json(filas);
    } catch (e) {
      res.status(500).json({ mensaje: e.message });
    }
  }
}

export default ControladorOperacionesInventario;
