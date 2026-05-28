import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const jwtSecret = process.env.JWT_SECRET?.trim();
if (!jwtSecret) {
  throw new Error('JWT_SECRET no definido en variables de entorno');
}

const frontendOrigins = [
  'https://sistema-bateriasalcosto-frontend.onrender.com',
  ...(process.env.FRONTEND_URL?.trim()
    ? process.env.FRONTEND_URL.split(',').map((s) => s.trim()).filter(Boolean)
    : []),
].filter((origin, index, origins) => origins.indexOf(origin) === index);

export const config = {
  jwt: {
    secret: jwtSecret,
    expiresIn: process.env.JWT_EXPIRES_IN?.trim() || '8h',
  },
  cors: {
    origin: frontendOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  },
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS ?? '',
    database: process.env.DB_NAME || 'sistema_baterias',
  },
  server: {
    port: Number(process.env.PORT || 3000),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
};
