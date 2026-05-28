import pool from '../configuracion/baseDeDatos.js';

export async function resolverProducto(art, conexion) {
  if (art.producto_id && Number.isInteger(parseInt(art.producto_id))) {
    return parseInt(art.producto_id);
  }

  if (!art.marca_custom && !art.tipo_caja_custom) {
    return null;
  }

  const marca = (art.marca_custom || '').trim();
  const tipoCaja = (art.tipo_caja_custom || '').trim();
  if (!marca && !tipoCaja) return null;

  const codigo = (marca + '-' + tipoCaja).replace(/\s+/g, '-').toUpperCase();
  const usarPool = conexion || pool;

  const [existentes] = await usarPool.query(
    `SELECT id FROM productos WHERE marca = ? AND tipo_caja = ? AND tipo = 'bateria' LIMIT 1`,
    [marca, tipoCaja]
  );
  if (existentes.length > 0) {
    return existentes[0].id;
  }

  const nombre = `${marca} ${tipoCaja}`.trim();
  const [insP] = await usarPool.query(
    `INSERT INTO productos (codigo, nombre, marca, tipo_caja, categoria_id, tipo, precio_costo, precio_venta, activo)
     VALUES (?, ?, ?, ?, 1, 'bateria', 0, 0, 1)`,
    [codigo, nombre, marca, tipoCaja]
  );

  await usarPool.query(
    'INSERT INTO inventario_stock (producto_id, cantidad) VALUES (?, 0)',
    [insP.insertId]
  );

  return insP.insertId;
}
