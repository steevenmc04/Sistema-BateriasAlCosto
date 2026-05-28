import { useState, useCallback, useMemo } from 'react';
import { safeNumber } from '../utilidades/safeNumber.js';

let _keyCounter = 0;
function uid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  _keyCounter += 1;
  return `tmp-${Date.now()}-${_keyCounter}`;
}

export function useOperacionMultiItem() {
  const [items, setItems] = useState([]);
  const [aplicarIVAGlobal, setAplicarIVAGlobal] = useState(false);

  const agregarItem = useCallback((itemData = {}) => {
    const nextUid = itemData.uid || uid();
    const nuevoItem = {
      uid: nextUid,
      id: nextUid,
      producto_id: itemData.producto_id || null,
      tipo: itemData.tipo || 'bateria',
      codigo: itemData.codigo || '',
      nombre: itemData.nombre || '',
      marca: itemData.marca || '',
      customMarca: itemData.customMarca || '',
      tipo_caja: itemData.tipo_caja || '',
      customTipoCaja: itemData.customTipoCaja || '',
      condicion: itemData.condicion || 'Nueva',
      cantidad: Math.max(1, safeNumber(itemData.cantidad) || 1),
      precio_unitario: itemData.precio_unitario || '',
      descuento: 0,

      codigo_manual: itemData.codigo_manual ?? itemData.codigoManual ?? '',
      codigoManual: itemData.codigoManual ?? itemData.codigo_manual ?? '',
      stock_disponible: itemData.stock_disponible ?? null,
      precio_actual: itemData.precio_actual ?? '',
    };
    setItems(prev => [...prev, nuevoItem]);
  }, []);

  const eliminarItem = useCallback((index) => {
    setItems(prev => prev.filter((_, i) => i !== index));
    return true;
  }, []);

  const actualizarCampo = useCallback((index, campo, valor) => {
    setItems(prev => {
      return prev.map((item, i) => {
        if (i !== index) return item;
        const actualizado = { ...item, [campo]: valor };
        if (campo === 'codigo_manual') actualizado.codigoManual = valor;
        if (campo === 'codigoManual') actualizado.codigo_manual = valor;
        return actualizado;
      });
    });
  }, []);

  const seleccionarProducto = useCallback((index, producto) => {
    setItems(prev => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        producto_id: producto.id,
        codigo: producto.codigo || '',
        nombre: producto.nombre || '',
        marca: producto.marca || '',
        customMarca: '',
        tipo_caja: producto.tipo_caja || '',
        customTipoCaja: '',
        condicion: producto.condicion || 'Nueva',
        precio_unitario: next[index].precio_unitario || safeNumber(producto.precio_venta || producto.precio_costo || 0),
      };
      return next;
    });
  }, []);

  const limpiarItems = useCallback(() => {
    setItems([]);
  }, []);

  const totales = useMemo(() => {
    const subtotal = items.reduce((s, it) => s + (safeNumber(it.cantidad) * safeNumber(it.precio_unitario)), 0);
    const subtotalRedondeado = Math.round(safeNumber(subtotal) * 100) / 100;
    const totalIva = aplicarIVAGlobal ? Math.round(safeNumber(subtotal) * 0.15 * 100) / 100 : 0;
    const ivaRedondeado = Math.round(safeNumber(totalIva) * 100) / 100;
    const total = Math.round((subtotalRedondeado + ivaRedondeado) * 100) / 100;

    return {
      subtotal: subtotalRedondeado,
      iva: ivaRedondeado,
      total,
      cantidadTotal: items.reduce((s, it) => s + safeNumber(it.cantidad), 0),
      cantidadItems: items.length,
    };
  }, [items, aplicarIVAGlobal]);

  const calcularSubtotalItem = useCallback((item) => {
    return Math.max(0, safeNumber(item.cantidad) * safeNumber(item.precio_unitario));
  }, []);

  return {
    items, totales, agregarItem, eliminarItem, actualizarCampo, seleccionarProducto, limpiarItems, calcularSubtotalItem,
    aplicarIVAGlobal, setAplicarIVAGlobal,
  };
}

export default useOperacionMultiItem;
