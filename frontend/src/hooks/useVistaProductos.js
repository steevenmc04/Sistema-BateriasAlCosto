import { useState, useEffect, useCallback, useMemo } from 'react';
import { inventarioAPI, chatarraAPI, extraerMensajeError } from '../servicios/servicios.js';
import { notificarGlobal } from '../contextos/NotificacionContexto.jsx';

const vacioBateria = () => ({
  codigo: '',
  marca: '',
  marca_otro: '',
  condicion: 'Nueva',
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

export const obtenerCategoriaInventario = (producto = {}) => {
  const tipoInventario = String(
    producto.tipo_inventario ??
    producto.tipo ??
    producto.tipo_producto ??
    ''
  ).toLowerCase();

  if (tipoInventario === 'chatarra') return 'chatarra';
  if (tipoInventario === 'bateria') return 'bateria';
  if (tipoInventario === 'varios') return 'varios';

  const texto = [
    producto.categoria,
    producto.tipo_producto,
    producto.tipo,
    producto.nombre_categoria,
    producto.es_bateria ? 'bateria' : '',
    producto.condicion,
    producto.estado,
    producto.descripcion,
    producto.nombre,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (texto.includes('chatarra') || String(producto.condicion || '').toLowerCase() === 'chatarra') {
    return 'chatarra';
  }

  if (
    producto.es_bateria === true ||
    texto.includes('bateria') ||
    texto.includes('batería') ||
    Boolean(producto.tipo_caja)
  ) {
    return 'bateria';
  }

  return 'varios';
};

const filtrarPorStock = (items = [], filtroStock = 'TODOS') => {
  if (filtroStock === 'TODOS') return items;
  if (filtroStock === 'DISPONIBLE') return items.filter((i) => Number(i.cantidad) > 0);
  if (filtroStock === 'AGOTADO') return items.filter((i) => Number(i.cantidad) === 0);
  return items;
};

const filtrarPorTexto = (items = [], busqueda = '', campos = []) => {
  const t = busqueda.toLowerCase().trim();
  if (!t) return items;

  return items.filter((item) =>
    campos.some((campo) => String(item?.[campo] ?? '').toLowerCase().includes(t))
  );
};

export function useVistaProductos() {
  const [tab, setTab] = useState('baterias');
  const [baterias, setBaterias] = useState([]);
  const [varios, setVarios] = useState([]);
  const [chatarra, setChatarra] = useState([]);
  const [productosUnificados, setProductosUnificados] = useState([]);
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
    return inventarioAPI
      .obtenerCatalogos()
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
      const [rB, rV, rC, rP] = await Promise.allSettled([
        inventarioAPI.listarBaterias(),
        inventarioAPI.listarVarios(),
        chatarraAPI.listar({ limite: 500 }),
        inventarioAPI.listarProductos({ soloActivos: true }),
      ]);

      if (rB.status === 'rejected') throw rB.reason;
      if (rV.status === 'rejected') throw rV.reason;

      const bateriasData = Array.isArray(rB.value.data) ? rB.value.data : [];
      const variosData = Array.isArray(rV.value.data) ? rV.value.data : [];

      const chatarraData = rC.status === 'fulfilled'
        ? (Array.isArray(rC.value.data?.data)
          ? rC.value.data.data
          : Array.isArray(rC.value.data)
            ? rC.value.data
            : [])
        : [];

      const productosData = rP.status === 'fulfilled'
        ? (Array.isArray(rP.value.data) ? rP.value.data : [])
        : [];

      setBaterias(bateriasData);
      setVarios(variosData);
      setChatarra(chatarraData);
      setProductosUnificados(productosData);
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
    } catch {
      // ignore
    }
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

  const chatarraDesdeInventario = useMemo(
    () =>
      (productosUnificados || [])
        .filter((p) => obtenerCategoriaInventario(p) === 'chatarra')
        .map((p) => ({
          id: `chatarra-prod-${p.id}`,
          codigo: p.codigo || `CHAT-${p.id}`,
          nombre: p.nombre || [p.marca, p.tipo_caja].filter(Boolean).join(' · ') || 'Producto chatarra',
          descripcion: p.descripcion || p.condicion || 'Chatarra',
          condicion: p.condicion || 'Chatarra',
          cantidad: Number(p.stock_actual ?? p.cantidad ?? 0),
          precio: Number(p.precio_venta ?? p.precio_costo ?? 0),
          estado_stock: Number(p.stock_actual ?? p.cantidad ?? 0) <= 0 ? 'sin_stock' : 'con_stock',
          tipo_operacion: '',
          creado_en: p.creado_en || p.actualizado_en,
        })),
    [productosUnificados]
  );

  const chatarraDesdeMovimientos = useMemo(() => {
    return (Array.isArray(chatarra) ? chatarra : []).map((registro, idx) => ({
      id: `chatarra-op-${registro.id ?? idx}`,
      codigo: registro.producto_codigo || `CHAT-${registro.id ?? idx + 1}`,
      nombre:
        [registro.producto_marca, registro.producto_tipo_caja].filter(Boolean).join(' · ') ||
        'Movimiento de chatarra',
      descripcion: registro.notas || '',
      condicion: 'Chatarra',
      cantidad: Number(registro.cantidad_total) || 0,
      precio: Number(registro.total) || 0,
      estado_stock: Number(registro.cantidad_total) > 0 ? 'con_stock' : 'sin_stock',
      tipo_operacion: registro.tipo_operacion || '',
      creado_en: registro.creado_en || registro.fecha,
    }));
  }, [chatarra]);

  const bFiltradas = useMemo(() => {
    const conStock = filtrarPorStock(baterias, filtroStock);
    return filtrarPorTexto(conStock, busqueda, ['codigo', 'marca', 'tipo_caja']);
  }, [baterias, busqueda, filtroStock]);

  const vFiltradas = useMemo(() => {
    const conStock = filtrarPorStock(varios, filtroStock);
    return filtrarPorTexto(conStock, busqueda, ['codigo', 'nombre', 'descripcion']);
  }, [varios, busqueda, filtroStock]);

  const chFiltradas = useMemo(() => {
    const base = chatarraDesdeInventario.length > 0
      ? chatarraDesdeInventario
      : chatarraDesdeMovimientos;
    const conStock = filtrarPorStock(base, filtroStock);
    return filtrarPorTexto(conStock, busqueda, ['codigo', 'nombre', 'descripcion', 'tipo_operacion']);
  }, [chatarraDesdeInventario, chatarraDesdeMovimientos, busqueda, filtroStock]);

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
    chFiltradas,
    baterias,
    chatarra,
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
