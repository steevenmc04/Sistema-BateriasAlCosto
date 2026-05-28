import Logger from './utilidades/logger.js';
import { config } from './configuracion/index.js';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import rutasUsuarios from './rutas/rutasUsuarios.js';
import rutasInventario from './rutas/rutasInventario.js';
import rutasCaja from './rutas/rutasCaja.js';
import rutasVentas from './rutas/rutasVentas.js';
import rutasCompras from './rutas/rutasCompras.js';
import rutasFacturas from './rutas/rutasFacturas.js';
import rutasDashboard from './rutas/rutasDashboard.js';
import rutasReportes from './rutas/rutasReportes.js';
import rutasInformes from './rutas/rutasInformes.js';
import rutasChatarra from './rutas/rutasChatarra.js';
import rutasRoles from './rutas/rutasRoles.js';
import rutasInventarioLegacy from './rutas/rutasInventarioLegacy.js';
import rutasOperacionesInventario from './rutas/rutasOperacionesInventario.js';
import rutasClientes from './rutas/rutasClientes.js';
import { verificarToken } from './middleware/autenticacion.js';
import { exigirPermiso } from './middleware/permisos.js';
import ControladorUsuarios from './controladores/ControladorUsuarios.js';
import ControladorInventario from './controladores/ControladorInventario.js';

const app = express();

app.use(cors(config.cors));
app.options('*', cors(config.cors));
app.use(express.json());
app.use(cookieParser());
app.set('trust proxy', 1);
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { ok: false, error: 'Demasiados intentos de inicio de sesión. Intente nuevamente en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.get('/', (req, res) => {
  const sistema = 'SISTEMA BATERIAS AL COSTO';
  const version = '3.0.0';
  const descripcion = 'Backend Corporativo Normalizado y Modular en Patron MVC.';
  const arquitectura = 'MVC';
  const autor = 'Senior Software Architect';

  return res.status(200).json({
    ok: true,
    sistema,
    version,
    descripcion,
    arquitectura,
    autor,
  });
});

app.post('/api/login', loginLimiter, ControladorUsuarios.login);
app.get('/api/auth/sesion', verificarToken, ControladorUsuarios.obtenerPerfil);

app.use('/api/usuarios', rutasUsuarios);
app.use('/api/roles', verificarToken, exigirPermiso('roles_admin'), rutasRoles);
app.use('/api/inventario', rutasInventario);
app.use('/api/inventario', rutasInventarioLegacy);
app.get('/api/productos', verificarToken, exigirPermiso('inventario.ver'), ControladorInventario.listar);
app.get('/api/productos/:id', verificarToken, exigirPermiso('inventario.ver'), ControladorInventario.obtener);
app.use('/api/operaciones', rutasOperacionesInventario);
app.use('/api/caja', rutasCaja);
app.use('/api/ventas', rutasVentas);
app.use('/api/compras', rutasCompras);
app.use('/api/facturas', rutasFacturas);
app.use('/api/reportes', verificarToken, exigirPermiso('reportes.ver'), rutasReportes);
app.use('/api/informes', verificarToken, exigirPermiso('reportes.ver'), rutasInformes);
app.use('/api/chatarra', verificarToken, exigirPermiso('inventario.ver'), rutasChatarra);
app.use('/api/dashboard', verificarToken, exigirPermiso('reportes.ver'), rutasDashboard);
app.use('/api/clientes', verificarToken, rutasClientes);

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      ok: false,
      error: 'Endpoint no encontrado',
    });
  }
  return next();
});

app.use((err, req, res, next) => {
  Logger.error('App', 'Error no controlado en la aplicación', err);
  const error = config.server.nodeEnv === 'development'
    ? err.message
    : 'Ha ocurrido un error no controlado en el servidor.';

  return res.status(500).json({
    ok: false,
    error,
  });
});

export default app;
