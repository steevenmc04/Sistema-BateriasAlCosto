import { useState, useEffect, useCallback, useMemo } from 'react';
import apiCliente, { apiUrl, extraerMensajeError, facturasAPI, inventarioAPI } from '../servicios/servicios.js';
import { notificarGlobal } from '../contextos/NotificacionContexto.jsx';
import {
  esBateria as clasificarBateria,
  esVario as clasificarVario,
  esChatarra as clasificarChatarra,
} from '../utilidades/clasificarProducto.js';

const normalizarTexto = (valor) => String(valor || '').trim().toLowerCase();
const aNumeroSeguro = (valor, fallback = 0) => {
  const n = Number(valor);
  return Number.isFinite(n) ? n : fallback;
};

const crearUid = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `item-${Date.now()}-${Math.floor(Math.random() * 99999)}`;
};

const normalizarProductoPOS = (p = {}) => {
  const id = p.producto_id ?? p.id ?? null;
  const stock = aNumeroSeguro(p.stock ?? p.stock_actual ?? p.cantidad_disponible ?? p.cantidad, 0);
  const precio = aNumeroSeguro(p.precio ?? p.precio_venta ?? p.pvp ?? p.precio_costo, 0);

  return {
    ...p,
    id,
    producto_id: id,
    codigo: p.codigo ?? p.referencia ?? '',
    nombre: p.nombre ?? p.descripcion ?? '',
    marca: p.marca ?? '',
    tipo_caja: p.tipo_caja ?? '',
    categoria: p.categoria ?? p.nombre_categoria ?? '',
    tipo_producto: p.tipo_producto ?? p.tipo ?? '',
    tipo_inventario: p.tipo_inventario ?? p.tipo ?? p.tipo_producto ?? '',
    condicion: p.condicion ?? p.estado ?? '',
    es_bateria: p.es_bateria === true || p.es_bateria === 1 || p.es_bateria === '1',
    stock,
    stock_actual: stock,
    cantidad_disponible: stock,
    precio,
    precio_venta: precio,
  };
};

const esChatarraProducto = (producto = {}) => clasificarChatarra(producto);
const esBateriaProducto = (producto = {}) => clasificarBateria(producto);
const esVarioProducto = (producto = {}) => clasificarVario(producto);

const descripcionBateria = (producto = {}) =>
  [producto.marca, producto.tipo_caja, producto.condicion, producto.codigo].filter(Boolean).join(' - ');

const descripcionVario = (producto = {}) => producto.nombre || producto.descripcion || producto.codigo || '';

const crearItemFactura = (tipo = 'bateria') => ({
  uid: crearUid(),
  tipo,
  producto_id: '',
  producto_nombre: '',
  marca: '',
  tipo_caja: '',
  condicion: '',
  codigo: '',
  descripcion: '',
  cantidad: 1,
  precio_unitario: 0,
});

/**
 * @hook useVistaFacturas
 * @descripcion Maneja todo el estado y la lógica del módulo de facturación en el frontend.
 *              Carga facturas desde la API, gestiona modales, formularios y cálculo de totales.
 *
 * @estado listaFacturas        - Array de facturas cargadas
 * @estado cargando             - true mientras carga datos
 * @estado error                - Mensaje de error o null
 * @estado filtros              - { desde, hasta, estado }
 * @estado modalNuevaFactura    - Controla visibilidad del modal de emisión
 * @estado modalConfigEmpresa  - Controla modal de configuración
 * @estado configEmpresa        - Configuración activa de la empresa
 * @estado formFactura          - Datos del formulario de factura activa
 * @estado facturaExistenteVenta - Factura encontrada si ya existe para una venta
 *
 * @expone cargarFacturas()     - Recarga la lista desde API
 * @expone cargarConfig()       - Obtiene configuración de empresa
 * @expone crearFactura()       - Envía POST /api/facturas
 * @expone anularFactura(id)    - Anula una factura local
 * @expone descargarPDF(id)     - Abre/descarga PDF de factura
 * @expone agregarItem()        - Agrega línea vacía al formulario
 * @expone eliminarItem(index)  - Elimina línea por índice
 * @expone actualizarItem(i,k,v)- Actualiza campo específico de un item
 * @expone guardarConfig()      - Actualiza datos de la empresa
 * @expone abrirModalFacturaConVenta - Prellena factura desde una venta POS
 * @expone reintentarSRI(id)    - Reintenta enviar la factura al SRI
 * @expone totalesCalculados    - { subtotal, descuento, base_imponible, monto_iva, total }
 */
export function useVistaFacturas() {
  const [listaFacturas, setListaFacturas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const [filtros, setFiltros] = useState({
    desde: '',
    hasta: '',
    estado: ''
  });

  const [modalNuevaFactura, setModalNuevaFactura] = useState(false);
  const [modalConfigEmpresa, setModalConfigEmpresa] = useState(false);

  const [configEmpresa, setConfigEmpresa] = useState(null);
  const [productosPOS, setProductosPOS] = useState([]);
  
  const [cargandoConfig, setCargandoConfig] = useState(false);
  
  const formVacio = {
    cliente_nombre: '',
    cliente_cedula_ruc: '',
    cliente_email: '',
    cliente_telefono: '',
    cliente_direccion: '',
    items: [],
    con_iva: true,
    notas: '',
    venta_id: null
  };
  
  const [formFactura, setFormFactura] = useState(formVacio);

  const cargarFacturas = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const { desde, hasta, estado } = filtros;
      const params = new URLSearchParams();
      if (desde) params.append('desde', desde);
      if (hasta) params.append('hasta', hasta);
      if (estado) params.append('estado', estado.toLowerCase());

      const { data } = await apiCliente.get(apiUrl(`/api/facturas?${params.toString()}`));
      setListaFacturas(data);
    } catch (err) {
      setError(extraerMensajeError(err));
    } finally {
      setCargando(false);
    }
  }, [filtros]);

  const cargarConfig = useCallback(async () => {
    setCargandoConfig(true);
    try {
      const { data } = await apiCliente.get(apiUrl('/api/facturas/config'));
      setConfigEmpresa(data);
    } catch {
      setConfigEmpresa(null);
    } finally {
      setCargandoConfig(false);
    }
  }, []);

  const cargarProductosPOS = useCallback(async () => {
    try {
      const { data } = await inventarioAPI.listarProductosPOS({ t: Date.now() });
      const rows = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
      setProductosPOS(rows.map(normalizarProductoPOS));
    } catch {
      setProductosPOS([]);
    }
  }, []);

  useEffect(() => {
    cargarFacturas();
    cargarConfig();
    cargarProductosPOS();
  }, [cargarFacturas, cargarConfig, cargarProductosPOS]);

  const totalesCalculados = useMemo(() => {
    let subtotal = 0;

    formFactura.items.forEach(item => {
      subtotal += parseFloat(item.cantidad || 0) * parseFloat(item.precio_unitario || 0);
    });

    const baseImponible = subtotal;
    
    let montoIva = 0;
    if (formFactura.con_iva && configEmpresa?.iva_porcentaje) {
      montoIva = (baseImponible * parseFloat(configEmpresa.iva_porcentaje)) / 100;
    }
    
    const total = baseImponible + montoIva;

    return {
      subtotal,
      descuento: 0,
      base_imponible: baseImponible,
      monto_iva: montoIva,
      total
    };
  }, [formFactura, configEmpresa]);

  const agregarItem = (tipo = 'bateria') => {
    setFormFactura(prev => ({
      ...prev,
      items: [...prev.items, crearItemFactura(tipo)]
    }));
  };

  const eliminarItem = (index) => {
    setFormFactura(prev => {
      const nuevosItems = [...prev.items];
      nuevosItems.splice(index, 1);
      return { ...prev, items: nuevosItems };
    });
  };

  const actualizarItem = (index, campo, valor) => {
    setFormFactura(prev => {
      const nuevosItems = [...prev.items];
      nuevosItems[index] = { ...nuevosItems[index], [campo]: valor };
      return { ...prev, items: nuevosItems };
    });
  };

  const seleccionarProductoItem = (index, producto) => {
    if (!producto) return;
    setFormFactura((prev) => {
      const nuevosItems = [...prev.items];
      const actual = nuevosItems[index] || crearItemFactura('bateria');
      const esVario = actual.tipo === 'varios';
      nuevosItems[index] = {
        ...actual,
        producto_id: producto.producto_id ?? producto.id ?? '',
        codigo: producto.codigo || '',
        producto_nombre: esVario ? (producto.nombre || producto.descripcion || '') : '',
        marca: esVario ? '' : (producto.marca || ''),
        tipo_caja: esVario ? '' : (producto.tipo_caja || ''),
        condicion: esVario ? '' : (producto.condicion || producto.estado || ''),
        descripcion: esVario ? descripcionVario(producto) : descripcionBateria(producto),
        precio_unitario: Number(producto.precio ?? producto.precio_venta ?? 0),
      };
      return { ...prev, items: nuevosItems };
    });
  };

  const crearFactura = async () => {
    try {
      const payload = {
        cliente: {
          nombre: formFactura.cliente_nombre,
          cedula_ruc: formFactura.cliente_cedula_ruc,
          email: formFactura.cliente_email,
          telefono: formFactura.cliente_telefono,
          direccion: formFactura.cliente_direccion
        },
        items: formFactura.items.map((item) => ({
          descripcion:
            item.descripcion ||
            (item.tipo === 'varios'
              ? (item.producto_nombre || item.codigo || 'Producto Varios')
              : [item.marca, item.tipo_caja, item.condicion, item.codigo].filter(Boolean).join(' - ') || item.codigo || 'Bateria'),
          cantidad: Number(item.cantidad) || 1,
          precio_unitario: Number(item.precio_unitario) || 0,
          descuento: 0,
        })),
        con_iva: formFactura.con_iva,
        descuento: 0,
        notas: formFactura.notas,
        venta_id: formFactura.venta_id
      };

      await facturasAPI.crear(payload);
      setModalNuevaFactura(false);
      setFormFactura(formVacio);
      cargarFacturas();
      return { success: true };
    } catch (err) {
      const detalle = extraerMensajeError(err);
      return { success: false, error: detalle };
    }
  };

  const anularFactura = async (id) => {
    if (!window.confirm('¿Estás seguro de anular esta factura? Esta acción no se puede deshacer.')) {
      return;
    }
    try {
      await apiCliente.patch(apiUrl(`/api/facturas/${id}/anular`));
      cargarFacturas();
    } catch (err) {
      notificarGlobal(extraerMensajeError(err), 'error');
    }
  };

  const descargarPDF = async (id) => {
    try {
      const res = await apiCliente.get(apiUrl(`/api/facturas/${id}/pdf`), {
        responseType: 'blob',
        headers: { Accept: 'application/pdf' },
      });
      const blob = res.data;
      if (blob.type && blob.type.includes('application/json')) {
        const text = await blob.text();
        try {
          const j = JSON.parse(text);
          notificarGlobal(j.mensaje || 'No se pudo generar el PDF', 'error');
        } catch {
          notificarGlobal('No se pudo generar el PDF', 'error');
        }
        return;
      }
      const cd = res.headers['content-disposition'] || '';
      const match = cd.match(/filename="?(.+?)"?$/);
      const filename = match ? match[1] : `Factura_${id}.pdf`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      notificarGlobal(extraerMensajeError(err), 'error');
    }
  };

  const guardarConfig = async (datos) => {
    try {
      await apiCliente.put(apiUrl('/api/facturas/config'), datos);
      setModalConfigEmpresa(false);
      cargarConfig();
      return { success: true };
    } catch (err) {
      return { success: false, error: extraerMensajeError(err) };
    }
  };

  const [facturaExistenteVenta, setFacturaExistenteVenta] = useState(null);

  const abrirModalFacturaConVenta = async (datosVenta) => {
    setFacturaExistenteVenta(null);

    // Verificar si ya existe factura para esta venta
    if (datosVenta.id) {
      try {
        const { data } = await apiCliente.get(apiUrl(`/api/facturas/venta/${datosVenta.id}`));
        if (data.existe) {
          setFacturaExistenteVenta(data.factura);
        }
      } catch {
        /* ignorar si no se pudo verificar duplicado */
      }
    }

    // Mapeo explícito: cada campo de datosVenta va a su campo exacto en el formulario
    setFormFactura({
      ...formVacio,
      venta_id:           datosVenta.id || null,
      cliente_nombre:     datosVenta.cliente_nombre     || '',
      cliente_cedula_ruc: datosVenta.cliente_cedula_ruc || '',
      cliente_email:      datosVenta.cliente_email       || '',
      cliente_telefono:   datosVenta.cliente_telefono    || '',
      cliente_direccion:  datosVenta.cliente_direccion   || '',
      con_iva:            datosVenta.con_iva !== undefined ? Boolean(datosVenta.con_iva) : true,
      notas:              datosVenta.notas               || '',
      items: Array.isArray(datosVenta.items) && datosVenta.items.length > 0
        ? datosVenta.items.map(item => ({
            uid: crearUid(),
            tipo:
              normalizarTexto(item.tipo_inventario) === 'varios' ||
              normalizarTexto(item.tipo) === 'varios' ||
              (!item.marca && !item.tipo_caja && (item.nombre || item.descripcion))
                ? 'varios'
                : 'bateria',
            producto_id: item.producto_id || '',
            codigo: item.codigo || '',
            producto_nombre: item.nombre || '',
            marca: item.marca || '',
            tipo_caja: item.tipo_caja || '',
            condicion: item.condicion || item.estado || '',
            descripcion: item.descripcion || '',
            cantidad:        Number(item.cantidad) || 1,
            precio_unitario: Number(item.precio_unitario) || 0,
          }))
        : [],
    });

    setModalNuevaFactura(true);
  };

  const reintentarSRI = async (id) => {
    try {
      await apiCliente.post(apiUrl(`/api/facturas/${id}/enviar-sri`));
      cargarFacturas();
      return { success: true };
    } catch (err) {
      const detalle = extraerMensajeError(err);
      notificarGlobal(detalle, 'error');
      return { success: false, error: detalle };
    }
  };

  return {
    listaFacturas,
    cargando,
    error,
    filtros,
    setFiltros,
    modalNuevaFactura,
    setModalNuevaFactura,
    modalConfigEmpresa,
    setModalConfigEmpresa,
    formFactura,
    setFormFactura,
    configEmpresa,
    totalesCalculados,
    productosPOS,
    esBateriaProducto,
    esChatarraProducto,
    esVarioProducto,
    agregarItem,
    eliminarItem,
    actualizarItem,
    seleccionarProductoItem,
    crearFactura,
    anularFactura,
    descargarPDF,
    guardarConfig,
    abrirModalFacturaConVenta,
    facturaExistenteVenta,
    setFacturaExistenteVenta,
    reintentarSRI
  };
}
