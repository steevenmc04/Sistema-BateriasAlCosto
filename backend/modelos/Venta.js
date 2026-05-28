/**
 * @class Venta
 * @description Modelo de datos para ventas y transacciones.
 * @tabla ventas
 * @autor Equipo Desarrollo
 * @version 1.0.0
 */
import Logger from '../utilidades/logger.js';
import pool from '../configuracion/baseDeDatos.js';
import MovimientoInventario from './MovimientoInventario.js';
import Caja from './Caja.js';

/**
 * Modelo de Datos: Venta (ventas, detalle_ventas)
 * Controla la transacción atómica de ventas, rebaja de stock en Kardex, e ingresos en Caja.
 */
class Venta {
  /**
   * Registra una venta completa con sus detalles, rebajando stock en el Kardex 
   * y sumando los ingresos correspondientes a la sesión de caja activa de manera transaccional.
   */
  static async crearVenta({
    cliente_id,
    usuario_id,
    sesion_caja_id,
    numero_factura = null,
    subtotal,
    descuento = 0.00,
    base_imponible,
    monto_iva,
    total,
    iva_porcentaje = 15.00,
    metodo_pago = 'efectivo',
    notas = null,
    articulos = [] // Array de objetos: { producto_id, cantidad, precio_unitario, descuento }
  }) {
    if (!articulos || articulos.length === 0) {
      throw new Error('No se pueden registrar ventas sin artículos.');
    }

    const conexion = await pool.getConnection();

    try {
      Logger.debug('Venta', 'BEGIN TRANSACTION');
      await conexion.beginTransaction();

      // 1. Validar que la sesión de caja esté abierta y pertenezca al usuario
      Logger.debug('Venta', 'Locking session caja FOR UPDATE', { sesion_caja_id });
      const [sesionFilas] = await conexion.query(
        'SELECT estado FROM sesiones_caja WHERE id = ? AND estado = "abierta" FOR UPDATE',
        [sesion_caja_id]
      );
      if (!sesionFilas[0]) {
        throw new Error('La sesión de caja seleccionada no existe o ya ha sido cerrada.');
      }

      // 2. Insertar cabecera de la venta
      Logger.debug('Venta', 'INSERT venta cabecera');
      const [resultadoVenta] = await conexion.query(
        `INSERT INTO ventas (cliente_id, usuario_id, sesion_caja_id, numero_factura, subtotal, descuento, base_imponible, monto_iva, total, iva_porcentaje, metodo_pago, estado, notas)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pagada', ?)`,
        [cliente_id, usuario_id, sesion_caja_id, numero_factura, subtotal, descuento, base_imponible, monto_iva, total, iva_porcentaje, metodo_pago, notas]
      );
      const ventaId = resultadoVenta.insertId;

      // 3. Registrar los artículos (detalles) y rebajar stock
      for (const art of articulos) {
        Logger.debug('Venta', 'PROCESANDO ARTICULO', art);

        // 3.0: Validar stock actual con FOR UPDATE para evitar races
        const [prodFilas] = await conexion.query(
          'SELECT id, precio_costo FROM productos WHERE id = ? FOR UPDATE',
          [art.producto_id]
        );
        if (!prodFilas[0]) {
          throw new Error(`Producto no existe ID: ${art.producto_id}`);
        }

        // Consultar stock actual en inventario_stock
        const [stockFilas] = await conexion.query(
          'SELECT cantidad FROM inventario_stock WHERE producto_id = ? FOR UPDATE',
          [art.producto_id]
        );
        const stock_actual = stockFilas[0] ? Number(stockFilas[0].cantidad) : 0;
        if (stock_actual < Number(art.cantidad)) {
          throw new Error(`Stock insuficiente para producto ID ${art.producto_id}. Stock actual: ${stock_actual}, requerido: ${art.cantidad}`);
        }

        const artSubtotal = Number(art.cantidad) * Number(art.precio_unitario) - (Number(art.descuento || 0));
        const artTotal = artSubtotal * (1 + Number(iva_porcentaje) / 100);

        // 3.1. Insertar el detalle
        Logger.debug('Venta', 'INSERT detalle_ventas', { ventaId, producto_id: art.producto_id, cantidad: art.cantidad });
        await conexion.query(
          `INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, descuento, iva_porcentaje, subtotal, total)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [ventaId, art.producto_id, art.cantidad, art.precio_unitario, art.descuento || 0.00, iva_porcentaje, artSubtotal, artTotal]
        );

        // 3.2. Registrar salida en Kardex (MovimientoInventario se encarga de actualizar inventario_stock)
        Logger.debug('Venta', 'REGISTRANDO MOVIMIENTO INVENTARIO (SALIDA)', { producto_id: art.producto_id, cantidad: art.cantidad });
        await MovimientoInventario.registrar({
          producto_id: art.producto_id,
          usuario_id: usuario_id,
          tipo_movimiento: 'salida',
          concepto: `Venta #${ventaId}`,
          cantidad: Number(art.cantidad),
          costo_unitario: prodFilas[0].precio_costo || 0.00,
          precio_venta: Number(art.precio_unitario),
          notas: `Salida por venta ID: ${ventaId}`
        }, conexion);
      }

      // 4. Registrar movimiento de ingreso en la caja activa
      Logger.debug('Venta', 'REGISTRANDO MOVIMIENTO CAJA');
      await Caja.registrarMovimiento({
        sesion_caja_id: sesion_caja_id,
        usuario_id: usuario_id,
        tipo_movimiento: 'ingreso',
        concepto: `Venta #${ventaId}${numero_factura ? ' (Fac: ' + numero_factura + ')' : ''}`,
        monto: total,
        referencia_tabla: 'ventas',
        referencia_id: ventaId,
        notas: `Pago recibido vía ${metodo_pago}`
      }, conexion);

      await conexion.commit();
      Logger.debug('Venta', 'COMMIT OK');
      return ventaId;
    } catch (error) {
      try {
        await conexion.rollback();
        Logger.error('Venta', 'ROLLBACK ERROR VENTA', error);
      } catch (rbErr) {
        Logger.error('Venta', 'ROLLBACK FALLIDO VENTA', rbErr);
      }
      throw error;
    } finally {
      conexion.release();
    }
  }

  /**
   * Registra una venta MULTI-ITEM de forma transaccional y atómica.
   * NUEVA: Versión mejorada con validaciones exhaustivas y rollback completo.
   */
  static async crearVentaMultiItem({
    cliente_id,
    usuario_id,
    sesion_caja_id,
    numero_factura = null,
    subtotal,
    descuento = 0.00,
    base_imponible,
    monto_iva,
    total,
    iva_porcentaje = 15.00,
    metodo_pago = 'efectivo',
    notas = null,
    articulos = [] // { producto_id, cantidad, precio_unitario, descuento }
  }) {
    // ======= VALIDACIONES PRELIMINARES =======
    if (!articulos || articulos.length === 0) {
      throw new Error('No se pueden registrar ventas sin artículos.');
    }

    if (!Number.isFinite(subtotal) || subtotal < 0) {
      throw new Error('Subtotal debe ser número >= 0');
    }

    if (!Number.isFinite(total) || total < 0) {
      throw new Error('Total debe ser número >= 0');
    }

    // Validar que no hay productos duplicados
    const productosVistos = new Set();
    for (const art of articulos) {
      if (!Number.isInteger(art.producto_id) || art.producto_id <= 0) {
        throw new Error(`Producto ID inválido: ${art.producto_id}`);
      }

      if (productosVistos.has(art.producto_id)) {
        throw new Error(`Producto duplicado en venta: ID ${art.producto_id}`);
      }
      productosVistos.add(art.producto_id);

      if (!Number.isFinite(art.cantidad) || art.cantidad <= 0) {
        throw new Error(`Cantidad inválida para producto ${art.producto_id}: debe ser > 0`);
      }

      if (!Number.isFinite(art.precio_unitario) || art.precio_unitario < 0) {
        throw new Error(`Precio unitario inválido para producto ${art.producto_id}: debe ser >= 0`);
      }
    }

    // Validar IVA
    const base_calculada = Math.round((subtotal - descuento) * 100) / 100;
    const iva_calculado = Math.round(base_calculada * (iva_porcentaje / 100) * 100) / 100;
    const total_calculado = Math.round((base_calculada + iva_calculado) * 100) / 100;

    if (Math.abs(base_imponible - base_calculada) > 0.01) {
      throw new Error(
        `Base imponible inconsistente. Esperado: ${base_calculada}, Recibido: ${base_imponible}`
      );
    }

    if (Math.abs(monto_iva - iva_calculado) > 0.01) {
      throw new Error(
        `Monto IVA inconsistente. Esperado: ${iva_calculado}, Recibido: ${monto_iva}`
      );
    }

    if (Math.abs(total - total_calculado) > 0.01) {
      throw new Error(
        `Total inconsistente. Esperado: ${total_calculado}, Recibido: ${total}`
      );
    }

    const conexion = await pool.getConnection();

    try {
      await conexion.beginTransaction();

      // ======= VALIDAR SESIÓN DE CAJA (opcional) =======
      if (sesion_caja_id) {
        const [sesionFilas] = await conexion.query(
          `SELECT id, estado, abierto_por FROM sesiones_caja 
           WHERE id = ? FOR UPDATE`,
          [sesion_caja_id]
        );

        const sesion = sesionFilas[0];
        if (!sesion) {
          throw new Error('La sesión de caja no existe.');
        }
        if (sesion.estado !== 'abierta') {
          throw new Error('La sesión de caja está cerrada.');
        }
        if (sesion.abierto_por !== usuario_id) {
          throw new Error('Acceso denegado. Sesión fue abierta por otro usuario.');
        }
      }

      // ======= PRE-VALIDAR STOCKS (todos con FOR UPDATE) =======
      for (const art of articulos) {
        const [stockFilas] = await conexion.query(
          'SELECT cantidad FROM inventario_stock WHERE producto_id = ? FOR UPDATE',
          [art.producto_id]
        );
        const stock_actual = stockFilas[0] ? Number(stockFilas[0].cantidad) : 0;
        if (stock_actual < Number(art.cantidad)) {
          throw new Error(
            `Stock insuficiente para producto ID ${art.producto_id}. ` +
            `Stock: ${stock_actual}, Requerido: ${art.cantidad}`
          );
        }
      }

      // ======= INSERTAR CABECERA =======
      const [resultadoVenta] = await conexion.query(
        `INSERT INTO ventas (
          cliente_id, usuario_id, sesion_caja_id, numero_factura, 
          subtotal, descuento, base_imponible, monto_iva, total, iva_porcentaje, 
          metodo_pago, estado, notas, creado_en
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pagada', ?, NOW())`,
        [
          cliente_id, usuario_id, sesion_caja_id || null, numero_factura,
          subtotal, descuento, base_imponible, monto_iva, total, iva_porcentaje,
          metodo_pago, notas
        ]
      );
      const ventaId = resultadoVenta.insertId;

      // ======= PROCESAR CADA ARTÍCULO =======
      for (const art of articulos) {
        const artSubtotal = (art.cantidad * art.precio_unitario) - (art.descuento || 0);
        const artTotal = Math.round(artSubtotal * (1 + iva_porcentaje / 100) * 100) / 100;

        // 1. Insertar detalle de venta
        await conexion.query(
          `INSERT INTO detalle_ventas (
            venta_id, producto_id, cantidad, precio_unitario, 
            descuento, iva_porcentaje, subtotal, total
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            ventaId, art.producto_id, art.cantidad, art.precio_unitario,
            art.descuento || 0, iva_porcentaje, artSubtotal, artTotal
          ]
        );

        // 2. Obtener precio de costo del producto
        const [prodFilas] = await conexion.query(
          'SELECT precio_costo FROM productos WHERE id = ?',
          [art.producto_id]
        );
        const precioCosto = prodFilas[0]?.precio_costo || 0;

        // 3. Registrar movimiento de inventario (salida)
        await MovimientoInventario.registrar({
          producto_id: art.producto_id,
          usuario_id: usuario_id,
          tipo_movimiento: 'salida',
          concepto: `Venta #${ventaId}${numero_factura ? ` - Fac: ${numero_factura}` : ''}`,
          cantidad: Number(art.cantidad),
          costo_unitario: precioCosto,
          precio_venta: Number(art.precio_unitario),
          notas: `Salida de stock por venta multi-item`
        }, conexion);
      }

      // ======= REGISTRAR MOVIMIENTO DE CAJA (opcional) =======
      if (sesion_caja_id) {
        await Caja.registrarMovimiento({
          sesion_caja_id: sesion_caja_id,
          usuario_id: usuario_id,
          tipo_movimiento: 'ingreso',
          concepto: `Venta #${ventaId}${numero_factura ? ` (Fac: ${numero_factura})` : ''}`,
          monto: total,
          referencia_tabla: 'ventas',
          referencia_id: ventaId,
          notas: `Pago recibido vía ${metodo_pago}`
        }, conexion);
      }

      await conexion.commit();

      return {
        ok: true,
        data: {
          venta_id: ventaId,
          cantidad_items: articulos.length,
          total_productos: articulos.reduce((sum, a) => sum + a.cantidad, 0)
        },
        message: 'Venta multi-item registrada e inventario actualizado'
      };
    } catch (error) {
      await conexion.rollback();
      throw error;
    } finally {
      conexion.release();
    }
  }

  /**
   * Obtiene una venta completa por su ID con sus detalles y datos del cliente.
   */
  static async obtenerPorId(id) {
    const [cabeceraFilas] = await pool.query(
      `SELECT v.id, v.cliente_id, c.nombre AS cliente_nombre, c.documento AS cliente_documento,
              c.tipo_documento AS cliente_tipo_documento, c.email AS cliente_email,
              c.telefono AS cliente_telefono, c.direccion AS cliente_direccion,
              v.usuario_id, u.nombre AS usuario_nombre,
              v.sesion_caja_id, v.numero_factura, v.subtotal, v.descuento, 
              v.base_imponible, v.monto_iva, v.total, v.iva_porcentaje, 
              v.metodo_pago, v.estado, v.notas, v.creado_en
       FROM ventas v
       JOIN clientes c ON v.cliente_id = c.id
       JOIN usuarios u ON v.usuario_id = u.id
       WHERE v.id = ?`,
      [id]
    );

    const venta = cabeceraFilas[0] || null;
    if (venta) {
      const [detalleFilas] = await pool.query(
        `SELECT dv.id, dv.producto_id, p.nombre AS producto_nombre, p.codigo AS producto_codigo,
                p.marca AS producto_marca, p.modelo AS producto_modelo,
                dv.cantidad, dv.precio_unitario, dv.descuento, dv.iva_porcentaje, 
                dv.subtotal, dv.total
         FROM detalle_ventas dv
         JOIN productos p ON dv.producto_id = p.id
         WHERE dv.venta_id = ?`,
        [id]
      );
      venta.articulos = detalleFilas;
    }

    return venta;
  }

  /**
   * Lista todas las ventas con filtros opcionales.
   */
  static async listarTodos({
    fechaInicio = null,
    fechaFin = null,
    clienteId = null,
    estado = null,
    limite = 100,
    desplazamiento = 0
  } = {}) {
    let sql = `
      SELECT v.id, v.cliente_id, c.nombre AS cliente_nombre, c.documento AS cliente_documento,
             c.email AS cliente_email, c.telefono AS cliente_telefono, c.direccion AS cliente_direccion,
             v.usuario_id, u.nombre AS usuario_nombre, v.numero_factura, 
             v.subtotal, v.descuento, v.base_imponible, v.monto_iva, v.total, v.metodo_pago, v.estado,
             v.notas, v.creado_en,
             first_dv.cantidad, first_dv.precio_unitario,
             first_p.nombre AS producto_nombre, first_p.codigo AS producto_codigo, 
             first_p.marca AS producto_marca,
             first_p.tipo_caja AS producto_tipo_caja, first_p.condicion AS producto_condicion,
             COALESCE(item_summary.cantidad_items, 0) AS cantidad_items,
             COALESCE(item_summary.cantidad_total, 0) AS cantidad_total
      FROM ventas v
      JOIN clientes c ON v.cliente_id = c.id
      JOIN usuarios u ON v.usuario_id = u.id
      LEFT JOIN detalle_ventas first_dv ON first_dv.venta_id = v.id
          AND first_dv.id = (SELECT MIN(dv2.id) FROM detalle_ventas dv2 WHERE dv2.venta_id = v.id)
      LEFT JOIN productos first_p ON first_dv.producto_id = first_p.id
      LEFT JOIN (
          SELECT venta_id, COUNT(*) AS cantidad_items, SUM(cantidad) AS cantidad_total
          FROM detalle_ventas
          GROUP BY venta_id
      ) item_summary ON item_summary.venta_id = v.id
      WHERE 1=1
    `;
    const params = [];

    if (fechaInicio) {
      sql += ' AND v.creado_en >= ?';
      params.push(`${fechaInicio} 00:00:00`);
    }

    if (fechaFin) {
      sql += ' AND v.creado_en <= ?';
      params.push(`${fechaFin} 23:59:59`);
    }

    if (clienteId) {
      sql += ' AND v.cliente_id = ?';
      params.push(clienteId);
    }

    if (estado) {
      sql += ' AND v.estado = ?';
      params.push(estado);
    }

    sql += ' ORDER BY v.id DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limite), parseInt(desplazamiento));

    const [filas] = await pool.query(sql, params);
    return filas;
  }

  /**
   * Anula una venta restaurando el inventario y registrando un egreso de caja de forma atómica.
   */
  static async anularVenta(id, usuarioId, sesionCajaId) {
    const conexion = await pool.getConnection();

    try {
      await conexion.beginTransaction();

      // 1. Obtener la venta y verificar si ya está anulada
      const [ventaFilas] = await conexion.query(
        'SELECT id, total, estado, sesion_caja_id FROM ventas WHERE id = ? FOR UPDATE',
        [id]
      );
      const venta = ventaFilas[0];

      if (!venta) {
        throw new Error('La venta solicitada no existe.');
      }
      if (venta.estado === 'anulada') {
        throw new Error('La venta ya se encuentra anulada.');
      }

      // 2. Obtener los artículos para retornar el stock
      const [articulos] = await conexion.query(
        'SELECT producto_id, cantidad, precio_unitario FROM detalle_ventas WHERE venta_id = ?',
        [id]
      );

      // Restablecer el stock de los productos vendidos
      for (const art of articulos) {
        await MovimientoInventario.registrar({
          producto_id: art.producto_id,
          usuario_id: usuarioId,
          tipo_movimiento: 'entrada',
          concepto: `Anulación Venta #${id}`,
          cantidad: art.cantidad,
          costo_unitario: 0.00,
          precio_venta: art.precio_unitario,
          notas: `Devolución de stock por anulación de venta ID: ${id}`
        }, conexion);
      }

      // 3. Registrar movimiento de egreso en caja por el dinero devuelto
      await Caja.registrarMovimiento({
        sesion_caja_id: sesionCajaId,
        usuario_id: usuarioId,
        tipo_movimiento: 'egreso',
        concepto: `Devolución Anulación Venta #${id}`,
        monto: venta.total,
        referencia_tabla: 'ventas',
        referencia_id: id,
        notas: `Reembolso por anulación de venta.`
      }, conexion);

      // 4. Cambiar el estado de la venta a 'anulada'
      await conexion.query(
        "UPDATE ventas SET estado = 'anulada' WHERE id = ?",
        [id]
      );

      // 5. Anular la factura vinculada si existe
      await conexion.query(
        "UPDATE facturas SET estado = 'anulada', sri_estado = 'ANULADA' WHERE venta_id = ?",
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

export default Venta;
