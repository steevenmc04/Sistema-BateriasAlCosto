import { useState, useEffect, useCallback, useMemo } from 'react';
import apiCliente, { apiUrl, extraerMensajeError } from '../servicios/servicios.js';
import { notificarGlobal } from '../contextos/NotificacionContexto.jsx';

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
  
  const [cargandoConfig, setCargandoConfig] = useState(false);
  
  const formVacio = {
    cliente_nombre: '',
    cliente_cedula_ruc: '',
    cliente_email: '',
    cliente_telefono: '',
    cliente_direccion: '',
    items: [],
    con_iva: true,
    descuento_global: 0,
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

  useEffect(() => {
    cargarFacturas();
    cargarConfig();
  }, [cargarFacturas, cargarConfig]);

  const totalesCalculados = useMemo(() => {
    let subtotal = 0;
    let descuentoItems = 0;

    formFactura.items.forEach(item => {
      subtotal += parseFloat(item.cantidad || 0) * parseFloat(item.precio_unitario || 0);
      descuentoItems += parseFloat(item.descuento || 0);
    });

    const descuentoGlobal = parseFloat(formFactura.descuento_global || 0);
    const baseImponible = subtotal - descuentoItems - descuentoGlobal;
    
    let montoIva = 0;
    if (formFactura.con_iva && configEmpresa?.iva_porcentaje) {
      montoIva = (baseImponible * parseFloat(configEmpresa.iva_porcentaje)) / 100;
    }
    
    const total = baseImponible + montoIva;

    return {
      subtotal,
      descuento: descuentoItems + descuentoGlobal,
      base_imponible: baseImponible,
      monto_iva: montoIva,
      total
    };
  }, [formFactura, configEmpresa]);

  const agregarItem = () => {
    setFormFactura(prev => ({
      ...prev,
      items: [
        ...prev.items, 
        { descripcion: '', cantidad: 1, precio_unitario: 0, descuento: 0 }
      ]
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
        items: formFactura.items,
        con_iva: formFactura.con_iva,
        descuento: formFactura.descuento_global,
        notas: formFactura.notas,
        venta_id: formFactura.venta_id
      };

      await apiCliente.post(apiUrl('/api/facturas'), payload);
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
      descuento_global:   datosVenta.descuento_global    ?? 0,
      notas:              datosVenta.notas               || '',
      items: Array.isArray(datosVenta.items) && datosVenta.items.length > 0
        ? datosVenta.items.map(item => ({
            descripcion:     item.descripcion     || '',
            cantidad:        Number(item.cantidad) || 1,
            precio_unitario: Number(item.precio_unitario) || 0,
            descuento:       Number(item.descuento) || 0,
          }))
        : [{ descripcion: '', cantidad: 1, precio_unitario: 0, descuento: 0 }],
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
    agregarItem,
    eliminarItem,
    actualizarItem,
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
