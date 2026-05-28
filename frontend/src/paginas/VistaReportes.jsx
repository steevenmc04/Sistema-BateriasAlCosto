import { useEffect, useMemo } from 'react';
import { FileText, Download, RefreshCw } from 'lucide-react';
import { useVistaReportes } from '../hooks/useVistaReportes.js';
import { usePaginacion } from '../hooks/usePaginacion.js';
import Button from '../componentes/Button.jsx';
import SelectPremium from '../componentes/SelectPremium.jsx';
import TablePremium from '../componentes/TablePremium.jsx';
import Paginacion from '../componentes/Paginacion.jsx';
import { tienePermiso } from '../utilidades/permisosCliente.js';
import { safeNumber } from '../utilidades/safeNumber.js';
import PageTitle from '../componentes/PageTitle.jsx';

const badgeTipoClass = (tipo = '') => {
  if (tipo.includes('Venta')) return 'badge-operation-sale';
  if (tipo.includes('Compra')) return 'badge-operation-buy';
  return 'badge';
};

const VistaReportes = ({ usuario }) => {
  const vp = useVistaReportes();
  const {
    paginaActual,
    setPaginaActual,
    elementosPorPagina,
    setElementosPorPagina,
    totalPaginas,
    itemsPaginados,
    totalElementos,
  } = usePaginacion(vp.registros, 10);

  const puedeVer = tienePermiso(usuario, 'reportes_ver');
  const puedePdf = tienePermiso(usuario, 'reportes_pdf');

  const esInventario = vp.tipo === 'inventario_actual';

  const columnas = useMemo(
    () => [
      { key: 'fecha', label: 'Fecha', width: '110px' },
      { key: 'tipo', label: 'Tipo', width: '150px' },
      { key: 'codigo', label: 'Código', width: '110px' },
      { key: 'producto', label: 'Producto', width: '220px' },
      { key: 'clienteProveedor', label: 'Cliente / Proveedor', width: '190px' },
      { key: 'cantidad', label: 'Cant.', width: '80px', align: 'center' },
      { key: 'iva', label: 'IVA?', width: '90px', align: 'center' },
      { key: 'total', label: 'Total', width: '120px', align: 'right' },
    ],
    []
  );

  useEffect(() => {
    if (puedeVer) vp.refrescarVista();
  }, [puedeVer, vp.tipo, vp.desde, vp.hasta, vp.refrescarVista]);

  useEffect(() => {
    setPaginaActual(1);
  }, [vp.tipo, vp.desde, vp.hasta, setPaginaActual]);

  if (!puedeVer) {
    return (
      <div className="p-16 text-center font-black uppercase tracking-[0.3em] text-error text-xs">
        No tienes permisos para acceder a esta sección.
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-[fadeIn_0.3s_ease-out]">
      <div className="flex flex-col xl:flex-row xl:justify-between gap-8">
        <PageTitle
          eyebrow="Inteligencia Operativa"
          titleWhite="Panel de"
          titleGold="Reportes"
          subtitle="Consulta ventas, compras y chatarra con filtros por tipo y rango de fechas."
        />

        <div className="space-y-5 min-w-0 xl:min-w-[360px] border-t border-border-default pt-5">
          <p className="text-[11px] font-black uppercase text-text-muted tracking-[0.3em]">Tipo de movimiento</p>
          <SelectPremium
            options={vp.opcionesTipoReporte}
            value={vp.tipo}
            onChange={(e) => vp.setTipo(e.target.value)}
            placeholder="Ventas (Todas)"
          />

          {!esInventario && (
            <>
              <p className="text-[11px] font-black uppercase text-text-muted tracking-[0.3em]">Rangos rápidos</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['hoy', 'Hoy'],
                  ['semana', 'Esta semana'],
                  ['mes', 'Este mes'],
                  ['mes_anterior', 'Mes ant.'],
                ].map(([id, texto]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => vp.aplicarPreset(id)}
                    className={`px-3 py-2 text-[10px] font-black uppercase tracking-wide border transition-all rounded-xl ${
                      vp.rangoRapido === id
                        ? 'border-border-strong bg-yellow-100/10 text-text-primary'
                        : 'border-border-default text-text-muted hover:border-border-strong'
                    }`}
                  >
                    {texto}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-[10px] font-black uppercase text-text-muted">
                  Desde
                  <input
                    type="date"
                    className="input-premium mt-1"
                    value={vp.desde}
                    onChange={(e) => vp.setDesde(e.target.value)}
                  />
                </label>
                <label className="text-[10px] font-black uppercase text-text-muted">
                  Hasta
                  <input
                    type="date"
                    className="input-premium mt-1"
                    value={vp.hasta}
                    onChange={(e) => vp.setHasta(e.target.value)}
                  />
                </label>
              </div>
            </>
          )}

          <div className="flex flex-col gap-3 pt-4 border-t border-border-default">
            <Button variant="ghost" onClick={vp.refrescarVista} icon={<RefreshCw size={16} />}>
              Refrescar consulta
            </Button>
            <Button
              disabled={vp.cargando || !puedePdf}
              onClick={() => vp.generarPDF(true)}
              icon={<Download size={18} />}
              title={!puedePdf ? 'Permiso PDF requerido.' : ''}
            >
              Descargar PDF
            </Button>
            {!puedePdf && (
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">
                Solicita habilitación de "Descargar reportes PDF" en tu rol.
              </span>
            )}
          </div>
        </div>
      </div>

      {vp.error && <div className="card-premium text-error font-bold text-sm">{vp.error}</div>}

      <div className="border-t border-border-default pt-4">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border-default">
          <div className="flex items-center gap-3 text-text-primary">
            <FileText className="text-yellow-100" />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em]">Vista previa</p>
              <p className="text-[10px] text-text-muted font-bold uppercase tracking-[0.2em]">
                {esInventario ? 'Inventario actual' : `Entre ${vp.desde} y ${vp.hasta}`}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="money-value text-xl">TOTAL USD {safeNumber(vp.totales?.monto_usd).toFixed(2)}</p>
            <p className="text-[11px] text-text-muted">Piezas · {safeNumber(vp.totales?.cantidad).toFixed(0)}</p>
          </div>
        </div>

        <div className="hidden md:block">
          <TablePremium
            columns={columnas}
            data={itemsPaginados}
            rowKey={(row, idx) => row.id || `row-${idx}`}
            loading={vp.cargando}
            loadingMessage="Consultando base de datos…"
            emptyMessage="No hay datos para el rango seleccionado."
            minWidthClass={esInventario ? 'min-w-[960px]' : 'min-w-[1080px]'}
            renderCell={(r, column) => {
              if (column.key === 'fecha') return <span className="cell-main">{vp.formatearFecha(r.fecha)}</span>;
              if (column.key === 'tipo') {
                return (
                  <span className={badgeTipoClass(r.tipoMovimiento)}>
                    {r.tipoMovimiento || '-'}
                  </span>
                );
              }
              if (column.key === 'codigo') return <span className="cell-main font-mono truncate block">{r.codigo || '-'}</span>;
              if (column.key === 'producto') return <span className="cell-main truncate block">{r.producto || '-'}</span>;
              if (column.key === 'clienteProveedor') return <span className="cell-main truncate block">{r.clienteProveedor || '-'}</span>;
              if (column.key === 'cantidad') return <span className="cell-main">{safeNumber(r.cantidad).toFixed(0)}</span>;
              if (column.key === 'iva') return <span className="cell-main">{r.iva || '-'}</span>;
              if (column.key === 'total') return <span className="money-cell">${safeNumber(r.total).toFixed(2)}</span>;
              return null;
            }}
            footer={
              <Paginacion
                paginaActual={paginaActual}
                totalPaginas={totalPaginas}
                totalElementos={totalElementos}
                elementosPorPagina={elementosPorPagina}
                setPaginaActual={setPaginaActual}
                setElementosPorPagina={setElementosPorPagina}
              />
            }
          />
        </div>

        <div className="md:hidden p-4 space-y-4">
          {vp.cargando ? (
            <div className="py-12 text-center text-[10px] font-black uppercase text-text-muted tracking-widest">
              Consultando...
            </div>
          ) : (
            itemsPaginados.map((r) => (
              <div key={r.id} className="item-card">
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">{vp.formatearFecha(r.fecha)}</p>
                    <h3 className="text-text-primary font-bold text-sm mt-1 truncate">{r.producto || 'Operación'}</h3>
                    <p className="text-[10px] text-yellow-100 font-black uppercase tracking-tight mt-0.5 truncate">{r.codigo || '-'}</p>
                  </div>
                  <div className="text-right">
                    <span className={badgeTipoClass(r.tipoMovimiento)}>{r.tipoMovimiento || '-'}</span>
                    <p className="money-value text-lg mt-2">${safeNumber(r.total).toFixed(2)}</p>
                    <p className="text-[9px] text-text-muted uppercase font-bold">{safeNumber(r.cantidad).toFixed(0)} uds</p>
                  </div>
                </div>
                <div className="pt-3 border-t border-border-default mt-3">
                  <p className="text-[9px] text-text-muted font-black uppercase tracking-widest">Cliente / Proveedor</p>
                  <p className="text-text-primary text-[11px] font-bold truncate">{r.clienteProveedor || '-'}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {!vp.cargando && (
          <div className="md:hidden p-4 pt-0">
            <Paginacion
              paginaActual={paginaActual}
              totalPaginas={totalPaginas}
              totalElementos={totalElementos}
              elementosPorPagina={elementosPorPagina}
              setPaginaActual={setPaginaActual}
              setElementosPorPagina={setElementosPorPagina}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default VistaReportes;
