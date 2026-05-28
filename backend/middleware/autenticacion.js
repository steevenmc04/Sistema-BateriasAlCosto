import jwt from 'jsonwebtoken';
import { config } from '../configuracion/index.js';

export const NOMBRE_COOKIE_JWT = 'token_sistema_baterias';

/**
 * Middleware: Verifica que el token JWT sea válido.
 * Soporta cabecera Authorization (Bearer Token) y cookies httpOnly.
 */
export const verificarToken = (req, res, next) => {
  const token =
    req.headers.authorization?.split(' ')[1] ||
    req.cookies?.[NOMBRE_COOKIE_JWT];

  if (!token) {
    return res.status(403).json({ mensaje: 'Acceso denegado: No se proporcionó un token de seguridad.' });
  }

  try {
    const decodificado = jwt.verify(token, config.jwt.secret);
    req.usuario = decodificado;
    next();
  } catch (error) {
    return res.status(401).json({ mensaje: 'Sesión expirada o inválida. Inicie sesión nuevamente.' });
  }
};

/**
 * Middleware: Restringe el acceso solo a usuarios con rol Administrador.
 */
export const soloAdmin = (req, res, next) => {
  if (!req.usuario) {
    return res.status(401).json({ mensaje: 'No autenticado.' });
  }

  const rol = String(req.usuario.rol_nombre || '');
  if (rol.toLowerCase() !== 'administrador') {
    return res.status(403).json({ mensaje: 'Acceso denegado: Se requieren privilegios de Administrador.' });
  }
  next();
};
