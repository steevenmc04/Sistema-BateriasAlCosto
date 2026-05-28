import React from 'react';
import { FileText, Download, RefreshCw } from 'lucide-react';
import { useVistaReportes } from '../hooks/useVistaReportes.js';
import { usePaginacion } from '../hooks/usePaginacion.js';
import Button from '../componentes/Button.jsx';
import Badge from '../componentes/Badge.jsx';
import SelectPremium from '../componentes/SelectPremium.jsx';
import TablePremium from '../componentes/TablePremium.jsx';
import Paginacion from '../componentes/Paginacion.jsx';
import { tienePermiso } from '../utilidades/permisosCliente.js';
import { safeNumber } from '../utilidades/safeNumber.js';
import PageTitle from '../componentes/PageTitle.jsx';

const formatearFecha = (f) => {
  if (!f) return '-';
  try { const d = new Date(f); if (isNaN(d.getTime())) return String(f); return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
  catch (e) { return String(f); }
};

const obtenerCodigoManual = (r) => {
  if (r.notas) { const match = r.notas.match(/Ref\.\sfísica\/SRI:\s*([^|]+)/); if (match && match[1]) return match[1].trim(); }
  return r.codigo_bateria || r.codigo_item || '-';
};

const VistaReportes = ({ usuario }) => {
  const vp = useVistaReportes();
  const {
    paginaActual, setPaginaActual,
    elementosPorPagina, setElementosPorPagina,
    totalPaginas, itemsPaginados, totalElementos
  } = usePaginacion(vp.registros, 10);
  const puedeVer = tienePermiso(usuario, 'reportes_ver');
  const puedePdf = tienePermiso(usuario, 'reportes_pdf');
  const columnasVentas = [
    { key: 'fecha', label: 'Fecha', width: '110px' },
    { key: 'tipo', label: 'Tipo', width: '90px' },
    { key: 'codigo', label: 'Código', width: '110px' },
    { key: 'cliente', label: 'Cliente', width: '200px' },
    { key: 'vendedor', label: 'Vendido por', width: '160px' },
    { key: 'cantidad', label: 'Cant.', width: '75px', align: 'center' },
    { key: 'iva', label: 'IVA?', width: '90px', align: 'center' },
    { key: 'total', label: 'Total', width: '120px', align: 'right' },
  ];
  const columnasCompras = [
    { key: 'fecha', label: 'Fecha', width: '110px' },
    { key: 'marca', label: 'Marca', width: '180px' },
    { key: 'caja', label: 'Caja', width: '160px' },
    { key: 'cond', label: 'Cond.', width: '90px' },
    { key: 'cantidad', label: 'Cantidad', width: '70px', align: 'center' },
    { key: 'total', label: 'Total', width: '120px', align: 'right' },
    { key: 'proveedor', label: 'Proveedor' },
  ];
  const columnasChatarra = [
    { key: 'fecha', label: 'Fecha', width: '110px' },
    { key: 'tipo', label: 'Operación', width: '90px' },
    { key: 'caja', label: 'Caja', width: '160px' },
    { key: 'cantidad', label: 'Cantidad', width: '70px', align: 'center' },
    { key: 'pu', label: 'PU', width: '110px', align: 'right' },
    { key: 'total', label: 'Total', width: '120px', align: 'right' },
    { key: 'contraparte', label: 'Contraparte' },
  ];
  const columnasInventario = [
    { key: 'clase', label: 'Clase', width: '100px' },
    { key: 'ref', label: 'Ref', width: '120px' },
    { key: 'marca', label: 'Marca', width: '210px' },
    { key: 'caja', label: 'Caja', width: '180px' },
    { key: 'cantidad', label: 'Cantidad', width: '80px', align: 'center' },
    { key: 'stock', label: 'Stock Valorizado', width: '150px', align: 'right' },
    { key: 'estado', label: 'Estado', width: '130px', align: 'center' },
  ];

  const renderDesktopCell = (r, column) => {
    if (vp.tipo.startsWith('ventas')) {
      if (column.key === 'fecha') return <span className="cell-main">{formatearFecha(r.fecha)}</span>;
      if (column.key === 'tipo') return <span className="cell-sub uppercase text-yellow-100">{r.tipo}</span>;
      if (column.key === 'codigo') return <span className="cell-main font-mono truncate block">{obtenerCodigoManual(r)}</span>;
      if (column.key === 'cliente') return <span className="cell-main truncate block">{r.nombre_cliente}</span>;
      if (column.key === 'vendedor') return <span className="cell-main truncate block">{r.usuario_nombre || '-'}</span>;
      if (column.key === 'cantidad') return <span className="cell-main">{r.cantidad}</span>;
      if (column.key === 'iva') return <span className="cell-main">{safeNumber(r.con_iva) === 1 ? 'Con IVA' : 'Sin IVA'}</span>;
      if (column.key === 'total') return <span className="money-cell">${safeNumber(r.total).toFixed(2)}</span>;
      return null;
    }

    if (vp.tipo === 'compras') {
      if (column.key === 'fecha') return <span className="cell-main">{formatearFecha(r.fecha)}</span>;
      if (column.key === 'marca') return <span className="cell-main truncate block">{r.marca}</span>;
      if (column.key === 'caja') return <span className="cell-main truncate block">{r.tipo_caja}</span>;
      if (column.key === 'cond') return <span className="cell-main">{r.condicion}</span>;
      if (column.key === 'cantidad') return <span className="cell-main">{r.cantidad}</span>;
      if (column.key === 'total') return <span className="money-cell">${safeNumber(r.total).toFixed(2)}</span>;
      if (column.key === 'proveedor') return <span className="cell-main truncate block">{r.proveedor}</span>;
      return null;
    }

    if (vp.tipo === 'chatarra') {
      if (column.key === 'fecha') return <span className="cell-main">{formatearFecha(r.fecha)}</span>;
      if (column.key === 'tipo') return <span className="cell-main uppercase">{r.tipo_operacion}</span>;
      if (column.key === 'caja') return <span className="cell-main">{r.tipo_caja}</span>;
      if (column.key === 'cantidad') return <span className="cell-main">{r.cantidad}</span>;
      if (column.key === 'pu') return <span className="money-cell">${safeNumber(r.precio_unitario).toFixed(2)}</span>;
      if (column.key === 'total') return <span className="money-cell">${safeNumber(r.total).toFixed(2)}</span>;
      if (column.key === 'contraparte') return <span className="cell-main">{r.nombre_cliente_proveedor}</span>;
      return null;
    }

    if (column.key === 'clase') return <span className="cell-main uppercase">{r.clase}</span>;
    if (column.key === 'ref') return <span className="cell-main font-mono">{r.ref}</span>;
    if (column.key === 'marca') return <span className="cell-main">{r.marca}</span>;
    if (column.key === 'caja') return <span className="cell-main truncate block">{r.tipo_caja || '—'}</span>;
    if (column.key === 'cantidad') return <span className="cell-main">{r.cantidad}</span>;
    if (column.key === 'stock') return <span className="money-cell">${(safeNumber(r.cantidad || 0) * safeNumber(r.precio || 0)).toFixed(2)}</span>;
    if (column.key === 'estado') {
      return (
        <div className="action-cell">
          <Badge cantidad={r.cantidad} size="sm">
            {r.estado_stock === 'sin_stock' ? 'Sin stock' : r.cantidad <= 5 ? 'Stock bajo' : 'Con stock'}
          </Badge>
        </div>
      );
    }
    return null;
  };

  React.useEffect(() => { if (puedeVer) vp.refrescarVista(); }, [puedeVer, vp.tipo, vp.desde, vp.hasta]);
  React.useEffect(() => { setPaginaActual(1); }, [vp.tipo, vp.desde, vp.hasta, setPaginaActual]);

  if (!puedeVer) return <div className="p-16 text-center font-black uppercase tracking-[0.3em] text-error text-xs">No tienes permisos para acceder a esta sección.</div>;

  return (
    <div className="space-y-8 animate-[fadeIn_0.3s_ease-out]">
      <div className="flex flex-col lg:flex-row lg:justify-between gap-8">
        <PageTitle
          eyebrow="Inteligencia Operativa"
          titleWhite="Panel de"
          titleGold="Reportes"
          subtitle="Filtra períodos y sincroniza la vista previa con las tablas de ventas, compras y chatarra."
        />

        <div className="space-y-5 min-w-0 lg:min-w-[320px] border-t border-border-default pt-5">
          <p className="text-[11px] font-black uppercase text-text-muted tracking-[0.3em]">Tipo de información</p>
          <div>
            <SelectPremium
              options={[
                { value: 'ventas', label: 'Ventas (Todas)' },
                { value: 'ventas_bateria', label: 'Ventas (Solo Baterías)' },
                { value: 'ventas_varios', label: 'Ventas (Solo Varios)' },
                { value: 'compras', label: 'Compras' },
                { value: 'chatarra', label: 'Chatarra' },
                { value: 'inventario', label: 'Inventario actual' },
              ]}
              value={vp.tipo}
              onChange={(e) => vp.setTipo(e.target.value)}
              placeholder="Ventas (Todas)"
            />
          </div>

          {vp.tipo !== 'inventario' && (
            <>
          <p className="text-[11px] font-black uppercase text-text-muted tracking-[0.3em]">Rangos rápidos</p>
              <div className="grid grid-cols-2 gap-2">
                {[['hoy','Hoy'],['semana','Esta semana'],['mes','Este mes'],['mes_anterior','Mes ant.']].map(([id, texto]) => (
                  <button key={id} type="button" onClick={() => vp.aplicarPreset(id)}
                    className={`px-3 py-2 text-[10px] font-black uppercase tracking-wide border transition-all rounded-xl ${
                      vp.rangoRapido === id ? 'border-border-strong bg-yellow-100/10 text-text-primary' : 'border-border-default text-text-muted hover:border-border-strong'}`}>
                    {texto}
                  </button>
                ))}
              </div>
              <div className="form-grid">
                 <label className="text-[10px] font-black uppercase text-text-muted">
                  Desde
                  <input type="date" className="input-premium"
                    value={vp.desde} onChange={(e) => vp.setDesde(e.target.value)} />
                </label>
                 <label className="text-[10px] font-black uppercase text-text-muted">
                  Hasta
                  <input type="date" className="input-premium"
                    value={vp.hasta} onChange={(e) => vp.setHasta(e.target.value)} />
                </label>
              </div>
            </>
          )}
          <div className="flex flex-col gap-3 pt-4 border-t border-border-default">
            <Button variant="ghost" onClick={vp.refrescarVista} icon={<RefreshCw size={16} />}>Refrescar consulta</Button>
            <Button disabled={vp.cargando || !puedePdf} onClick={() => vp.generarPDF(true)} icon={<Download size={18} />} title={!puedePdf ? 'Permiso PDF requerido.' : ''}>Descargar PDF</Button>
            {!puedePdf && <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Solicita habilitación de "Descargar reportes PDF" en tu rol.</span>}
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
                {vp.tipo === 'inventario' ? 'Snapshot actual' : `Entre ${vp.desde} y ${vp.hasta}`}
              </p>
            </div>
          </div>
          <div className="text-right font-black text-xl">
            {vp.totales?.monto_usd != null && <p className="money-value">TOTAL USD {safeNumber(vp.totales.monto_usd).toFixed(2)}</p>}
            {vp.totales?.cantidad != null && <p className="text-[11px] text-text-muted">Piezas · {vp.totales.cantidad}</p>}
            {vp.totales?.cantidad_unidades != null && <p className="text-[11px] text-text-muted">Piezas combinadas · {vp.totales.cantidad_unidades}</p>}
          </div>
        </div>

        {vp.tipo.startsWith('ventas') && vp.totales && !vp.cargando && (
          <div className="grid grid-cols-2 gap-4 px-6 py-4">
            <div className="py-2">
              <span className="text-[9px] font-black uppercase tracking-wider text-text-muted">Total Ventas</span>
              <p className="money-value text-xl mt-1">${safeNumber(vp.totales.monto_usd || 0).toFixed(2)}</p>
            </div>
            <div className="py-2">
              <span className="text-[9px] font-black uppercase tracking-wider text-text-muted">Articulos vendidos</span>
              <p className="text-xl font-black text-yellow-100 mt-1">{safeNumber(vp.totales.cantidad || 0)}</p>
            </div>
          </div>
        )}

        {vp.tipo === 'inventario' && vp.totales && !vp.cargando && (
          <div className="grid grid-cols-2 gap-4 px-6 py-4">
            <div className="py-2">
              <span className="text-[9px] font-black uppercase tracking-wider text-text-muted">Total Unidades en Stock</span>
              <p className="text-xl font-black text-white mt-1">{vp.totales.cantidad_unidades} unidades</p>
            </div>
            <div className="py-2">
              <span className="text-[9px] font-black uppercase tracking-wider text-text-muted">Stock Valorizado</span>
              <p className="money-value text-xl mt-1">${safeNumber(vp.totales.monto_usd || 0).toFixed(2)}</p>
            </div>
          </div>
        )}

        {/* DESKTOP TABLE */}
        <div className="hidden md:block">
          <TablePremium
            columns={
              vp.tipo.startsWith('ventas')
                ? columnasVentas
                : vp.tipo === 'compras'
                  ? columnasCompras
                  : vp.tipo === 'chatarra'
                    ? columnasChatarra
                    : columnasInventario
            }
            data={itemsPaginados}
            rowKey={(row, idx) => row.id || `${vp.tipo}-${idx}`}
            loading={vp.cargando}
            loadingMessage="Consultando base de datos…"
            emptyMessage="No hay datos para el rango seleccionado."
            minWidthClass={
              vp.tipo.startsWith('ventas')
                ? 'min-w-[1000px]'
                : vp.tipo === 'compras'
                  ? 'min-w-[960px]'
                  : vp.tipo === 'chatarra'
                    ? 'min-w-[920px]'
                    : 'min-w-[980px]'
            }
            renderCell={renderDesktopCell}
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

        {/* MOBILE CARDS */}
        <div className="md:hidden p-4 space-y-4">
          {vp.cargando ? (
            <div className="py-12 text-center text-[10px] font-black uppercase text-text-muted tracking-widest">Consultando...</div>
          ) : (
            itemsPaginados.map((r, idx) => (
              <div key={idx} className="item-card">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">{vp.tipo !== 'inventario' ? formatearFecha(r.fecha) : r.clase}</p>
                    <h3 className="text-text-primary font-bold text-sm mt-1">{r.marca || r.tipo_operacion || r.concepto || 'Operación'}</h3>
                    <p className="text-[10px] text-yellow-100 font-black uppercase tracking-tighter mt-0.5">{vp.tipo === 'ventas' ? obtenerCodigoManual(r) : (r.ref || '-')}</p>
                  </div>
                  <div className="text-right">
                    <p className="money-value text-lg">${safeNumber(r.total || r.precio || 0).toFixed(2)}</p>
                    <p className="text-[9px] text-text-muted uppercase font-bold">{r.cantidad} uds</p>
                  </div>
                </div>
                {(r.nombre_cliente || r.proveedor || r.nombre_cliente_proveedor) && (
                  <div className="pt-3 border-t border-border-default">
                    <p className="text-[9px] text-text-muted font-black uppercase tracking-widest">Contraparte</p>
                    <p className="text-text-primary text-[11px] font-bold">{r.nombre_cliente || r.proveedor || r.nombre_cliente_proveedor}</p>
                  </div>
                )}
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
        <div className="px-6 py-3 text-text-muted text-[10px] font-black uppercase tracking-[0.2em]">
          Rango solicitado
        </div>
      </div>
    </div>
  );
};

export default VistaReportes;

