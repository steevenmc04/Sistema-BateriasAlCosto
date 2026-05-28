import pool from '../configuracion/baseDeDatos.js';
import MovimientoInventario from './MovimientoInventario.js';

/**
 * @class Compra
 * @description Modelo de Datos: Compra (compras, detalle_compras). Gestiona el registro de compras, incremento de stock e historial de proveedores.
 * @tabla compras, detalle_compras
 * @autor Equipo Desarrollo
 * @version 1.0.0
 */
class Compra {
  /**
   * Registra una compra a un proveedor, actualiza los precios de costo de los productos
   * e incrementa de forma atómica su stock en el Kardex.
   */
  static async registrarCompra({
    usuario_id,
    numero_factura,
    subtotal,
    monto_iva,
    total,
    notas = null,
    articulos = [] // Array de objetos: { producto_id, cantidad, costo_unitario }
  }) {
    if (!articulos || articulos.length === 0) {
      throw new Error('No se pueden registrar compras sin artículos.');
    }

    const conexion = await pool.getConnection();

    try {
      await conexion.beginTransaction();

      // 1. Insertar la cabecera de la compra
      const [resultadoCompra] = await conexion.query(
        `INSERT INTO compras (usuario_id, numero_factura, subtotal, monto_iva, total, estado, notas)
         VALUES (?, ?, ?, ?, ?, 'registrada', ?)`,
        [usuario_id, numero_factura, subtotal, monto_iva, total, notas]
      );
      const compraId = resultadoCompra.insertId;

      // 2. Registrar los detalles de la compra e incrementar el stock
      for (const art of articulos) {
        const artSubtotal = art.cantidad * art.costo_unitario;

        // 2.1. Insertar detalle
        await conexion.query(
          `INSERT INTO detalle_compras (compra_id, producto_id, cantidad, costo_unitario, subtotal)
           VALUES (?, ?, ?, ?, ?)`,
          [compraId, art.producto_id, art.cantidad, art.costo_unitario, artSubtotal]
        );

        // 2.2. Actualizar el precio de costo del producto al costo de compra más reciente
        await conexion.query(
          'UPDATE productos SET precio_costo = ? WHERE id = ?',
          [art.costo_unitario, art.producto_id]
        );

        // 2.3. Registrar la entrada en el Kardex de inventario (actualiza automáticamente inventario_stock)
        await MovimientoInventario.registrar({
          producto_id: art.producto_id,
          usuario_id: usuario_id,
          tipo_movimiento: 'entrada',
          concepto: `Compra #${compraId}`,
          cantidad: art.cantidad,
          costo_unitario: art.costo_unitario,
          precio_venta: 0.00,
          notas: `Ingreso de stock por compra. Fac: ${numero_factura}`
        }, conexion);
      }

      await conexion.commit();
      return {
        ok: true,
        data: { compra_id: compraId },
        message: 'Compra registrada e inventario actualizado'
      };
    } catch (error) {
      await conexion.rollback();
      throw error;
    } finally {
      conexion.release();
    }
  }

  /**
   * Registra una compra MULTI-ITEM de forma transaccional y atómica.
   * NUEVA: Versión mejorada con validaciones exhaustivas y rollback completo.
   */
  static async registrarCompraMultiItem({
    usuario_id,
    numero_factura,
    total,
    notas = null,
    articulos = []
  }) {
    if (!articulos || articulos.length === 0) {
      throw new Error('No se pueden registrar compras sin articulos.');
    }

    if (!Number.isFinite(total) || total < 0) {
      throw new Error('Total debe ser numero >= 0');
    }

    const productosVistos = new Set();
    for (const art of articulos) {
      if (!Number.isInteger(art.producto_id) || art.producto_id <= 0) {
        throw new Error(`Producto ID invalido: ${art.producto_id}`);
      }

      if (productosVistos.has(art.producto_id)) {
        throw new Error(`Producto duplicado en compra: ID ${art.producto_id}`);
      }
      productosVistos.add(art.producto_id);

      if (!Number.isFinite(art.cantidad) || art.cantidad <= 0) {
        throw new Error(`Cantidad invalida para producto ${art.producto_id}: debe ser > 0`);
      }

      if (!Number.isFinite(art.precio_unitario) || art.precio_unitario < 0) {
        throw new Error(`Precio unitario invalido para producto ${art.producto_id}: debe ser >= 0`);
      }
    }

    const conexion = await pool.getConnection();

    try {
      await conexion.beginTransaction();

      const [resultadoCompra] = await conexion.query(
        `INSERT INTO compras (usuario_id, numero_factura, subtotal, monto_iva, total, estado, notas, creado_en)
         VALUES (?, ?, ?, 0, ?, 'registrada', ?, NOW())`,
        [usuario_id, numero_factura, total, total, notas]
      );
      const compraId = resultadoCompra.insertId;

      for (const art of articulos) {
        const costo = art.precio_unitario;

        const artSubtotal = art.cantidad * costo;

        await conexion.query(
          `INSERT INTO detalle_compras (compra_id, producto_id, cantidad, costo_unitario, subtotal)
           VALUES (?, ?, ?, ?, ?)`,
          [compraId, art.producto_id, art.cantidad, costo, artSubtotal]
        );

        await conexion.query(
          'UPDATE productos SET precio_costo = ? WHERE id = ?',
          [costo, art.producto_id]
        );

        await MovimientoInventario.registrar({
          producto_id: art.producto_id,
          usuario_id: usuario_id,
          tipo_movimiento: 'entrada',
          concepto: `Compra #${compraId} - Fac: ${numero_factura}`,
          cantidad: art.cantidad,
          costo_unitario: costo,
          precio_venta: 0.00,
          notas: `Ingreso de stock por compra multi-item`
        }, conexion);
      }

      await conexion.commit();

      return {
        ok: true,
        data: {
          compra_id: compraId,
          cantidad_items: articulos.length,
          total_productos: articulos.reduce((sum, a) => sum + a.cantidad, 0)
        },
        message: 'Compra multi-item registrada e inventario actualizado'
      };
    } catch (error) {
      await conexion.rollback();
      throw error;
    } finally {
      conexion.release();
    }
  }

  /**
   * Obtiene los datos detallados de una compra por su ID.
   */
  static async obtenerPorId(id) {
    const [cabeceraFilas] = await pool.query(
      `SELECT c.id,
              c.usuario_id, u.nombre AS usuario_nombre, c.numero_factura, 
              c.subtotal, c.monto_iva, c.total, c.estado, c.notas, c.creado_en
       FROM compras c
       JOIN usuarios u ON c.usuario_id = u.id
       WHERE c.id = ?`,
      [id]
    );

    const compra = cabeceraFilas[0] || null;
    if (compra) {
      const [detalleFilas] = await pool.query(
        `SELECT dc.id, dc.producto_id, prod.nombre AS producto_nombre, prod.codigo AS producto_codigo,
                dc.cantidad, dc.costo_unitario, dc.subtotal
         FROM detalle_compras dc
         JOIN productos prod ON dc.producto_id = prod.id
         WHERE dc.compra_id = ?`,
        [id]
      );
      compra.articulos = detalleFilas;
    }

    return compra;
  }

  /**
   * Lista todas las compras con filtros para el panel de administración.
   */
  static async listarTodos({
    fechaInicio = null,
    fechaFin = null,
    estado = null,
    limite = 100,
    desplazamiento = 0
  } = {}) {
    let sql = `
      SELECT c.id,
             c.usuario_id, u.nombre AS usuario_nombre, c.numero_factura, 
             c.subtotal, c.total, c.estado, c.notas, c.creado_en,
             first_dc.cantidad, first_dc.costo_unitario AS precio_unitario,
             first_p.nombre AS producto_nombre, first_p.codigo AS producto_codigo, 
             first_p.marca AS producto_marca,
             first_p.tipo_caja AS producto_tipo_caja, first_p.condicion AS producto_condicion,
             COALESCE(item_summary.cantidad_items, 0) AS cantidad_items,
             COALESCE(item_summary.cantidad_total, 0) AS cantidad_total
      FROM compras c
      JOIN usuarios u ON c.usuario_id = u.id
      LEFT JOIN detalle_compras first_dc ON first_dc.compra_id = c.id
          AND first_dc.id = (SELECT MIN(dc2.id) FROM detalle_compras dc2 WHERE dc2.compra_id = c.id)
      LEFT JOIN productos first_p ON first_dc.producto_id = first_p.id
      LEFT JOIN (
          SELECT compra_id, COUNT(*) AS cantidad_items, SUM(cantidad) AS cantidad_total
          FROM detalle_compras
          GROUP BY compra_id
      ) item_summary ON item_summary.compra_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (fechaInicio) {
      sql += ' AND c.creado_en >= ?';
      params.push(`${fechaInicio} 00:00:00`);
    }

    if (fechaFin) {
      sql += ' AND c.creado_en <= ?';
      params.push(`${fechaFin} 23:59:59`);
    }

    if (estado) {
      sql += ' AND c.estado = ?';
      params.push(estado);
    }

    sql += ' ORDER BY c.id DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limite), parseInt(desplazamiento));

    const [filas] = await pool.query(sql, params);
    return filas;
  }

  /**
   * Anula una compra registrada rebajando el stock agregado previamente.
   */
  static async anularCompra(id, usuarioId) {
    const conexion = await pool.getConnection();

    try {
      await conexion.beginTransaction();

      // 1. Obtener la compra y validar si ya está anulada
      const [compraFilas] = await conexion.query(
        'SELECT id, estado, numero_factura FROM compras WHERE id = ? FOR UPDATE',
        [id]
      );
      const compra = compraFilas[0];

      if (!compra) {
        throw new Error('La compra solicitada no existe.');
      }
      if (compra.estado === 'anulada') {
        throw new Error('La compra ya se encuentra anulada.');
      }

      // 2. Obtener los artículos para rebajar el stock
      const [articulos] = await conexion.query(
        'SELECT producto_id, cantidad, costo_unitario FROM detalle_compras WHERE compra_id = ?',
        [id]
      );

      // Descontar del inventario
      for (const art of articulos) {
        await MovimientoInventario.registrar({
          producto_id: art.producto_id,
          usuario_id: usuarioId,
          tipo_movimiento: 'salida',
          concepto: `Anulación Compra #${id}`,
          cantidad: art.cantidad,
          costo_unitario: art.costo_unitario,
          precio_venta: 0.00,
          notas: `Salida de stock por anulación de compra ID: ${id}. Fac: ${compra.numero_factura}`
        }, conexion);
      }

      // 3. Cambiar estado de la compra a anulada
      await conexion.query(
        "UPDATE compras SET estado = 'anulada' WHERE id = ?",
        [id]
      );

      await conexion.commit();
      return true;
    } catch (error) {
      await conexion.rollback();
      throw error;
    } finally {
      conexion.release();
    }
  }

}

export default Compra;
