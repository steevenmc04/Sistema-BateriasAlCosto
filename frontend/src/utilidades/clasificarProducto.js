export const normalizarTexto = (valor) => String(valor ?? '').trim().toLowerCase();

const contieneAlguno = (texto, palabras = []) =>
  palabras.some((palabra) => texto.includes(normalizarTexto(palabra)));

const textoClasificacion = (producto = {}) =>
  [
    producto.tipo_inventario,
    producto.categoria,
    producto.tipo_producto,
    producto.tipo,
    producto.nombre_categoria,
    producto.condicion,
    producto.estado,
    producto.nombre,
    producto.descripcion,
  ]
    .filter(Boolean)
    .map((v) => normalizarTexto(v))
    .join(' ');

export const esChatarra = (producto = {}) => {
  const tipoInventario = normalizarTexto(producto.tipo_inventario);
  if (tipoInventario === 'chatarra') return true;

  const texto = textoClasificacion(producto);
  return contieneAlguno(texto, ['chatarra', 'scrap', 'chat-']);
};

export const esBateria = (producto = {}) => {
  if (!producto || typeof producto !== 'object') return false;
  if (esChatarra(producto)) return false;

  const tipoInventario = normalizarTexto(producto.tipo_inventario);
  if (tipoInventario === 'bateria') return true;
  if (tipoInventario === 'varios') return false;

  if (producto.es_bateria === true || Number(producto.es_bateria) === 1) return true;
  if (producto.es_bateria === false || Number(producto.es_bateria) === 0) return false;

  const categoria = normalizarTexto(producto.categoria);
  const tipoProducto = normalizarTexto(producto.tipo_producto);
  const nombreCategoria = normalizarTexto(producto.nombre_categoria);
  const tipo = normalizarTexto(producto.tipo);
  const textoCategoria = [tipoInventario, categoria, tipoProducto, nombreCategoria, tipo].join(' ');

  if (contieneAlguno(textoCategoria, ['bateria', 'batería'])) return true;

  const marca = normalizarTexto(producto.marca);
  const tipoCaja = normalizarTexto(producto.tipo_caja);
  const codigo = normalizarTexto(producto.codigo || producto.producto_codigo);
  const nombre = normalizarTexto(producto.nombre);
  const descripcion = normalizarTexto(producto.descripcion);
  const textoLibre = [nombre, descripcion].join(' ');

  // Evita marcar como batería productos claramente varios.
  if (contieneAlguno(textoLibre, ['agua', 'ácido', 'acido', 'destilada', 'accesorio', 'vario'])) {
    return false;
  }

  if (codigo.startsWith('bat-') || codigo.startsWith('ecu-') || codigo.startsWith('bsh-')) {
    return true;
  }

  // Regla secundaria: marcas conocidas + tipo de caja con rasgos de batería.
  const marcasBateria = ['bosch', 'dacar', 'ecuador'];
  if (marcasBateria.includes(marca) && tipoCaja) {
    if (
      contieneAlguno(tipoCaja, ['caja', 'amp', 'ah', 'fe', 'hp']) ||
      /\d/.test(tipoCaja)
    ) {
      return true;
    }
  }

  return false;
};

export const esVario = (producto = {}) => !esBateria(producto) && !esChatarra(producto);

export const obtenerCategoriaInventario = (producto = {}) => {
  if (esChatarra(producto)) return 'chatarra';
  if (esBateria(producto)) return 'bateria';
  return 'varios';
};

