import { ChevronLeft, ChevronRight } from 'lucide-react';
import SelectPremium from './SelectPremium.jsx'

const Paginacion = ({ 
  paginaActual, 
  totalPaginas, 
  totalElementos, 
  elementosPorPagina, 
  setPaginaActual, 
  setElementosPorPagina 
}) => {
  const opcionesTamano = [10, 15, 20, 25, 50, 100].map((n) => ({ value: String(n), label: String(n) }));

  const inicio = (paginaActual - 1) * elementosPorPagina + 1;
  const fin = Math.min(paginaActual * elementosPorPagina, totalElementos);

  if (totalElementos === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr_auto] items-center gap-4 p-4 md:px-6 border-t border-border-default bg-black/40 text-xs text-text-primary">
      <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 min-w-0">
        <span className="text-[10px] font-black uppercase tracking-widest">Mostrar</span>
        <div className="w-24">
          <SelectPremium
            options={opcionesTamano}
            value={String(elementosPorPagina)}
            onChange={(e) => { setElementosPorPagina(Number(e.target.value)); setPaginaActual(1) }}
            placeholder={String(elementosPorPagina)}
            className="w-full"
          />
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest">registros</span>
      </div>

      <div className="min-w-0 text-center font-medium text-text-primary text-[10px]">
        Mostrando {inicio} a {fin} de {totalElementos} registros
      </div>

      <div className="flex items-center justify-center lg:justify-end gap-2">
        <button
          onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
          disabled={paginaActual === 1}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-950 border border-border-default hover:bg-yellow-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-text-primary"
          title="Página Anterior"
        >
          <ChevronLeft size={15} />
        </button>
        
        <span className="font-bold text-text-primary px-2 text-sm">
          {paginaActual} / {totalPaginas}
        </span>

        <button
          onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
          disabled={paginaActual === totalPaginas}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-950 border border-border-default hover:bg-yellow-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-text-primary"
          title="Página Siguiente"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
};

export default Paginacion;

