import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';
import { safeNumber } from '../utilidades/safeNumber.js';

export default function BuscadorProductoPOS({
  productos = [],
  onSelect = () => {},
  placeholder = 'Buscar por código, marca o tipo de caja',
  label = 'Producto',
  className = '',
  mode, // optional: 'bateria' | 'varios'
}) {
  const [open, setOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const isBattery = (p) => {
    if (!p) return false;
    if (p.es_bateria === true) return true;
    const cat = (p.categoria || p.tipo_producto || '').toString().toLowerCase();
    if (cat.includes('bater')) return true;
    const tipoCaja = (p.tipo_caja || '').toString().toLowerCase();
    if (tipoCaja.includes('bater')) return true;
    const nombre = (p.nombre || '').toString().toLowerCase();
    if (nombre.includes('bater')) return true;
    return false;
  };

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    // base list (apply mode filter first)
    let base = productos;
    if (mode === 'varios') {
      base = productos.filter(p => !isBattery(p));
    }
    if (!q) return base.slice(0, 10);
    return base
      .filter(p => {
        const searchFields = [
          p.codigo?.toLowerCase() || '',
          p.nombre?.toLowerCase() || '',
          p.marca?.toLowerCase() || '',
          p.tipo_caja?.toLowerCase() || '',
        ];
        return searchFields.some(field => field.includes(q));
      })
      .slice(0, 15);
  }, [searchText, productos, mode]);

  useEffect(() => { setHighlightedIndex(-1) }, [filtered]);
  useEffect(() => { if (!open) setHighlightedIndex(-1) }, [open]);

  const handleInputBlur = () => setTimeout(() => setOpen(false), 150);

  const handleSelect = useCallback((producto) => {
    onSelect(producto);
    setSearchText('');
    setOpen(false);
    inputRef.current?.blur();
  }, [onSelect]);

  const handleKeyDown = useCallback((e) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') { setOpen(true); e.preventDefault(); }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        setHighlightedIndex(prev => Math.min(prev + 1, filtered.length - 1));
        e.preventDefault();
        break;
      case 'ArrowUp':
        setHighlightedIndex(prev => Math.max(prev - 1, 0));
        e.preventDefault();
        break;
      case 'Enter':
        if (highlightedIndex >= 0 && highlightedIndex < filtered.length) handleSelect(filtered[highlightedIndex]);
        e.preventDefault();
        break;
      case 'Escape':
        setOpen(false); e.preventDefault();
        break;
    }
  }, [open, filtered, highlightedIndex, handleSelect]);

  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current?.children[highlightedIndex]) {
      listRef.current.children[highlightedIndex].scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  return (
    <div className={`relative space-y-2 ${className}`}>
      {label && (
        <label className="text-[10px] text-text-muted font-black uppercase tracking-[0.15em] ml-1 block">{label}</label>
      )}

      <div className="relative overflow-visible">
        <div
          className={[
            'relative w-full input-premium px-4 transition-all duration-200',
            'flex items-center gap-2 cursor-text min-h-[48px]',
            open && filtered.length > 0 ? 'rounded-b-none border-b-0' : '',
          ].join(' ')}
          onClick={() => { setOpen(true); inputRef.current?.focus(); }}
        >
          <Search size={16} className="text-text-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchText}
            onChange={e => { setSearchText(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted/60 h-10"
            autoComplete="off"
          />
          {searchText && (
            <button
              type="button"
              onClick={() => { setSearchText(''); inputRef.current?.focus(); }}
              className="text-text-muted hover:text-text-primary transition-colors"
            >
              <X size={16} />
            </button>
          )}
          {!searchText && filtered.length > 0 && (
            <ChevronDown size={16} className="text-text-muted shrink-0" />
          )}
        </div>

        {open && filtered.length > 0 && (
          <div ref={listRef} className="dropdown-list mt-0">
            {filtered.map((producto, i) => (
              <button
                key={`${producto.id}-${i}`}
                type="button"
                onMouseDown={e => { e.preventDefault(); handleSelect(producto); }}
                onMouseEnter={() => setHighlightedIndex(i)}
                className={[
                  'w-full text-left px-4 py-3 transition-all last:border-b-0',
                  highlightedIndex === i ? 'dropdown-item-active' : 'text-text-muted hover:bg-zinc-900/80',
                ].join(' ')}
              >
                <div className="flex items-center gap-2 justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-accent">
                    [{producto.codigo}]
                  </span>
                  <span className="text-xs font-bold text-success">
                    ${safeNumber(producto.precio_venta).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-text-muted">
                  <span className="font-semibold text-text-muted">{producto.marca || 'N/A'}</span>
                  <span>·</span>
                  <span>{producto.tipo_caja || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-text-muted">
                  <span>{producto.nombre || 'Sin nombre'}</span>
                  <span className="font-bold">Stock: {producto.stock_actual || 0}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {open && filtered.length === 0 && searchText && (
          <div className="dropdown-list mt-0 text-center px-4 py-8 text-text-muted text-sm">
            No se encontraron productos
          </div>
        )}
      </div>
    </div>
  );
}

