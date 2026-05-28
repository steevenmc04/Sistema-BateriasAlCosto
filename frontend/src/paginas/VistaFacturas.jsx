import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
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
import { esProductoBateria } from '../utilidades/esProductoBateria.js';

const VistaFacturas = ({ usuario }) => {
  const {
    listaFacturas, cargando, error, filtros, setFiltros, modalNuevaFactura, setModalNuevaFactura,
    modalConfigEmpresa, setModalConfigEmpresa, formFactura, setFormFactura, configEmpresa,
    totalesCalculados, productosPOS, agregarItem, eliminarItem, actualizarItem, seleccionarProductoItem, crearFactura, anularFactura,
    descargarPDF, guardarConfig, abrirModalFacturaConVenta, facturaExistenteVenta,
    setFacturaExistenteVenta, reintentarSRI
  } = useVistaFacturas();

  const { paginaActual, setPaginaActual, elementosPorPagina, setElementosPorPagina, totalPaginas, itemsPaginados, totalElementos } = usePaginacion(listaFacturas, 10);

  useEffect(() => { setPaginaActual(1); }, [filtros, setPaginaActual]);

  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (location.state?.facturaGenerada?.id) {
      const numero = location.state?.facturaGenerada?.numero_factura;
      notificarGlobal(
        numero ? `Factura ${numero} disponible en el listado.` : 'Factura generada correctamente.',
        'exito'
      );
      navigate('/facturacion', { replace: true, state: {} });
      return;
    }

    if (location.state?.nuevaFacturaVenta) {
      abrirModalFacturaConVenta(location.state.nuevaFacturaVenta);
      navigate('/facturacion', { replace: true, state: {} });
    }
  }, [location.state, navigate, abrirModalFacturaConVenta]);

  const puedeEmitir = tienePermiso(usuario, 'facturacion_emitir');
  const puedeAnular = tienePermiso(usuario, 'facturacion_anular');
  const esAdmin = tienePermiso(usuario, 'roles_admin');

  const [formConfig, setFormConfig] = useState({});
  const productosBateriaOpciones = useMemo(
    () =>
      (productosPOS || [])
        .filter((p) => esProductoBateria(p))
        .map((p) => ({
          value: String(p.producto_id ?? p.id),
          label: [p.marca, p.tipo_caja].filter(Boolean).join(' · ') || p.nombre || p.codigo,
          codigo: p.codigo || '',
          producto: p,
        })),
    [productosPOS]
  );

  const productosVariosOpciones = useMemo(
    () =>
      (productosPOS || [])
        .filter((p) => !esProductoBateria(p))
        .map((p) => ({
          value: String(p.producto_id ?? p.id),
          label: p.nombre || p.descripcion || p.codigo,
          codigo: p.codigo || '',
          producto: p,
        })),
    [productosPOS]
  );
  const columnasFacturas = [
    { key: 'numero', label: 'N° Factura', width: '120px' },
    { key: 'fecha', label: 'Fecha', width: '100px' },
    { key: 'cliente', label: 'Cliente' },
    { key: 'total', label: 'Total', width: '120px', align: 'right' },
    { key: 'estado', label: 'Estado', width: '120px', align: 'center' },
    { key: 'acciones', label: 'Acciones', width: '120px', align: 'center', cellClassName: 'table-action-cell' },
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
          minWidthClass="min-w-[760px]"
          renderCell={(f, column) => {
            if (column.key === 'numero') {
              return <div className="cell-main">{f.numero_factura}</div>;
            }
            if (column.key === 'fecha') return <span className="cell-main">{new Date(f.fecha_emision).toLocaleDateString()}</span>;
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
                <div className="flex flex-wrap justify-center gap-1">
                  <span className={`badge ${f.estado === 'emitida' ? 'badge-success' : 'badge-danger'}`}>{f.estado}</span>
                  {f.sri_estado === 'AUTORIZADA' && <span className="badge badge-success">SRI OK</span>}
                  {f.sri_estado === 'PENDIENTE' && <span className="badge badge-warning" title={f.sri_error}>SRI PEND</span>}
                </div>
              );
            }
            if (column.key === 'acciones') {
              return (
                <div className="action-cell">
                  <button onClick={() => descargarPDF(f.id)} className="action-btn action-btn-icon" title="Descargar PDF"><Download size={16} /></button>
                  {f.estado === 'emitida' && puedeAnular && (
                    <button onClick={() => anularFactura(f.id)} className="action-btn action-btn-icon delete-btn" title="Anular"><Trash2 size={16} /></button>
                  )}
                  {f.sri_ride_url && (
                    <a href={f.sri_ride_url} target="_blank" rel="noreferrer" className="action-btn !h-8 !px-2 !text-[10px]">RIDE</a>
                  )}
                  {f.sri_estado === 'PENDIENTE' && (
                    <button onClick={() => reintentarSRI(f.id)} className="action-btn !h-8 !px-2 !text-[10px]">SRI</button>
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

                <div className="pt-4 border-t border-border-default space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-yellow-100">Detalle de Factura</h3>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        type="button"
                        onClick={() => agregarItem('bateria')}
                        className="text-yellow-100 text-[10px] font-black flex items-center justify-center gap-1.5 uppercase tracking-wider border border-border-default/40 px-3 py-2 rounded-xl hover:bg-yellow-100/10 transition-all"
                      >
                        <PlusCircle size={13} /> Agregar Batería
                      </button>
                      <button
                        type="button"
                        onClick={() => agregarItem('varios')}
                        className="text-text-primary text-[10px] font-black flex items-center justify-center gap-1.5 uppercase tracking-wider border border-border-default/40 px-3 py-2 rounded-xl hover:bg-white/5 transition-all"
                      >
                        <PlusCircle size={13} /> Agregar Varios
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {formFactura.items.map((item, index) => {
                      const opciones = item.tipo === 'varios' ? productosVariosOpciones : productosBateriaOpciones;
                      const subtotalItem = safeNumber(item.cantidad) * safeNumber(item.precio_unitario);

                      return (
                        <div key={item.uid || index} className="grid grid-cols-1 lg:grid-cols-[minmax(240px,2fr)_minmax(130px,1fr)_120px_140px_120px_48px] gap-3 items-end border-b border-border-default/50 pb-4">
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-wider text-text-muted">
                              {item.tipo === 'varios' ? 'Producto Varios' : 'Producto Batería'}
                            </label>
                            <SelectPremium
                              options={[
                                { value: '', label: item.tipo === 'varios' ? 'Seleccione un producto varios' : 'Seleccione una batería' },
                                ...opciones.map((o) => ({ value: o.value, label: o.label })),
                              ]}
                              value={String(item.producto_id || '')}
                              onChange={(e) => {
                                const seleccionado = opciones.find((o) => String(o.value) === String(e.target.value));
                                actualizarItem(index, 'producto_id', e.target.value);
                                if (seleccionado?.producto) {
                                  seleccionarProductoItem(index, { ...seleccionado.producto, tipo_inventario: item.tipo });
                                  actualizarItem(index, 'codigo', seleccionado.producto.codigo || '');
                                }
                              }}
                              placeholder={item.tipo === 'varios' ? 'Seleccione un producto varios' : 'Seleccione una batería'}
                              className="w-full"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-wider text-text-muted">Código</label>
                            <input
                              type="text"
                              className="input-premium h-11 font-mono"
                              value={item.codigo || ''}
                              onChange={(e) => actualizarItem(index, 'codigo', e.target.value)}
                              placeholder="Código"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-wider text-text-muted">Cant.</label>
                            <input
                              type="number"
                              min="1"
                              className="input-premium h-11 text-center font-bold"
                              value={item.cantidad}
                              onChange={(e) => actualizarItem(index, 'cantidad', e.target.value)}
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-wider text-text-muted">P. Unit.</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className="input-premium h-11 text-right"
                              value={item.precio_unitario}
                              onChange={(e) => actualizarItem(index, 'precio_unitario', e.target.value)}
                            />
                          </div>

                          <div className="space-y-1.5 text-right">
                            <label className="text-[9px] font-black uppercase tracking-wider text-text-muted block">Subtotal</label>
                            <span className="money-value text-base">${subtotalItem.toFixed(2)}</span>
                          </div>

                          <div className="h-11 flex items-center justify-end">
                            <button
                              type="button"
                              onClick={() => eliminarItem(index)}
                              className="action-btn action-btn-icon delete-btn"
                              title="Eliminar línea"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
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
                    <div className="flex justify-between items-center text-sm text-text-muted"><span>Subtotal:</span><span className="money-value">${safeNumber(totalesCalculados.base_imponible).toFixed(2)}</span></div>
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

