const normalizar = (valor) => String(valor || '').trim().toLowerCase();

export function esBateria(producto) {
  if (!producto || typeof producto !== 'object') return false;

  const texto = [
    producto.tipo,
    producto.tipo_producto,
    producto.categoria,
    producto.nombre_categoria,
    producto.tipo_caja,
    producto.descripcion,
    producto.nombre,
    producto.codigo,
    producto.producto_tipo_caja,
    producto.producto_codigo,
  ]
    .filter(Boolean)
    .map(normalizar)
    .join(' ');

  const marca = normalizar(producto.marca || producto.producto_marca || producto.brand);

  if (producto.es_bateria === true) return true;
  if (texto.includes('bateria') || texto.includes('batería')) return true;
  if (marca === 'bosch' || marca === 'ecuador' || marca === 'dacar') return true;

  return false;
}

export const esProductoBateria = esBateria;
export default esBateria;
