const normalizar = (valor) => String(valor || '').trim().toLowerCase();

const TIENE_BATERIA = /bater|bosch|dacar|ecuador/i;

export function esProductoBateria(producto) {
  if (!producto || typeof producto !== 'object') return false;

  if (producto.es_bateria === true) return true;

  const tipo = normalizar(producto.tipo || producto.clase || producto.tipo_producto || producto.nombre_categoria || producto.categoria);
  if (tipo.includes('bater')) return true;

  const marca = normalizar(producto.marca || producto.producto_marca || producto.brand);
  const tipoCaja = normalizar(producto.tipo_caja || producto.producto_tipo_caja || producto.caja);
  const nombre = normalizar(producto.nombre);
  const codigo = normalizar(producto.codigo || producto.producto_codigo);

  if (TIENE_BATERIA.test(marca) || TIENE_BATERIA.test(nombre) || TIENE_BATERIA.test(codigo)) return true;

  // Heurística segura para POS: las baterías llegan con marca + tipo_caja.
  if (marca && tipoCaja) return true;
  if (tipoCaja && tipoCaja !== 'n/a' && tipoCaja !== '-') return true;

  return false;
}

export default esProductoBateria;
