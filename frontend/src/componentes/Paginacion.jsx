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
  const opcionesTamano = [10, 20, 50].map((n) => ({ value: String(n), label: String(n) }));

  const inicio = (paginaActual - 1) * elementosPorPagina + 1;
  const fin = Math.min(paginaActual * elementosPorPagina, totalElementos);

  if (totalElementos === 0) return null;

  return (
    <div className="pagination-premium text-xs text-text-primary">
      <div className="pagination-left">
        <span className="text-[10px] font-black uppercase tracking-widest">Mostrar</span>
        <div className="pagination-select">
          <SelectPremium
            options={opcionesTamano}
            value={String(elementosPorPagina)}
            onChange={(e) => { setElementosPorPagina(Number(e.target.value)); setPaginaActual(1) }}
            placeholder={String(elementosPorPagina)}
            className="w-full"
            size="sm"
            openDirection="up"
          />
        </div>
      </div>

      <div className="pagination-center">
        Mostrando {inicio} a {fin} de {totalElementos} registros
      </div>

      <div className="pagination-right">
        <button
          onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
          disabled={paginaActual === 1}
          className="action-btn !w-9 !h-9 !min-w-[36px] !px-0 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Página Anterior"
        >
          <ChevronLeft size={15} />
        </button>
        
        <span className="font-bold text-text-primary px-2 text-sm whitespace-nowrap">
          {paginaActual} / {totalPaginas}
        </span>

        <button
          onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
          disabled={paginaActual === totalPaginas}
          className="action-btn !w-9 !h-9 !min-w-[36px] !px-0 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Página Siguiente"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
};

export default Paginacion;

