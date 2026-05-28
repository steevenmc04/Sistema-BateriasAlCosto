import { useState, useEffect, useMemo, useCallback } from 'react';
import { ventasAPI, comprasAPI, chatarraAPI, facturasAPI, API, extraerMensajeError } from '../servicios/servicios.js';
import apiCliente from '../servicios/servicios.js';
import { useOperacionMultiItem } from './useOperacionMultiItem.js';
import { notificarGlobal } from '../contextos/NotificacionContexto.jsx';
import { esProductoBateria } from '../utilidades/esProductoBateria.js';

const aNumeroSeguro = (valor, fallback = 0) => {
  const n = Number(valor);
  return Number.isFinite(n) ? n : fallback;
};

const normalizarProductoPOS = (p = {}) => {
  const id = aNumeroSeguro(p.id ?? p.producto_id, null);
  const stock = aNumeroSeguro(p.stock ?? p.stock_actual ?? p.cantidad_disponible ?? p.cantidad, 0);
  const precio = aNumeroSeguro(p.precio ?? p.precio_venta ?? p.pvp ?? p.precio_costo, 0);

  return {
    ...p,
    id,
    producto_id: id,
    codigo: p.codigo ?? p.referencia ?? '',
    nombre: p.nombre ?? p.descripcion ?? '',
    marca: p.marca ?? p.nombre ?? '',
    tipo_caja: p.tipo_caja ?? p.descripcion ?? p.nombre ?? '',
    categoria: p.categoria ?? p.nombre_categoria ?? '',
    tipo_producto: p.tipo_producto ?? p.tipo ?? '',
    tipo_inventario: p.tipo_inventario ?? p.tipo ?? p.tipo_producto ?? '',
    es_bateria: p.es_bateria === true || p.es_bateria === 1 || p.es_bateria === '1',
    stock,
    stock_actual: stock,
    cantidad_disponible: stock,
    precio,
    precio_venta: precio,
    precio_costo: precio,
  };
};

export const useVistaTransacciones = (tabPredeterminado = 'venta') => {
  const [tab, setTab] = useState(tabPredeterminado);
  const [cargando, setCargando] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [ventas, setVentas] = useState([]);
  const [compras, setCompras] = useState([]);
  const [chatarra, setChatarra] = useState([]);
  const [busqueda, setBusqueda] = useState('');

  const [modalVenta, setModalVenta] = useState(false);
  const [modalCompra, setModalCompra] = useState(false);
  const [modalChatarra, setModalChatarra] = useState(false);
  const [modalExito, setModalExito] = useState(false);
  const [exitoData, setExitoData] = useState(null);

  const [productos, setProductos] = useState([]);
  const [productosBateria, setProductosBateria] = useState([]);
  const [productosVarios, setProductosVarios] = useState([]);
  const [productosChatarra, setProductosChatarra] = useState([]);

  const [clienteId, setClienteId] = useState('');
  const [clienteData, setClienteData] = useState(null);
  const [nombreCliente, setNombreCliente] = useState('');
  const [documentoCliente, setDocumentoCliente] = useState('');
  const [telefonoCliente, setTelefonoCliente] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');
  const [clienteDireccion, setClienteDireccion] = useState('');
  const [mostrarFormCliente, setMostrarFormCliente] = useState(false);
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [notas, setNotas] = useState('');
  const [tipoChatarra, setTipoChatarra] = useState('salida');
  const [erroresValidacion, setErroresValidacion] = useState([]);

  const ventaItems = useOperacionMultiItem();
  const compraItems = useOperacionMultiItem();
  const chatarraItems = useOperacionMultiItem();

  const cargarProductos = useCallback(async () => {
    try {
      const ts = Date.now();
      const res = await apiCliente.get(`${API}/api/inventario/productos-pos?t=${ts}`);
      const productosArray = Array.isArray(res.data) ? res.data : res.data?.data || [];
      const productosNormalizados = productosArray.map(normalizarProductoPOS);
      const chatarraFiltrados = productosNormalizados.filter((p) => {
        const tipoInventario = String(p.tipo_inventario || p.tipo || p.tipo_producto || '').toLowerCase();
        if (tipoInventario === 'chatarra') return true;
        const texto = [
          p.categoria,
          p.tipo_producto,
          p.tipo,
          p.nombre_categoria,
          p.condicion,
          p.descripcion,
          p.nombre,
        ].filter(Boolean).join(' ').toLowerCase();
        return texto.includes('chatarra');
      });
      const bateriasFiltradas = productosNormalizados.filter((p) => {
        const tipoInventario = String(p.tipo_inventario || p.tipo || p.tipo_producto || '').toLowerCase();
        if (tipoInventario === 'chatarra') return false;
        if (tipoInventario === 'bateria') return true;
        const texto = [p.categoria, p.tipo_producto, p.tipo, p.condicion, p.descripcion, p.nombre]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (texto.includes('chatarra')) return false;
        return esProductoBateria(p);
      });
      const variosFiltrados = productosNormalizados.filter((p) => {
        const tipoInventario = String(p.tipo_inventario || p.tipo || p.tipo_producto || '').toLowerCase();
        if (tipoInventario === 'chatarra') return false;
        if (tipoInventario === 'varios') return true;
        const texto = [p.categoria, p.tipo_producto, p.tipo, p.condicion, p.descripcion, p.nombre]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (texto.includes('chatarra')) return false;
        return !esProductoBateria(p);
      });

      setProductosBateria(bateriasFiltradas);
      setProductosVarios(variosFiltrados);
      setProductosChatarra(chatarraFiltrados);
      setProductos(productosNormalizados);
    } catch (err) {
      setProductosBateria([]);
      setProductosVarios([]);
      setProductosChatarra([]);
      setProductos([]);
      setErrorMsg(extraerMensajeError(err));
    }
  }, []);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      if (tab === 'venta') {
        const r = await ventasAPI.listar({ limite: 200 });
        setVentas(r.data?.data || []);
      } else if (tab === 'compra') {
        const r = await comprasAPI.listar({ limite: 200 });
        setCompras(r.data?.data || []);
      } else {
        const r = await chatarraAPI.listar({ limite: 200 });
        setChatarra(r.data?.data || []);
      }
    } catch (err) {
      setErrorMsg(extraerMensajeError(err));
    } finally { setCargando(false); }
  }, [tab]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  const abrirVenta = useCallback(() => {
    ventaItems.limpiarItems();
    setClienteId(''); setClienteData(null);
    setNombreCliente(''); setDocumentoCliente(''); setTelefonoCliente('');
    setClienteEmail(''); setClienteDireccion(''); setMostrarFormCliente(false);
    setMetodoPago('efectivo'); setNotas(''); setErroresValidacion([]);
    setExitoData(null); setModalExito(false);
    cargarProductos();
    setModalVenta(true);
  }, [ventaItems, cargarProductos]);

  const abrirCompra = useCallback(() => {
    compraItems.limpiarItems();
    setNotas(''); setErroresValidacion([]);
    setExitoData(null); setModalExito(false);
    cargarProductos();
    setModalCompra(true);
  }, [compraItems, cargarProductos]);

  const abrirChatarraOp = useCallback(() => {
    chatarraItems.limpiarItems();
    setTipoChatarra('salida'); setNotas(''); setErroresValidacion([]);
    setExitoData(null); setModalExito(false);
    cargarProductos();
    setModalChatarra(true);
  }, [chatarraItems, cargarProductos]);

  const normalizarItems = (items) => {
    if (!Array.isArray(items)) return [];
    return items.map(it => ({
      ...it,
      producto_id: it.producto_id === null || it.producto_id === undefined || it.producto_id === '' ? null : Number(it.producto_id),
      cantidad: Number(it.cantidad),
      precio_unitario: Number(it.precio_unitario),
      descuento: 0,
    }));
  };

  const validar = (tipo, items) => {
    const errs = [];

    if (!items || items.length === 0) {
      errs.push('Debe haber al menos un item');
      setErroresValidacion(errs);
      return false;
    }

    const itemsNorm = normalizarItems(items);

    const todosTienenProducto = itemsNorm.every(it => it.producto_id);
    if (!todosTienenProducto) {
      errs.push('Seleccione marca y tipo de caja para cada bateria');
    }

    const itemsValidos = itemsNorm.every(it => {
      const tieneProducto = it.producto_id;
      const esCustom = it.marca === 'Otro' || it.tipo_caja === 'Otro';
      if (!tieneProducto && esCustom) return true;
      return it.producto_id &&
        Number.isFinite(it.cantidad) && it.cantidad > 0 &&
        Number.isFinite(it.precio_unitario) && it.precio_unitario > 0;
    });
    if (!itemsValidos) errs.push('Seleccione una bateria valida con cantidad y precio');

    if (tipo === 'venta') {
      for (const it of itemsNorm) {
        const stock = it.stock_disponible;
        const cant = Number(it.cantidad);
        if (stock !== null && stock !== undefined && stock !== '' && !Number.isNaN(Number(stock))) {
          if (cant > Number(stock)) {
            errs.push('Stock insuficiente');
            errs.push(`Solo hay ${Number(stock)} unidades disponibles`);
            break;
          }
        }
      }
    }

    setErroresValidacion(errs);
    return errs.length === 0;
  };

  const ejecutarVenta = useCallback(async () => {
    const itemsFiltrados = ventaItems.items.filter(it => {
      if (!it || Number(it.cantidad) <= 0) return false;
      const esCustom = it.marca === 'Otro' || it.tipo_caja === 'Otro';
      if (esCustom) return it.customMarca && it.customTipoCaja;
      return it.producto_id;
    });
    const articulos = itemsFiltrados.map(it => {
      const art = {
        tipo: it.tipo,
        cantidad: Number(it.cantidad),
        precio_unitario: Number(it.precio_unitario) || 0, descuento: 0,
      };
      const esCustom = it.marca === 'Otro' || it.tipo_caja === 'Otro';
      if (esCustom) {
        art.marca_custom = it.customMarca || it.marca;
        art.tipo_caja_custom = it.customTipoCaja || it.tipo_caja;
      } else {
        art.producto_id = Number(it.producto_id);
      }
      if (it.codigo_manual) art.codigo_manual = it.codigo_manual;
      if (it.customMarca && !esCustom) art.marca_custom = it.customMarca;
      if (it.customTipoCaja && !esCustom) art.tipo_caja_custom = it.customTipoCaja;
      return art;
    });
    if (!validar('venta', itemsFiltrados)) return;
    setCargando(true); setErrorMsg('');
    try {
      const useClienteFromAutocomplete = clienteId && clienteData;
      const body = {
        subtotal: ventaItems.totales.subtotal,
        descuento: 0,
        base_imponible: ventaItems.totales.subtotal,
        monto_iva: ventaItems.totales.iva,
        total: ventaItems.totales.total,
        iva_porcentaje: ventaItems.totales.iva > 0 ? 15 : 0,
        metodo_pago: metodoPago,
        notas,
        articulos,
      };
      if (useClienteFromAutocomplete) {
        body.cliente_id = clienteId;
        body.cliente_nombre = clienteData.nombre;
        body.cliente_documento = clienteData.documento || '9999999999';
        body.cliente_telefono = clienteData.telefono || null;
        body.cliente_email = clienteData.email || null;
        body.cliente_direccion = clienteData.direccion || null;
      } else if (mostrarFormCliente) {
        body.cliente_nombre = nombreCliente || 'CONSUMIDOR FINAL';
        body.cliente_documento = documentoCliente || '9999999999';
        body.cliente_telefono = telefonoCliente || null;
        body.cliente_email = clienteEmail || null;
        body.cliente_direccion = clienteDireccion || null;
      } else {
        body.cliente_nombre = 'CONSUMIDOR FINAL';
        body.cliente_documento = '9999999999';
        body.cliente_telefono = '';
        body.cliente_email = '';
        body.cliente_direccion = '';
      }

      const res = await ventasAPI.crear(body);
      setExitoData({ tipo: 'venta', id: res.data?.data?.venta_id, total: ventaItems.totales.total });
      setModalExito(true);
      notificarGlobal('Venta procesada correctamente.', 'exito');
      await cargarProductos();
      await cargarDatos();
    } catch (err) {
      setErrorMsg(extraerMensajeError(err));
    } finally { setCargando(false); }
  }, [ventaItems.items, ventaItems.totales, clienteId, clienteData, nombreCliente, documentoCliente, telefonoCliente, clienteEmail, clienteDireccion, mostrarFormCliente, metodoPago, notas, cargarProductos, cargarDatos]);

  const ejecutarCompra = useCallback(async () => {
    const itemsFiltrados = compraItems.items.filter(it => {
      if (!it || Number(it.cantidad) <= 0) return false;
      const esCustom = it.marca === 'Otro' || it.tipo_caja === 'Otro';
      if (esCustom) return it.customMarca && it.customTipoCaja;
      return it.producto_id;
    });
    const articulos = itemsFiltrados.map(it => {
      const art = {
        tipo: it.tipo,
        cantidad: Number(it.cantidad),
        precio_unitario: Number(it.precio_unitario) || 0,
      };
      const esCustom = it.marca === 'Otro' || it.tipo_caja === 'Otro';
      if (esCustom) {
        art.marca_custom = it.customMarca || it.marca;
        art.tipo_caja_custom = it.customTipoCaja || it.tipo_caja;
      } else {
        art.producto_id = Number(it.producto_id);
      }
      if (it.customMarca && !esCustom) art.marca_custom = it.customMarca;
      if (it.customTipoCaja && !esCustom) art.tipo_caja_custom = it.customTipoCaja;
      return art;
    });
    if (!validar('compra', itemsFiltrados)) return;
    setCargando(true); setErrorMsg('');
    try {
      const body = {
        numero_factura: 'S/N',
        total: compraItems.totales.total,
        notas,
        articulos,
      };

      const res = await comprasAPI.crear(body);
      setExitoData({ tipo: 'compra', id: res.data?.data?.compra_id, total: compraItems.totales.total });
      setModalExito(true);
      notificarGlobal('Compra procesada correctamente.', 'exito');
      await cargarProductos();
      await cargarDatos();
    } catch (err) {
      setErrorMsg(extraerMensajeError(err));
    } finally { setCargando(false); }
  }, [compraItems.items, compraItems.totales, notas, cargarProductos, cargarDatos]);

  const ejecutarChatarra = useCallback(async () => {
    const itemsFiltrados = chatarraItems.items.filter(it => {
      if (!it || Number(it.cantidad) <= 0) return false;
      const esCustom = it.marca === 'Otro' || it.tipo_caja === 'Otro';
      if (esCustom) return it.customMarca && it.customTipoCaja;
      return it.producto_id;
    });
    const articulos = itemsFiltrados.map(it => {
      const art = {
        tipo: it.tipo,
        cantidad: Number(it.cantidad),
        precio_unitario: Number(it.precio_unitario) || 0, notas: it.notas || '',
      };
      const esCustom = it.marca === 'Otro' || it.tipo_caja === 'Otro';
      if (esCustom) {
        art.marca_custom = it.customMarca || it.marca;
        art.tipo_caja_custom = it.customTipoCaja || it.tipo_caja;
      } else {
        art.producto_id = Number(it.producto_id);
      }
      if (it.customMarca && !esCustom) art.marca_custom = it.customMarca;
      if (it.customTipoCaja && !esCustom) art.tipo_caja_custom = it.customTipoCaja;
      return art;
    });
    if (!validar('chatarra', itemsFiltrados)) return;
    setCargando(true); setErrorMsg('');
    try {
      const body = {
        tipo_operacion: tipoChatarra,
        subtotal: chatarraItems.totales.subtotal,
        total: chatarraItems.totales.total,
        notas, articulos,
      };

      const res = await chatarraAPI.crear(body);
      setExitoData({
        tipo: 'chatarra',
        id: res.data?.data?.chatarra_id,
        total: chatarraItems.totales.total,
        tipo_operacion: tipoChatarra,
      });
      setModalExito(true);
      notificarGlobal('Operación de chatarra procesada correctamente.', 'exito');
      await cargarProductos();
      await cargarDatos();
    } catch (err) {
      setErrorMsg(extraerMensajeError(err));
    } finally { setCargando(false); }
  }, [chatarraItems.items, chatarraItems.totales, tipoChatarra, notas, cargarProductos, cargarDatos]);

  const cerrarVenta = useCallback(() => {
    setModalVenta(false);
    ventaItems.limpiarItems();
    setClienteId(''); setClienteData(null);
    setNombreCliente(''); setDocumentoCliente(''); setTelefonoCliente('');
    setClienteEmail(''); setClienteDireccion(''); setMostrarFormCliente(false);
    setMetodoPago('efectivo'); setNotas(''); setErroresValidacion([]);
  }, [ventaItems]);

  const cerrarCompra = useCallback(() => {
    setModalCompra(false);
    compraItems.limpiarItems();
    setNotas(''); setErroresValidacion([]);
  }, [compraItems]);

  const cerrarChatarra = useCallback(() => {
    setModalChatarra(false);
    chatarraItems.limpiarItems();
    setTipoChatarra('salida'); setNotas(''); setErroresValidacion([]);
  }, [chatarraItems]);

  const cerrarModalExito = useCallback(() => {
    setModalExito(false); setModalVenta(false); setModalCompra(false); setModalChatarra(false);
    ventaItems.limpiarItems(); compraItems.limpiarItems(); chatarraItems.limpiarItems();
    setClienteId(''); setClienteData(null);
    setNombreCliente(''); setDocumentoCliente(''); setTelefonoCliente('');
    setClienteEmail(''); setClienteDireccion(''); setMostrarFormCliente(false);
    setErroresValidacion([]); setErrorMsg('');
    cargarDatos();
  }, [ventaItems, compraItems, chatarraItems, cargarDatos]);

  const generarFacturaDesdeVenta = useCallback(async (ventaId) => {
    const idVenta = Number(ventaId);
    if (!Number.isInteger(idVenta) || idVenta <= 0) {
      return { ok: false, error: 'Venta inválida para facturación.' };
    }

    try {
      const { data } = await facturasAPI.crearDesdeVenta(idVenta);
      const factura = data?.factura || null;
      if (data?.existe) {
        notificarGlobal('La factura ya existe para esta venta.', 'advertencia');
      } else {
        notificarGlobal('Factura generada correctamente desde la venta.', 'exito');
      }
      return { ok: true, factura, existe: Boolean(data?.existe) };
    } catch (err) {
      const mensaje = extraerMensajeError(err);
      setErrorMsg(mensaje);
      notificarGlobal(mensaje, 'error');
      return { ok: false, error: mensaje };
    }
  }, []);

  const vFiltradas = useMemo(() => {
    if (!busqueda) return ventas;
    const b = busqueda.toLowerCase();
    return ventas.filter(v => (v.producto_codigo||'').toLowerCase().includes(b) || (v.cliente_nombre||'').toLowerCase().includes(b) || (v.producto_marca||'').toLowerCase().includes(b));
  }, [ventas, busqueda]);

  const cFiltradas = useMemo(() => {
    if (!busqueda) return compras;
    const b = busqueda.toLowerCase();
    return compras.filter(c => (c.producto_marca||'').toLowerCase().includes(b));
  }, [compras, busqueda]);

  const hFiltrada = useMemo(() => {
    if (!busqueda) return chatarra;
    const b = busqueda.toLowerCase();
    return chatarra.filter(h => (h.producto_tipo_caja||'').toLowerCase().includes(b) || (h.notas||'').toLowerCase().includes(b));
  }, [chatarra, busqueda]);

  return {
    tab, setTab, cargando, errorMsg, setErrorMsg, busqueda, setBusqueda,
    vFiltradas, cFiltradas, hFiltrada,
    modalVenta, modalCompra, modalChatarra, modalExito, exitoData,
    abrirVenta, abrirCompra, abrirChatarra: abrirChatarraOp,
    cerrarVenta, cerrarCompra, cerrarChatarra,
    ejecutarVenta, ejecutarCompra, ejecutarChatarra,
    cerrarModalExito, cargarDatos,
    ventaItems, compraItems, chatarraItems,
    productos,
    productosBateria,
    productosVarios,
    productosChatarra,
    clienteId, setClienteId, clienteData, setClienteData,
    nombreCliente, setNombreCliente, documentoCliente, setDocumentoCliente,
    telefonoCliente, setTelefonoCliente, clienteEmail, setClienteEmail,
    clienteDireccion, setClienteDireccion, mostrarFormCliente, setMostrarFormCliente,
    metodoPago, setMetodoPago,
    notas, setNotas,
    tipoChatarra, setTipoChatarra,
    erroresValidacion, setErroresValidacion,
    generarFacturaDesdeVenta,
  };
};
