import express from 'express';
import { verificarToken } from '../middleware/autenticacion.js';
import { exigirPermiso } from '../middleware/permisos.js';
import ControladorInventarioLegacy from '../controladores/ControladorInventarioLegacy.js';

const router = express.Router();
router.use(verificarToken);

router.get('/baterias/buscar', exigirPermiso('inventario_ver'), ControladorInventarioLegacy.buscarBaterias);
router.get('/baterias/catalogos', exigirPermiso('inventario_ver'), ControladorInventarioLegacy.catalogos);
router.get('/baterias', exigirPermiso('inventario_ver'), ControladorInventarioLegacy.listarBaterias);
router.post('/baterias', exigirPermiso('inventario_crear'), ControladorInventarioLegacy.crearBateria);
router.put('/baterias/:id', exigirPermiso('inventario_editar'), ControladorInventarioLegacy.actualizarBateria);
router.delete('/baterias/:id', exigirPermiso('inventario_eliminar'), ControladorInventarioLegacy.eliminarBateria);

router.get('/varios/buscar', exigirPermiso('inventario_ver'), ControladorInventarioLegacy.buscarVarios);
router.get('/varios/siguiente-codigo', exigirPermiso('inventario_ver'), ControladorInventarioLegacy.previewCodigoVario);
router.get('/varios', exigirPermiso('inventario_ver'), ControladorInventarioLegacy.listarVarios);
router.post('/varios', exigirPermiso('inventario_crear'), ControladorInventarioLegacy.crearVario);
router.put('/varios/:id', exigirPermiso('inventario_editar'), ControladorInventarioLegacy.actualizarVario);
router.delete('/varios/:id', exigirPermiso('inventario_eliminar'), ControladorInventarioLegacy.eliminarVario);

export default router;
