import Logger from '../utilidades/logger.js';
import pool from '../configuracion/baseDeDatos.js';
import MovimientoInventario from './MovimientoInventario.js';
import Caja from './Caja.js';

class Chatarra {

  static async registrarChatarraMultiItem({
    tipo_operacion,
    usuario_id,
    sesion_caja_id = null,
    subtotal,
    total,
    notas = null,
    articulos = []
  }) {
    if (!articulos || articulos.length === 0) {
      throw new Error('No se pueden registrar operaciones de chatarra sin artículos.');
    }

    if (!['entrada', 'salida'].includes(tipo_operacion)) {
      throw new Error('Tipo de operación debe ser "entrada" o "salida".');
    }

    const productosVistos = new Set();
    for (const art of articulos) {
      if (!Number.isInteger(art.producto_id) || art.producto_id <= 0) {
        throw new Error(`Producto ID inválido: ${art.producto_id}`);
      }

      if (productosVistos.has(art.producto_id)) {
        throw new Error(`Producto duplicado en chatarra: ID ${art.producto_id}`);
      }
      productosVistos.add(art.producto_id);

      if (!Number.isFinite(art.cantidad) || art.cantidad <= 0) {
        throw new Error(`Cantidad inválida para producto ${art.producto_id}: debe ser > 0`);
      }

      if (!Number.isFinite(art.precio_unitario) || art.precio_unitario < 0) {
        throw new Error(`Precio unitario inválido para producto ${art.producto_id}: debe ser >= 0`);
      }
    }

    const conexion = await pool.getConnection();

    try {
      await conexion.beginTransaction();

      // ======= INSERTAR CABECERA =======
      const [resultado] = await conexion.query(
        `INSERT INTO chatarra_operaciones (
          tipo_operacion, usuario_id, sesion_caja_id,
          subtotal, total, notas, estado, creado_en
        ) VALUES (?, ?, ?, ?, ?, ?, 'registrada', NOW())`,
        [tipo_operacion, usuario_id, sesion_caja_id, subtotal, total, notas]
      );
      const chatarraId = resultado.insertId;

      // ======= PROCESAR CADA ARTÍCULO =======
      for (const art of articulos) {
        const artSubtotal = (art.cantidad * art.precio_unitario) - (art.descuento || 0);

        // 1. Insertar detalle
        await conexion.query(
          `INSERT INTO chatarra_detalles (
            chatarra_id, producto_id, cantidad, precio_unitario, subtotal, notas
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [chatarraId, art.producto_id, art.cantidad, art.precio_unitario, artSubtotal, art.notas || null]
        );

        const movimientoConcepto = tipo_operacion === 'entrada'
          ? `Chatarra entrada #${chatarraId}`
          : `Chatarra salida #${chatarraId}`;

        // 2. Registrar movimiento de inventario (chatarra) - usar ENUM válido: entrada/salida
        await MovimientoInventario.registrar({
          producto_id: art.producto_id,
          usuario_id: usuario_id,
          tipo_movimiento: tipo_operacion === 'entrada' ? 'entrada' : 'salida',
          concepto: movimientoConcepto,
          cantidad: art.cantidad,
          costo_unitario: art.precio_unitario,
          precio_venta: tipo_operacion === 'salida' ? art.precio_unitario : 0,
          notas: tipo_operacion === 'entrada'
            ? `Ingreso de chatarra. Detalle: ${art.notas || ''}`
            : `Salida de chatarra. Detalle: ${art.notas || ''}`
        }, conexion);
      }

      // ======= REGISTRAR MOVIMIENTO DE CAJA (si aplica) =======
      if (sesion_caja_id) {
        const cajaTipo = tipo_operacion === 'entrada' ? 'egreso' : 'ingreso';
        await Caja.registrarMovimiento({
          sesion_caja_id,
          usuario_id,
          tipo_movimiento: cajaTipo,
          concepto: `Chatarra #${chatarraId} - ${tipo_operacion === 'entrada' ? 'Compra' : 'Venta'}`,
          monto: total,
          referencia_tabla: 'chatarra_operaciones',
          referencia_id: chatarraId,
          notas: `Movimiento por chatarra ${tipo_operacion}`
        }, conexion);
      }

      await conexion.commit();

      return {
        ok: true,
        data: {
          chatarra_id: chatarraId,
          cantidad_items: articulos.length,
          total_productos: articulos.reduce((sum, a) => sum + a.cantidad, 0)
        },
        message: `Chatarra ${tipo_operacion === 'entrada' ? 'registrada' : 'vendida'} exitosamente`
      };
    } catch (error) {
      await conexion.rollback();
      throw error;
    } finally {
      conexion.release();
    }
  }

  static async obtenerPorId(id) {
    const [cabeceraFilas] = await pool.query(
      `SELECT c.*, u.nombre AS usuario_nombre
       FROM chatarra_operaciones c
       JOIN usuarios u ON c.usuario_id = u.id
       WHERE c.id = ?`,
      [id]
    );
    const op = cabeceraFilas[0] || null;
    if (op) {
      const [detalleFilas] = await pool.query(
        `SELECT cd.id, cd.producto_id, p.nombre AS producto_nombre, p.codigo AS producto_codigo,
                p.marca AS producto_marca, cd.cantidad, cd.precio_unitario, cd.subtotal, cd.notas
         FROM chatarra_detalles cd
         JOIN productos p ON cd.producto_id = p.id
         WHERE cd.chatarra_id = ?
         ORDER BY cd.id ASC`,
        [id]
      );
      op.articulos = detalleFilas;
    }
    return op;
  }

  static async listarTodos({
    tipoOperacion = null,
    fechaInicio = null,
    fechaFin = null,
    limite = 100,
    desplazamiento = 0
  } = {}) {
    let sql = `
      SELECT c.id, c.tipo_operacion, c.usuario_id, u.nombre AS usuario_nombre,
             c.subtotal, c.total, c.estado, c.notas, c.creado_en,
             first_cd.cantidad, first_cd.precio_unitario,
             first_p.nombre AS producto_nombre, first_p.codigo AS producto_codigo, 
             first_p.marca AS producto_marca,
             first_p.tipo_caja AS producto_tipo_caja, first_p.condicion AS producto_condicion,
             COALESCE(item_summary.cantidad_items, 0) AS cantidad_items,
             COALESCE(item_summary.cantidad_total, 0) AS cantidad_total
      FROM chatarra_operaciones c
      JOIN usuarios u ON c.usuario_id = u.id
      LEFT JOIN chatarra_detalles first_cd ON first_cd.chatarra_id = c.id
          AND first_cd.id = (SELECT MIN(cd2.id) FROM chatarra_detalles cd2 WHERE cd2.chatarra_id = c.id)
      LEFT JOIN productos first_p ON first_cd.producto_id = first_p.id
      LEFT JOIN (
          SELECT chatarra_id, COUNT(*) AS cantidad_items, SUM(cantidad) AS cantidad_total
          FROM chatarra_detalles
          GROUP BY chatarra_id
      ) item_summary ON item_summary.chatarra_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (tipoOperacion) {
      sql += ' AND c.tipo_operacion = ?';
      params.push(tipoOperacion);
    }

    if (fechaInicio) {
      sql += ' AND c.creado_en >= ?';
      params.push(`${fechaInicio} 00:00:00`);
    }

    if (fechaFin) {
      sql += ' AND c.creado_en <= ?';
      params.push(`${fechaFin} 23:59:59`);
    }

    sql += ' ORDER BY c.id DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limite), parseInt(desplazamiento));

    const [filas] = await pool.query(sql, params);
    return filas;
  }

  static async anularChatarra(id, usuarioId) {
    const conexion = await pool.getConnection();

    try {
      await conexion.beginTransaction();

      const [filas] = await conexion.query(
        'SELECT id, tipo_operacion, total, estado, sesion_caja_id FROM chatarra_operaciones WHERE id = ? FOR UPDATE',
        [id]
      );
      const op = filas[0];

      if (!op) {
        throw new Error('Operación de chatarra no encontrada.');
      }
      if (op.estado === 'anulada') {
        throw new Error('La operación de chatarra ya está anulada.');
      }

      const [articulos] = await conexion.query(
        'SELECT producto_id, cantidad, precio_unitario FROM chatarra_detalles WHERE chatarra_id = ?',
        [id]
      );

      for (const art of articulos) {
        await MovimientoInventario.registrar({
          producto_id: art.producto_id,
          usuario_id: usuarioId,
          tipo_movimiento: 'ajuste',
          concepto: `Anulación Chatarra #${id}`,
          cantidad: art.cantidad,
          costo_unitario: art.precio_unitario,
          precio_venta: 0,
          notas: `Reversión por anulación de chatarra ID: ${id}`
        }, conexion);
      }

      if (op.sesion_caja_id) {
        const cajaTipo = op.tipo_operacion === 'entrada' ? 'ingreso' : 'egreso';
        await Caja.registrarMovimiento({
          sesion_caja_id: op.sesion_caja_id,
          usuario_id: usuarioId,
          tipo_movimiento: cajaTipo,
          concepto: `Anulación Chatarra #${id}`,
          monto: op.total,
          referencia_tabla: 'chatarra_operaciones',
          referencia_id: id,
          notas: `Reversión de caja por anulación de chatarra`
        }, conexion);
      }

      await conexion.query(
        "UPDATE chatarra_operaciones SET estado = 'anulada' WHERE id = ?",
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

export default Chatarra;
