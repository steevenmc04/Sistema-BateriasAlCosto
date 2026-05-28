/**
 * @class Producto
 * @description Modelo de datos para productos y gestión de stock.
 * @tabla productos
 * @autor Equipo Desarrollo
 * @version 1.0.0
 */
import pool from '../configuracion/baseDeDatos.js';

/**
 * Modelo de Datos: Producto (productos, categorias, inventario_stock)
 * Gestiona el catálogo de productos unificado y su stock actual.
 */
class Producto {
  /**
   * Obtiene la lista de todos los productos activos con su categoría y stock actual.
   */
  static async listarTodos({ buscar = '', categoriaId = null, soloActivos = true } = {}) {
    let sql = `
      SELECT p.id, p.categoria_id, c.nombre AS categoria_nombre, p.codigo, p.nombre, 
             p.descripcion, p.marca, p.modelo, p.condicion, p.tipo_caja, 
             p.precio_costo, p.precio_venta, p.stock_minimo, p.activo,
             COALESCE(s.cantidad, 0) AS stock_actual, p.creado_en
      FROM productos p
      JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN inventario_stock s ON p.id = s.producto_id
      WHERE 1=1
    `;
    const params = [];

    if (soloActivos) {
      sql += ' AND p.activo = 1';
    }

    if (categoriaId) {
      sql += ' AND p.categoria_id = ?';
      params.push(categoriaId);
    }

    if (buscar) {
      sql += ' AND (p.nombre LIKE ? OR p.codigo LIKE ? OR p.marca LIKE ? OR p.modelo LIKE ?)';
      const queryBusqueda = `%${buscar}%`;
      params.push(queryBusqueda, queryBusqueda, queryBusqueda, queryBusqueda);
    }

    sql += ' ORDER BY p.nombre ASC';

    const [filas] = await pool.query(sql, params);
    return filas;
  }

  /**
   * Obtiene un producto por su ID, incluyendo categoría y stock actual.
   */
  static async obtenerPorId(id) {
    const [filas] = await pool.query(
      `SELECT p.id, p.categoria_id, c.nombre AS categoria_nombre, p.codigo, p.nombre, 
              p.descripcion, p.marca, p.modelo, p.condicion, p.tipo_caja, 
              p.precio_costo, p.precio_venta, p.stock_minimo, p.activo,
              COALESCE(s.cantidad, 0) AS stock_actual
       FROM productos p
       JOIN categorias c ON p.categoria_id = c.id
       LEFT JOIN inventario_stock s ON p.id = s.producto_id
       WHERE p.id = ?`,
       [id]
     );
     return filas[0] || null;
   }

   /**
    * Busca un producto por su código de barras o código único.
    */
   static async buscarPorCodigo(codigo) {
     const [filas] = await pool.query(
       `SELECT p.id, p.categoria_id, c.nombre AS categoria_nombre, p.codigo, p.nombre, 
              p.descripcion, p.marca, p.modelo, p.condicion, p.tipo_caja, 
              p.precio_costo, p.precio_venta, p.stock_minimo, p.activo,
              COALESCE(s.cantidad, 0) AS stock_actual
       FROM productos p
       JOIN categorias c ON p.categoria_id = c.id
       LEFT JOIN inventario_stock s ON p.id = s.producto_id
       WHERE p.codigo = ? AND p.activo = 1`,
      [codigo]
    );
    return filas[0] || null;
  }

   /**
    * Crea un producto en la base de datos e inicializa su stock en 0 de forma transaccional.
    */
   static async crear({
     categoria_id,
     codigo,
     nombre,
     descripcion = null,
     marca,
     modelo = null,
     condicion = 'Nueva',
     tipo_caja = null,
     precio_costo,
     precio_venta,
     stock_minimo = 3,
     stock_inicial = 0,
   }) {
     // Normalizar el valor de condicion
     const condicionNormalizada = condicion ? condicion.trim() : 'Nueva';
     
     const conexion = await pool.getConnection();
     try {
       await conexion.beginTransaction();

       // 1. Insertar el producto
       const [resultadoProd] = await conexion.query(
         `INSERT INTO productos (categoria_id, codigo, nombre, descripcion, marca, modelo, condicion, tipo_caja, precio_costo, precio_venta, stock_minimo, activo)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
         [categoria_id, codigo, nombre, descripcion, marca, modelo, condicionNormalizada, tipo_caja, precio_costo, precio_venta, stock_minimo]
       );
       const productoId = resultadoProd.insertId;

       // 2. Inicializar la cantidad en la tabla de stock
       await conexion.query(
         `INSERT INTO inventario_stock (producto_id, cantidad) VALUES (?, ?)`,
         [productoId, stock_inicial]
       );

       await conexion.commit();
       return productoId;
     } catch (error) {
       await conexion.rollback();
       throw error;
     } finally {
       conexion.release();
     }
   }

   /**
    * Actualiza los datos generales de un producto.
    */
   static async actualizar(id, {
     categoria_id,
     codigo,
     nombre,
     descripcion = null,
     marca,
     modelo = null,
     condicion = 'Nueva',
     tipo_caja = null,
     precio_costo,
     precio_venta,
     stock_minimo = 3,
     activo = 1
   }) {
     // Normalizar el valor de condicion
     const condicionNormalizada = condicion ? condicion.trim() : 'Nueva';
     
     await pool.query(
       `UPDATE productos 
        SET categoria_id = ?, codigo = ?, nombre = ?, descripcion = ?, marca = ?, 
            modelo = ?, condicion = ?, tipo_caja = ?, precio_costo = ?, precio_venta = ?, 
            stock_minimo = ?, activo = ?
        WHERE id = ?`,
       [categoria_id, codigo, nombre, descripcion, marca, modelo, condicionNormalizada, tipo_caja, precio_costo, precio_venta, stock_minimo, activo, id]
     );
   }

  /**
   * Realiza un ajuste o actualización directa de stock para un producto.
   * Utilizar para operaciones atómicas de incremento/decremento.
   * Si conexionTransaccional es provista, no realiza commit/rollback independiente para ser atómica.
   */
  static async modificarStock(productoId, cantidadDiferencia, conexionTransaccional = null) {
    const query = `
      INSERT INTO inventario_stock (producto_id, cantidad) 
      VALUES (?, ?) 
      ON DUPLICATE KEY UPDATE cantidad = cantidad + ?
    `;
    const params = [productoId, cantidadDiferencia, cantidadDiferencia];

    if (conexionTransaccional) {
      await conexionTransaccional.query(query, params);
    } else {
      await pool.query(query, params);
    }
  }

  /**
   * Desactivación lógica de un producto (activo = 0)
   */
  static async desactivar(id) {
    await pool.query('UPDATE productos SET activo = 0 WHERE id = ?', [id]);
  }

  // ============================================================================
  // GESTIÓN DE CATEGORÍAS
  // ============================================================================

  /**
   * Lista todas las categorías disponibles.
   */
  static async listarCategorias() {
    const [filas] = await pool.query('SELECT id, nombre, descripcion FROM categorias ORDER BY nombre ASC');
    return filas;
  }

  /**
   * Obtiene una categoría por su ID.
   */
  static async obtenerCategoriaPorId(id) {
    const [filas] = await pool.query('SELECT id, nombre, descripcion FROM categorias WHERE id = ?', [id]);
    return filas[0] || null;
  }

  /**
   * Crea una nueva categoría.
   */
  static async crearCategoria({ nombre, descripcion = null }) {
    const [resultado] = await pool.query(
      'INSERT INTO categorias (nombre, descripcion) VALUES (?, ?)',
      [nombre, descripcion]
    );
    return resultado.insertId;
  }

  /**
   * Actualiza una categoría.
   */
  static async actualizarCategoria(id, { nombre, descripcion = null }) {
    await pool.query(
      'UPDATE categorias SET nombre = ?, descripcion = ? WHERE id = ?',
      [nombre, descripcion, id]
    );
  }

  /**
   * Elimina una categoría si no está asociada a ningún producto.
   */
  static async eliminarCategoria(id) {
    const [filas] = await pool.query('SELECT COUNT(*) AS total FROM productos WHERE categoria_id = ?', [id]);
    if (filas[0].total > 0) {
      throw new Error('No se puede eliminar la categoría porque tiene productos asociados.');
    }
    await pool.query('DELETE FROM categorias WHERE id = ?', [id]);
  }
}

export default Producto;
