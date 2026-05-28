import { useState, useEffect, useCallback, useMemo } from 'react';
import { inventarioAPI, extraerMensajeError } from '../servicios/servicios.js';
import { notificarGlobal } from '../contextos/NotificacionContexto.jsx';

const vacioBateria = () => ({
  codigo: '',
  marca: '',
  marca_otro: '',
  condicion: '',
  tipo_caja: '',
  tipo_caja_otro: '',
  cantidad: 1,
  precio: '',
});

const vacioVario = () => ({
  nombre: '',
  descripcion: '',
  cantidad: 1,
  precio: '',
});

/**
 * Inventario: pestañas baterías y otros productos (referencias VAR-xxxx).
 */
export function useVistaProductos() {
  const [tab, setTab] = useState('baterias');
  const [baterias, setBaterias] = useState([]);
  const [varios, setVarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroStock, setFiltroStock] = useState('TODOS');
  const [modalBat, setModalBat] = useState(false);
  const [modalVar, setModalVar] = useState(false);
  const [editBatId, setEditBatId] = useState(null);
  const [editVarId, setEditVarId] = useState(null);
  const [formBat, setFormBat] = useState(() => vacioBateria());
  const [formVar, setFormVar] = useState(() => vacioVario());
  const [proxVar, setProxVar] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [marcasDB, setMarcasDB] = useState([]);
  const [tiposCajaDB, setTiposCajaDB] = useState([]);
  const [condicionesDB, setCondicionesDB] = useState([]);

  const recargarCatalogos = useCallback(() => {
    return inventarioAPI.obtenerCatalogos()
      .then((res) => {
        setMarcasDB(res.data.marcas || []);
        setTiposCajaDB(res.data.tipos_caja || []);
        setCondicionesDB(res.data.condiciones || []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    recargarCatalogos();
  }, [recargarCatalogos]);

  const recargar = useCallback(async () => {
    setCargando(true);
    try {
      const [rB, rV] = await Promise.all([
        inventarioAPI.listarBaterias(),
        inventarioAPI.listarVarios(),
      ]);
      setBaterias(rB.data);
      setVarios(rV.data);
    } catch (e) {
      setErrorMsg(extraerMensajeError(e));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    recargar();
  }, [recargar]);

  const abrirNuevaBateria = () => {
    setEditBatId(null);
    setFormBat(vacioBateria());
    setModalBat(true);
  };

  const abrirEditarBateria = (row) => {
    setEditBatId(row.id);
    setFormBat({
      codigo: row.codigo,
      marca: row.marca,
      marca_otro: '',
      condicion: row.condicion,
      tipo_caja: row.tipo_caja,
      tipo_caja_otro: '',
      cantidad: Math.max(1, Number(row.cantidad)),
      precio: row.precio,
    });
    setModalBat(true);
  };

  const guardarBateria = async (e) => {
    e.preventDefault();
    const marca = formBat.marca === 'Otros' ? formBat.marca_otro.trim() : formBat.marca.trim();
    const tipoCaja = formBat.tipo_caja === 'Otro' ? formBat.tipo_caja_otro.trim() : formBat.tipo_caja.trim();

    if (!marca || !tipoCaja) {
      notificarGlobal('Debe ingresar marca y tipo de caja.', 'advertencia');
      return;
    }

    const base = {
      marca,
      condicion: formBat.condicion,
      tipo_caja: tipoCaja,
      cantidad: Number(formBat.cantidad),
      precio: Number(formBat.precio),
    };
    try {
      if (editBatId) {
        await inventarioAPI.actualizarBateria(editBatId, base);
      } else {
        await inventarioAPI.crearBateria(base);
      }
      setModalBat(false);
      await recargar();
      await recargarCatalogos();
    } catch (err) {
      notificarGlobal(extraerMensajeError(err), 'error');
    }
  };

  const eliminarBateriaFn = async (id) => {
    if (!window.confirm('¿Eliminar esta fila del inventario?')) return;
    try {
      await inventarioAPI.eliminarBateria(id);
      notificarGlobal('Batería eliminada', 'exito');
      await recargar();
      await recargarCatalogos();
    } catch (err) {
      notificarGlobal(extraerMensajeError(err), 'error');
    }
  };

  const cargarSiguienteVar = async () => {
    try {
      const { data } = await inventarioAPI.previewCodigoVario();
      setProxVar(data.codigo);
    } catch {/* ignore */}
  };

  const abrirNuevoVario = async () => {
    setEditVarId(null);
    setFormVar(vacioVario());
    await cargarSiguienteVar();
    setModalVar(true);
  };

  const abrirEditVario = (row) => {
    setEditVarId(row.id);
    setFormVar({
      nombre: row.nombre,
      descripcion: row.descripcion || '',
      cantidad: row.cantidad,
      precio: row.precio,
    });
    setProxVar(row.codigo);
    setModalVar(true);
  };

  const guardarVario = async (e) => {
    e.preventDefault();
    const payload = {
      nombre: formVar.nombre.trim(),
      descripcion: formVar.descripcion,
      cantidad: Number(formVar.cantidad),
      precio: Number(formVar.precio),
    };
    try {
      if (editVarId) {
        await inventarioAPI.actualizarVario(editVarId, payload);
      } else {
        await inventarioAPI.crearVario(payload);
      }
      setModalVar(false);
      await recargar();
      await recargarCatalogos();
    } catch (err) {
      notificarGlobal(extraerMensajeError(err), 'error');
    }
  };

  const eliminarVarFn = async (id) => {
    if (!window.confirm('¿Eliminar este producto del inventario?')) return;
    try {
      await inventarioAPI.eliminarVario(id);
      notificarGlobal('Producto eliminado', 'exito');
      await recargar();
      await recargarCatalogos();
    } catch (err) {
      notificarGlobal(extraerMensajeError(err), 'error');
    }
  };

  const bFiltradas = useMemo(() => {
    let result = baterias;
    if (filtroStock === 'DISPONIBLE') result = result.filter(b => Number(b.cantidad) > 0);
    else if (filtroStock === 'AGOTADO') result = result.filter(b => Number(b.cantidad) === 0);

    const t = busqueda.toLowerCase().trim();
    if (!t) return result;
    return result.filter(
      (b) =>
        String(b.codigo).toLowerCase().includes(t) ||
        String(b.marca).toLowerCase().includes(t) ||
        String(b.tipo_caja).toLowerCase().includes(t)
    );
  }, [baterias, busqueda, filtroStock]);

  const vFiltradas = useMemo(() => {
    let result = varios;
    if (filtroStock === 'DISPONIBLE') result = result.filter(v => Number(v.cantidad) > 0);
    else if (filtroStock === 'AGOTADO') result = result.filter(v => Number(v.cantidad) === 0);

    const t = busqueda.toLowerCase().trim();
    if (!t) return result;
    return result.filter(
      (v) =>
        String(v.codigo).toLowerCase().includes(t) || String(v.nombre).toLowerCase().includes(t)
    );
  }, [varios, busqueda, filtroStock]);

  return {
    tab,
    setTab,
    cargando,
    busqueda,
    setBusqueda,
    filtroStock,
    setFiltroStock,
    bFiltradas,
    vFiltradas,
    baterias,
    proxVar,
    formBat,
    setFormBat,
    formVar,
    setFormVar,
    modalBat,
    setModalBat,
    modalVar,
    setModalVar,
    abrirNuevaBateria,
    abrirEditarBateria,
    guardarBateria,
    eliminarBateriaFn,
    abrirNuevoVario,
    abrirEditVario,
    guardarVario,
    eliminarVarFn,
    errorMsg,
    editBatEsNuevo: !editBatId,
    marcasDB,
    tiposCajaDB,
    condicionesDB,
  };
}
