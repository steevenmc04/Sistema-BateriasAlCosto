import express from 'express';
import { verificarToken } from '../middleware/autenticacion.js';
import { exigirPermiso } from '../middleware/permisos.js';
import ControladorInformes from '../controladores/ControladorInformes.js';

/** Consultas consolidadas para tablero/reportes PDF (filtros fecha + tipo ). */
const router = express.Router();
router.use(verificarToken);

router.get('/:tipo', exigirPermiso('reportes_ver'), ControladorInformes.obtener);

export default router;
