import { useState, useEffect, useCallback, useMemo } from 'react';
import { usuariosAPI, extraerMensajeError } from '../servicios/servicios.js';
import { CLAVES_PERMISO_UI } from '../constantes/listasInventario.js';
import { notificarGlobal } from '../contextos/NotificacionContexto.jsx';

function decodePerm(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    const o = JSON.parse(raw);
    return typeof o === 'object' && o ? o : {};
  } catch {
    return {};
  }
}

const permisosVacio = () =>
  CLAVES_PERMISO_UI.reduce((acc, item) => {
    acc[item.clave] = false;
    return acc;
  }, {});

/**
 * CRUD de roles.roles + columna JSON permisos.
 */
export function useVistaRoles() {
  const [roles, setRoles] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState('');
  const [formulario, setFormulario] = useState({
    nombre: '',
    descripcion: '',
    permisos: permisosVacio(),
    id: null,
  });

  const plantillaClaves = useMemo(() => CLAVES_PERMISO_UI, []);

  const obtenerRoles = useCallback(async () => {
    try {
      const { data } = await usuariosAPI.listarRoles();
      setRoles(data);
    } catch (error) {
      setMensaje(extraerMensajeError(error));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    obtenerRoles();
  }, [obtenerRoles]);

  const togglePermiso = (clave, valor) => {
    setFormulario((prev) => ({
      ...prev,
      permisos: {
        ...prev.permisos,
        [clave]: valor,
      },
    }));
  };

  const nuevaPlantilla = () => {
    setFormulario({
      nombre: '',
      descripcion: '',
      permisos: permisosVacio(),
      id: null,
    });
    setMensaje('');
  };

  const cargarPresetVendedor = (presetObj) => {
    setFormulario((prev) => ({
      ...prev,
      permisos: {
        ...permisosVacio(),
        ...presetObj,
      },
    }));
  };

  const editarRol = (rol) => {
    const per = decodePerm(rol.permisos);
    setFormulario({
      id: rol.id,
      nombre: rol.nombre,
      descripcion: rol.descripcion || '',
      permisos: {
        ...permisosVacio(),
        ...per,
      },
    });
    setMensaje('');
  };

  const guardar = async (e) => {
    e.preventDefault();
    if (!formulario.nombre.trim()) {
      notificarGlobal('Nombre obligatorio', 'advertencia');
      return;
    }
    try {
      if (formulario.id) {
        await usuariosAPI.actualizarRol(formulario.id, {
          nombre: formulario.nombre.trim(),
          descripcion: formulario.descripcion,
          permisos: formulario.permisos,
        });
        setMensaje('Rol actualizado desde MySQL.');
      } else {
        await usuariosAPI.crearRol({
          nombre: formulario.nombre.trim(),
          descripcion: formulario.descripcion,
          permisos: formulario.permisos,
        });
        setMensaje('Rol insertado.');
      }
      nuevaPlantilla();
      obtenerRoles();
    } catch (error) {
      notificarGlobal(extraerMensajeError(error), 'error');
    }
  };

  const eliminarRol = async (id) => {
    try {
      await usuariosAPI.eliminarRol(id);
      notificarGlobal('Rol eliminado', 'exito');
      obtenerRoles();
    } catch (error) {
      notificarGlobal(extraerMensajeError(error), 'error');
    }
  };

  return {
    roles,
    cargando,
    mensaje,
    formulario,
    setFormulario,
    plantillaClaves,
    togglePermiso,
    nuevaPlantilla,
    cargarPresetVendedor,
    editarRol,
    guardar,
    eliminarRol,
  };
}
