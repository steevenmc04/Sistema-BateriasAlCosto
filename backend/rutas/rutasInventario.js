import { Router } from 'express';
import ControladorInventario from '../controladores/ControladorInventario.js';
import { verificarToken } from '../middleware/autenticacion.js';
import { exigirPermiso } from '../middleware/permisos.js';
import InventarioBateria from '../modelos/InventarioBateria.js';
import InventarioVario from '../modelos/InventarioVario.js';
import Producto from '../modelos/Producto.js';
import pool from '../configuracion/baseDeDatos.js';

const router = Router();

// POS-specific endpoints: Baterías y Varios directamente desde inventario_baterias e inventario_varios
router.get('/baterias', verificarToken, exigirPermiso('inventario.ver'), async (req, res) => {
  try {
    const baterias = await InventarioBateria.listarTodos();
    return res.status(200).json(baterias);
  } catch (error) {
    console.error('Error al listar baterías:', error);
    return res.status(500).json({ mensaje: 'Error al obtener baterías.' });
  }
});

router.post('/baterias', verificarToken, exigirPermiso('inventario.crear'), async (req, res) => {
  try {
    const codigo = await InventarioBateria.crear(req.body);
    const bateria = await InventarioBateria.obtenerPorCodigo(codigo);
    if (bateria) {
      const existe = await Producto.buscarPorCodigo(codigo);
      if (!existe) {
        const nombre = `${bateria.marca} ${bateria.tipo_caja}`;
        await Producto.crear({
          categoria_id: 1,
          codigo,
          nombre,
          marca: bateria.marca,
          tipo_caja: bateria.tipo_caja,
          condicion: bateria.condicion,
          precio_costo: bateria.precio,
          precio_venta: bateria.precio,
          stock_inicial: bateria.cantidad,
        });
      }
    }
    return res.status(201).json({ mensaje: 'Batería creada con éxito.', codigo });
  } catch (error) {
    console.error('Error al crear batería:', error);
    if (error.message === 'Esta referencia ya está registrada') {
      return res.status(400).json({ mensaje: error.message });
    }
    return res.status(500).json({ mensaje: 'Error interno al crear batería.' });
  }
});

router.put('/baterias/:id', verificarToken, exigirPermiso('inventario.editar'), async (req, res) => {
  try {
    await InventarioBateria.actualizar(req.params.id, req.body);
    const prod = await pool.query(
      `SELECT p.id FROM productos p
       INNER JOIN inventario_baterias ib ON ib.codigo = p.codigo
       WHERE ib.id = ? LIMIT 1`,
      [req.params.id]
    );
    if (prod[0]?.length > 0) {
      const prodId = prod[0][0].id;
      const { marca, tipo_caja, cantidad, precio } = req.body;
      if (marca || tipo_caja || precio !== undefined) {
        await pool.query(
          `UPDATE productos SET marca = COALESCE(?, marca), tipo_caja = COALESCE(?, tipo_caja), precio_costo = COALESCE(?, precio_costo), precio_venta = COALESCE(?, precio_venta) WHERE id = ?`,
          [marca || null, tipo_caja || null, precio ?? null, precio ?? null, prodId]
        );
      }
      if (cantidad !== undefined) {
        await pool.query('UPDATE inventario_stock SET cantidad = ? WHERE producto_id = ?', [cantidad, prodId]);
      }
    }
    return res.status(200).json({ mensaje: 'Batería actualizada con éxito.' });
  } catch (error) {
    console.error('Error al actualizar batería:', error);
    return res.status(500).json({ mensaje: 'Error interno al actualizar batería.' });
  }
});

router.delete('/baterias/:id', verificarToken, exigirPermiso('inventario.eliminar'), async (req, res) => {
  try {
    const prod = await pool.query(
      `SELECT p.id FROM productos p
       INNER JOIN inventario_baterias ib ON ib.codigo = p.codigo
       WHERE ib.id = ? LIMIT 1`,
      [req.params.id]
    );
    await InventarioBateria.eliminar(req.params.id);
    if (prod[0]?.length > 0) {
      await pool.query('DELETE FROM inventario_stock WHERE producto_id = ?', [prod[0][0].id]);
      await pool.query('DELETE FROM productos WHERE id = ?', [prod[0][0].id]);
    }
    return res.status(200).json({ mensaje: 'Batería eliminada con éxito.' });
  } catch (error) {
    console.error('Error al eliminar batería:', error);
    return res.status(500).json({ mensaje: 'Error interno al eliminar batería.' });
  }
});

router.get('/varios', verificarToken, exigirPermiso('inventario.ver'), async (req, res) => {
  try {
    const varios = await InventarioVario.listarTodos();
    return res.status(200).json(varios);
  } catch (error) {
    console.error('Error al listar varios:', error);
    return res.status(500).json({ mensaje: 'Error al obtener productos varios.' });
  }
});

// Productos CRUD
router.get('/productos', verificarToken, exigirPermiso('inventario.ver'), ControladorInventario.listar);
router.get('/productos-pos', verificarToken, exigirPermiso('inventario.ver'), ControladorInventario.listarParaPOS);
router.get('/productos/:id', verificarToken, exigirPermiso('inventario.ver'), ControladorInventario.obtener);
router.post('/productos', verificarToken, exigirPermiso('inventario.crear'), ControladorInventario.crear);
router.put('/productos/:id', verificarToken, exigirPermiso('inventario.editar'), ControladorInventario.actualizar);
router.delete('/productos/:id', verificarToken, exigirPermiso('inventario.eliminar'), ControladorInventario.eliminar);

// Categorías CRUD
router.get('/categorias', verificarToken, exigirPermiso('inventario.ver'), ControladorInventario.listarCategorias);
router.post('/categorias', verificarToken, exigirPermiso('inventario.crear'), ControladorInventario.crearCategoria);
router.put('/categorias/:id', verificarToken, exigirPermiso('inventario.editar'), ControladorInventario.actualizarCategoria);
router.delete('/categorias/:id', verificarToken, exigirPermiso('inventario.eliminar'), ControladorInventario.eliminarCategoria);

// Historial Kardex y Ajustes Manuales
router.get('/kardex', verificarToken, exigirPermiso('inventario.ver'), ControladorInventario.listarKardex);
router.post('/ajustes', verificarToken, exigirPermiso('inventario.editar'), ControladorInventario.registrarAjuste);

export default router;
