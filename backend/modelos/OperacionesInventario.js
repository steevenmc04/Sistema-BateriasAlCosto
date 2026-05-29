import pool from '../configuracion/baseDeDatos.js';
import InventarioBateria from './InventarioBateria.js';
import InventarioVario from './InventarioVario.js';

/**
 * @class OperacionesInventario
 * @description Operaciones sobre inventario_* y registros financieros (transacciones en BD).
 * @autor Equipo Desarrollo
 * @version 1.0.0
 */
const IVA_RATIO = 0.15;

/**
 * Operaciones sobre inventario_* y registros financieros (transacciones en BD).
 */
class OperacionesInventario {
  static _cacheTieneCodigoManualDetalleVentas = null;

  static async _tieneCodigoManualDetalleVentas() {
    if (OperacionesInventario._cacheTieneCodigoManualDetalleVentas !== null) {
      return OperacionesInventario._cacheTieneCodigoManualDetalleVentas;
    }
    try {
      const [rows] = await pool.query(
        `SELECT 1
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'detalle_ventas'
           AND COLUMN_NAME = 'codigo_manual'
         LIMIT 1`
      );
      OperacionesInventario._cacheTieneCodigoManualDetalleVentas = rows.length > 0;
    } catch {
      OperacionesInventario._cacheTieneCodigoManualDetalleVentas = false;
    }
    return OperacionesInventario._cacheTieneCodigoManualDetalleVentas;
  }

  static _montosCantidadPrecio(q, pu, incluyeIva) {
    const bruto = Number(q) * Number(pu);
    if (incluyeIva) {
      const subtotal = Number(bruto.toFixed(2));
      const montoIva = Number((subtotal * IVA_RATIO).toFixed(2));
      const total = Number((subtotal + montoIva).toFixed(2));
      return { subtotal, monto_iva: montoIva, total };
    }
    const total = Number(bruto.toFixed(2));
    return { subtotal: total, monto_iva: 0, total };
  }

  /** Venta batería desde inventario_baterías */
  static async venderBateria(payload, usuarioId) {
    const {
      codigo,
      marca,
      tipo_caja,
      cantidad,
      precio_unitario,
      con_iva,
      nombre_cliente,
      fecha
    } = payload;

    const q = Number(cantidad);
    const pu = Number(precio_unitario);
    const codigoVenta = String(codigo || '').trim();
    const marcaVenta = String(marca || '').trim();
    const tipoCajaVenta = String(tipo_caja || '').trim();

    if ((!codigoVenta && (!marcaVenta || !tipoCajaVenta)) || Number.isNaN(q) || q < 1) {
      throw new Error('Debe ingresar un código válido y cantidad mayor a cero.');
    }

    const {
      subtotal,
      monto_iva,
      total
    } = OperacionesInventario._montosCantidadPrecio(
      q,
      pu,
      Boolean(con_iva)
    );

    const con = await pool.getConnection();

    try {
      await con.beginTransaction();

      const [filas] = codigoVenta
        ? await con.query(
        `SELECT
          id,
          codigo,
          marca,
          tipo_caja,
          condicion AS condicion_bd,
          cantidad AS stock
        FROM inventario_baterias
        WHERE codigo = ?
        FOR UPDATE`,
        [codigoVenta]
      )
        : await con.query(
          `SELECT
            id,
            codigo,
            marca,
            tipo_caja,
            condicion AS condicion_bd,
            cantidad AS stock
          FROM inventario_baterias
          WHERE marca = ? AND tipo_caja = ? AND cantidad >= ?
          ORDER BY cantidad DESC, id ASC
          LIMIT 1
          FOR UPDATE`,
          [marcaVenta, tipoCajaVenta, q]
        );

      const fila = filas[0];

      if (!fila) {
        throw new Error('No existe batería con ese código');
      }

      const stockDisp = Number(fila.stock ?? 0);

      if (stockDisp < q) {
        throw new Error('Cantidad solicitada mayor al stock disponible');
      }

      const [resultadoVenta] = await con.query(
        `INSERT INTO ventas_inventario (
          tipo,
          codigo_item,
          marca,
          tipo_caja,
          condicion,
          cantidad,
          precio_unitario,
          con_iva,
          subtotal,
          monto_iva,
          total,
          nombre_cliente,
          usuario_id,
          fecha
        ) VALUES ('bateria', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          fila.codigo,
          fila.marca,
          fila.tipo_caja,
          fila.condicion_bd,
          q,
          pu,
          con_iva ? 1 : 0,
          subtotal,
          monto_iva,
          total,
          nombre_cliente || null,
          usuarioId,
          fecha || new Date()
        ]
      );

      await InventarioBateria.actualizarCantidadYSaldo(con, fila.id, stockDisp - q);
      await con.commit();
      return {
        total,
        ventaId: resultadoVenta.insertId,
        codigo: fila.codigo,
        marca: fila.marca,
        tipo_caja: fila.tipo_caja,
        condicion: fila.condicion_bd,
      };
    } catch (err) {
      await con.rollback();
      throw err;
    } finally {
      con.release();
    }
  }

  /** Venta varios desde inventario_varios */
  static async venderVarios(payload, usuarioId) {
    const {
      codigo,
      cantidad,
      precio_unitario,
      con_iva,
      nombre_cliente,
      fecha
    } = payload;

    const q = Number(cantidad);
    const pu = Number(precio_unitario);

    if (!String(codigo || '').trim() || Number.isNaN(q) || q < 1) {
      throw new Error('Debe ingresar un código válido y cantidad mayor a cero.');
    }

    const {
      subtotal,
      monto_iva,
      total
    } = OperacionesInventario._montosCantidadPrecio(
      q,
      pu,
      Boolean(con_iva)
    );

    const con = await pool.getConnection();

    try {
      await con.beginTransaction();

      const [filas] = await con.query(
        `SELECT
          id,
          nombre,
          cantidad AS stock
        FROM inventario_varios
        WHERE codigo = ?
        FOR UPDATE`,
        [codigo]
      );

      const fila = filas[0];

      if (!fila) {
        throw new Error('No existe item con ese código');
      }

      const stockDisp = Number(fila.stock ?? 0);
      if (stockDisp < q) throw new Error('Stock insuficiente');

      await con.query(
        `INSERT INTO ventas_inventario (
          tipo, codigo_item, marca, tipo_caja, condicion, cantidad, precio_unitario, con_iva,
          subtotal, monto_iva, total, nombre_cliente, usuario_id, fecha
        ) VALUES ('varios', ?, null, null, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          codigo,
          fila.nombre?.slice(0, 40) || '-',
          q,
          pu,
          con_iva ? 1 : 0,
          subtotal,
          monto_iva,
          total,
          nombre_cliente || null,
          usuarioId,
          fecha || new Date()
        ]
      );

      await InventarioVario.actualizarCantidad(con, fila.id, stockDisp - q);
      await con.commit();
      return { total };
    } catch (err) {
      await con.rollback();
      throw err;
    } finally {
      con.release();
    }
  }

  /** Compra proveedor: registra compras_inventario y suma o crea línea inventario */
  static async comprarBaterias(payload, usuarioId) {
    const {
      marca,
      tipo_caja,
      condicion,
      cantidad,
      precio_unitario,
      proveedor,
      fecha,
      codigo_nuevo
    } = payload;

    const q = Number(cantidad);
    const pu = Number(precio_unitario);
    const total = Number((q * pu).toFixed(2));

    const con = await pool.getConnection();

    try {
      await con.beginTransaction();

      await con.query(
        `INSERT INTO compras_inventario (
          marca,
          tipo_caja,
          condicion,
          cantidad,
          precio_unitario,
          total,
          proveedor,
          usuario_id,
          fecha
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          marca,
          tipo_caja,
          condicion || 'Nueva',
          q,
          pu,
          total,
          proveedor || '',
          usuarioId,
          fecha || new Date()
        ]
      );

      const [existRows] = await con.query(
        `SELECT id, cantidad FROM inventario_baterias
         WHERE marca = ? AND tipo_caja = ? AND condicion = ?
         ORDER BY id ASC LIMIT 1 FOR UPDATE`,
        [marca, tipo_caja, condicion || 'Nueva']
      );

      const existente = existRows[0];

      if (existente) {
        const nueva = Number(existente.cantidad) + q;
        await InventarioBateria.actualizarCantidadYSaldo(con, existente.id, nueva);
      } else {
        const manual = codigo_nuevo?.trim();

        if (manual) {
          const [dup] = await con.query(
            'SELECT id FROM inventario_baterias WHERE codigo = ? LIMIT 1',
            [manual]
          );

          if (dup.length) {
            throw new Error('Esta referencia ya está registrada');
          }

          await con.query(
            `INSERT INTO inventario_baterias (
              codigo,
              marca,
              condicion,
              tipo_caja,
              cantidad,
              estado_stock,
              precio
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              manual,
              marca,
              condicion || 'Nueva',
              tipo_caja,
              q,
              'normal',
              pu
            ]
          );
        } else {
          let insertado = false;
          let intentos = 0;

          while (intentos < 50) {
            intentos++;
            const codigoIns = await InventarioBateria.siguienteCodigoLibreEnConexion(con);

            try {
              await con.query(
                `INSERT INTO inventario_baterias (
                  codigo,
                  marca,
                  condicion,
                  tipo_caja,
                  cantidad,
                  estado_stock,
                  precio
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                  codigoIns,
                  marca,
                  condicion || 'Nueva',
                  tipo_caja,
                  q,
                  'normal',
                  pu
                ]
              );
              insertado = true;
              break;
            } catch (err) {
              if (err.code !== 'ER_DUP_ENTRY') {
                throw err;
              }
            }
          }

          if (!insertado) {
            throw new Error('No se pudo crear la línea en inventario');
          }
        }
      }

      await con.commit();
      return { total };
    } catch (err) {
      await con.rollback();
      throw err;
    } finally {
      con.release();
    }
  }

  /** Compra varios desde inventario_varios */
  static async comprarVarios(payload, usuarioId) {
    const { codigo, cantidad, precio_unitario, proveedor, notas, fecha } = payload;
    const q = Number(cantidad);
    const pu = Number(precio_unitario);
    const total = Number((q * pu).toFixed(2));

    if (!String(codigo || '').trim() || Number.isNaN(q) || q < 1) {
      throw new Error('Debe ingresar un código válido y cantidad mayor a cero.');
    }

    const con = await pool.getConnection();
    try {
      await con.beginTransaction();

      const [filas] = await con.query(
        `SELECT id, nombre, cantidad AS stock FROM inventario_varios WHERE codigo = ? FOR UPDATE`,
        [codigo]
      );
      const fila = filas[0];
      if (!fila) throw new Error('No existe item con ese código');

      await con.query(
        `INSERT INTO compras_inventario (marca, tipo_caja, condicion, cantidad, precio_unitario, total, proveedor, usuario_id, fecha)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [fila.nombre, '-', 'Nueva', q, pu, total, proveedor || '', usuarioId, fecha || new Date()]
      );

      const nuevoStock = Number(fila.stock) + q;
      await con.query('UPDATE inventario_varios SET cantidad = ? WHERE id = ?', [nuevoStock, fila.id]);
      await con.commit();
      return { total };
    } catch (err) {
      await con.rollback();
      throw err;
    } finally {
      con.release();
    }
  }

  /** Registrar Chatarra */
  static async registrarChatarra(payload, usuarioId) {
    const {
      tipo_operacion,
      cantidad,
      marca,
      tipo_caja,
      precio_unitario,
      nombre_cliente_proveedor,
      notas,
      fecha
    } = payload;
    const q = Number(cantidad);
    const pu = Number(precio_unitario);
    const total = Number((q * pu).toFixed(2));

    const finalNotas = marca ? `Marca: ${marca}${notas ? ' | ' + notas : ''}` : notas;

    const con = await pool.getConnection();
    try {
      await con.beginTransaction();
      await con.query(
        `INSERT INTO chatarra_inventario (
          tipo_operacion, cantidad, tipo_caja, precio_unitario, total,
          nombre_cliente_proveedor, notas, usuario_id, fecha
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tipo_operacion === 'venta' ? 'venta' : 'compra',
          Math.max(1, q),
          tipo_caja,
          pu,
          total,
          nombre_cliente_proveedor || '',
          finalNotas || null,
          usuarioId,
          fecha || new Date()
        ]
      );
      await con.commit();
      return { total };
    } catch (err) {
      await con.rollback();
      throw err;
    } finally {
      con.release();
    }
  }

  /** Historial ventas_inventario */
  static async listarVentasInventario({ desde, hasta, usuarioFiltradoId }) {
    const tieneCodigoManual = await OperacionesInventario._tieneCodigoManualDetalleVentas();
    const codigoManualSelect = tieneCodigoManual ? 'dv.codigo_manual' : 'NULL AS codigo_manual';
    const codigoPreferidoSelect = tieneCodigoManual
      ? "COALESCE(NULLIF(TRIM(dv.codigo_manual), ''), p.codigo)"
      : 'p.codigo';

    let sql = `
      SELECT
        dv.id,
        v.id AS venta_id,
        v.creado_en AS fecha,
        COALESCE(
          p.tipo,
          CASE
            WHEN COALESCE(NULLIF(TRIM(p.tipo_caja), ''), '-') <> '-' THEN 'bateria'
            ELSE 'varios'
          END
        ) AS tipo,
        ${codigoPreferidoSelect} AS codigo_item,
        ${codigoManualSelect},
        p.codigo AS codigo_producto,
        p.marca,
        p.tipo_caja,
        p.condicion,
        COALESCE(cat.nombre, '') AS categoria,
        dv.cantidad,
        dv.precio_unitario,
        CASE WHEN COALESCE(dv.iva_porcentaje, v.iva_porcentaje, 0) > 0 THEN 1 ELSE 0 END AS con_iva,
        dv.subtotal,
        ROUND(COALESCE(dv.total, dv.subtotal, 0) - COALESCE(dv.subtotal, 0), 2) AS monto_iva,
        COALESCE(dv.total, dv.subtotal, 0) AS total,
        COALESCE(c.nombre, 'CONSUMIDOR FINAL') AS nombre_cliente,
        v.usuario_id,
        u.nombre AS usuario_nombre,
        COALESCE(p.precio_costo, 0) AS costo_unitario,
        v.notas
      FROM ventas v
      INNER JOIN detalle_ventas dv ON dv.venta_id = v.id
      LEFT JOIN productos p ON p.id = dv.producto_id
      LEFT JOIN categorias cat ON cat.id = p.categoria_id
      LEFT JOIN clientes c ON c.id = v.cliente_id
      LEFT JOIN usuarios u ON u.id = v.usuario_id
      WHERE v.estado <> 'anulada'
    `;
    const p = [];
    if (desde) {
      sql += ' AND v.creado_en >= ?';
      p.push(`${String(desde).split(' ')[0]} 00:00:00`);
    }
    if (hasta) {
      sql += ' AND v.creado_en <= ?';
      p.push(hasta.endsWith?.('23:59:59') ? hasta : `${String(hasta).split(' ')[0]} 23:59:59`);
    }
    if (usuarioFiltradoId) {
      sql += ' AND v.usuario_id = ?';
      p.push(usuarioFiltradoId);
    }
    sql += ' ORDER BY v.creado_en DESC, dv.id DESC';
    const [filas] = await pool.query(sql, p);
    return filas;
  }

  static async listarComprasInv({ desde, hasta }) {
    let sql = `
      SELECT
        dc.id,
        c.id AS compra_id,
        c.creado_en AS fecha,
        COALESCE(
          p.tipo,
          CASE
            WHEN COALESCE(NULLIF(TRIM(p.tipo_caja), ''), '-') <> '-' THEN 'bateria'
            ELSE 'varios'
          END
        ) AS tipo,
        p.codigo AS codigo_item,
        p.marca,
        p.tipo_caja,
        COALESCE(dc.condicion, p.condicion) AS condicion,
        COALESCE(cat.nombre, '') AS categoria,
        dc.cantidad,
        COALESCE(dc.precio_unitario, dc.costo_unitario, 0) AS precio_unitario,
        COALESCE(dc.subtotal, dc.total, 0) AS subtotal,
        COALESCE(dc.total, dc.subtotal, 0) AS total,
        c.numero_factura AS proveedor,
        c.usuario_id,
        u.nombre AS usuario_nombre,
        c.notas
      FROM compras c
      INNER JOIN detalle_compras dc ON dc.compra_id = c.id
      LEFT JOIN productos p ON p.id = dc.producto_id
      LEFT JOIN categorias cat ON cat.id = p.categoria_id
      LEFT JOIN usuarios u ON u.id = c.usuario_id
      WHERE c.estado <> 'anulada'
    `;
    const p = [];
    if (desde) {
      sql += ' AND c.creado_en >= ?';
      p.push(`${String(desde).split(' ')[0]} 00:00:00`);
    }
    if (hasta) {
      sql += ' AND c.creado_en <= ?';
      p.push(hasta.endsWith?.('23:59:59') ? hasta : `${String(hasta).split(' ')[0]} 23:59:59`);
    }
    sql += ' ORDER BY c.creado_en DESC, dc.id DESC';
    const [filas] = await pool.query(sql, p);
    return filas;
  }

  static async listarChatarraInv({ desde, hasta }) {
    let sql = `
      SELECT
        cd.id,
        c.id AS chatarra_id,
        c.creado_en AS fecha,
        c.tipo_operacion,
        'chatarra' AS tipo,
        p.codigo AS codigo_item,
        p.marca,
        p.tipo_caja,
        COALESCE(p.condicion, 'Chatarra') AS condicion,
        'Chatarra' AS categoria,
        cd.cantidad,
        cd.precio_unitario,
        cd.subtotal,
        cd.subtotal AS total,
        COALESCE(c.notas, cd.notas, '') AS notas,
        '-' AS nombre_cliente_proveedor,
        c.usuario_id,
        u.nombre AS usuario_nombre
      FROM chatarra_operaciones c
      INNER JOIN chatarra_detalles cd ON cd.chatarra_id = c.id
      LEFT JOIN productos p ON p.id = cd.producto_id
      LEFT JOIN usuarios u ON u.id = c.usuario_id
      WHERE c.estado <> 'anulada'
    `;
    const p = [];
    if (desde) {
      sql += ' AND c.creado_en >= ?';
      p.push(`${String(desde).split(' ')[0]} 00:00:00`);
    }
    if (hasta) {
      sql += ' AND c.creado_en <= ?';
      p.push(hasta.endsWith?.('23:59:59') ? hasta : `${String(hasta).split(' ')[0]} 23:59:59`);
    }
    sql += ' ORDER BY c.creado_en DESC, cd.id DESC';
    const [filas] = await pool.query(sql, p);
    return filas;
  }

  static async snapshotInventario() {
    const [bat] = await pool.query(`SELECT 'bateria' AS clase, codigo AS ref, marca, tipo_caja, condicion,
      cantidad, precio, estado_stock, fecha_actualizacion AS fecha_ref FROM inventario_baterias`);
    const [varios] = await pool.query(`SELECT 'varios' AS clase, codigo AS ref, nombre AS marca,
      '' AS tipo_caja, '-' AS condicion, cantidad, precio, estado_stock, fecha_actualizacion AS fecha_ref FROM inventario_varios`);
    return [...bat, ...varios];
  }
}

export default OperacionesInventario;
