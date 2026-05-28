const normalizar = (valor) => String(valor || '').trim().toLowerCase();

export function esBateria(producto) {
  if (!producto || typeof producto !== 'object') return false;

  if (producto.es_bateria === true || Number(producto.es_bateria) === 1) return true;
  if (producto.es_bateria === false || Number(producto.es_bateria) === 0) return false;

  const texto = [
    producto.categoria,
    producto.tipo_producto,
    producto.tipo,
    producto.nombre_categoria,
    producto.clase_producto,
    producto.descripcion,
  ]
    .filter(Boolean)
    .map(normalizar)
    .join(' ');

  if (texto.includes('bateria') || texto.includes('batería')) return true;

  const codigo = normalizar(producto.codigo || producto.producto_codigo);
  if (codigo.startsWith('bat-')) return true;

  const tipoCaja = normalizar(producto.tipo_caja || producto.producto_tipo_caja);
  const marca = normalizar(producto.marca || producto.producto_marca || producto.brand);
  const marcasBateria = ['bosch', 'ecuador', 'dacar'];
  if (marcasBateria.includes(marca) && tipoCaja.includes('caja')) return true;

  return false;
}

export const esProductoBateria = esBateria;
export default esBateria;
