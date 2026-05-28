import express from 'express';
import { verificarToken } from '../middleware/autenticacion.js';
import { exigirPermiso, exigirAlgunPermiso } from '../middleware/permisos.js';
import ControladorOperacionesInventario from '../controladores/ControladorOperacionesInventario.js';

const router = express.Router();
router.use(verificarToken);

router.post('/venta-bateria', exigirPermiso('ventas_baterias'), ControladorOperacionesInventario.venderBateria);
router.post('/venta-varios', exigirPermiso('ventas_baterias'), ControladorOperacionesInventario.venderVarios);
router.post('/compra-baterias', exigirPermiso('compras_baterias'), ControladorOperacionesInventario.comprarBaterias);
router.post('/compra-varios', exigirPermiso('compras_baterias'), ControladorOperacionesInventario.comprarVarios);
router.post('/chatarra', exigirPermiso('operaciones_chatarra'), ControladorOperacionesInventario.chatarra);

router.get(
  '/historial/ventas',
  exigirAlgunPermiso('historial_ventas_propias', 'historial_ventas_todos'),
  ControladorOperacionesInventario.historialVentas
);
router.get('/historial/compras', exigirPermiso('compras_baterias'), ControladorOperacionesInventario.historialCompras);
router.get('/historial/chatarra', exigirPermiso('operaciones_chatarra'), ControladorOperacionesInventario.historialChatarra);

export default router;
