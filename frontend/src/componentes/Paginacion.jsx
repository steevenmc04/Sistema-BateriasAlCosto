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
  const opcionesTamano = [10, 15, 20, 25, 50, 100];

  const inicio = (paginaActual - 1) * elementosPorPagina + 1;
  const fin = Math.min(paginaActual * elementosPorPagina, totalElementos);

  if (totalElementos === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 md:px-6 border-t border-border-default bg-black/40 text-xs text-text-muted">
      
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-black uppercase tracking-widest">Mostrar</span>
        <div className="w-28">
          <SelectPremium
            options={opcionesTamano}
            value={elementosPorPagina}
            onChange={(e) => { setElementosPorPagina(Number(e.target.value)); setPaginaActual(1) }}
            placeholder={String(elementosPorPagina)}
            className="w-full"
          />
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest">registros</span>
      </div>

      <div className="flex-1 text-center font-medium text-text-muted text-[10px]">
        Mostrando {inicio} a {fin} de {totalElementos} registros
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
          disabled={paginaActual === 1}
          className="w-8 h-8 flex items-center justify-center rounded-xl bg-black border border-border-default hover:bg-yellow-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-text-muted"
          title="Página Anterior"
        >
          <ChevronLeft size={15} />
        </button>
        
        <span className="font-bold text-white px-2 text-sm">
          {paginaActual} / {totalPaginas}
        </span>

        <button
          onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
          disabled={paginaActual === totalPaginas}
          className="w-8 h-8 flex items-center justify-center rounded-xl bg-black border border-border-default hover:bg-yellow-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-text-muted"
          title="Página Siguiente"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
};

export default Paginacion;

