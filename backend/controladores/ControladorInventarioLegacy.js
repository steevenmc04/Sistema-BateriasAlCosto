import InventarioBateria from '../modelos/InventarioBateria.js';
import InventarioVario from '../modelos/InventarioVario.js';
import pool from '../configuracion/baseDeDatos.js';

/**
 * CRUD de inventario_baterias e inventario_varios contra MySQL (fuente única de verdad).
 * Mantenido para retrocompatibilidad con el Frontend que llama directamente a /api/inventario/baterias y /api/inventario/varios.
 */
class ControladorInventarioLegacy {
  /* --- Baterías --- */

  static async listarBaterias(_req, res) {
    try {
      const filas = await InventarioBateria.listarTodos();
      res.json(filas);
    } catch (e) {
      res.status(500).json({ mensaje: e.message });
    }
  }

  /** Consulta LIKE en vivo para POS / autocomplete (tabla inventario_baterias). */
  static async buscarBaterias(req, res) {
    try {
      const q = req.query.q || '';
      const filas = await InventarioBateria.buscarEnVivo(q);
      res.json(filas);
    } catch (e) {
      res.status(500).json({ mensaje: e.message });
    }
  }

  static async crearBateria(req, res) {
    try {
      const codigo = await InventarioBateria.crear(req.body);
      res.status(201).json({ mensaje: 'Batería registrada en inventario', codigo });
    } catch (e) {
      const mensaje = e.message || String(e);
      const status = mensaje.includes('ya está registrada') ? 409 : 500;
      res.status(status).json({ mensaje });
    }
  }

  static async actualizarBateria(req, res) {
    try {
      await InventarioBateria.actualizar(req.params.id, req.body);
      res.json({ mensaje: 'Inventario de batería actualizado' });
    } catch (e) {
      res.status(500).json({ mensaje: e.message });
    }
  }

  static async eliminarBateria(req, res) {
    try {
      await InventarioBateria.eliminar(req.params.id);
      res.json({ mensaje: 'Registro eliminado' });
    } catch (e) {
      res.status(500).json({ mensaje: e.message });
    }
  }

  static async catalogos(_req, res) {
    try {
      const [marcas] = await pool.query(
        `SELECT DISTINCT marca FROM (
          SELECT marca FROM inventario_baterias WHERE marca IS NOT NULL AND marca != ''
          UNION
          SELECT marca FROM compras_inventario WHERE marca IS NOT NULL AND marca != ''
          UNION
          SELECT marca FROM productos WHERE marca IS NOT NULL AND marca != ''
        ) t ORDER BY marca`
      );
      const [tipos] = await pool.query(
        `SELECT DISTINCT tipo_caja FROM (
          SELECT tipo_caja FROM inventario_baterias WHERE tipo_caja IS NOT NULL AND tipo_caja != ''
          UNION
          SELECT tipo_caja FROM compras_inventario WHERE tipo_caja IS NOT NULL AND tipo_caja != ''
          UNION
          SELECT tipo_caja FROM chatarra_inventario WHERE tipo_caja IS NOT NULL AND tipo_caja != ''
          UNION
          SELECT tipo_caja FROM productos WHERE tipo_caja IS NOT NULL AND tipo_caja != ''
        ) t ORDER BY tipo_caja`
      );
      const [condiciones] = await pool.query(
        `SELECT DISTINCT condicion FROM (
          SELECT condicion FROM inventario_baterias WHERE condicion IS NOT NULL AND condicion != ''
          UNION
          SELECT condicion FROM compras_inventario WHERE condicion IS NOT NULL AND condicion != ''
          UNION
          SELECT condicion FROM productos WHERE condicion IS NOT NULL AND condicion != ''
        ) t ORDER BY condicion`
      );
      res.json({
        marcas: marcas.map(r => r.marca),
        tipos_caja: tipos.map(r => r.tipo_caja),
        condiciones: condiciones.map(r => r.condicion),
      });
    } catch (e) {
      res.status(500).json({ mensaje: e.message });
    }
  }

  /* --- Varios (VAR-xxxx) --- */

  static async listarVarios(_req, res) {
    try {
      const filas = await InventarioVario.listarTodos();
      res.json(filas);
    } catch (e) {
      res.status(500).json({ mensaje: e.message });
    }
  }

  static async buscarVarios(req, res) {
    try {
      const q = req.query.q || '';
      const filas = await InventarioVario.buscarEnVivo(q);
      res.json(filas);
    } catch (e) {
      res.status(500).json({ mensaje: e.message });
    }
  }

  /** Vista previa del próximo código (consulta último correlativo en BD). */
  static async previewCodigoVario(_req, res) {
    try {
      const codigo = await InventarioVario.siguienteCodigoAuto();
      res.json({ codigo });
    } catch (e) {
      res.status(500).json({ mensaje: e.message });
    }
  }

  static async crearVario(req, res) {
    try {
      const codigo = await InventarioVario.crear(req.body);
      res.status(201).json({ mensaje: 'Ítem varios registrado', codigo });
    } catch (e) {
      res.status(500).json({ mensaje: e.message });
    }
  }

  static async actualizarVario(req, res) {
    try {
      await InventarioVario.actualizar(req.params.id, req.body);
      res.json({ mensaje: 'Ítem VAR actualizado' });
    } catch (e) {
      res.status(500).json({ mensaje: e.message });
    }
  }

  static async eliminarVario(req, res) {
    try {
      await InventarioVario.eliminar(req.params.id);
      res.json({ mensaje: 'Registro eliminado' });
    } catch (e) {
      res.status(500).json({ mensaje: e.message });
    }
  }
}

export default ControladorInventarioLegacy;
