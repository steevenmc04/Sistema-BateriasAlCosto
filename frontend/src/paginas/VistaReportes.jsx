import React from 'react';
import { FileText, Download, RefreshCw, Calendar } from 'lucide-react';
import { useVistaReportes } from '../hooks/useVistaReportes.js';
import Button from '../componentes/Button.jsx';
import Badge from '../componentes/Badge.jsx';
import SelectPremium from '../componentes/SelectPremium.jsx';
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
  const puedeVer = tienePermiso(usuario, 'reportes_ver');
  const puedePdf = tienePermiso(usuario, 'reportes_pdf');

  React.useEffect(() => { if (puedeVer) vp.refrescarVista(); }, [puedeVer, vp.tipo, vp.desde, vp.hasta]);

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

      <div className="border-t border-border-default pt-5">
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
          <div className="grid grid-cols-2 gap-4 p-6 border-b border-border-default bg-white/[0.01]">
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
          <div className="grid grid-cols-2 gap-4 p-6 border-b border-border-default bg-white/[0.01]">
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
        <div className="hidden md:block table-premium">
          <div className="table-scroll">
          <table className="min-w-[1100px] w-full text-left text-[12px] text-text-muted table-fixed">
            <thead className="bg-white/[0.02]">
              <tr>
                {vp.tipo.startsWith('ventas') && ['Fecha','Tipo','Código','Cliente','Vendido por','Cant.','PVP Unit.','Costo','IVA?','Total'].map(t => (
                  <th key={t} className={`table-header-cell ${
                    t === 'Fecha' ? 'reference-col' :
                    t === 'Cliente' ? 'client-col' :
                    t === 'Cant.' ? 'quantity-col' :
                    ['PVP Unit.','Costo','Total'].includes(t) ? 'money-header money-col' :
                    ''
                  }`}>
                    {t}
                  </th>
                ))}
                {vp.tipo === 'compras' && ['Fecha','Marca','Caja','Cond','Cantidad','Total','Proveedor'].map(t => (
                  <th key={t} className={`table-header-cell ${
                    t === 'Fecha' ? 'reference-col' :
                    t === 'Cantidad' ? 'quantity-col' :
                    t === 'Proveedor' ? 'client-col' :
                    t === 'Total' ? 'money-header money-col' :
                    ''
                  }`}>
                    {t}
                  </th>
                ))}
                {vp.tipo === 'chatarra' && ['Fecha','Operación','Caja','Cantidad','PU','Total','Contraparte'].map(t => (
                  <th key={t} className={`table-header-cell ${
                    t === 'Fecha' ? 'reference-col' :
                    t === 'Cantidad' ? 'quantity-col' :
                    t === 'Contraparte' ? 'client-col' :
                    ['PU','Total'].includes(t) ? 'money-header money-col' :
                    ''
                  }`}>
                    {t}
                  </th>
                ))}
                {vp.tipo === 'inventario' && ['Clase','Ref','Marca','Caja','Cantidad','Costo Unit.','PVP Sugerido','Stock Valorizado','Estado'].map(t => (
                  <th key={t} className={`table-header-cell ${
                    t === 'Ref' ? 'reference-col' :
                    t === 'Cantidad' ? 'quantity-col' :
                    t === 'Estado' ? 'status-col' :
                    ['Costo Unit.','PVP Sugerido','Stock Valorizado'].includes(t) ? 'money-header money-col' :
                    ''
                  }`}>
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vp.cargando ? (
                <tr><td colSpan={12} className="table-cell text-center text-text-muted font-black uppercase tracking-[0.3em]">Consultando base de datos…</td></tr>
              ) : (
                vp.registros.map((r, idx) => (
                  <tr key={idx} className="transition-colors hover:bg-zinc-900/80 border-b border-border-default">
                    {vp.tipo.startsWith('ventas') && (
                      <>
                        <td className="table-cell">{formatearFecha(r.fecha)}</td>
                        <td className="table-cell uppercase table-subtext text-yellow-100">{r.tipo}</td>
                        <td className="table-cell font-mono">{obtenerCodigoManual(r)}</td>
                        <td className="table-cell">{r.nombre_cliente}</td>
                        <td className="table-cell">{r.usuario_nombre || '-'}</td>
                        <td className="table-cell text-center font-black">{r.cantidad}</td>
                        <td className="table-cell"><span className="money-cell">${safeNumber(r.precio_unitario).toFixed(2)}</span></td>
                        <td className="table-cell"><span className="money-cell">${safeNumber(r.costo_unitario || 0).toFixed(2)}</span></td>
                        <td className="table-cell">{safeNumber(r.con_iva) === 1 ? 'Con IVA' : 'Sin IVA'}</td>
                        <td className="table-cell"><span className="money-cell">${safeNumber(r.total).toFixed(2)}</span></td>
                      </>
                    )}
                    {vp.tipo === 'compras' && (
                      <>
                        <td className="table-cell">{formatearFecha(r.fecha)}</td>
                        <td className="table-cell">{r.marca}</td>
                        <td className="table-cell">{r.tipo_caja}</td>
                        <td className="table-cell">{r.condicion}</td>
                        <td className="table-cell text-center font-black">{r.cantidad}</td>
                        <td className="table-cell"><span className="money-cell">${safeNumber(r.total).toFixed(2)}</span></td>
                        <td className="table-cell">{r.proveedor}</td>
                      </>
                    )}
                    {vp.tipo === 'chatarra' && (
                      <>
                        <td className="table-cell">{formatearFecha(r.fecha)}</td>
                        <td className="table-cell uppercase">{r.tipo_operacion}</td>
                        <td className="table-cell">{r.tipo_caja}</td>
                        <td className="table-cell text-center font-black">{r.cantidad}</td>
                        <td className="table-cell"><span className="money-cell">${safeNumber(r.precio_unitario).toFixed(2)}</span></td>
                        <td className="table-cell"><span className="money-cell">${safeNumber(r.total).toFixed(2)}</span></td>
                        <td className="table-cell">{r.nombre_cliente_proveedor}</td>
                      </>
                    )}
                    {vp.tipo === 'inventario' && (
                      <>
                        <td className="table-cell uppercase text-[11px]">{r.clase}</td>
                        <td className="table-cell font-mono">{r.ref}</td>
                        <td className="table-cell">{r.marca}</td>
                        <td className="table-cell">{r.tipo_caja || '—'}</td>
                        <td className="table-cell font-black">{r.cantidad}</td>
                        <td className="table-cell"><span className="money-cell">${safeNumber(r.precio).toFixed(2)}</span></td>
                        <td className="table-cell"><span className="money-cell">${safeNumber(r.precio_venta_sugerido || 0).toFixed(2)}</span></td>
                        <td className="table-cell"><span className="money-cell">${(safeNumber(r.cantidad || 0) * safeNumber(r.precio || 0)).toFixed(2)}</span></td>
                        <td className="table-cell">
                          <div className="action-cell">
                            <Badge cantidad={r.cantidad} size="sm">
                              {r.estado_stock === 'sin_stock' ? 'Sin stock' : r.cantidad <= 5 ? 'Stock bajo' : 'Con stock'}
                            </Badge>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>

        {/* MOBILE CARDS */}
        <div className="md:hidden p-4 space-y-4">
          {vp.cargando ? (
            <div className="py-12 text-center text-[10px] font-black uppercase text-text-muted tracking-widest">Consultando...</div>
          ) : (
            vp.registros.map((r, idx) => (
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
        <div className="px-6 py-4 border-t border-border-default flex items-center gap-3 text-text-muted text-[10px] font-black uppercase tracking-[0.3em]">
          <Calendar size={14} className="text-text-primary" /> Rango solicitado
        </div>
      </div>
    </div>
  );
};

export default VistaReportes;

