import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import BuscadorProductoPOS from './BuscadorProductoPOS';
import SelectPremium from './SelectPremium.jsx';
import { safeNumber } from '../utilidades/safeNumber.js';

export default function FormularioAgregarItemPOS({
  productos = [],
  onAgregar = () => {},
  onCancelar = () => {},
  mostrar = false,
}) {
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [cantidad, setCantidad] = useState('1');
  const [precioUnitario, setPrecioUnitario] = useState('');
  const [descuento, setDescuento] = useState('0');
  const [codigoManual, setCodigoManual] = useState('');
  const [marcaSeleccionada, setMarcaSeleccionada] = useState('');
  const [tipoCajaSeleccionada, setTipoCajaSeleccionada] = useState('');
  const [errores, setErrores] = useState([]);

  const marcasUnicas = useMemo(() => {
    const marcas = [...new Set(productos.filter(p => p.marca).map(p => p.marca))];
    return marcas.sort();
  }, [productos]);

  const tiposCajaUnicos = useMemo(() => {
    const filtrados = marcaSeleccionada
      ? productos.filter(p => p.marca === marcaSeleccionada && p.tipo_caja)
      : productos.filter(p => p.tipo_caja);
    const tipos = [...new Set(filtrados.map(p => p.tipo_caja))];
    return tipos.sort();
  }, [productos, marcaSeleccionada]);

  const subtotal = (() => {
    const p = safeNumber(precioUnitario);
    const c = safeNumber(cantidad);
    const d = safeNumber(descuento);
    const sub = p * c;
    return sub - (sub * d / 100);
  })();

  useEffect(() => {
    if (productoSeleccionado) {
      setPrecioUnitario(String(productoSeleccionado.precio_venta || 0));
      setCodigoManual(productoSeleccionado.codigo || '');
      setMarcaSeleccionada(productoSeleccionado.marca || '');
      setTipoCajaSeleccionada(productoSeleccionado.tipo_caja || '');
      setCantidad('1');
      setDescuento('0');
      setErrores([]);
    }
  }, [productoSeleccionado]);

  const validar = () => {
    const errs = [];
    if (!productoSeleccionado && !codigoManual.trim()) {
      errs.push('Selecciona un producto o ingresa código manual');
    }
    if (!cantidad || safeNumber(cantidad) <= 0) {
      errs.push('Cantidad debe ser mayor a 0');
    }
    if (precioUnitario === '' || safeNumber(precioUnitario) < 0) {
      errs.push('Precio debe ser válido');
    }
    setErrores(errs);
    return errs.length === 0;
  };

  const handleAgregar = useCallback(() => {
    if (!validar()) return;

    const item = {
      producto_id: productoSeleccionado?.id || null,
      codigo_manual: codigoManual || null,
      nombre: productoSeleccionado?.nombre || codigoManual,
      marca: marcaSeleccionada || productoSeleccionado?.marca || '',
      tipo_caja: tipoCajaSeleccionada || productoSeleccionado?.tipo_caja || '',
      cantidad: safeNumber(cantidad),
      precio_unitario: safeNumber(precioUnitario),
      descuento: safeNumber(descuento),
      subtotal: subtotal,
    };

    onAgregar(item);
    setProductoSeleccionado(null);
    setCantidad('1');
    setPrecioUnitario('');
    setDescuento('0');
    setCodigoManual('');
    setMarcaSeleccionada('');
    setTipoCajaSeleccionada('');
    setErrores([]);
  }, [productoSeleccionado, cantidad, precioUnitario, descuento, codigoManual, marcaSeleccionada, tipoCajaSeleccionada, subtotal, onAgregar]);

  const handleCancelar = useCallback(() => {
    setProductoSeleccionado(null);
    setCantidad('1');
    setPrecioUnitario('');
    setDescuento('0');
    setCodigoManual('');
    setMarcaSeleccionada('');
    setTipoCajaSeleccionada('');
    setErrores([]);
    onCancelar();
  }, [onCancelar]);

  if (!mostrar) return null;

  return (
    <div className="space-y-5 overflow-visible">
      <BuscadorProductoPOS
        productos={productos}
        onSelect={setProductoSeleccionado}
        placeholder="Buscar producto por código, marca o tipo de caja"
        label="Seleccionar Producto"
      />

      <div>
        <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1 block mb-2">
          Código Manual
        </label>
        <input
          type="text"
          value={codigoManual}
          onChange={e => {
            const val = e.target.value;
            setCodigoManual(val);
            if (val.trim()) {
              const encontrado = productos.find(p =>
                p.codigo?.toLowerCase() === val.trim().toLowerCase()
              );
              if (encontrado) setProductoSeleccionado(encontrado);
            }
          }}
          placeholder="Ej: BAT-001, ECU-005 — busca automáticamente"
          className="input-premium"
        />
      </div>

      {productoSeleccionado && (
        <div className="space-y-4 border-t border-border-default pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1 block mb-2">Marca</label>
              <SelectPremium
                options={[{ value: '', label: 'Seleccione una marca' }, ...marcasUnicas.map(m => ({ value: m, label: m }))]}
                value={marcaSeleccionada}
                onChange={e => { setMarcaSeleccionada(e.target.value); setTipoCajaSeleccionada(''); }}
                placeholder="Seleccione una marca"
                className="w-full"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1 block mb-2">Tipo de Caja</label>
              <SelectPremium
                options={[{ value: '', label: 'Seleccione un tipo de caja' }, ...tiposCajaUnicos.map(t => ({ value: t, label: t }))]}
                value={tipoCajaSeleccionada}
                onChange={e => setTipoCajaSeleccionada(e.target.value)}
                placeholder="Seleccione un tipo de caja"
                className="w-full"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-text-muted font-bold uppercase block">Stock</span>
              <p className="text-success font-semibold text-sm mt-1">{productoSeleccionado.stock_actual || 0}</p>
            </div>
            <div>
              <span className="text-text-muted font-bold uppercase block">Código</span>
              <p className="text-yellow-100 font-mono text-sm mt-1">{productoSeleccionado.codigo}</p>
            </div>
            <div>
              <span className="text-text-muted font-bold uppercase block">Condición</span>
              <p className="text-white font-semibold text-sm mt-1">{productoSeleccionado.condicion || 'Nueva'}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1 block mb-2">
            Cantidad
          </label>
          <input
            type="number"
            value={cantidad === '' ? '' : Number(cantidad)}
            onChange={e => setCantidad(e.target.value === '' ? '' : String(Number(e.target.value)))}
            onBlur={() => { if (cantidad === '' || Number(cantidad) < 1) setCantidad('1'); }}
            min="0.01"
            step="0.01"
            className="input-premium w-full min-w-[120px]"
          />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1 block mb-2">
            Precio Unit.
          </label>
          <input
            type="number"
            value={precioUnitario}
            onChange={e => setPrecioUnitario(e.target.value)}
            min="0"
            step="0.01"
            className="input-premium"
          />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1 block mb-2">
            Descuento %
          </label>
          <input
            type="number"
            value={descuento}
            onChange={e => setDescuento(e.target.value)}
            min="0"
            max="100"
            step="1"
            className="input-premium"
          />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1 block mb-2">
            Subtotal
          </label>
          <div className="w-full px-1 py-3 text-sm font-bold text-success flex items-center">
            ${safeNumber(subtotal).toFixed(2)}
          </div>
        </div>
      </div>

      {errores.length > 0 && (
        <div className="border-l border-error/50 pl-4 py-1">
          <ul className="text-xs text-error/80 space-y-1">
            {errores.map((err, i) => (
              <li key={i}>• {err}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={handleCancelar}
          className="flex-1 px-4 py-2.5 bg-zinc-900 border border-border-default text-text-muted hover:text-white hover:bg-zinc-900 rounded-xl transition-all font-semibold text-sm uppercase tracking-wider"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleAgregar}
          className="flex-1 px-4 py-2.5 bg-brand-500 hover:bg-brand-400 text-black rounded-xl transition-all font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-glow-sm"
        >
          <Plus size={16} />
          Agregar Item
        </button>
      </div>
    </div>
  );
}


