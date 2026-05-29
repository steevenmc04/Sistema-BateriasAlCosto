import pool from '../configuracion/baseDeDatos.js';

/**
 * @modelo FacturaLegacy
 * @descripcion Maneja todas las operaciones de facturas
 *              contra la tabla `facturas` de MySQL.
 *              Incluye generación de número correlativo,
 *              cálculo de totales e IVA, e inserción
 *              de detalles por línea.
 * @tabla facturas, factura_detalles, empresa_config
 */
class FacturaLegacy {
  static _cacheTieneCodigoManualDetalleVentas = null;
  static _cacheTieneColumnaVentaPosIdFacturas = null;
  static _cacheTieneTablaEmpresaConfig = null;
  static _cacheColumnasProductos = new Map();

  static _normalizarTexto(valor) {
    return String(valor ?? '').trim().toLowerCase();
  }

  static _esProductoBateria(producto = {}) {
    const tipoInventario = FacturaLegacy._normalizarTexto(producto.tipo_inventario || producto.tipo);
    if (tipoInventario === 'bateria') return true;
    if (tipoInventario === 'varios' || tipoInventario === 'chatarra') return false;

    if (producto.es_bateria === true || Number(producto.es_bateria) === 1) return true;
    if (producto.es_bateria === false || Number(producto.es_bateria) === 0) return false;

    const categoriaTexto = [
      producto.categoria,
      producto.tipo_producto,
      producto.nombre_categoria
    ]
      .map(FacturaLegacy._normalizarTexto)
      .join(' ');

    if (categoriaTexto.includes('bateria') || categoriaTexto.includes('batería')) {
      return true;
    }

    const tipoCaja = FacturaLegacy._normalizarTexto(producto.tipo_caja);
    return Boolean(tipoCaja);
  }

  static _textoSinGuiones(texto) {
    return String(texto ?? '')
      .replace(/\s*-\s*/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  static _codigoBateriaFactura(item = {}) {
    const codigoManual = FacturaLegacy._normalizarTexto(item.codigo_manual);
    if (codigoManual) return String(item.codigo_manual).trim();
    const codigoProducto = FacturaLegacy._normalizarTexto(item.codigo_producto);
    if (codigoProducto) return String(item.codigo_producto).trim();
    return '-';
  }

  static _descripcionBateriaFactura(item = {}) {
    const codigo = FacturaLegacy._codigoBateriaFactura(item);
    const partes = [
      item.producto_marca || item.producto_nombre || 'Producto',
      item.producto_tipo_caja,
      item.producto_condicion,
      codigo
    ].filter(Boolean);
    return partes.join(' - ');
  }

  static _descripcionVarioFactura(item = {}) {
    const base = item.producto_nombre || item.producto_descripcion || item.codigo_producto || 'Producto varios';
    return FacturaLegacy._textoSinGuiones(base) || 'Producto varios';
  }

  static async _tieneCodigoManualDetalleVentas() {
    if (FacturaLegacy._cacheTieneCodigoManualDetalleVentas !== null) {
      return FacturaLegacy._cacheTieneCodigoManualDetalleVentas;
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
      FacturaLegacy._cacheTieneCodigoManualDetalleVentas = rows.length > 0;
    } catch {
      FacturaLegacy._cacheTieneCodigoManualDetalleVentas = false;
    }
    return FacturaLegacy._cacheTieneCodigoManualDetalleVentas;
  }

  static async _tieneColumnaVentaPosIdFacturas(conexion = pool) {
    if (FacturaLegacy._cacheTieneColumnaVentaPosIdFacturas !== null) {
      return FacturaLegacy._cacheTieneColumnaVentaPosIdFacturas;
    }
    try {
      const [rows] = await conexion.query(
        `SELECT 1
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'facturas'
           AND COLUMN_NAME = 'venta_pos_id'
         LIMIT 1`
      );
      FacturaLegacy._cacheTieneColumnaVentaPosIdFacturas = rows.length > 0;
    } catch {
      FacturaLegacy._cacheTieneColumnaVentaPosIdFacturas = false;
    }
    return FacturaLegacy._cacheTieneColumnaVentaPosIdFacturas;
  }

  static async _tieneTablaEmpresaConfig(conexion = pool) {
    if (FacturaLegacy._cacheTieneTablaEmpresaConfig !== null) {
      return FacturaLegacy._cacheTieneTablaEmpresaConfig;
    }
    try {
      const [rows] = await conexion.query(
        `SELECT 1
         FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'empresa_config'
         LIMIT 1`
      );
      FacturaLegacy._cacheTieneTablaEmpresaConfig = rows.length > 0;
    } catch {
      FacturaLegacy._cacheTieneTablaEmpresaConfig = false;
    }
    return FacturaLegacy._cacheTieneTablaEmpresaConfig;
  }

  static async _tieneColumnaProductos(columna, conexion = pool) {
    if (!columna) return false;
    if (FacturaLegacy._cacheColumnasProductos.has(columna)) {
      return FacturaLegacy._cacheColumnasProductos.get(columna);
    }
    try {
      const [rows] = await conexion.query(
        `SELECT 1
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'productos'
           AND COLUMN_NAME = ?
         LIMIT 1`,
        [columna]
      );
      const existe = rows.length > 0;
      FacturaLegacy._cacheColumnasProductos.set(columna, existe);
      return existe;
    } catch {
      FacturaLegacy._cacheColumnasProductos.set(columna, false);
      return false;
    }
  }


  /**
   * @metodo generarNumero
   * @descripcion Genera el número correlativo de forma atómica
   *              aplicando bloqueo FOR UPDATE en la fila de configuración.
   * @param {object} connection - Conexión de transacción activa
   * @returns {Promise<string>} Número de factura formateado (e.g. FAC-0001)
   * @throws {Error} Si no hay configuración de empresa
   */
  static async generarNumero(connection) {
    const [rows] = await connection.query(
      'SELECT prefijo_factura, secuencial_factura FROM empresa_config LIMIT 1 FOR UPDATE'
    );
    if (rows.length === 0) {
      throw new Error(
        'No hay configuración de empresa. ' +
        'Ve a Facturación → Configurar Empresa y guarda los datos primero.'
      );
    }
    const { prefijo_factura, secuencial_factura } = rows[0];
    const numeroFormateado =
      `${prefijo_factura}-${String(secuencial_factura).padStart(4, '0')}`;
    await connection.query(
      'UPDATE empresa_config SET secuencial_factura = secuencial_factura + 1'
    );
    return numeroFormateado;
  }

  /**
   * @metodo crear
   * @descripcion Crea una factura completa en la BD usando
   *              una transacción. Genera el número correlativo
   *              de forma atómica, calcula subtotal, IVA y
   *              total, e inserta los detalles línea por línea.
   * @param {number}  datos.usuario_id  - ID del usuario que emite
   * @param {object}  datos.cliente     - Datos del cliente
   * @param {string}  datos.cliente.nombre      - Nombre obligatorio
   * @param {string}  [datos.cliente.cedula_ruc] - Cédula o RUC
   * @param {string}  [datos.cliente.email]      - Correo electrónico
   * @param {Array}   datos.items       - Líneas de detalle
   * @param {boolean} datos.con_iva     - Si aplica IVA 15%
   * @param {number}  [datos.descuento] - Descuento global en USD
   * @param {string}  [datos.notas]     - Observaciones
   * @param {number}  [datos.venta_id]  - ID de venta relacionada
   * @returns {Promise<object>} Factura completa con detalles
   * @throws {Error} Si no hay config de empresa
   */
  static async crear(datos) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 1. Obtener config de empresa (si existe) con bloqueo FOR UPDATE para concurrencia
      const tieneEmpresaConfig = await FacturaLegacy._tieneTablaEmpresaConfig(conn);
      let config = null;
      if (tieneEmpresaConfig) {
        const [cfg] = await conn.query(
          'SELECT * FROM empresa_config LIMIT 1 FOR UPDATE'
        );
        config = cfg[0] || null;
      }

      // 2. Generar número de factura (fallback si no existe empresa_config)
      const prefijoFactura = config?.prefijo_factura || 'FAC';
      const secuencialFactura = Number(config?.secuencial_factura || (Date.now() % 100000));
      const numero_factura = `${prefijoFactura}-${String(secuencialFactura).padStart(4, '0')}`;

      // 3. Calcular totales
      const cliente   = datos.cliente || {};
      const items     = datos.items   || [];
      const con_iva   = Boolean(datos.con_iva);
      const ivaPct    = Number(config?.iva_porcentaje || 15);
      const descGlobal = Number(datos.descuento || 0);

      let subtotal = 0;
      items.forEach(item => {
        subtotal += Number(item.cantidad || 1) *
                    Number(item.precio_unitario || 0) -
                    Number(item.descuento || 0);
      });

      const baseImponible = subtotal - descGlobal;
      const montoIva      = con_iva
        ? (baseImponible * ivaPct) / 100
        : 0;
      const total = baseImponible + montoIva;

      // 4. INSERT en facturas (compatibilidad con esquemas con/sin venta_pos_id)
      const tieneVentaPosId = await FacturaLegacy._tieneColumnaVentaPosIdFacturas(conn);
      const ventaRelacionada = datos.venta_pos_id || datos.venta_id || null;
      const [result] = tieneVentaPosId
        ? await conn.query(
            `INSERT INTO facturas (
              numero_factura, venta_id, venta_pos_id, usuario_id,
              cliente_nombre, cliente_documento,
              cliente_email, cliente_telefono, cliente_direccion,
              subtotal, descuento, base_imponible,
              monto_iva, total, iva_porcentaje,
              estado, notas
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'emitida', ?)`,
            [
              numero_factura,
              ventaRelacionada,
              ventaRelacionada,
              datos.usuario_id,
              cliente.nombre      || 'CONSUMIDOR FINAL',
              cliente.cedula_ruc  || '9999999999999',
              cliente.email       || null,
              cliente.telefono    || null,
              cliente.direccion   || null,
              subtotal,
              descGlobal,
              baseImponible,
              montoIva,
              total,
              ivaPct,
              datos.notas || null
            ]
          )
        : await conn.query(
            `INSERT INTO facturas (
              numero_factura, venta_id, usuario_id,
              cliente_nombre, cliente_documento,
              cliente_email, cliente_telefono, cliente_direccion,
              subtotal, descuento, base_imponible,
              monto_iva, total, iva_porcentaje,
              estado, notas
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'emitida', ?)`,
            [
              numero_factura,
              ventaRelacionada,
              datos.usuario_id,
              cliente.nombre      || 'CONSUMIDOR FINAL',
              cliente.cedula_ruc  || '9999999999999',
              cliente.email       || null,
              cliente.telefono    || null,
              cliente.direccion   || null,
              subtotal,
              descGlobal,
              baseImponible,
              montoIva,
              total,
              ivaPct,
              datos.notas || null
            ]
          );

      const facturaId = result.insertId;

      // 5. INSERT detalles
      for (const item of items) {
        const itemSubtotal = Number(item.cantidad || 1) *
          Number(item.precio_unitario || 0) -
          Number(item.descuento || 0);

        await conn.query(
          `INSERT INTO factura_detalles
            (factura_id, descripcion, cantidad,
             precio_unitario, descuento, subtotal)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            facturaId,
            item.descripcion    || 'Producto',
            Number(item.cantidad || 1),
            Number(item.precio_unitario || 0),
            Number(item.descuento || 0),
            itemSubtotal
          ]
        );
      }

      // 6. Incrementar correlativo de factura (solo si existe empresa_config)
      if (tieneEmpresaConfig) {
        await conn.query(
          `UPDATE empresa_config 
           SET secuencial_factura = secuencial_factura + 1`
        );
      }

      await conn.commit();

      // 7. Retornar factura completa
      const factura = await FacturaLegacy.obtenerPorId(facturaId);
      return factura;

    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }

  // ── LEFT JOIN para que facturas sin usuario aún sean visibles ──
  static async listarTodas({ desde, hasta, estado } = {}) {
    let query = `
      SELECT f.*, 
             COALESCE(u.nombre, 'Usuario eliminado') AS usuario_nombre
      FROM facturas f
      LEFT JOIN usuarios u ON f.usuario_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (desde && hasta) {
      query += ' AND DATE(f.fecha_emision) BETWEEN ? AND ?';
      params.push(desde, hasta);
    } else if (desde) {
      query += ' AND DATE(f.fecha_emision) >= ?';
      params.push(desde);
    } else if (hasta) {
      query += ' AND DATE(f.fecha_emision) <= ?';
      params.push(hasta);
    }

    if (estado) {
      query += ' AND f.estado = ?';
      params.push(estado);
    }

    query += ' ORDER BY f.fecha_emision DESC';

    const [rows] = await pool.query(query, params);
    return rows;
  }

  static async obtenerPorId(id) {
    const [facturas] = await pool.query(
      `SELECT f.*,
              COALESCE(u.nombre, 'Usuario eliminado') AS usuario_nombre
       FROM facturas f
       LEFT JOIN usuarios u ON f.usuario_id = u.id
       WHERE f.id = ?`,
      [id]
    );
    if (facturas.length === 0) return null;

    const factura = facturas[0];
    const [detalles] = await pool.query(
      'SELECT * FROM factura_detalles WHERE factura_id = ? ORDER BY id ASC',
      [id]
    );
    factura.detalles = detalles;
    factura.empresa  = await FacturaLegacy.obtenerConfigEmpresa();
    return factura;
  }

  static async obtenerPorVentaId(venta_id) {
    const tieneVentaPosId = await FacturaLegacy._tieneColumnaVentaPosIdFacturas();
    const [facturas] = tieneVentaPosId
      ? await pool.query(
          `SELECT id, numero_factura 
           FROM facturas 
           WHERE (venta_id = ? OR venta_pos_id = ?) AND estado != 'anulada' 
           LIMIT 1`,
          [venta_id, venta_id]
        )
      : await pool.query(
          `SELECT id, numero_factura 
           FROM facturas 
           WHERE venta_id = ? AND estado != 'anulada' 
           LIMIT 1`,
          [venta_id]
        );
    return facturas.length > 0 ? facturas[0] : null;
  }

  static async obtenerPorNumero(numero_factura) {
    const [facturas] = await pool.query(
      `SELECT f.*,
              COALESCE(u.nombre, 'Usuario eliminado') AS usuario_nombre
       FROM facturas f
       LEFT JOIN usuarios u ON f.usuario_id = u.id
       WHERE f.numero_factura = ?`,
      [numero_factura]
    );
    if (facturas.length === 0) return null;

    const factura = facturas[0];
    const [detalles] = await pool.query(
      'SELECT * FROM factura_detalles WHERE factura_id = ? ORDER BY id ASC',
      [factura.id]
    );
    factura.detalles = detalles;
    factura.empresa  = await FacturaLegacy.obtenerConfigEmpresa();
    return factura;
  }

  static async anular(id, usuario_id) {
    const [result] = await pool.query(
      `UPDATE facturas SET estado = 'anulada' WHERE id = ? AND estado = 'emitida'`,
      [id]
    );
    if (result.affectedRows === 0) {
      throw new Error('Factura no encontrada o ya estaba anulada.');
    }
    return true;
  }

  static async actualizarEstadoSRI(id, datos) {
    const permitidos = [
      'sri_estado', 'sri_numero_autorizacion', 'sri_fecha_autorizacion',
      'sri_clave_acceso', 'sri_ride_url', 'sri_error'
    ];
    const sets = [];
    const params = [];
    for (const key of permitidos) {
      if (datos[key] !== undefined && datos[key] !== null) {
        sets.push(`${key} = ?`);
        params.push(datos[key]);
      }
    }
    if (sets.length === 0) return false;
    params.push(id);
    await pool.query(`UPDATE facturas SET ${sets.join(', ')} WHERE id = ?`, params);
    return true;
  }

  static async registrarComprobanteSRI(factura_id, xml_firmado, respuesta_sri) {
    await pool.query(
      `INSERT INTO comprobantes_sri (factura_id, xml_firmado, respuesta_sri) VALUES (?, ?, ?)`,
      [factura_id, xml_firmado || null, respuesta_sri ? JSON.stringify(respuesta_sri) : null]
    );
  }

  static async listarTodos(filtros = {}) {
    return FacturaLegacy.listarTodas(filtros);
  }

  static async crearDesdeVenta(ventaId, usuarioId) {
    const existente = await FacturaLegacy.obtenerPorVentaId(ventaId);
    if (existente?.id) {
      return await FacturaLegacy.obtenerPorId(existente.id);
    }

    const [ventas] = await pool.query(
      `SELECT v.*, c.nombre AS cliente_nombre, c.documento AS cliente_documento,
              c.email AS cliente_email, c.telefono AS cliente_telefono,
              c.direccion AS cliente_direccion
       FROM ventas v
       LEFT JOIN clientes c ON v.cliente_id = c.id
       WHERE v.id = ?`,
      [ventaId]
    );
    if (ventas.length === 0) throw new Error('Venta no encontrada');
    const venta = ventas[0];
    const tieneCodigoManual = await FacturaLegacy._tieneCodigoManualDetalleVentas();
    const [
      tieneDescripcionProducto,
      tieneTipoProducto,
      tieneTipoInventarioProducto,
      tieneTipoProductoProducto,
      tieneEsBateriaProducto
    ] = await Promise.all([
      FacturaLegacy._tieneColumnaProductos('descripcion'),
      FacturaLegacy._tieneColumnaProductos('tipo'),
      FacturaLegacy._tieneColumnaProductos('tipo_inventario'),
      FacturaLegacy._tieneColumnaProductos('tipo_producto'),
      FacturaLegacy._tieneColumnaProductos('es_bateria')
    ]);
    const codigoResueltoExpr = tieneCodigoManual
      ? "COALESCE(NULLIF(TRIM(dv.codigo_manual), ''), p.codigo)"
      : 'p.codigo';
    const codigoManualExpr = tieneCodigoManual ? 'dv.codigo_manual' : 'NULL AS codigo_manual';
    const descripcionProductoExpr = tieneDescripcionProducto
      ? 'p.descripcion AS producto_descripcion'
      : "'' AS producto_descripcion";
    const tipoExpr = tieneTipoProducto ? 'p.tipo AS tipo' : "'' AS tipo";
    const tipoInventarioExpr = tieneTipoInventarioProducto
      ? 'p.tipo_inventario AS tipo_inventario'
      : "'' AS tipo_inventario";
    const tipoProductoExpr = tieneTipoProductoProducto
      ? 'p.tipo_producto AS tipo_producto'
      : "'' AS tipo_producto";
    const esBateriaExpr = tieneEsBateriaProducto
      ? 'p.es_bateria AS es_bateria'
      : 'NULL AS es_bateria';

    const [items] = await pool.query(
      `SELECT
         dv.id,
         dv.venta_id,
         dv.producto_id,
         ${codigoManualExpr},
         dv.cantidad,
         dv.precio_unitario,
         dv.descuento,
         dv.iva_porcentaje,
         dv.subtotal,
         dv.total,
         p.nombre AS producto_nombre,
         ${descripcionProductoExpr},
         p.marca AS producto_marca,
         p.tipo_caja AS producto_tipo_caja,
         p.condicion AS producto_condicion,
         ${tipoExpr},
         ${tipoInventarioExpr},
         ${tipoProductoExpr},
         ${esBateriaExpr},
         p.codigo AS codigo_producto,
         ${codigoResueltoExpr} AS codigo_resuelto
       FROM detalle_ventas dv
       LEFT JOIN productos p ON dv.producto_id = p.id
       WHERE dv.venta_id = ?`,
      [ventaId]
    );

    const factura = await FacturaLegacy.crear({
      usuario_id: usuarioId,
      venta_id: ventaId,
      con_iva: venta.monto_iva > 0,
      descuento: Number(venta.descuento || 0),
      notas: `Factura generada desde Venta #${ventaId}`,
      cliente: {
        nombre: venta.cliente_nombre || 'CONSUMIDOR FINAL',
        cedula_ruc: venta.cliente_documento || '9999999999999',
        email: venta.cliente_email,
        telefono: venta.cliente_telefono,
        direccion: venta.cliente_direccion
      },
      items: items.map(item => {
        const esBateria = FacturaLegacy._esProductoBateria(item);
        const descripcion = esBateria
          ? FacturaLegacy._descripcionBateriaFactura(item)
          : FacturaLegacy._descripcionVarioFactura(item);

        return {
          descripcion,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          descuento: item.descuento || 0
        };
      })
    });

    if (factura && factura.id) {
      const tieneVentaPosId = await FacturaLegacy._tieneColumnaVentaPosIdFacturas();
      if (tieneVentaPosId) {
        await pool.query('UPDATE facturas SET venta_pos_id = ?, venta_id = ? WHERE id = ?', [ventaId, ventaId, factura.id]);
      } else {
        await pool.query('UPDATE facturas SET venta_id = ? WHERE id = ?', [ventaId, factura.id]);
      }
    }

    return factura || null;
  }

  static async obtenerConfigEmpresa() {
    const tieneEmpresaConfig = await FacturaLegacy._tieneTablaEmpresaConfig();
    if (!tieneEmpresaConfig) {
      return {
        razon_social: 'BATERIAS AL COSTO',
        iva_porcentaje: 15,
        prefijo_factura: 'FAC',
        secuencial_factura: 1
      };
    }
    const [rows] = await pool.query('SELECT * FROM empresa_config LIMIT 1');
    return rows[0] || null;
  }

  // ──── actualizarConfigEmpresa con columnas válidas de empresa_config ────
  static async actualizarConfigEmpresa(datos) {
    const permitidos = [
      'razon_social', 'ruc', 'direccion', 'telefono',
      'email', 'iva_porcentaje', 'prefijo_factura', 'secuencial_factura',
      'firma_certificado', 'firma_clave', 'sri_ambiente', 'sri_modo'
    ];
    const sets   = [];
    const params = [];

    for (const key of permitidos) {
    if (datos[key] !== undefined && datos[key] !== null) {
      sets.push(`${key} = ?`);
      params.push(datos[key]);
    }
  }
  if (sets.length === 0) return false;

  // Verificar si ya existe una fila
  const [rows] = await pool.query(
    'SELECT id FROM empresa_config LIMIT 1'
  );

  if (rows.length === 0) {
    // ✅ No existe → INSERT
    await pool.query(
      `INSERT INTO empresa_config SET secuencial_factura = 1, ${sets.join(', ')}`,
      params
    );
  } else {
    // ✅ Ya existe → UPDATE
    await pool.query(
      `UPDATE empresa_config SET ${sets.join(', ')}`,
      params
    );
  }

  return true;
}
}

export default FacturaLegacy;
