import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { safeNumber } from '../utilidades/safeNumber.js';

export default function ComponenteTablaItems({ items, onActualizarCampo, onEliminarItem, onAgregarItem, productos = [], soloLectura }) {
  const [busqueda, setBusqueda] = useState('');
  const [mostrarDrop, setMostrarDrop] = useState(false);
  const [dropIndex, setDropIndex] = useState(null);
  const inputRefs = useRef({});
  const timerRef = useRef(null);

  const productosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return [];
    const q = busqueda.toLowerCase();
    return productos.filter(p =>
      (p.nombre || '').toLowerCase().includes(q) ||
      (p.codigo || '').toLowerCase().includes(q) ||
      (p.marca || '').toLowerCase().includes(q)
    ).slice(0, 15);
  }, [productos, busqueda]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!dropIndex === null || !busqueda.trim()) return;
    timerRef.current = setTimeout(() => {}, 50);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [busqueda, dropIndex]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">Productos</label>
        {!soloLectura && (
          <button type="button" onClick={() => { onAgregarItem(); setBusqueda(''); }}
            className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-yellow-100 hover:text-yellow-100 transition-colors">
            <Plus size={14} /> Agregar item
          </button>
        )}
      </div>

      <div className="table-premium">
        <div className="table-scroll hide-scrollbar">
        <table className="w-full text-left border-collapse min-w-[860px] table-fixed">
          <thead>
            <tr>
              <th className="table-header-cell col-producto">Producto</th>
              <th className="table-header-cell col-ref">Marca</th>
              <th className="table-header-cell col-cantidad">Cant</th>
              <th className="table-header-cell col-money">Precio</th>
              <th className="table-header-cell col-money">Dscto</th>
              <th className="table-header-cell col-money">Subtotal</th>
              {!soloLectura && <th className="table-header-cell col-acciones"></th>}
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id} className="transition-colors hover:bg-zinc-900/80 border-b border-border-default">
                <td className="table-body-cell relative">
                  {soloLectura ? (
                    <div className="text-xs text-white font-medium">
                      {item.nombre || item.codigo || ''}
                      <div className="text-[9px] text-text-muted">{item.codigo || ''}</div>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        ref={el => inputRefs.current[idx] = el}
                        type="text"
                        value={item.nombre || item.codigo || ''}
                        placeholder="Buscar producto"
                        onChange={e => {
                          setBusqueda(e.target.value);
                          setDropIndex(idx);
                          setMostrarDrop(true);
                        }}
                        onFocus={() => { if (productosFiltrados.length > 0) { setDropIndex(idx); setMostrarDrop(true); } }}
                        onBlur={() => setTimeout(() => setMostrarDrop(false), 200)}
                        className="input-premium text-xs"
                      />
                      {dropIndex === idx && mostrarDrop && productosFiltrados.length > 0 && (
                        <div className="dropdown-list">
                          {productosFiltrados.map(p => (
                            <button key={p.id} type="button" onMouseDown={() => {
                              onActualizarCampo(idx, 'producto_id', p.id);
                              onActualizarCampo(idx, 'codigo', p.codigo || '');
                              onActualizarCampo(idx, 'nombre', p.nombre || '');
                              onActualizarCampo(idx, 'marca', p.marca || '');
                              onActualizarCampo(idx, 'tipo_caja', p.tipo_caja || '');
                              onActualizarCampo(idx, 'condicion', p.condicion || 'Nueva');
                              if (!item.precio_unitario) {
                                onActualizarCampo(idx, 'precio_unitario', Number(p.precio_venta || p.precio_costo || 0));
                              }
                              setBusqueda('');
                              setMostrarDrop(false);
                            }}
                              className="dropdown-item text-xs">
                              <span className="font-medium">{p.nombre || p.codigo}</span>
                              <span className="text-text-muted ml-2">{p.marca || ''}{p.tipo_caja ? ` - ${p.tipo_caja}` : ''}</span>
                              <span className="text-yellow-100 ml-2">${safeNumber(p.precio_venta).toFixed(2)}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </td>
                <td className="table-body-cell">
                  {soloLectura ? (
                    <span className="text-xs text-text-muted">{item.marca || ''}</span>
                  ) : (
                    <input type="text" value={item.marca || ''} onChange={e => onActualizarCampo(idx, 'marca', e.target.value)}
                      placeholder="Marca" className="input-premium text-xs" />
                  )}
                </td>
                <td className="table-body-cell">
                  {soloLectura ? (
                    <span className="text-xs text-white font-black block text-center">{item.cantidad}</span>
                  ) : (
                    <input type="number" min="1" value={item.cantidad === '' ? '' : item.cantidad || 1}
                      onChange={e => onActualizarCampo(idx, 'cantidad', e.target.value === '' ? '' : Number(e.target.value))}
                      onBlur={() => { const v = item.cantidad; if (v === '' || Number(v) < 1) onActualizarCampo(idx, 'cantidad', 1); }}
                      className="input-premium text-xs text-center" />
                  )}
                </td>
                <td className="table-body-cell">
                  {soloLectura ? (
                    <span className="text-xs text-yellow-100 font-bold block text-right">${safeNumber(item.precio_unitario).toFixed(2)}</span>
                  ) : (
                    <input type="number" step="0.01" min="0" value={item.precio_unitario === '' ? '' : item.precio_unitario}
                      onChange={e => onActualizarCampo(idx, 'precio_unitario', e.target.value === '' ? '' : Number(e.target.value))}
                      className="input-premium text-xs text-right" />
                  )}
                </td>
                <td className="table-body-cell">
                  {soloLectura ? (
                    <span className="text-xs text-error block text-right">{safeNumber(item.descuento) > 0 ? `-$${safeNumber(item.descuento).toFixed(2)}` : '-'}</span>
                  ) : (
                    <input type="number" step="0.01" min="0" value={item.descuento || 0}
                      onChange={e => onActualizarCampo(idx, 'descuento', Math.max(0, Number(e.target.value) || 0))}
                      className="input-premium text-xs text-right" />
                  )}
                </td>
                <td className="table-body-cell">
                  <span className="money-cell">${((safeNumber(item.cantidad) * safeNumber(item.precio_unitario)) * (1 - safeNumber(item.descuento) / 100)).toFixed(2)}</span>
                </td>
                {!soloLectura && (
                  <td className="table-body-cell">
                    <div className="action-cell">
                    <button type="button" onClick={() => onEliminarItem(idx)}
                      className="p-2 rounded-xl bg-red-900/30 border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-30"
                      disabled={items.length === 1}>
                      <Trash2 size={14} />
                    </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

