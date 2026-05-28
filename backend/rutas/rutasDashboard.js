import express from 'express';
import ControladorDashboard from '../controladores/ControladorDashboard.js';

const router = express.Router();

// Resumen ejecutivo (auth + permiso reportes_ver aplicados en servidor/index.js).
router.get('/resumen', ControladorDashboard.obtenerResumen);
export default router;
