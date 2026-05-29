import Logger from '../utilidades/logger.js';
import pool from '../configuracion/baseDeDatos.js';

/**
 * @class MovimientoInventario
 * @description Modelo de Datos: MovimientoInventario (movimientos_inventario). Gestiona el Kardex electrónico (historial de movimientos de stock).
 * @tabla movimientos_inventario
 * @autor Equipo Desarrollo
 * @version 1.0.0
 */
class MovimientoInventario {
  static _cacheTieneTablaInventarioBaterias = null;

  static async _tieneTablaInventarioBaterias(conn = pool) {
    if (MovimientoInventario._cacheTieneTablaInventarioBaterias !== null) {
      return MovimientoInventario._cacheTieneTablaInventarioBaterias;
    }

    try {
      const [rows] = await conn.query(
        `SELECT 1
         FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'inventario_baterias'
         LIMIT 1`
      );
      MovimientoInventario._cacheTieneTablaInventarioBaterias = rows.length > 0;
    } catch {
      MovimientoInventario._cacheTieneTablaInventarioBaterias = false;
    }

    return MovimientoInventario._cacheTieneTablaInventarioBaterias;
  }

  /**
   * Registra un movimiento en el Kardex y actualiza la cantidad en inventario_stock de forma transaccional.
   * Si conexionTransaccional es provista, se une a la transacción existente.
   */
  static async registrar({
    producto_id,
    usuario_id,
    tipo_movimiento, // 'entrada', 'salida', 'ajuste'
    concepto,
    cantidad, // siempre positivo en el argumento, el cálculo de stock se basa en tipo_movimiento
    costo_unitario = 0.00,
    precio_venta = 0.00,
    notas = null
  }, conexionTransaccional = null) {
    const conn = conexionTransaccional || await pool.getConnection();

    try {
      if (!conexionTransaccional) {
        Logger.debug('MovimientoInventario', 'BEGIN TRANSACTION');
        await conn.beginTransaction();
      }

      Logger.debug('MovimientoInventario', 'Locking stock row FOR UPDATE', { producto_id });
      // 1. Obtener el stock actual antes del movimiento para registrar la foto histórica
      const [stockFila] = await conn.query(
        'SELECT cantidad FROM inventario_stock WHERE producto_id = ? FOR UPDATE',
        [producto_id]
      );

      const stock_anterior = stockFila[0] ? Number(stockFila[0].cantidad) : 0;
      let stock_posterior = stock_anterior;

      // Calcular el stock posterior en función del tipo de movimiento
      if (tipo_movimiento === 'entrada') {
        stock_posterior += Number(cantidad);
      } else if (tipo_movimiento === 'salida') {
        stock_posterior -= Number(cantidad);
      } else if (tipo_movimiento === 'ajuste') {
        stock_posterior += Number(cantidad);
      }

      if (stock_posterior < 0) {
        throw new Error(`Operación inválida: El stock resultante para el producto ID ${producto_id} no puede ser menor a 0 (Stock actual: ${stock_anterior}, solicitado: ${cantidad}).`);
      }

      Logger.debug('MovimientoInventario', 'INSERT movimiento_inventario', { producto_id, tipo_movimiento, cantidad, stock_anterior, stock_posterior });
      // 2. Insertar el movimiento en el Kardex
      const [resultadoMov] = await conn.query(
        `INSERT INTO movimientos_inventario (producto_id, usuario_id, tipo_movimiento, concepto, cantidad, costo_unitario, precio_venta, stock_anterior, stock_posterior, notas)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [producto_id, usuario_id, tipo_movimiento, concepto, Math.abs(cantidad), costo_unitario, precio_venta, stock_anterior, stock_posterior, notas]
      );

      Logger.debug('MovimientoInventario', 'UPDATE inventario_stock', { producto_id, stock_posterior });
      // 3. Actualizar la tabla de stock consolidado
      await conn.query(
        `INSERT INTO inventario_stock (producto_id, cantidad) 
         VALUES (?, ?) 
         ON DUPLICATE KEY UPDATE cantidad = ?`,
        [producto_id, stock_posterior, stock_posterior]
      );

      // 4. Sincronizar stock con la tabla legada inventario_baterias (si existe)
      const tieneTablaInventarioBaterias = await MovimientoInventario._tieneTablaInventarioBaterias(conn);
      if (tieneTablaInventarioBaterias) {
        await conn.query(
          `UPDATE inventario_baterias ib
           INNER JOIN productos p ON p.codigo = ib.codigo
           SET ib.cantidad = ?
           WHERE p.id = ?`,
          [stock_posterior, producto_id]
        );
      }

      if (!conexionTransaccional) {
        await conn.commit();
        Logger.debug('MovimientoInventario', 'COMMIT OK');
      }

      return resultadoMov.insertId;
    } catch (error) {
      if (!conexionTransaccional) {
        try {
          await conn.rollback();
        } catch (rbErr) {
          Logger.error('MovimientoInventario', 'ROLLBACK ERROR', rbErr);
        }
      }
      throw error;
    } finally {
      if (!conexionTransaccional) {
        conn.release();
      }
    }
  }

  /**
   * Obtiene el listado de movimientos de inventario con filtros para el Kardex visual.
   */
  static async listar({
    productoId = null,
    tipoMovimiento = null,
    fechaInicio = null,
    fechaFin = null,
    limite = 100,
    desplazamiento = 0
  } = {}) {
    let sql = `
      SELECT m.id, m.producto_id, p.nombre AS producto_nombre, p.codigo AS producto_codigo, 
             p.marca AS producto_marca, p.modelo AS producto_modelo,
             m.usuario_id, u.nombre AS usuario_nombre,
             m.tipo_movimiento, m.concepto, m.cantidad, m.costo_unitario, 
             m.precio_venta, m.stock_anterior, m.stock_posterior, m.notas, m.creado_en
      FROM movimientos_inventario m
      JOIN productos p ON m.producto_id = p.id
      JOIN usuarios u ON m.usuario_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (productoId) {
      sql += ' AND m.producto_id = ?';
      params.push(productoId);
    }

    if (tipoMovimiento) {
      sql += ' AND m.tipo_movimiento = ?';
      params.push(tipoMovimiento);
    }

    if (fechaInicio) {
      sql += ' AND m.creado_en >= ?';
      params.push(`${fechaInicio} 00:00:00`);
    }

    if (fechaFin) {
      sql += ' AND m.creado_en <= ?';
      params.push(`${fechaFin} 23:59:59`);
    }

    sql += ' ORDER BY m.id DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limite), parseInt(desplazamiento));

    const [filas] = await pool.query(sql, params);
    return filas;
  }

  /**
   * Obtiene un movimiento del inventario por su ID.
   */
  static async obtenerPorId(id) {
    const [filas] = await pool.query(
      `SELECT m.id, m.producto_id, p.nombre AS producto_nombre, p.codigo AS producto_codigo,
              m.usuario_id, u.nombre AS usuario_nombre,
              m.tipo_movimiento, m.concepto, m.cantidad, m.costo_unitario, 
              m.precio_venta, m.stock_anterior, m.stock_posterior, m.notas, m.creado_en
       FROM movimientos_inventario m
       JOIN productos p ON m.producto_id = p.id
       JOIN usuarios u ON m.usuario_id = u.id
       WHERE m.id = ?`,
      [id]
    );
    return filas[0] || null;
  }
}

export default MovimientoInventario;
