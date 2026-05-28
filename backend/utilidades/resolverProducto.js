import pool from '../configuracion/baseDeDatos.js';

const TIPOS_VALIDOS = new Set(['bateria', 'varios', 'chatarra']);

const normalizar = (valor) => String(valor || '').trim().toLowerCase();
const aSlug = (valor) =>
  String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toUpperCase();

async function obtenerCategoriaId(usarPool, tipoInventario) {
  const patrones = tipoInventario === 'chatarra'
    ? ['%chatarra%']
    : tipoInventario === 'varios'
      ? ['%vario%', '%accesorio%', '%producto%']
      : ['%bateria%', '%batería%'];

  for (const patron of patrones) {
    const [rows] = await usarPool.query(
      'SELECT id FROM categorias WHERE LOWER(nombre) LIKE ? ORDER BY id ASC LIMIT 1',
      [patron]
    );
    if (rows.length > 0) return rows[0].id;
  }

  const [fallback] = await usarPool.query('SELECT id FROM categorias ORDER BY id ASC LIMIT 1');
  return fallback.length > 0 ? fallback[0].id : 1;
}

async function generarCodigoUnico(usarPool, baseCodigo) {
  let intento = 0;
  let codigo = baseCodigo || `PRD-${Date.now()}`;

  while (intento < 100) {
    intento += 1;
    const [rows] = await usarPool.query('SELECT id FROM productos WHERE codigo = ? LIMIT 1', [codigo]);
    if (rows.length === 0) return codigo;
    codigo = `${baseCodigo}-${intento + 1}`;
  }

  return `PRD-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
}

async function crearProductoSiNoExiste(usarPool, datos) {
  const {
    tipoInventario,
    marca = '',
    tipoCaja = '',
    nombreBase = '',
    codigoBase = '',
    condicion = 'Nueva'
  } = datos;

  const tipo = TIPOS_VALIDOS.has(tipoInventario) ? tipoInventario : 'bateria';
  const marcaLimpia = String(marca || '').trim();
  const tipoCajaLimpio = String(tipoCaja || '').trim();
  const nombre = String(nombreBase || `${marcaLimpia} ${tipoCajaLimpio}`.trim() || 'Producto').trim();
  const categoriaId = await obtenerCategoriaId(usarPool, tipo);

  if (tipo === 'varios') {
    const [existenteVario] = await usarPool.query(
      `SELECT id
       FROM productos
       WHERE tipo = 'varios' AND LOWER(nombre) = ?
       LIMIT 1`,
      [normalizar(nombre)]
    );
    if (existenteVario.length > 0) return existenteVario[0].id;
  } else {
    const [existente] = await usarPool.query(
      `SELECT id
       FROM productos
       WHERE tipo = ? AND LOWER(marca) = ? AND LOWER(COALESCE(tipo_caja, '')) = ?
       LIMIT 1`,
      [tipo, normalizar(marcaLimpia), normalizar(tipoCajaLimpio)]
    );
    if (existente.length > 0) return existente[0].id;
  }

  const prefijo = tipo === 'chatarra' ? 'CHAT' : tipo === 'varios' ? 'VAR' : 'BAT';
  const baseCodigo = aSlug(codigoBase) || aSlug(`${prefijo}-${marcaLimpia}-${tipoCajaLimpio}`) || `${prefijo}-${Date.now()}`;
  const codigo = await generarCodigoUnico(usarPool, tipo === 'chatarra' && !baseCodigo.startsWith('CHAT-') ? `CHAT-${baseCodigo}` : baseCodigo);

  const [ins] = await usarPool.query(
    `INSERT INTO productos (
      codigo, nombre, marca, tipo_caja, condicion,
      categoria_id, tipo, precio_costo, precio_venta, activo
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 1)`,
    [codigo, nombre, marcaLimpia || nombre, tipoCajaLimpio || '-', condicion || 'Nueva', categoriaId, tipo]
  );

  await usarPool.query(
    'INSERT INTO inventario_stock (producto_id, cantidad) VALUES (?, 0)',
    [ins.insertId]
  );

  return ins.insertId;
}

async function obtenerProductoPorId(usarPool, productoId) {
  const [rows] = await usarPool.query(
    `SELECT id, codigo, nombre, marca, tipo_caja, condicion, tipo
     FROM productos
     WHERE id = ?
     LIMIT 1`,
    [productoId]
  );
  return rows.length > 0 ? rows[0] : null;
}

export async function resolverProducto(art = {}, conexion, opciones = {}) {
  const usarPool = conexion || pool;
  const tipoInventario = TIPOS_VALIDOS.has(opciones.tipoInventario)
    ? opciones.tipoInventario
    : TIPOS_VALIDOS.has(art.tipo_inventario)
      ? art.tipo_inventario
      : TIPOS_VALIDOS.has(art.tipo)
        ? art.tipo
        : 'bateria';

  const productoId = Number.parseInt(art.producto_id, 10);
  if (Number.isInteger(productoId) && productoId > 0) {
    if (tipoInventario !== 'chatarra') {
      return productoId;
    }

    const productoBase = await obtenerProductoPorId(usarPool, productoId);
    if (!productoBase) return productoId;
    if (productoBase.tipo === 'chatarra') return productoBase.id;

    const marca = (art.marca_custom || art.marca || productoBase.marca || '').trim();
    const tipoCaja = (art.tipo_caja_custom || art.tipo_caja || productoBase.tipo_caja || '').trim();
    const nombreBase = (art.nombre || productoBase.nombre || `${marca} ${tipoCaja}`).trim();

    return crearProductoSiNoExiste(usarPool, {
      tipoInventario: 'chatarra',
      marca,
      tipoCaja,
      nombreBase,
      codigoBase: productoBase.codigo || `${marca}-${tipoCaja}`,
      condicion: 'Chatarra'
    });
  }

  const marca = (art.marca_custom || art.marca || '').trim();
  const tipoCaja = (art.tipo_caja_custom || art.tipo_caja || '').trim();
  const nombre = (art.nombre_custom || art.nombre || art.descripcion || '').trim();

  if (!marca && !tipoCaja && !nombre) {
    return null;
  }

  if (tipoInventario === 'varios') {
    return crearProductoSiNoExiste(usarPool, {
      tipoInventario: 'varios',
      marca: marca || nombre || 'Varios',
      tipoCaja: '-',
      nombreBase: nombre || marca || 'Producto varios',
      codigoBase: art.codigo || art.referencia || nombre || 'VARIOS',
      condicion: 'Nueva'
    });
  }

  return crearProductoSiNoExiste(usarPool, {
    tipoInventario,
    marca: marca || nombre,
    tipoCaja,
    nombreBase: nombre || `${marca} ${tipoCaja}`,
    codigoBase: art.codigo || `${marca}-${tipoCaja}`,
    condicion: tipoInventario === 'chatarra' ? 'Chatarra' : (art.condicion || 'Nueva')
  });
}
