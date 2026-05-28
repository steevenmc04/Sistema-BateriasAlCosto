import express from 'express';
import { 
  listar, obtener, crear, anular, 
  getConfig, updateConfig, generarPDF, verificarPorVenta 
} from '../controladores/ControladorFacturaLegacy.js';
import ControladorFacturaSRI from '../controladores/ControladorFacturaSRI.js';
import { verificarToken } from '../middleware/autenticacion.js';
import { exigirPermiso } from '../middleware/permisos.js';

/**
 * @rutas Facturación Consolidada
 * @base /api/facturas
 *
 * GET    /api/facturas                  → Listar todas las facturas locales
 * GET    /api/facturas/config           → Obtener configuración de empresa
 * GET    /api/facturas/:id              → Obtener factura local por ID
 * GET    /api/facturas/:id/pdf          → Descargar PDF de factura
 * POST   /api/facturas                  → Crear nueva factura local
 * PATCH  /api/facturas/:id/anular       → Anular factura local
 * PUT    /api/facturas/config           → Actualizar configuración de empresa
 * POST   /api/facturas/:id/enviar-sri   → Enviar factura electrónica al SRI
 * GET    /api/facturas/venta/:venta_id  → Verificar si existe factura por venta
 *
 * @middleware verificarToken  - Todas las rutas
 * @middleware exigirPermiso   - Según la acción solicitada
 */
const enrutador = express.Router();

// Middleware de autenticación global para todas las rutas de facturas
enrutador.use(verificarToken);

// --- Rutas de Configuración ---
enrutador.get('/config', exigirPermiso('facturacion_ver'), getConfig);
enrutador.put('/config', exigirPermiso('roles_admin'), updateConfig);

// --- Rutas Base ---
enrutador.get('/', exigirPermiso('facturacion_ver'), listar);
enrutador.post('/', exigirPermiso('facturacion_emitir'), crear);

// --- Integración con Facturación Electrónica SRI ---
enrutador.post('/:id/enviar-sri', exigirPermiso('facturas.sri'), ControladorFacturaSRI.procesarFacturaSRI);

// --- Consulta por Venta ID ---
enrutador.get('/venta/:venta_id', exigirPermiso('facturacion_ver'), verificarPorVenta);

// --- Rutas por ID de Factura ---
enrutador.get('/:id', exigirPermiso('facturacion_ver'), obtener);
enrutador.patch('/:id/anular', exigirPermiso('facturacion_anular'), anular);
enrutador.get('/:id/pdf', exigirPermiso('facturacion_ver'), generarPDF);

export default enrutador;
