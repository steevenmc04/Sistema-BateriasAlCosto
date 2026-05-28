import { useState, useEffect } from 'react';
import { authAPI } from '../servicios/servicios.js';

/**
 * Sesión con JWT en localStorage: al iniciar se sincroniza el usuario con el servidor
 * para traer permisos actualizados (evita menús bloqueados por datos viejos guardados).
 */
export function useSesion() {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let cancelado = false;

    (async () => {
      const token = localStorage.getItem('token_baterias');
      const guardado = localStorage.getItem('usuario');

      if (!token || !guardado) {
        if (!cancelado) setCargando(false);
        return;
      }

      try {
        const { data } = await authAPI.sesion();
        if (cancelado) return;
        if (data?.usuario) {
          setUsuario(data.usuario);
          localStorage.setItem('usuario', JSON.stringify(data.usuario));
        }
      } catch (err) {
        if (cancelado) return;
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          // Token inválido o expirado → cerrar sesión correctamente
          localStorage.removeItem('token_baterias');
          localStorage.removeItem('usuario');
          setUsuario(null);
        } else {
          // Error de red, backend todavía iniciando, timeout, etc.
          // Cargamos el usuario guardado en localStorage para no desloguear
          try {
            const guardadoStr = localStorage.getItem('usuario');
            if (guardadoStr) setUsuario(JSON.parse(guardadoStr));
          } catch {
            // Si el JSON está corrupto, limpiamos
            localStorage.removeItem('token_baterias');
            localStorage.removeItem('usuario');
            setUsuario(null);
          }
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, []);

  const cerrarSesion = () => {
    localStorage.removeItem('token_baterias');
    localStorage.removeItem('usuario');
    setUsuario(null);
    window.location.reload();
  };

  return { usuario, setUsuario, cargando, cerrarSesion };
}
