import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, X, Download, Trash2, Settings, PlusCircle, CheckCircle2 } from 'lucide-react';
import { safeNumber } from '../utilidades/safeNumber.js';
import { useVistaFacturas } from '../hooks/useVistaFacturas.js';
import { notificarGlobal } from '../contextos/NotificacionContexto.jsx';
import { usePaginacion } from '../hooks/usePaginacion.js';
import Paginacion from '../componentes/Paginacion.jsx';
import Button from '../componentes/Button.jsx';
import SelectPremium from '../componentes/SelectPremium.jsx';
import TablePremium from '../componentes/TablePremium.jsx';
import { tienePermiso } from '../utilidades/permisosCliente.js';
import PageTitle from '../componentes/PageTitle.jsx';

const desglosarDescripcion = (desc) => {
  let marca = '', caja = '', estado = '', codigo = '';
  if (!desc) return { marca, caja, estado, codigo };
  const partes = desc.split(/\s*-\s*/);
  if (partes.length >= 4) {
    marca = partes[0].trim(); caja = partes[1].trim(); estado = partes[2].trim(); codigo = partes[3].trim();
  } else if (partes.length === 3) {
    marca = partes[0].trim(); caja = partes[1].trim();
    const u = partes[2].trim();
    if (['Nueva', 'Usada', 'Nuevo', 'Usado'].includes(u)) { estado = u; } else { codigo = u; }
  } else if (partes.length === 2) {
    marca = partes[0].trim(); codigo = partes[1].trim();
  } else { marca = desc.trim(); }
  if (codigo.startsWith('[') && codigo.endsWith(']')) { codigo = codigo.slice(1, -1); }
  return { marca, caja, estado, codigo };
};

const VistaFacturas = ({ usuario }) => {
  const {
    listaFacturas, cargando, error, filtros, setFiltros, modalNuevaFactura, setModalNuevaFactura,
    modalConfigEmpresa, setModalConfigEmpresa, formFactura, setFormFactura, configEmpresa,
    totalesCalculados, agregarItem, eliminarItem, actualizarItem, crearFactura, anularFactura,
    descargarPDF, guardarConfig, abrirModalFacturaConVenta, facturaExistenteVenta,
    setFacturaExistenteVenta, reintentarSRI
  } = useVistaFacturas();

  const { paginaActual, setPaginaActual, elementosPorPagina, setElementosPorPagina, totalPaginas, itemsPaginados, totalElementos } = usePaginacion(listaFacturas, 10);

  useEffect(() => { setPaginaActual(1); }, [filtros, setPaginaActual]);

  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (location.state?.nuevaFacturaVenta) {
      abrirModalFacturaConVenta(location.state.nuevaFacturaVenta);
      navigate('/facturacion', { replace: true, state: {} });
    }
  }, [location.state, navigate, abrirModalFacturaConVenta]);

  const puedeEmitir = tienePermiso(usuario, 'facturacion_emitir');
  const puedeAnular = tienePermiso(usuario, 'facturacion_anular');
  const esAdmin = tienePermiso(usuario, 'roles_admin');

  const [formConfig, setFormConfig] = useState({});
  const columnasFacturas = [
    { key: 'numero', label: 'N° Factura · Fecha', widthClassName: 'w-[170px]' },
    { key: 'cliente', label: 'Cliente' },
    { key: 'total', label: 'Total', widthClassName: 'w-[150px]', align: 'right' },
    { key: 'estado', label: 'Estado', widthClassName: 'w-[150px]', align: 'center' },
    { key: 'acciones', label: 'Acciones', widthClassName: 'w-[140px]', align: 'center' },
  ];
  const abrirConfigEmpresa = () => {
    setFormConfig(configEmpresa || { razon_social: '', ruc: '', direccion: '', telefono: '', email: '', ciudad: 'Guayaquil', pais: 'Ecuador', prefijo_factura: 'FAC', iva_porcentaje: 15 });
    setModalConfigEmpresa(true);
  };
  const procesarGuardarConfig = async () => { const r = await guardarConfig(formConfig); if (!r.success) notificarGlobal(r.error, 'error'); };
  const procesarCrearFactura = async () => {
    const r = await crearFactura();
    if (!r.success) notificarGlobal(r.error, 'error');
    else notificarGlobal('Factura emitida correctamente.', 'exito');
  };

  useEffect(() => {
    if (!modalNuevaFactura && !modalConfigEmpresa) return undefined;
    const handleKeyDown = (e) => {
      if (document.querySelector('[data-select-premium-open="true"]')) return;
      if (e.key === 'Escape') {
        setModalNuevaFactura(false);
        setModalConfigEmpresa(false);
      }
      if (e.key === 'Enter' && modalNuevaFactura && !facturaExistenteVenta) {
        const tag = e.target?.tagName?.toLowerCase();
        if (tag === 'textarea' || e.target?.closest?.('[role="combobox"]')) return;
        if (formFactura.items.length === 0 || !formFactura.cliente_nombre) return;
        e.preventDefault();
        procesarCrearFactura();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalNuevaFactura, modalConfigEmpresa, facturaExistenteVenta, formFactura.items.length, formFactura.cliente_nombre]);

  return (
    <div className="space-y-8 animate-[fadeIn_0.3s_ease-out]">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8">
        <PageTitle
          eyebrow="Facturación"
          titleWhite="Gestión de"
          titleGold="Facturas"
          subtitle="Emite, anula y consulta el historial de facturación del negocio."
        />
        <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-stretch">
          <div className="inline-flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input type="date" className="input-premium text-[11px] w-auto h-10" value={filtros.desde} onChange={(e) => setFiltros({ ...filtros, desde: e.target.value })} />
            <input type="date" className="input-premium text-[11px] w-auto h-10" value={filtros.hasta} onChange={(e) => setFiltros({ ...filtros, hasta: e.target.value })} />
            <div className="w-40">
              <SelectPremium
                options={[{ value: '', label: 'Todos' }, { value: 'emitida', label: 'Emitidas' }, { value: 'anulada', label: 'Anuladas' }]}
                value={filtros.estado}
                onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
                placeholder="Todos"
              />
            </div>
          </div>
          {puedeEmitir && <Button onClick={() => setModalNuevaFactura(true)} icon={<Plus size={18} />}>Nueva Factura</Button>}
          {esAdmin && <Button variant="secondary" onClick={abrirConfigEmpresa} icon={<Settings size={18} />}>Configurar Empresa</Button>}
        </div>
      </div>

       {error && <div className="card-premium text-error font-bold text-sm">{error}</div>}

      {/* DESKTOP TABLE */}
      <div className="hidden md:block">
        <TablePremium
          columns={columnasFacturas}
          data={itemsPaginados}
          rowKey={(row) => row.id}
          loading={cargando}
          loadingMessage="Cargando facturas..."
          emptyMessage="No se encontraron facturas."
          minWidthClass="min-w-[980px]"
          renderCell={(f, column) => {
            if (column.key === 'numero') {
              return (
                <>
                  <div className="cell-main">{f.numero_factura}</div>
                  <div className="cell-sub">{new Date(f.fecha_emision).toLocaleDateString()}</div>
                </>
              );
            }
            if (column.key === 'cliente') {
              return (
                <>
                  <div className="cell-main truncate">{f.cliente_nombre}</div>
                  <div className="cell-sub truncate">{f.cliente_cedula_ruc || 'Consumidor Final'}</div>
                </>
              );
            }
            if (column.key === 'total') return <span className="money-cell">${safeNumber(f.total).toFixed(2)}</span>;
            if (column.key === 'estado') {
              return (
                <div className="action-cell">
                  <span className={`badge ${f.estado === 'emitida' ? 'badge-success' : 'badge-danger'}`}>{f.estado}</span>
                  {f.sri_estado === 'AUTORIZADA' && <span className="badge badge-success">SRI OK</span>}
                  {f.sri_estado === 'PENDIENTE' && <span className="badge badge-warning" title={f.sri_error}>SRI PEND</span>}
                </div>
              );
            }
            if (column.key === 'acciones') {
              return (
                <div className="action-cell">
                  <button onClick={() => descargarPDF(f.id)} className="h-10 w-10 rounded-xl bg-black/50 border border-border-default text-text-muted hover:bg-zinc-900/80 hover:text-text-primary transition-colors flex items-center justify-center" title="Descargar PDF"><Download size={16} /></button>
                  {f.estado === 'emitida' && puedeAnular && (
                    <button onClick={() => anularFactura(f.id)} className="h-10 w-10 rounded-xl bg-red-900/30 border border-red-500/30 text-error hover:bg-red-500/10 hover:text-error transition-all flex items-center justify-center" title="Anular"><Trash2 size={16} /></button>
                  )}
                  {f.sri_ride_url && (
                    <a href={f.sri_ride_url} target="_blank" rel="noreferrer" className="h-10 px-3 rounded-xl border border-success/30 text-success text-[10px] font-black uppercase hover:bg-success/10 transition-all inline-flex items-center">RIDE</a>
                  )}
                  {f.sri_estado === 'PENDIENTE' && (
                    <button onClick={() => reintentarSRI(f.id)} className="h-10 px-3 rounded-xl border border-warning/30 text-warning text-[10px] font-black uppercase hover:bg-warning/10 transition-all">SRI</button>
                  )}
                </div>
              );
            }
            return null;
          }}
          footer={<Paginacion paginaActual={paginaActual} totalPaginas={totalPaginas} totalElementos={totalElementos} elementosPorPagina={elementosPorPagina} setPaginaActual={setPaginaActual} setElementosPorPagina={setElementosPorPagina} />}
        />
      </div>

      {/* MOBILE CARDS */}
        <div className="md:hidden space-y-4">
        {cargando ? (
          <div className="py-12 text-center text-[10px] font-black uppercase text-text-muted tracking-widest">Cargando...</div>
        ) : itemsPaginados.length === 0 ? (
          <div className="py-12 text-center text-[10px] font-black uppercase text-text-muted tracking-widest">Sin facturas</div>
        ) : (
          itemsPaginados.map((f) => (
            <div key={f.id} className="card-premium space-y-5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] text-text-muted font-black uppercase tracking-wider">{f.numero_factura || 'BORRADOR'}</p>
                  <h3 className="text-text-primary font-bold text-sm mt-1">{f.cliente_nombre}</h3>
                  <p className="text-[10px] text-text-muted uppercase tracking-widest">{new Date(f.fecha_emision).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="money-value text-lg">${safeNumber(f.total).toFixed(2)}</p>
                  <span className={`badge mt-1 ${f.estado === 'emitida' ? 'badge-success' : 'badge-danger'}`}>{f.estado}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => descargarPDF(f.id)} className="w-full py-3 rounded-xl bg-zinc-900 text-text-primary font-black uppercase text-[10px] border border-border-default flex items-center justify-center gap-2"><Download size={14} /> PDF</button>
                {f.estado === 'emitida' && puedeAnular && (
                  <button onClick={() => anularFactura(f.id)} className="w-full py-3 rounded-xl bg-error/10 text-error font-black uppercase text-[10px] border border-error/30 flex items-center justify-center"><Trash2 size={14} /> Anular</button>
                )}
                {f.sri_ride_url && (
                  <a href={f.sri_ride_url} target="_blank" rel="noreferrer" className="w-full py-3 rounded-xl bg-success/10 text-success font-black uppercase text-[10px] border border-success/30 flex items-center justify-center gap-2">RIDE</a>
                )}
                {f.sri_estado === 'PENDIENTE' && (
                  <button onClick={() => reintentarSRI(f.id)} className="w-full py-3 rounded-xl bg-warning/10 text-warning font-black uppercase text-[10px] border border-warning/30 flex items-center justify-center gap-2">Reintentar SRI</button>
                )}
              </div>
            </div>
          ))
        )}
        {!cargando && (
            <div className="card-premium overflow-hidden">
            <Paginacion paginaActual={paginaActual} totalPaginas={totalPaginas} totalElementos={totalElementos} elementosPorPagina={elementosPorPagina} setPaginaActual={setPaginaActual} setElementosPorPagina={setElementosPorPagina} />
          </div>
        )}
      </div>

      {/* MODAL NUEVA FACTURA */}
      {modalNuevaFactura && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-6 bg-black/85 backdrop-blur-sm overflow-hidden">
          <div className="bg-zinc-900 border border-border-default rounded-t-2xl md:rounded-2xl w-full md:max-w-5xl max-h-[95vh] md:max-h-[90vh] overflow-y-auto overflow-x-hidden shadow-2xl custom-scrollbar">
            <div className="px-8 py-6 border-b border-border-default flex justify-between items-center">
              <div>
              <h2 className="text-2xl font-black text-text-primary uppercase italic">Emitir <span className="text-yellow-100">Factura</span></h2>
                {formFactura.venta_id && <p className="text-success text-[10px] uppercase tracking-widest font-bold mt-2">Asociada a la venta #{formFactura.venta_id}</p>}
              </div>
              <button onClick={() => setModalNuevaFactura(false)} className="text-text-muted hover:text-text-primary transition-colors"><X size={24} /></button>
            </div>

            {facturaExistenteVenta ? (
                <div className="p-16 flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-24 h-24 bg-success/10 text-success rounded-full flex items-center justify-center"><CheckCircle2 size={48} /></div>
                <div className="space-y-2">
                  <h3 className="text-3xl font-black text-text-primary uppercase italic">Factura <span className="text-yellow-100">Emitida</span></h3>
                  <p className="text-text-muted text-sm">Ya se emitió la factura <strong className="text-text-primary">{facturaExistenteVenta.numero_factura}</strong> para esta venta.</p>
                </div>
                <div className="flex gap-4 pt-8 w-full max-w-md">
                  <Button variant="secondary" onClick={() => setFacturaExistenteVenta(null)} fullWidth>Cerrar</Button>
                  <Button onClick={() => descargarPDF(facturaExistenteVenta.id)} fullWidth icon={<Download size={16} />}>Ver PDF</Button>
                </div>
              </div>
            ) : (
              <div className="p-8 space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-yellow-100">Datos del Cliente</h3>
                     <button type="button" onClick={() => setFormFactura({ ...formFactura, cliente_nombre: 'CONSUMIDOR FINAL', cliente_cedula_ruc: '9999999999999', cliente_email: '', cliente_telefono: '', cliente_direccion: 'GUAYAQUIL' })}
                       className="px-3 py-1.5 bg-zinc-900 border border-border-default rounded-xl text-[9px] font-black uppercase text-yellow-100 hover:bg-yellow-100/10 transition-all">Consumidor Final</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" placeholder="Ingrese nombre o razón social *" className="input-premium md:col-span-2" value={formFactura.cliente_nombre} onChange={(e) => setFormFactura({...formFactura, cliente_nombre: e.target.value})} />
                    <input type="text" placeholder="Ingrese cédula o RUC" className="input-premium" value={formFactura.cliente_cedula_ruc} onChange={(e) => setFormFactura({...formFactura, cliente_cedula_ruc: e.target.value})} />
                    <input type="email" placeholder="Ingrese correo electrónico" className="input-premium" value={formFactura.cliente_email} onChange={(e) => setFormFactura({...formFactura, cliente_email: e.target.value})} />
                    <input type="text" placeholder="Ingrese teléfono" className="input-premium" value={formFactura.cliente_telefono} onChange={(e) => setFormFactura({...formFactura, cliente_telefono: e.target.value})} />
                    <input type="text" placeholder="Ingrese dirección completa" className="input-premium md:col-span-2" value={formFactura.cliente_direccion} onChange={(e) => setFormFactura({...formFactura, cliente_direccion: e.target.value})} />
                  </div>
                </div>

                    <div className="pt-4 border-t border-border-default">
                      <div className="flex justify-between items-center mb-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-yellow-100">Detalle de Factura</h3>
                    <button onClick={agregarItem} className="text-yellow-100 text-[10px] font-black flex items-center gap-1.5 uppercase tracking-wider border border-border-default/40 px-3 py-1.5 rounded-xl hover:bg-yellow-100/10 transition-all"><PlusCircle size={13} /> Agregar línea</button>
                  </div>

                  {formFactura.items.length > 0 && (
                    <div className="hidden md:grid grid-cols-[1.5fr_1fr_1fr_1.2fr_minmax(120px,.7fr)_minmax(140px,.8fr)_minmax(120px,.7fr)_minmax(120px,.7fr)_36px] gap-2 mb-2">
                          {['Marca','Caja','Estado','Código','Cant.','P. Unit.','Desc.','Subtotal'].map(t => <span key={t} className="text-[9px] font-black uppercase tracking-widest text-text-muted">{t}</span>)}
                      <span />
                    </div>
                  )}

                  <div className="divide-y divide-[#2a2a2a]">
                    {formFactura.items.map((item, index) => {
                      const parsed = desglosarDescripcion(item.descripcion);
                      const handlePartChange = (field, value) => {
                        const current = desglosarDescripcion(item.descripcion);
                        current[field] = value;
                        const parts = [];
                        if (current.marca) parts.push(current.marca);
                        if (current.caja) parts.push(current.caja);
                        if (current.estado) parts.push(current.estado);
                        if (current.codigo) parts.push(current.codigo);
                        actualizarItem(index, 'descripcion', parts.join(' - '));
                      };
                      return (
                        <div key={index} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-[1.5fr_1fr_1fr_1.2fr_minmax(120px,.7fr)_minmax(140px,.8fr)_minmax(120px,.7fr)_minmax(120px,.7fr)_36px] gap-3 md:gap-2 items-start md:items-center py-4 md:py-3 transition-colors border-b border-border-default/60 last:border-b-0">
                          {['marca','caja','estado','codigo'].map((fld, fi) => (
                            <div key={fld} className="space-y-1 md:space-y-0">
                               <label className="md:hidden text-[9px] font-black uppercase text-text-muted">{['Marca','Caja','Estado','Código'][fi]}</label>
                              <input type="text" placeholder={['Marca','Caja','Estado','Código'][fi]}
                                className="bg-transparent text-text-primary text-sm outline-none placeholder:text-text-muted truncate w-full"
                                value={parsed[fld]} onChange={(e) => handlePartChange(fld, e.target.value)} />
                            </div>
                          ))}
                          <div className="space-y-1 md:space-y-0">
                             <label className="md:hidden text-[9px] font-black uppercase text-text-muted">Cant.</label>
                            <input type="number" min="1" className="input-premium text-center font-bold h-10" value={item.cantidad} onChange={(e) => actualizarItem(index, 'cantidad', e.target.value)} />
                          </div>
                          <div className="space-y-1 md:space-y-0">
                             <label className="md:hidden text-[9px] font-black uppercase text-text-muted">P. Unit</label>
                             <div className="relative"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted text-xs">$</span>
                              <input type="number" min="0" step="0.01" className="input-premium pl-5 text-right h-10" value={item.precio_unitario} onChange={(e) => actualizarItem(index, 'precio_unitario', e.target.value)} /></div>
                          </div>
                          <div className="space-y-1 md:space-y-0">
                             <label className="md:hidden text-[9px] font-black uppercase text-text-muted">Desc.</label>
                             <div className="relative"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted text-xs">$</span>
                              <input type="number" min="0" step="0.01" className="input-premium pl-5 text-right h-10" value={item.descuento} onChange={(e) => actualizarItem(index, 'descuento', e.target.value)} /></div>
                          </div>
                           <div className="text-right text-sm tabular-nums">
                             <label className="md:hidden text-[9px] font-black uppercase text-text-muted block mb-1">Subtotal</label>
                            <span className="money-value">${(safeNumber(item.cantidad) * safeNumber(item.precio_unitario) - safeNumber(item.descuento)).toFixed(2)}</span>
                          </div>
                           <div className="flex justify-end"><button onClick={() => eliminarItem(index)} className="flex items-center justify-center w-12 h-12 md:w-8 md:h-8 rounded-xl text-error bg-error/10 md:bg-transparent hover:bg-error/10 transition-all"><Trash2 size={18} /></button></div>
                        </div>
                      );
                    })}
                      {formFactura.items.length === 0 && (
                      <div className="flex flex-col items-center py-8 text-text-muted gap-2">
                        <PlusCircle size={28} className="opacity-30" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Agrega al menos una línea</p>
                      </div>
                    )}
                  </div>
                </div>

                    <div className="pt-4 border-t border-border-default grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div>
                     <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1">Notas Adicionales</label>
                     <textarea className="input-premium h-24 resize-none mt-2" placeholder="Agregue observaciones de la factura" value={formFactura.notas} onChange={(e) => setFormFactura({...formFactura, notas: e.target.value})} />
                   </div>
                  <div className="space-y-3 py-1">
                    <div className="flex justify-between items-center text-sm text-text-muted"><span>Subtotal:</span><span className="money-value">${safeNumber(totalesCalculados.subtotal).toFixed(2)}</span></div>
                    <div className="flex justify-between items-center text-sm text-text-muted">
                      <span>Descuento:</span>
                      <div className="flex items-center gap-2"><span className="text-text-muted">$</span>
                        <input type="number" className="input-premium w-20 h-10 text-right" value={formFactura.descuento_global} onChange={(e) => setFormFactura({...formFactura, descuento_global: e.target.value})} /></div>
                    </div>
                    <div className="flex justify-between items-center text-sm text-text-muted"><span>Subtotal Neto:</span><span className="money-value">${safeNumber(totalesCalculados.base_imponible).toFixed(2)}</span></div>
                    <div className="flex justify-between items-center">
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-text-muted">
                        <input type="checkbox" className="accent-accent rounded" checked={formFactura.con_iva} onChange={(e) => setFormFactura({...formFactura, con_iva: e.target.checked})} />
                        IVA ({configEmpresa?.iva_porcentaje || 15}%):
                      </label>
                      <span className="money-value">${safeNumber(totalesCalculados.monto_iva).toFixed(2)}</span>
                    </div>
                    <div className="pt-2 border-t border-border-default flex justify-between items-baseline mt-2">
                      <span className="text-[10px] font-black uppercase text-yellow-100">TOTAL</span>
                      <span className="money-value text-3xl">${safeNumber(totalesCalculados.total).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-2">
                  <Button variant="secondary" onClick={() => setModalNuevaFactura(false)} fullWidth>Cancelar</Button>
                  <Button fullWidth onClick={procesarCrearFactura} disabled={formFactura.items.length === 0 || !formFactura.cliente_nombre}>Emitir Factura</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL CONFIG EMPRESA */}
      {modalConfigEmpresa && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="w-full max-w-xl modal-premium overflow-hidden">
            <div className="px-8 py-6 border-b border-border-default flex justify-between items-center">
              <h2 className="text-xl font-black text-text-primary uppercase italic">Configuración <span className="text-yellow-100">Empresa</span></h2>
               <button onClick={() => setModalConfigEmpresa(false)} className="text-text-muted hover:text-text-primary transition-colors"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] font-black uppercase text-text-muted ml-1">Razón Social</label>
                  <input type="text" className="input-premium mt-2" value={formConfig.razon_social} onChange={e => setFormConfig({...formConfig, razon_social: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-text-muted ml-1">RUC</label>
                  <input type="text" className="input-premium mt-2" value={formConfig.ruc} onChange={e => setFormConfig({...formConfig, ruc: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-text-muted ml-1">Prefijo Factura</label>
                  <input type="text" className="input-premium mt-2 uppercase" value={formConfig.prefijo_factura} onChange={e => setFormConfig({...formConfig, prefijo_factura: e.target.value})} />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-black uppercase text-text-muted ml-1">Dirección</label>
                  <input type="text" className="input-premium mt-2" value={formConfig.direccion} onChange={e => setFormConfig({...formConfig, direccion: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-text-muted ml-1">Teléfono</label>
                  <input type="text" className="input-premium mt-2" value={formConfig.telefono} onChange={e => setFormConfig({...formConfig, telefono: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-text-muted ml-1">Email</label>
                  <input type="email" className="input-premium mt-2" value={formConfig.email} onChange={e => setFormConfig({...formConfig, email: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-text-muted ml-1">Ciudad</label>
                  <input type="text" className="input-premium mt-2" value={formConfig.ciudad} onChange={e => setFormConfig({...formConfig, ciudad: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-text-muted ml-1">% IVA Actual</label>
                  <input type="number" step="0.01" className="input-premium mt-2" value={formConfig.iva_porcentaje} onChange={e => setFormConfig({...formConfig, iva_porcentaje: e.target.value})} />
                </div>
              </div>
              <div className="flex gap-4 pt-4 mt-4 border-t border-border-default">
                <Button variant="secondary" onClick={() => setModalConfigEmpresa(false)} fullWidth>Cerrar</Button>
                <Button onClick={procesarGuardarConfig} fullWidth>Guardar Cambios</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VistaFacturas;

