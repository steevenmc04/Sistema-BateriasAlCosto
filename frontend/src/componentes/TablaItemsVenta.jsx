import { useState, useMemo, useRef, useEffect } from 'react';
import { Trash2, Search, X } from 'lucide-react';
import Badge from './Badge.jsx';
import SelectPremium from './SelectPremium.jsx';
import { safeNumber } from '../utilidades/safeNumber.js';
import { esBateria } from '../utilidades/esProductoBateria.js';

const Field = ({ label, className = '', children }) => (
  <div className={`pos-field ${className}`}>
    <label className="pos-label">{label}</label>
    {children}
  </div>
);

const StockBadge = ({ stock }) => {
  if (stock === null || stock === undefined || Number.isNaN(Number(stock))) {
    return <Badge variant="neutral" size="sm">Sin seleccionar</Badge>;
  }
  const n = safeNumber(stock);
  if (n <= 0) return <Badge variant="danger" size="sm">Sin stock: 0</Badge>;
  if (n <= 5) return <Badge variant="warning" size="sm">{`Stock bajo: ${n}`}</Badge>;
  return <Badge variant="success" size="sm">{`Disponible: ${n}`}</Badge>;
};

const normalize = (v) => String(v || '').trim().toLowerCase();
const getMarca = (p) => p?.marca ?? p?.producto_marca ?? p?.brand ?? '';
const getTipoCaja = (p) => p?.tipo_caja ?? p?.tipoCaja ?? p?.producto_tipo_caja ?? p?.caja ?? '';
const getCodigo = (p) => p?.codigo ?? p?.producto_codigo ?? '';
const getStock = (p) => p?.stock ?? p?.stock_actual ?? p?.cantidad_disponible ?? p?.cantidad ?? 0;
const getPrecio = (p) => p?.precio ?? p?.precio_venta ?? p?.precio_costo ?? 0;

function BuscadorInline({ productos, valorInicial, onSelect, onChange, mode }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(valorInicial);
  const inputRef = useRef(null);

  useEffect(() => { setText(valorInicial); }, [valorInicial]);

  const filtered = useMemo(() => {
    const q = text.trim().toLowerCase();
    let base = productos || [];
    const esBateriaProducto = (p) => esBateria(p);
    if (mode === 'varios') base = base.filter((p) => !esBateriaProducto(p));
    if (mode === 'bateria') base = base.filter((p) => esBateriaProducto(p));
    if (!q) return base.slice(0, 10);
    return base.filter((p) =>
      (p.nombre || '').toLowerCase().includes(q) ||
      (p.codigo || '').toLowerCase().includes(q) ||
      (p.marca || '').toLowerCase().includes(q)
    ).slice(0, 10);
  }, [text, productos, mode]);

  return (
    <div className="relative w-full overflow-visible">
      <div className="relative flex items-center">
        <Search size={14} className="absolute left-3 text-text-muted" />
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => { setText(e.target.value); onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder="Buscar producto"
          className="input-premium text-xs pl-10"
        />
        {text && (
          <button
            type="button"
            onClick={() => { setText(''); onChange(''); inputRef.current?.focus(); }}
            className="absolute right-3 text-text-muted hover:text-text-primary"
          >
            <X size={14} />
          </button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <div className="dropdown-list">
          {filtered.map((p) => (
            <button
              key={p.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onSelect(p); setOpen(false); }}
              className="dropdown-item flex justify-between items-center text-xs"
            >
              <div>
                <span className="font-medium block">{p.nombre || p.codigo}</span>
                <span className="text-[10px] text-text-muted">{p.marca || ''} {p.tipo_caja || ''}</span>
              </div>
              <span className="money-value">${safeNumber(p.precio ?? p.precio_venta).toFixed(2)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TablaItemsVenta({
  items,
  productos = [],
  onActualizarCampo,
  onEliminarItem,
  tipoModal = 'venta',
}) {
  const isVenta = tipoModal === 'venta';
  const isCompra = tipoModal === 'compra';

  const productosBateria = useMemo(() => (productos || []).filter((p) => esBateria(p)), [productos]);
  const productosVarios = useMemo(() => (productos || []).filter((p) => !esBateria(p)), [productos]);

  const getBateriaMatch = (marca, tipoCaja) => {
    if (!marca || !tipoCaja) return null;
    const marcaNorm = normalize(marca);
    const tipoNorm = normalize(tipoCaja);
    const match = productosBateria.find((p) => {
      const pMarca = normalize(getMarca(p));
      const pTipoCaja = normalize(getTipoCaja(p));
      return pMarca === marcaNorm && pTipoCaja && pTipoCaja === tipoNorm;
    });
    return match || null;
  };

  const marcasUnicas = useMemo(() => {
    const marcas = [...new Set(productosBateria.map((p) => getMarca(p)).filter(Boolean))];
    return ['Otro', ...marcas.sort((a, b) => String(a).localeCompare(String(b)))];
  }, [productosBateria]);

  const autocompleteFromInventario = (index, marca, tipoCaja) => {
    if (!marca || !tipoCaja || marca === 'Otro' || tipoCaja === 'Otro') {
      onActualizarCampo(index, 'producto_id', null);
      onActualizarCampo(index, 'precio_unitario', '');
      onActualizarCampo(index, 'stock_disponible', null);
      return;
    }

    const match = getBateriaMatch(marca, tipoCaja);
    if (!match) {
      onActualizarCampo(index, 'producto_id', null);
      onActualizarCampo(index, 'precio_unitario', '');
      onActualizarCampo(index, 'stock_disponible', null);
      return;
    }

    const precio = Number(getPrecio(match));
    const stock = Number(getStock(match));
    onActualizarCampo(index, 'producto_id', match.id ?? match.producto_id ?? null);
    onActualizarCampo(index, 'precio_unitario', precio);
    onActualizarCampo(index, 'stock_disponible', stock);
    onActualizarCampo(index, 'precio_actual', String(precio));

    const actual = items[index];
    const codigoActual = actual?.codigo_manual ?? '';
    if (!codigoActual) {
      const codigoInventario = getCodigo(match);
      if (codigoInventario) onActualizarCampo(index, 'codigo_manual', codigoInventario);
    }
  };

  const renderFilaBateria = (item, index) => {
    const isMarcaOtro = item.marca === 'Otro';
    const tiposCajaUnicos = (() => {
      if (isMarcaOtro) return ['Otro'];
      const filtrados = item.marca
        ? productosBateria.filter((p) => normalize(getMarca(p)) === normalize(item.marca) && getTipoCaja(p))
        : productosBateria.filter((p) => getTipoCaja(p));
      const tipos = [...new Set(filtrados.map((p) => getTipoCaja(p)).filter(Boolean))];
      return ['Otro', ...tipos.sort()];
    })();
    const isCajaOtro = item.tipo_caja === 'Otro';
    const rawStock = item.stock_disponible ?? item.stock ?? item.stock_actual ?? item.cantidad_disponible;
    const stockVal = rawStock === null || rawStock === undefined || rawStock === ''
      ? null
      : safeNumber(rawStock);
    const mostrarCodigoManual = isVenta || isCompra;

    return (
      <div
        key={item.uid}
        className="relative overflow-visible border-b border-border-default/40 py-4 px-3 md:px-4 last:border-b-0 rounded-xl bg-zinc-950/30"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[minmax(180px,1fr)_minmax(180px,1fr)_140px] gap-3 items-end">
          <Field label="Marca">
            {isMarcaOtro ? (
              <input
                type="text"
                value={item.customMarca || ''}
                onChange={(e) => onActualizarCampo(index, 'customMarca', e.target.value)}
                placeholder="Ingrese una nueva marca"
                className="input-premium"
              />
            ) : (
              <SelectPremium
                options={[{ value: '', label: 'Seleccione una marca' }, ...marcasUnicas.map((m) => ({ value: String(m), label: String(m) }))]}
                value={item.marca || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  onActualizarCampo(index, 'marca', val);
                  onActualizarCampo(index, 'customMarca', '');
                  onActualizarCampo(index, 'tipo_caja', '');
                  onActualizarCampo(index, 'stock_disponible', null);
                  onActualizarCampo(index, 'precio_actual', '');
                  onActualizarCampo(index, 'precio_unitario', '');
                }}
                placeholder="Seleccione una marca"
                className="w-full"
              />
            )}
          </Field>

          <Field label="Tipo caja">
            {isCajaOtro ? (
              <input
                type="text"
                value={item.customTipoCaja || ''}
                onChange={(e) => onActualizarCampo(index, 'customTipoCaja', e.target.value)}
                placeholder="Ingrese un nuevo tipo de caja"
                className="input-premium"
              />
            ) : (
              <SelectPremium
                options={[{ value: '', label: 'Seleccione un tipo de caja' }, ...tiposCajaUnicos.map((t) => ({ value: String(t), label: String(t) }))]}
                value={item.tipo_caja || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  onActualizarCampo(index, 'tipo_caja', val);
                  onActualizarCampo(index, 'customTipoCaja', '');
                  autocompleteFromInventario(index, item.marca, val);
                }}
                placeholder="Seleccione un tipo de caja"
                className="w-full"
              />
            )}
          </Field>

          <Field label="Stock">
            <div className="h-12 flex items-center">
              <StockBadge stock={stockVal} />
            </div>
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[minmax(240px,2fr)_120px_140px_48px] gap-3 items-end mt-3">
          {mostrarCodigoManual ? (
            <Field label="Código manual" className="xl:min-w-[240px]">
              <input
                type="text"
                value={item.codigo_manual ?? ''}
                onChange={(e) => onActualizarCampo(index, 'codigo_manual', e.target.value)}
                placeholder="Ingrese el código manual"
                data-no-submit-enter="true"
                className="input-premium w-full font-mono tracking-wide"
              />
            </Field>
          ) : (
            <div className="hidden xl:block" />
          )}

          <Field label="Cantidad" className="xl:min-w-[120px]">
            <input
              type="number"
              min="1"
              value={item.cantidad === '' ? '' : item.cantidad || 1}
              onChange={(e) => onActualizarCampo(index, 'cantidad', e.target.value === '' ? '' : Number(e.target.value))}
              onBlur={() => {
                const v = item.cantidad;
                if (v === '' || Number(v) < 1) onActualizarCampo(index, 'cantidad', 1);
              }}
              className="input-premium w-full text-center"
            />
          </Field>

          <Field label="Precio" className="xl:min-w-[140px]">
            <input
              type="number"
              step="0.01"
              min="0"
              value={item.precio_unitario === '' ? '' : item.precio_unitario}
              onChange={(e) => onActualizarCampo(index, 'precio_unitario', e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="$0.00"
              className="input-premium w-full text-right"
            />
          </Field>

          <div className="h-12 flex items-end justify-start xl:justify-center">
            <button
              type="button"
              onClick={() => onEliminarItem(index)}
              className="h-12 w-12 rounded-xl text-error hover:bg-red-500/10 transition-all flex items-center justify-center"
              title="Eliminar item"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderFilaVarios = (item, index) => {
    const rawStock = item.stock_disponible ?? item.stock ?? item.stock_actual ?? item.cantidad_disponible;
    const stockVal = rawStock === null || rawStock === undefined || rawStock === ''
      ? null
      : safeNumber(rawStock);

    return (
      <div
        key={item.uid}
        className="relative overflow-visible border-b border-border-default/40 py-4 px-3 md:px-4 last:border-b-0 rounded-xl bg-zinc-950/30"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[minmax(180px,1fr)_minmax(180px,1fr)_140px] gap-3 items-end">
          <Field label="Producto" className="xl:col-span-2">
            <BuscadorInline
              productos={productosVarios}
              valorInicial={item.nombre || ''}
              mode="varios"
              onSelect={(p) => {
                onActualizarCampo(index, 'producto_id', p.id);
                onActualizarCampo(index, 'nombre', p.nombre || '');
                onActualizarCampo(index, 'stock_disponible', safeNumber(getStock(p)));
                if (!item.precio_unitario) {
                  onActualizarCampo(index, 'precio_unitario', Number(getPrecio(p)));
                }
              }}
              onChange={(val) => onActualizarCampo(index, 'nombre', val)}
            />
          </Field>

          <Field label="Stock">
            <div className="h-12 flex items-center">
              <StockBadge stock={stockVal} />
            </div>
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[minmax(240px,2fr)_120px_140px_48px] gap-3 items-end mt-3">
          <div className="hidden xl:block" />

          <Field label="Cantidad" className="xl:min-w-[120px]">
            <input
              type="number"
              min="1"
              value={item.cantidad === '' ? '' : item.cantidad || 1}
              onChange={(e) => onActualizarCampo(index, 'cantidad', e.target.value === '' ? '' : Number(e.target.value))}
              onBlur={() => {
                const v = item.cantidad;
                if (v === '' || Number(v) < 1) onActualizarCampo(index, 'cantidad', 1);
              }}
              className="input-premium w-full text-center"
            />
          </Field>

          <Field label="Precio" className="xl:min-w-[140px]">
            <input
              type="number"
              step="0.01"
              min="0"
              value={item.precio_unitario === '' ? '' : item.precio_unitario}
              onChange={(e) => onActualizarCampo(index, 'precio_unitario', e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="$0.00"
              className="input-premium w-full text-right"
            />
          </Field>

          <div className="h-12 flex items-end justify-start xl:justify-center">
            <button
              type="button"
              onClick={() => onEliminarItem(index)}
              className="h-12 w-12 rounded-xl text-error hover:bg-red-500/10 transition-all flex items-center justify-center"
              title="Eliminar item"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (items.length === 0) return null;

  const baterias = items.reduce((acc, item, index) => {
    if (item.tipo !== 'varios') acc.push({ item, index });
    return acc;
  }, []);

  const varios = items.reduce((acc, item, index) => {
    if (item.tipo === 'varios') acc.push({ item, index });
    return acc;
  }, []);

  return (
    <div className="space-y-4 overflow-visible">
      {baterias.length > 0 && (
        <div className="space-y-4 overflow-visible">
          {baterias.map(({ item, index }) => renderFilaBateria(item, index))}
        </div>
      )}
      {varios.length > 0 && (
        <div className="space-y-4 overflow-visible">
          {varios.map(({ item, index }) => renderFilaVarios(item, index))}
        </div>
      )}
    </div>
  );
}
