import express from 'express';
import ControladorReportes from '../controladores/ControladorReportes.js';

const router = express.Router();

// Métricas operativas por rango de tiempo.
router.get('/metricas/:periodo', ControladorReportes.obtenerMetricas);

export default router;
