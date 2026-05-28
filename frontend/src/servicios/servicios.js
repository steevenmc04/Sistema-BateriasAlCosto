import axios from 'axios';

export const API = (
  import.meta.env.VITE_API_URL ||
  'https://sistema-bateriasalcosto.onrender.com'
).replace(/\/+$/, '');

export const apiUrl = (ruta) => {
  const path = ruta.startsWith('/') ? ruta : `/${ruta}`;
  return `${API}${path}`;
};

const apiCliente = axios.create();

function mensajeErrorHTTP(status) {
  if (status >= 500) return 'Error interno del servidor.';
  if (status === 404) return 'Recurso no encontrado.';
  if (status === 403) return 'No tienes permisos para esta acción.';
  if (status === 401) return 'Tu sesión expiró. Inicia sesión nuevamente.';
  if (status === 400) return 'Datos inválidos. Verifica la información ingresada.';
  return 'Error inesperado. Intenta nuevamente.';
}

export function extraerMensajeError(err) {
  if (err?.response?.data?.error) return err.response.data.error;
  if (err?.response?.data?.mensaje) return err.response.data.mensaje;
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.response) return mensajeErrorHTTP(err.response.status);
  if (err?.request) return 'No se pudo conectar con el servidor. Verifica tu conexión.';
  return 'Error inesperado. Intenta nuevamente.';
}

apiCliente.interceptors.request.use((config) => {
  const token = localStorage.getItem('token_baterias');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiCliente.interceptors.response.use(
  (res) => res,
  (err) => {
    const mensaje = extraerMensajeError(err);
    err.mensajeUsuario = mensaje;
    return Promise.reject(err);
  }
);

export const authAPI = {
  login: (payload) => apiCliente.post(`${API}/api/login`, payload),
  sesion: () => apiCliente.get(`${API}/api/auth/sesion`),
};

export const inventarioAPI = {
  listarProductos: (params) => apiCliente.get(`${API}/api/inventario/productos`, { params }),
  listarProductosPOS: (params) => apiCliente.get(`${API}/api/inventario/productos-pos`, { params }),
  listarBaterias: () => apiCliente.get(`${API}/api/inventario/baterias`),
  buscarBaterias: (q) => apiCliente.get(`${API}/api/inventario/baterias/buscar`, { params: { q } }),
  obtenerCatalogos: () => apiCliente.get(`${API}/api/inventario/baterias/catalogos`),
  crearBateria: (payload) => apiCliente.post(`${API}/api/inventario/baterias`, payload),
  actualizarBateria: (id, payload) => apiCliente.put(`${API}/api/inventario/baterias/${id}`, payload),
  eliminarBateria: (id) => apiCliente.delete(`${API}/api/inventario/baterias/${id}`),
  listarVarios: () => apiCliente.get(`${API}/api/inventario/varios`),
  buscarVarios: (q) => apiCliente.get(`${API}/api/inventario/varios/buscar`, { params: { q } }),
  previewCodigoVario: () => apiCliente.get(`${API}/api/inventario/varios/siguiente-codigo`),
  crearVario: (payload) => apiCliente.post(`${API}/api/inventario/varios`, payload),
  actualizarVario: (id, payload) => apiCliente.put(`${API}/api/inventario/varios/${id}`, payload),
  eliminarVario: (id) => apiCliente.delete(`${API}/api/inventario/varios/${id}`),
};

export const facturasAPI = {
  listar: (params) => apiCliente.get(`${API}/api/facturas`, { params }),
  obtener: (id) => apiCliente.get(`${API}/api/facturas/${id}`),
  crear: (payload) => apiCliente.post(`${API}/api/facturas`, payload),
  anular: (id) => apiCliente.patch(`${API}/api/facturas/${id}/anular`),
  descargarPDF: (id) => apiCliente.get(`${API}/api/facturas/${id}/pdf`, { responseType: 'blob' }),
  verificarPorVenta: (ventaId) => apiCliente.get(`${API}/api/facturas/venta/${ventaId}`),
  crearDesdeVenta: (ventaId) => apiCliente.post(`${API}/api/facturas/desde-venta/${ventaId}`),
  obtenerConfig: () => apiCliente.get(`${API}/api/facturas/config`),
  guardarConfig: (payload) => apiCliente.put(`${API}/api/facturas/config`, payload),
};

export const informesAPI = {
  obtener: (tipo, params) => apiCliente.get(`${API}/api/informes/${tipo}`, { params }),
};

export const ventasAPI = {
  listar: (params) => apiCliente.get(`${API}/api/ventas`, { params }),
  crear: (payload) => apiCliente.post(`${API}/api/ventas`, payload),
  obtener: (id) => apiCliente.get(`${API}/api/ventas/${id}`),
  anular: (id) => apiCliente.delete(`${API}/api/ventas/${id}`),
};

export const comprasAPI = {
  listar: (params) => apiCliente.get(`${API}/api/compras`, { params }),
  crear: (payload) => apiCliente.post(`${API}/api/compras`, payload),
  obtener: (id) => apiCliente.get(`${API}/api/compras/${id}`),
  anular: (id) => apiCliente.delete(`${API}/api/compras/${id}`),
};

export const chatarraAPI = {
  listar: (params) => apiCliente.get(`${API}/api/chatarra`, { params }),
  crear: (payload) => apiCliente.post(`${API}/api/chatarra`, payload),
  obtener: (id) => apiCliente.get(`${API}/api/chatarra/${id}`),
  anular: (id) => apiCliente.delete(`${API}/api/chatarra/${id}`),
};

export const usuariosAPI = {
  listar: () => apiCliente.get(`${API}/api/usuarios`),
  crear: (payload) => apiCliente.post(`${API}/api/usuarios`, payload),
  asignarRol: (id, rol_id) => apiCliente.patch(`${API}/api/usuarios/${id}/rol`, { rol_id }),
  listarRoles: () => apiCliente.get(`${API}/api/roles`),
  crearRol: (payload) => apiCliente.post(`${API}/api/roles`, payload),
  actualizarRol: (id, payload) => apiCliente.put(`${API}/api/roles/${id}`, payload),
  eliminarRol: (id) => apiCliente.delete(`${API}/api/roles/${id}`),
};

export default apiCliente;
