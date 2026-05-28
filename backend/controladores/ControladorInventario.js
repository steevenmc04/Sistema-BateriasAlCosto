import Logger from '../utilidades/logger.js';
import pool from '../configuracion/baseDeDatos.js';
import Producto from '../modelos/Producto.js';
import MovimientoInventario from '../modelos/MovimientoInventario.js';
import Auditoria from '../modelos/Auditoria.js';

/**
 * Controlador de Negocio: ControladorInventario
 * Controla el catálogo de productos unificado, categorías y Kardex de movimientos de stock.
 */
class ControladorInventario {
  // ============================================================================
  // PRODUCTOS
  // ============================================================================

  static async listar(req, res) {
    const { buscar, categoriaId, soloActivos } = req.query;
    try {
      const productos = await Producto.listarTodos({
        buscar,
        categoriaId: categoriaId ? parseInt(categoriaId) : null,
        soloActivos: soloActivos === 'false' ? false : true
      });
      return res.status(200).json(productos);
    } catch (error) {
      Logger.error('ControladorInventario', 'Error al listar productos', error);
      return res.status(500).json({ mensaje: 'Error al obtener el listado de productos.' });
    }
  }

  // Endpoint exclusivo para POS (Ventas/Compras/Chatarra).
  // Retorna productos con marca/tipo_caja + stock para poblar el POS.
  // Flujo:
  //   1. Intenta SELECT desde productos + inventario_stock
  //   2. Si la tabla productos está vacía, lee directo desde inventario_baterias
  //      (tabla legacy con datos reales) SIN modificar productos
  //   3. Logging detallado para diagnosticar en producción
  static async listarParaPOS(req, res) {
    try {
      // --- 1. Asegurar que productos tenga datos (sync desde inventario_baterias si es necesario) ---
      const [check] = await pool.query('SELECT COUNT(*) AS total FROM productos WHERE activo = 1');
      if (check[0].total === 0) {
        console.log('PRODUCTOS POS - productos vacío, sincronizando...');
        await ControladorInventario._sincronizarBaterias();
      }

      // --- 2. Consultar productos con columnas seguras (evita p.tipo, p.precio_venta si no existen) ---
      let productos;
      try {
        const [rows] = await pool.query(`
          SELECT p.id, p.codigo, p.nombre, p.marca, p.tipo_caja,
                 COALESCE(s.cantidad, 0) AS stock,
                 0 AS precio,
                 p.condicion
          FROM productos p
          LEFT JOIN inventario_stock s ON s.producto_id = p.id
          WHERE p.activo = 1
          ORDER BY p.marca, p.tipo_caja
        `);
        productos = rows;
        console.log('PRODUCTOS POS - consulta OK:', JSON.stringify({ count: rows.length }));
      } catch (err) {
        console.log('PRODUCTOS POS - query falló, leyendo directo de inventario_baterias:', err.message);
        // Fallback extremo: lectura directa desde inventario_baterias
        const [baterias] = await pool.query(
          'SELECT id, codigo, marca, condicion, tipo_caja, cantidad, precio FROM inventario_baterias ORDER BY marca, tipo_caja'
        );
        if (baterias.length > 0) {
          return res.status(200).json(baterias.map(b => ({
            id: b.id,
            codigo: b.codigo,
            nombre: `${b.marca} ${b.tipo_caja}`.trim(),
            marca: b.marca,
            tipo_caja: b.tipo_caja,
            stock: Number(b.cantidad),
            precio: Number(b.precio),
            tipo: 'bateria',
            condicion: b.condicion,
            estado: Number(b.cantidad) > 0 ? 'disponible' : 'sin_stock'
          })));
        }
        productos = [];
        console.log('PRODUCTOS POS - sin datos');
      }

      if (!productos || productos.length === 0) {
        return res.status(200).json([]);
      }

      return res.status(200).json(productos.map(p => ({
        id: p.id,
        codigo: p.codigo,
        nombre: p.nombre,
        marca: p.marca,
        tipo_caja: p.tipo_caja,
        stock: Number(p.stock),
        precio: Number(p.precio),
        tipo: 'bateria',
        condicion: p.condicion,
        estado: Number(p.stock) > 0 ? 'disponible' : 'sin_stock'
      })));
    } catch (error) {
      console.error('ERROR PRODUCTOS POS (crítico):', error);
      Logger.error('ControladorInventario', 'Error crítico al listar productos para POS', error);
      return res.status(500).json({
        mensaje: error.message || 'Error al obtener productos para POS.',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  // Sincroniza datos desde inventario_baterias → productos + inventario_stock
  // sin hardcodear categoria_id (usa la primera categoría existente)
  static async _sincronizarBaterias() {
    let categoriaId = 1;
    try {
      const [cats] = await pool.query('SELECT id FROM categorias ORDER BY id LIMIT 1');
      if (cats && cats.length > 0) categoriaId = cats[0].id;
    } catch (_) { /* si no hay categorías, usar 1 */ }

    const [baterias] = await pool.query(
      'SELECT codigo, marca, condicion, tipo_caja, cantidad, precio FROM inventario_baterias'
    );
    for (const b of baterias) {
      try {
        const [existe] = await pool.query(
          'SELECT id FROM productos WHERE codigo = ? LIMIT 1', [b.codigo]
        );
        if (existe.length > 0) continue;

        const nombre = `${b.marca} ${b.tipo_caja}`.trim();
        // Intentar con precio_venta; si falla, reintentar sin ella
        try {
          const [res] = await pool.query(
            `INSERT INTO productos (codigo, nombre, marca, tipo_caja, condicion, categoria_id, precio_costo, precio_venta, activo)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            [b.codigo, nombre, b.marca, b.tipo_caja, b.condicion, categoriaId, b.precio, b.precio]
          );
          await pool.query(
            'INSERT INTO inventario_stock (producto_id, cantidad) VALUES (?, ?)',
            [res.insertId, b.cantidad]
          );
        } catch (innerErr) {
          try {
            const [res] = await pool.query(
              `INSERT INTO productos (codigo, nombre, marca, tipo_caja, condicion, categoria_id, precio_costo, activo)
               VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
              [b.codigo, nombre, b.marca, b.tipo_caja, b.condicion, categoriaId, b.precio]
            );
            await pool.query(
              'INSERT INTO inventario_stock (producto_id, cantidad) VALUES (?, ?)',
              [res.insertId, b.cantidad]
            );
          } catch (innerErr2) {
            console.log('PRODUCTOS POS - sync insert falló completo:', b.codigo, innerErr2.message);
          }
        }
      } catch (itemErr) {
        console.log('PRODUCTOS POS - error sync item:', b.codigo, itemErr.message);
      }
    }
  }

  static async obtener(req, res) {
    const { id } = req.params;
    try {
      const producto = await Producto.obtenerPorId(id);
      if (!producto) {
        return res.status(404).json({ mensaje: 'Producto no encontrado.' });
      }
      return res.status(200).json(producto);
    } catch (error) {
      return res.status(500).json({ mensaje: 'Error al obtener producto.' });
    }
  }

  static async crear(req, res) {
    const {
      categoria_id, codigo, nombre, descripcion, marca, modelo,
      condicion, tipo_caja, precio_costo, precio_venta, stock_minimo, stock_inicial
    } = req.body;

    if (!categoria_id || !codigo || !nombre || !marca || precio_costo === undefined || precio_venta === undefined) {
      return res.status(400).json({ mensaje: 'Los campos obligatorios de producto están incompletos.' });
    }

    try {
      // 1. Crear el producto en BD e inicializar tabla stock
      const nuevoId = await Producto.crear({
        categoria_id, codigo, nombre, descripcion, marca, modelo,
        condicion, tipo_caja, precio_costo, precio_venta, stock_minimo,
        stock_inicial: stock_inicial ? parseInt(stock_inicial) : 0
      });

      // 2. Si el stock inicial es mayor a cero, registrar el movimiento de entrada en el Kardex
      if (stock_inicial && parseInt(stock_inicial) > 0) {
        await MovimientoInventario.registrar({
          producto_id: nuevoId,
          usuario_id: req.usuario.id,
          tipo_movimiento: 'entrada',
          concepto: 'Inventario Inicial',
          cantidad: parseInt(stock_inicial),
          costo_unitario: parseFloat(precio_costo),
          precio_venta: parseFloat(precio_venta),
          notas: 'Registro inicial de stock al crear producto.'
        });
      }

      await Auditoria.registrar({
        usuario_id: req.usuario.id,
        accion: 'crear',
        tabla_afectada: 'productos',
        registro_id: nuevoId,
        descripcion: `Creado producto unificado: ${nombre} (${codigo}), stock inicial: ${stock_inicial || 0}`,
        ip_direccion: req.ip
      });

      return res.status(201).json({ mensaje: 'Producto creado y registrado con éxito.', id: nuevoId });
    } catch (error) {
      Logger.error('ControladorInventario', 'Error al crear producto', error);
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ mensaje: 'El código de producto o código de barras ya existe.' });
      }
      return res.status(500).json({ mensaje: 'Error interno del servidor al crear producto.' });
    }
  }

  static async actualizar(req, res) {
    const { id } = req.params;
    const {
      categoria_id, codigo, nombre, descripcion, marca, modelo,
      condicion, tipo_caja, precio_costo, precio_venta, stock_minimo, activo
    } = req.body;

    try {
      const anterior = await Producto.obtenerPorId(id);
      if (!anterior) {
        return res.status(404).json({ mensaje: 'Producto no encontrado.' });
      }

      await Producto.actualizar(id, {
        categoria_id, codigo, nombre, descripcion, marca, modelo,
        condicion, tipo_caja, precio_costo, precio_venta, stock_minimo, activo
      });

      await Auditoria.registrar({
        usuario_id: req.usuario.id,
        accion: 'editar',
        tabla_afectada: 'productos',
        registro_id: id,
        descripcion: `Producto ${nombre} actualizado.`,
        datos_anteriores: anterior,
        datos_nuevos: { categoria_id, codigo, nombre, descripcion, marca, modelo, precio_costo, precio_venta, stock_minimo, activo },
        ip_direccion: req.ip
      });

      return res.status(200).json({ mensaje: 'Producto actualizado exitosamente.' });
    } catch (error) {
      Logger.error('ControladorInventario', 'Error al actualizar producto', error);
      return res.status(500).json({ mensaje: 'Error al actualizar datos de producto.' });
    }
  }

  static async eliminar(req, res) {
    const { id } = req.params;
    try {
      const anterior = await Producto.obtenerPorId(id);
      if (!anterior) {
        return res.status(404).json({ mensaje: 'Producto no encontrado.' });
      }

      await Producto.desactivar(id);

      await Auditoria.registrar({
        usuario_id: req.usuario.id,
        accion: 'eliminar',
        tabla_afectada: 'productos',
        registro_id: id,
        descripcion: `Producto dado de baja: ${anterior.nombre} (ID: ${id})`,
        ip_direccion: req.ip
      });

      return res.status(200).json({ mensaje: 'Producto desactivado lógicamente con éxito.' });
    } catch (error) {
      return res.status(500).json({ mensaje: 'Error al desactivar el producto.' });
    }
  }

  // ============================================================================
  // CATEGORÍAS
  // ============================================================================

  static async listarCategorias(req, res) {
    try {
      const categorias = await Producto.listarCategorias();
      return res.status(200).json(categorias);
    } catch (error) {
      return res.status(500).json({ mensaje: 'Error al obtener categorías.' });
    }
  }

  static async crearCategoria(req, res) {
    const { nombre, descripcion } = req.body;
    if (!nombre) {
      return res.status(400).json({ mensaje: 'El nombre de la categoría es requerido.' });
    }
    try {
      const nuevoId = await Producto.crearCategoria({ nombre, descripcion });
      return res.status(201).json({ mensaje: 'Categoría creada con éxito.', id: nuevoId });
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ mensaje: 'La categoría ya existe.' });
      }
      return res.status(500).json({ mensaje: 'Error al crear la categoría.' });
    }
  }

  static async actualizarCategoria(req, res) {
    const { id } = req.params;
    const { nombre, descripcion } = req.body;
    try {
      await Producto.actualizarCategoria(id, { nombre, descripcion });
      return res.status(200).json({ mensaje: 'Categoría actualizada con éxito.' });
    } catch (error) {
      return res.status(500).json({ mensaje: 'Error al actualizar categoría.' });
    }
  }

  static async eliminarCategoria(req, res) {
    const { id } = req.params;
    try {
      await Producto.eliminarCategoria(id);
      return res.status(200).json({ mensaje: 'Categoría eliminada con éxito.' });
    } catch (error) {
      return res.status(400).json({ mensaje: error.message });
    }
  }

  // ============================================================================
  // KARDEX / AJUSTES
  // ============================================================================

  static async listarKardex(req, res) {
    const { productoId, tipoMovimiento, fechaInicio, fechaFin, limite, desplazamiento } = req.query;
    try {
      const movimientos = await MovimientoInventario.listar({
        productoId: productoId ? parseInt(productoId) : null,
        tipoMovimiento: tipoMovimiento || null,
        fechaInicio: fechaInicio || null,
        fechaFin: fechaFin || null,
        limite: limite ? parseInt(limite) : 100,
        desplazamiento: desplazamiento ? parseInt(desplazamiento) : 0
      });
      return res.status(200).json(movimientos);
    } catch (error) {
      Logger.error('ControladorInventario', 'Error al listar Kardex', error);
      return res.status(500).json({ mensaje: 'Error al obtener historial de movimientos (Kardex).' });
    }
  }

  /**
   * Permite realizar un ajuste de inventario manual (entrada / salida / corrección).
   */
  static async registrarAjuste(req, res) {
    const { producto_id, tipo_movimiento, cantidad, concepto, notas } = req.body;

    if (!producto_id || !tipo_movimiento || cantidad === undefined || !concepto) {
      return res.status(400).json({ mensaje: 'Campos de ajuste incompletos.' });
    }

    try {
      const prod = await Producto.obtenerPorId(producto_id);
      if (!prod) {
        return res.status(404).json({ mensaje: 'El producto seleccionado no existe.' });
      }

      // El ajuste manual impacta el Kardex
      const movId = await MovimientoInventario.registrar({
        producto_id,
        usuario_id: req.usuario.id,
        tipo_movimiento,
        concepto,
        cantidad: parseInt(cantidad),
        costo_unitario: prod.precio_costo,
        precio_venta: prod.precio_venta,
        notas: notas || 'Ajuste manual de inventario.'
      });

      await Auditoria.registrar({
        usuario_id: req.usuario.id,
        accion: 'editar',
        tabla_afectada: 'productos',
        registro_id: producto_id,
        descripcion: `Ajuste manual de inventario (${tipo_movimiento}): ${concepto}. Cantidad diferencia: ${cantidad}`,
        ip_direccion: req.ip
      });

      return res.status(200).json({ mensaje: 'Ajuste de inventario registrado con éxito.', movimientoId: movId });
    } catch (error) {
      Logger.error('ControladorInventario', 'Error en ajuste de inventario', error);
      return res.status(500).json({ mensaje: error.message || 'Error al procesar ajuste de inventario.' });
    }
  }
}

export default ControladorInventario;
