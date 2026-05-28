import Logger from './utilidades/logger.js';
import { config } from './configuracion/index.js';
import app from './app.js';
import pool from './configuracion/baseDeDatos.js';

const PUERTO = config.server.port;

// Verificación inicial de conexión a la Base de Datos MySQL
async function verificarConexionBD() {
  try {
    const conexion = await pool.getConnection();
    Logger.info('Servidor', 'Base de datos MySQL conectada exitosamente');
    conexion.release();
  } catch (error) {
    Logger.error('Servidor', 'Error crítico conectando base de datos', {
      host: `${config.db.host}:${config.db.port}`,
      database: config.db.database,
      user: config.db.user,
      detalle: error.message
    });
  }
}

// Inicialización de Servidor Express
app.listen(PUERTO, async () => {
  Logger.info('Servidor', `============================================================`);
  Logger.info('Servidor', `SISTEMA BATERÍAS AL COSTO — SERVIDOR ACTIVO EN PUERTO ${PUERTO}`);
  Logger.info('Servidor', `URL: http://localhost:${PUERTO}`);
  Logger.info('Servidor', `============================================================`);
  
  await verificarConexionBD();
});
