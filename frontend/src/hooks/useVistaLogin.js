import { useState } from 'react';
import { authAPI, extraerMensajeError } from '../servicios/servicios.js';

export function useVistaLogin(alLoguear) {
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const manejarLogin = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      const { data } = await authAPI.login({
        usuario: nombreUsuario,
        clave,
      });
      const { token, usuario: datosUsuario } = data;
      if (!token || !datosUsuario) {
        setError('Respuesta del servidor incompleta');
        return;
      }
      localStorage.setItem('token_baterias', token);
      localStorage.setItem('usuario', JSON.stringify(datosUsuario));
      alLoguear(datosUsuario);
    } catch (err) {
      const cod = err.response?.data?.codigo ? ` [${err.response.data.codigo}]` : '';
      setError(extraerMensajeError(err) + cod);
    } finally {
      setCargando(false);
    }
  };

  return {
    nombreUsuario,
    setNombreUsuario,
    clave,
    setClave,
    error,
    cargando,
    manejarLogin,
  };
}
