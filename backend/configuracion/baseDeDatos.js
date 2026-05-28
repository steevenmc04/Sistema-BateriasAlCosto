import mysql from 'mysql2/promise';
import { config } from './index.js';

/**
 * Configura el pool MySQL reutilizable para toda la capa de modelos.
 * Se usa pool para evitar sobrecoste de abrir/cerrar conexiones por consulta.
 */
const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,

  ...(config.server.nodeEnv === 'production' ? {
    ssl: { rejectUnauthorized: true }
  } : {}),

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
});

export default pool;