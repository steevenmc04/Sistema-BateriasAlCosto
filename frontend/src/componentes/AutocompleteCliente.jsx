import React from 'react';
import useAutocompleteCliente from '../hooks/useAutocompleteCliente';

export default function AutocompleteCliente({ onSelect, placeholder = 'Buscar cliente', label = 'Cliente' }) {
  const {
    busqueda, setBusqueda, resultados, cargando, abierto, setAbierto,
    seleccionado, indiceActivo, inputRef, seleccionar, limpiar, handleKeyDown
  } = useAutocompleteCliente({ onSelect });

  return (
    <div className="relative w-full">
      <label className="text-[10px] text-text-muted font-black uppercase tracking-[0.15em] ml-1 block mb-2">{label}</label>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={busqueda}
          onChange={(e) => { setBusqueda(e.target.value); setAbierto(true); }}
          onFocus={() => { if (resultados.length > 0) setAbierto(true); }}
          onBlur={() => setTimeout(() => setAbierto(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder={seleccionado ? seleccionado.nombre : placeholder}
          className={[
            'input-premium',
            abierto && resultados.length > 0 ? 'rounded-b-none border-b-0 border-yellow-100' : '',
          ].join(' ')}
        />
        {seleccionado && (
          <button
            type="button"
            onClick={limpiar}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {abierto && resultados.length > 0 && (
        <div className="dropdown-list">
          {resultados.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onMouseDown={() => seleccionar(c)}
              className={[
                'dropdown-item',
                i === indiceActivo ? 'dropdown-item-active' : '',
              ].join(' ')}
            >
              <span className="font-medium text-white">{c.nombre}</span>
              <span className="text-text-muted ml-2">{c.documento ? `· ${c.documento}` : ''}</span>
              {c.telefono && <span className="text-text-muted ml-2 text-xs">{c.telefono}</span>}
            </button>
          ))}
        </div>
      )}

      {seleccionado && (
        <div className="mt-3 p-3 bg-zinc-900/50 rounded-xl border border-border-default text-xs text-text-muted space-y-0.5">
          {seleccionado.documento && <p><span className="font-medium text-text-muted">Doc:</span> {seleccionado.documento}</p>}
          {seleccionado.telefono && <p><span className="font-medium text-text-muted">Tel:</span> {seleccionado.telefono}</p>}
          {seleccionado.email && <p><span className="font-medium text-text-muted">Email:</span> {seleccionado.email}</p>}
        </div>
      )}
    </div>
  );
}

