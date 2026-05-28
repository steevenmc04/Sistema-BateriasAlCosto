import { useState, useEffect, useCallback } from 'react';
import { usuariosAPI, extraerMensajeError } from '../servicios/servicios.js';
import { notificarGlobal } from '../contextos/NotificacionContexto.jsx';

const vacioUsuario = () => ({
  nombre: '',
  nombre_usuario: '',
  clave: '',
  rol_id: '',
});

/**
 * Controlador para gestión de personal (usuarios + roles).
 */
export function useVistaUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [nuevoUsuario, setNuevoUsuario] = useState(vacioUsuario);

  const obtenerUsuarios = useCallback(async () => {
    try {
      const { data } = await usuariosAPI.listar();
      setUsuarios(data);
    } catch (e) {
    }
  }, []);

  const obtenerRoles = useCallback(async () => {
    try {
      const { data } = await usuariosAPI.listarRoles();
      setRoles(data);
    } catch (e) {
    }
  }, []);

  useEffect(() => {
    obtenerUsuarios();
    obtenerRoles();
  }, [obtenerUsuarios, obtenerRoles]);

  /**
   * Guarda usuario y recarga el listado para mantener consistencia visual.
   */
  const cambiarRol = async (usuarioId, rolId) => {
    try {
      await usuariosAPI.asignarRol(usuarioId, rolId);
      obtenerUsuarios();
    } catch (e2) {
      notificarGlobal(extraerMensajeError(e2), 'error');
    }
  };

  const manejarGuardar = async (e) => {
    e.preventDefault();
    try {
      await usuariosAPI.crear({
        nombre: nuevoUsuario.nombre,
        nombre_usuario: nuevoUsuario.nombre_usuario,
        clave: nuevoUsuario.clave,
        rol_id: nuevoUsuario.rol_id,
      });
      setMostrarModal(false);
      setNuevoUsuario(vacioUsuario());
      obtenerUsuarios();
    } catch (e) {
      notificarGlobal(extraerMensajeError(e), 'error');
    }
  };

  return {
    usuarios,
    roles,
    mostrarModal,
    setMostrarModal,
    nuevoUsuario,
    setNuevoUsuario,
    manejarGuardar,
    cambiarRol,
    recargar: obtenerUsuarios,
  };
}
