import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, ArrowUpRight, ArrowDownLeft, Recycle, FileText, CheckCircle2 } from 'lucide-react';
import { useVistaTransacciones } from '../hooks/useVistaTransacciones.js';
import { usePaginacion } from '../hooks/usePaginacion.js';
import Paginacion from '../componentes/Paginacion.jsx';
import Button from '../componentes/Button.jsx';
import AutocompleteCliente from '../componentes/AutocompleteCliente.jsx';
import TablaItemsVenta from '../componentes/TablaItemsVenta.jsx';
import { tienePermiso } from '../utilidades/permisosCliente.js';
import { safeNumber } from '../utilidades/safeNumber.js';
import PageTitle from '../componentes/PageTitle.jsx';

const formatearFecha = (f) => {
  if (!f) return '-';
  try { return new Date(f).toLocaleDateString(); } catch { return '-'; }
};

const VistaTransacciones = ({ usuario, tabPredeterminado = 'venta' }) => {
  const h = useVistaTransacciones(tabPredeterminado);
  const navigate = useNavigate();

  const {
    paginaActual, setPaginaActual,
    elementosPorPagina, setElementosPorPagina,
    totalPaginas, itemsPaginados, totalElementos
  } = usePaginacion(
    h.tab === 'venta' ? h.vFiltradas : h.tab === 'compra' ? h.cFiltradas : h.hFiltrada, 10
  );

  useEffect(() => { setPaginaActual(1); }, [h.busqueda, h.tab, setPaginaActual]);

  useEffect(() => {
    const modalAbierto = h.modalVenta || h.modalCompra || h.modalChatarra;
    if (!modalAbierto) return undefined;

    const handleKeyDown = (e) => {
      if (document.querySelector('[data-select-premium-open="true"]')) return;
      if (e.key === 'Escape') {
        if (h.modalExito) h.cerrarModalExito();
        else if (h.modalVenta) h.cerrarVenta();
        else if (h.modalCompra) h.cerrarCompra();
        else if (h.modalChatarra) h.cerrarChatarra();
        return;
      }

      if (e.key !== 'Enter' || h.cargando || h.modalExito) return;
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === 'textarea' || e.target?.closest?.('[role="combobox"]') || e.target?.closest?.('[data-no-submit-enter="true"]')) return;
      e.preventDefault();
      if (h.modalVenta) h.ejecutarVenta();
      else if (h.modalCompra) h.ejecutarCompra();
      else if (h.modalChatarra) h.ejecutarChatarra();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    h.modalVenta, h.modalCompra, h.modalChatarra, h.modalExito, h.cargando,
    h.cerrarModalExito, h.cerrarVenta, h.cerrarCompra, h.cerrarChatarra,
    h.ejecutarVenta, h.ejecutarCompra, h.ejecutarChatarra,
  ]);

  const puedeVender = tienePermiso(usuario, 'ventas_baterias');
  const puedeComprar = tienePermiso(usuario, 'compras_baterias');
  const puedeChatarra = tienePermiso(usuario, 'operaciones_chatarra');
  const titleByTab = h.tab === 'venta'
    ? { titleWhite: 'Ventas', titleGold: 'Baterías' }
    : h.tab === 'compra'
      ? { titleWhite: 'Compras', titleGold: 'Baterías' }
      : { titleWhite: 'Gestión de', titleGold: 'Chatarra' };

  const TotalesPanel = ({ totales, variante = 'normal', mostrarIVA = true }) => (
    <div className={`w-full max-w-md ml-auto space-y-3 ${variante === 'grande' ? 'md:py-2' : ''}`}>
      <div className="grid grid-cols-[1fr_auto] items-center gap-4 text-[10px] font-black uppercase tracking-widest text-text-muted">
        <span>Subtotal</span><span className="money-value">${safeNumber(totales.subtotal).toFixed(2)}</span>
      </div>
      {mostrarIVA && (
        <div className="grid grid-cols-[1fr_auto] items-center gap-4 text-[10px] font-black uppercase tracking-widest text-text-muted">
          <span>IVA (15%)</span><span className="money-value">${safeNumber(totales.iva).toFixed(2)}</span>
        </div>
      )}
      <div className={`grid grid-cols-[1fr_auto] items-baseline gap-4 font-black text-text-primary pt-3 mt-3 border-t border-border-default ${variante === 'grande' ? 'text-2xl md:text-3xl' : 'text-lg'}`}>
        <span>Total</span><span className="money-value">${safeNumber(totales.total).toFixed(2)}</span>
      </div>
      <div className="text-[9px] text-text-muted font-bold uppercase tracking-wider text-right pt-1">
        {safeNumber(totales.cantidadItems)} item(s) | {Math.round(safeNumber(totales.cantidadTotal))} unidad(es)
      </div>
    </div>
  );

  const ModalExito = ({ tipo, id, total }) => (
    <div className="p-16 flex flex-col items-center justify-center text-center space-y-6 animate-in zoom-in duration-500">
      <div className="w-24 h-24 bg-success/10 text-success rounded-full flex items-center justify-center">
        <CheckCircle2 size={48} />
      </div>
      <div className="space-y-2">
        <h3 className="text-3xl font-black text-text-primary uppercase italic">
          {tipo === 'venta' ? 'Venta' : tipo === 'compra' ? 'Compra' : 'Chatarra'} <span className="text-yellow-100">Exitosa</span>
        </h3>
        <p className="text-text-muted text-sm">Transacción #{id} registrada correctamente.</p>
      </div>
      <p className="money-value text-4xl">${safeNumber(total).toFixed(2)}</p>
      <div className="flex gap-4 pt-8 w-full max-w-md">
        <Button variant="secondary" onClick={() => h.cerrarModalExito()}>Cerrar</Button>
        {tipo === 'venta' && (
          <Button onClick={() => { h.cerrarModalExito(); navigate('/facturacion'); }} icon={<FileText size={16} />}>
            Generar Factura
          </Button>
        )}
      </div>
    </div>
  );

  const ErrorPanel = () => h.errorMsg ? (
    <div className="text-error text-xs font-black uppercase tracking-wider border-l border-error/50 bg-transparent pl-4 py-2 flex justify-between items-center">
      <span>{h.errorMsg}</span>
      <button onClick={() => h.setErrorMsg('')}><X size={14} /></button>
    </div>
  ) : null;

  const ErroresPanel = () => h.erroresValidacion.length > 0 ? (
    <div className="space-y-1 border-l border-error/50 pl-4 py-1">
      {h.erroresValidacion.map((e, i) => (
        <p key={i} className="text-error text-[10px] font-black uppercase tracking-wider">{e}</p>
      ))}
    </div>
  ) : null;

  const renderTable = (items, tabType) => {
    if (h.cargando) {
      return <tr><td colSpan={8} className="px-8 py-20 text-center text-text-muted text-xs uppercase font-black tracking-widest">Cargando historial...</td></tr>;
    }
    if (items.length === 0) {
      return <tr><td colSpan={8} className="px-8 py-20 text-center text-text-muted text-xs uppercase font-black tracking-widest">No hay transacciones registradas</td></tr>;
    }
    return items.map((item) => (
      <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
        {tabType === 'venta' ? (
          <>
            <td className="table-body-cell">
              <div className="text-text-primary font-bold text-sm">{formatearFecha(item.creado_en)}</div>
              <div className="table-subtext text-yellow-100 font-black">{item.producto_codigo || ''}</div>
            </td>
            <td className="table-body-cell">
              <div className="text-text-primary text-sm">{item.producto_marca || ''} {item.producto_tipo_caja || ''}</div>
               <div className="table-subtext uppercase">{item.producto_condicion || ''}</div>
            </td>
            <td className="table-body-cell">
              <div className="text-text-primary text-sm">{item.cliente_nombre || 'Consumidor Final'}</div>
               <div className="table-subtext">{item.cliente_documento || ''}</div>
            </td>
            <td className="table-body-cell text-center font-black text-text-primary">{item.cantidad_total || '-'}</td>
            <td className="table-body-cell text-center text-text-muted text-xs">{item.cantidad_items || '1'}</td>
            <td className="table-body-cell"><span className="money-cell">${safeNumber(item.total).toFixed(2)}</span></td>
            <td className="table-body-cell text-right text-[10px] font-black uppercase text-text-muted">{item.usuario_nombre}</td>
            <td className="table-body-cell">
              <div className="action-cell">
                {tienePermiso(usuario, 'facturacion_emitir') && (
                <button onClick={() => navigate('/facturacion', { state: { nuevaFacturaVenta: {
                  id: item.id, venta_id: item.id, cliente_nombre: item.cliente_nombre || '',
                  cliente_cedula_ruc: item.cliente_documento || '', cliente_email: item.cliente_email || '',
                  cliente_telefono: item.cliente_telefono || '', cliente_direccion: item.cliente_direccion || '',
                  con_iva: Number(item.monto_iva) > 0, descuento_global: 0,
                  notas: `Venta registrada el ${formatearFecha(item.creado_en)}`,
                  items: [{ descripcion: [item.producto_marca, item.producto_tipo_caja, item.producto_condicion, item.producto_codigo].filter(Boolean).join(' - '), cantidad: Number(item.cantidad_total) || 1, precio_unitario: item.precio_unitario || (item.cantidad_total && item.total ? Number(item.total)/Number(item.cantidad_total) : 0), descuento: 0 }],
                }}})} className="p-2 rounded-xl text-text-muted hover:bg-yellow-100/10 hover:text-yellow-100 transition-colors" title="Emitir factura"><FileText size={16} /></button>
              )}
              </div>
            </td>
          </>
        ) : tabType === 'compra' ? (
          <>
            <td className="table-body-cell text-text-primary font-bold text-sm">{formatearFecha(item.creado_en)}</td>
            <td className="table-body-cell">
              <div className="text-text-primary text-sm">{item.producto_marca || ''} {item.producto_tipo_caja || ''}</div>
              <div className="table-subtext uppercase">{item.producto_condicion || ''}</div>
            </td>
            <td className="table-body-cell text-center font-black text-text-primary">{item.cantidad_total || '-'}</td>
            <td className="table-body-cell text-center text-text-muted text-xs">{item.cantidad_items || '1'}</td>
            <td className="table-body-cell"><span className="money-cell">${safeNumber(item.total).toFixed(2)}</span></td>
            <td className="table-body-cell text-right text-[10px] font-black uppercase text-text-muted">{item.usuario_nombre}</td>
            <td className="table-body-cell"><div className="action-cell"><button onClick={() => navigator.clipboard?.writeText(item.numero_factura || '')} className="p-2 rounded-xl text-text-muted hover:bg-yellow-100/10 hover:text-yellow-100 transition-colors" title="Copiar factura"><FileText size={16} /></button></div></td>
          </>
        ) : (
          <>
            <td className="table-body-cell text-white font-bold text-sm">{formatearFecha(item.creado_en)}</td>
            <td className="table-body-cell text-center">
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg ${item.tipo_operacion === 'salida' ? 'bg-error/10 text-error' : 'bg-success/10 text-success'}`}>{item.tipo_operacion}</span>
            </td>
            <td className="table-body-cell">
              <div className="text-white text-sm">{item.producto_marca || ''} {item.producto_tipo_caja || ''}</div>
              <div className="table-subtext">{item.notas || ''}</div>
            </td>
            <td className="table-body-cell text-center font-black text-white">{item.cantidad_total || '-'}</td>
            <td className="table-body-cell text-center text-text-muted text-xs">{item.cantidad_items || '1'}</td>
            <td className="table-body-cell"><span className="money-cell">${safeNumber(item.total).toFixed(2)}</span></td>
            <td className="table-body-cell text-right text-[10px] font-black uppercase text-text-muted">{item.usuario_nombre}</td>
          </>
        )}
      </tr>
    ));
  };

  const renderMobileCards = (items, tabType) => {
    if (items.length === 0) return <div className="text-center text-text-muted text-xs uppercase font-black tracking-widest py-10">No hay transacciones</div>;
    return items.map((item) => (
      <div key={item.id} className="mobile-card">
        {tabType === 'venta' ? (
          <>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-yellow-100 font-black text-[10px] uppercase tracking-wider">{item.producto_codigo || ''}</p>
                <h3 className="text-text-primary font-bold text-sm">{item.producto_marca || ''} {item.producto_tipo_caja || ''}</h3>
                <p className="text-[10px] text-text-muted uppercase">{formatearFecha(item.creado_en)} · {item.cliente_nombre || 'Consumidor Final'}</p>
              </div>
              <div className="text-right">
                 <p className="money-value text-lg">${safeNumber(item.total).toFixed(2)}</p>
                 <p className="text-[9px] text-text-muted uppercase font-black">{item.usuario_nombre}</p>
              </div>
            </div>
            <div className="flex justify-between items-center border-t border-border-default pt-4">
              <span className="text-white font-black text-sm">{item.cantidad_total || 0} uds ({item.cantidad_items || 1} items)</span>
              {tienePermiso(usuario, 'facturacion_emitir') && (
                <button onClick={() => navigate('/facturacion', { state: { nuevaFacturaVenta: {
                  id: item.id, venta_id: item.id, cliente_nombre: item.cliente_nombre || '',
                  cliente_cedula_ruc: item.cliente_documento || '', cliente_email: item.cliente_email || '',
                  cliente_telefono: item.cliente_telefono || '', cliente_direccion: item.cliente_direccion || '',
                  con_iva: Number(item.monto_iva) > 0, descuento_global: 0,
                  notas: `Venta registrada el ${formatearFecha(item.creado_en)}`,
                  items: [{ descripcion: [item.producto_marca, item.producto_tipo_caja, item.producto_condicion, item.producto_codigo].filter(Boolean).join(' - '), cantidad: Number(item.cantidad_total) || 1, precio_unitario: item.precio_unitario || (item.cantidad_total && item.total ? Number(item.total)/Number(item.cantidad_total) : 0), descuento: 0 }],
                 }}})} className="flex items-center gap-2 text-yellow-100 text-[10px] font-black uppercase tracking-widest border border-border-default px-3 py-2 rounded-xl"><FileText size={14} /> Facturar</button>
              )}
            </div>
          </>
        ) : tabType === 'compra' ? (
          <>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-white font-bold text-sm">{item.producto_marca || ''} {item.producto_tipo_caja || ''}</h3>
                <p className="text-[10px] text-text-muted uppercase">{formatearFecha(item.creado_en)}</p>
              </div>
              <div className="text-right">
                <p className="money-value text-lg">${safeNumber(item.total).toFixed(2)}</p>
                <p className="text-[9px] text-text-muted uppercase font-black">{item.usuario_nombre}</p>
              </div>
            </div>
            <div className="border-t border-border-default pt-4">
              <span className="text-white font-black text-sm">{item.cantidad_total || 0} uds ({item.cantidad_items || 1} items)</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-between items-start">
              <div>
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg ${item.tipo_operacion === 'salida' ? 'bg-error/10 text-error' : 'bg-success/10 text-success'}`}>{item.tipo_operacion}</span>
                <h3 className="text-white font-bold text-sm mt-2">{item.producto_marca || ''} {item.producto_tipo_caja || ''}</h3>
                <p className="text-[10px] text-text-muted uppercase">{formatearFecha(item.creado_en)} · {item.notas || ''}</p>
              </div>
              <div className="text-right">
                <p className="money-value text-lg">${safeNumber(item.total).toFixed(2)}</p>
                <p className="text-[9px] text-text-muted uppercase font-black">{item.usuario_nombre}</p>
              </div>
            </div>
            <div className="border-t border-border-default pt-4">
              <span className="text-white font-black text-sm">{item.cantidad_total || 0} uds ({item.cantidad_items || 1} items)</span>
            </div>
          </>
        )}
      </div>
    ));
  };

  return (
    <>
    <div className="space-y-10 animate-[fadeIn_0.3s_ease-out]">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8">
        <PageTitle
          eyebrow="Operaciones"
          titleWhite={titleByTab.titleWhite}
          titleGold={titleByTab.titleGold}
          subtitle="Registra y consulta el historial de transacciones del sistema."
        />
        <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-stretch">
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
            <input type="search" placeholder="Buscar transacciones" className="search-input" value={h.busqueda} onChange={e => h.setBusqueda(e.target.value)} />
          </div>
          <div className="tab-group">
            <button onClick={() => h.setTab('venta')} className={`tab-item ${h.tab === 'venta' ? 'tab-item-active' : 'tab-item-inactive'}`}>Ventas</button>
            <button onClick={() => h.setTab('compra')} className={`tab-item ${h.tab === 'compra' ? 'tab-item-active' : 'tab-item-inactive'}`}>Compras</button>
            <button onClick={() => h.setTab('chatarra')} className={`tab-item ${h.tab === 'chatarra' ? 'tab-item-active' : 'tab-item-inactive'}`}>Chatarra</button>
          </div>
          {h.tab === 'venta' && puedeVender && <Button onClick={h.abrirVenta} icon={<ArrowUpRight size={18} />}>Nueva Venta</Button>}
          {h.tab === 'compra' && puedeComprar && <Button onClick={h.abrirCompra} icon={<ArrowDownLeft size={18} />}>Nueva Compra</Button>}
          {h.tab === 'chatarra' && puedeChatarra && <Button onClick={h.abrirChatarra} icon={<Recycle size={18} />}>Nueva Chatarra</Button>}
        </div>
      </div>

      <ErrorPanel />

      <div className="table-premium bg-zinc-900/50 backdrop-blur-xl">
        <div className="hidden md:block table-scroll">
          <table className="w-full text-left border-collapse table-fixed min-w-[980px]">
            <thead>
              <tr className="border-b border-border-default text-[10px] font-black text-text-muted uppercase tracking-[0.3em]">
                {h.tab === 'venta' ? (
                  <><th className="table-header-cell col-ref">Fecha</th><th className="table-header-cell col-producto">Producto</th><th className="table-header-cell col-cliente">Cliente</th><th className="table-header-cell col-cantidad">Cant.</th><th className="table-header-cell col-items">Items</th><th className="table-header-cell money-header col-money">Total</th><th className="table-header-cell col-money">Vendedor</th><th className="table-header-cell col-acciones">Acciones</th></>
                ) : h.tab === 'compra' ? (
                  <><th className="table-header-cell col-ref">Fecha</th><th className="table-header-cell col-producto">Producto</th><th className="table-header-cell col-cantidad">Cant.</th><th className="table-header-cell col-items">Items</th><th className="table-header-cell money-header col-money">Total</th><th className="table-header-cell col-money">Usuario</th><th className="table-header-cell col-acciones">Acciones</th></>
                ) : (
                  <><th className="table-header-cell col-ref">Fecha</th><th className="table-header-cell col-ref text-center">Tipo</th><th className="table-header-cell col-producto">Producto</th><th className="table-header-cell col-cantidad">Cant.</th><th className="table-header-cell col-items">Items</th><th className="table-header-cell money-header col-money">Total</th><th className="table-header-cell col-money">Usuario</th></>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a2a]/20">
              {renderTable(
                itemsPaginados,
                h.tab
              )}
            </tbody>
          </table>
          <Paginacion paginaActual={paginaActual} totalPaginas={totalPaginas} totalElementos={totalElementos} elementosPorPagina={elementosPorPagina} setPaginaActual={setPaginaActual} setElementosPorPagina={setElementosPorPagina} />
        </div>
        <div className="md:hidden p-4 space-y-4">
          {h.cargando ? (
            <div className="text-center text-text-muted text-xs uppercase font-black tracking-widest py-10">Cargando...</div>
          ) : (
            renderMobileCards(itemsPaginados, h.tab)
          )}
          {!h.cargando && <Paginacion paginaActual={paginaActual} totalPaginas={totalPaginas} totalElementos={totalElementos} elementosPorPagina={elementosPorPagina} setPaginaActual={setPaginaActual} setElementosPorPagina={setElementosPorPagina} />}
        </div>
      </div>
    </div>

    {/* MODAL VENTA */}
    {h.modalVenta && (
      <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-6 bg-black/85 backdrop-blur-sm overflow-hidden">
        <div className="w-full md:max-w-5xl bg-zinc-900 border border-border-default rounded-t-2xl md:rounded-2xl max-h-[94vh] md:max-h-[88vh] overflow-y-auto overflow-x-hidden shadow-2xl animate-[slideUp_0.3s_ease-out]">
          <div className="px-5 md:px-7 py-5 border-b border-border-default flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-black text-white uppercase italic">Nueva <span className="text-yellow-100">Venta</span></h2>
              <p className="text-text-muted text-[10px] uppercase tracking-widest font-bold">Registro de salida de inventario — Multi-Item</p>
            </div>
            <button onClick={() => h.cerrarVenta()} className="text-text-muted hover:text-white transition-colors"><X size={24} /></button>
          </div>

          {h.modalExito ? (
            <ModalExito tipo={h.exitoData?.tipo} id={h.exitoData?.id} total={h.exitoData?.total} />
          ) : (
            <div className="p-5 md:p-6 space-y-5">
              <ErrorPanel />
              <ErroresPanel />

              <div className="pos-product-section space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <label className="pos-section-title">1. Productos</label>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <button
                      onClick={() => h.ventaItems.agregarItem({ tipo: 'bateria' })}
                      className="h-10 px-4 bg-brand-500/10 hover:bg-brand-500/20 text-yellow-100 border border-yellow-100/30 hover:border-yellow-100/50 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-200"
                    >
                      + Agregar Batería
                    </button>
                    <button
                      onClick={() => h.ventaItems.agregarItem({ tipo: 'varios' })}
                      className="h-10 px-4 bg-transparent hover:bg-white/5 text-text-muted border border-border-default hover:border-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-200"
                    >
                      + Agregar Varios
                    </button>
                  </div>
                </div>

                <div className="overflow-visible">
                  <TablaItemsVenta
                    items={h.ventaItems.items}
                    productos={h.productos}
                    onActualizarCampo={h.ventaItems.actualizarCampo}
                    onEliminarItem={h.ventaItems.eliminarItem}
                    tipoModal="venta"
                  />

                  {h.ventaItems.items.length === 0 && (
                    <div className="text-center py-8 mt-2">
                      <p className="text-text-muted text-sm font-bold">No hay productos en la venta.</p>
                      <p className="text-text-muted text-xs mt-1">Usa los botones de arriba para agregar ítems.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <label className="pos-section-title">2. Cliente</label>
                
                <div className="pos-toggle-row" onClick={() => {
                     const next = !h.mostrarFormCliente;
                     h.setMostrarFormCliente(next);
                     if (!next) { h.setClienteId(''); h.setClienteData(null); h.setNombreCliente(''); h.setDocumentoCliente(''); h.setTelefonoCliente(''); h.setClienteEmail(''); h.setClienteDireccion(''); }
                  }}>
                    <div className={`pos-toggle ${h.mostrarFormCliente ? 'bg-brand-500' : 'bg-white/20'}`}>
                      <span className={`pos-toggle-knob ${h.mostrarFormCliente ? 'translate-x-6' : 'translate-x-1'}`} />
                    </div>
                    <div>
                      <p className="text-sm text-white font-bold">Datos de Facturación</p>
                      <p className="text-[10px] text-text-muted font-black uppercase tracking-wider">{!h.mostrarFormCliente ? 'Consumidor Final activo' : 'Ingresando datos del cliente'}</p>
                    </div>
                </div>

                {h.mostrarFormCliente && (
                  <div className="space-y-4 animate-[slideUp_0.2s_ease-out]">
                    <AutocompleteCliente onSelect={(c) => {
                      h.setClienteId(c.id); h.setClienteData(c);
                      h.setNombreCliente(c.nombre || ''); h.setDocumentoCliente(c.documento || '');
                      h.setTelefonoCliente(c.telefono || ''); h.setClienteEmail(c.email || '');
                      h.setClienteDireccion(c.direccion || '');
                    }} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input type="text" placeholder="Ingrese nombre completo" value={h.nombreCliente} onChange={e => h.setNombreCliente(e.target.value)}
                        className="input-premium" />
                      <input type="text" placeholder="Ingrese documento" value={h.documentoCliente} onChange={e => h.setDocumentoCliente(e.target.value)}
                        className="input-premium" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input type="text" placeholder="Ingrese teléfono" value={h.telefonoCliente} onChange={e => h.setTelefonoCliente(e.target.value)}
                        className="input-premium" />
                      <input type="email" placeholder="Ingrese email" value={h.clienteEmail} onChange={e => h.setClienteEmail(e.target.value)}
                        className="input-premium" />
                    </div>
                    <input type="text" placeholder="Ingrese dirección" value={h.clienteDireccion} onChange={e => h.setClienteDireccion(e.target.value)}
                      className="input-premium" />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <label className="pos-section-title">3. IVA</label>
                <div className="pos-toggle-row" onClick={() => h.ventaItems.setAplicarIVAGlobal(!h.ventaItems.aplicarIVAGlobal)}>
                    <div className={`pos-toggle ${h.ventaItems.aplicarIVAGlobal ? 'bg-brand-500' : 'bg-white/20'}`}>
                      <span className={`pos-toggle-knob ${h.ventaItems.aplicarIVAGlobal ? 'translate-x-6' : 'translate-x-1'}`} />
                    </div>
                    <div>
                      <p className="text-sm text-white font-bold">Aplicar IVA 15%</p>
                      <p className="text-[10px] text-text-muted font-black uppercase tracking-wider">{h.ventaItems.aplicarIVAGlobal ? 'IVA Habilitado' : 'IVA Deshabilitado'}</p>
                    </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-border-default">
                <label className="pos-section-title">4. Resumen de Venta</label>
                <TotalesPanel totales={h.ventaItems.totales} variante="grande" />
              </div>

              <div className="flex flex-col sm:flex-row justify-center gap-4 pt-6 mt-6 border-t border-border-default">
                <Button variant="secondary" onClick={() => h.cerrarVenta()} fullWidth>Cancelar</Button>
                <Button onClick={h.ejecutarVenta} loading={h.cargando} fullWidth className="bg-success text-black hover:brightness-110">{h.cargando ? 'Procesando...' : 'Procesar Venta'}</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    )}

    {/* MODAL COMPRA */}
    {h.modalCompra && (
      <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-6 bg-black/85 backdrop-blur-sm overflow-hidden">
        <div className="w-full md:max-w-5xl bg-zinc-900 border border-border-default rounded-t-2xl md:rounded-2xl max-h-[94vh] md:max-h-[88vh] overflow-y-auto overflow-x-hidden shadow-2xl animate-[slideUp_0.3s_ease-out]">
          <div className="px-5 md:px-7 py-5 border-b border-border-default flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-black text-white uppercase italic">Nueva <span className="text-yellow-100">Compra</span></h2>
              <p className="text-text-muted text-[10px] uppercase tracking-widest font-bold">Registro de entrada de inventario — Multi-Item</p>
            </div>
            <button onClick={() => h.cerrarCompra()} className="text-text-muted hover:text-white transition-colors"><X size={24} /></button>
          </div>

          {h.modalExito ? (
            <ModalExito tipo={h.exitoData?.tipo} id={h.exitoData?.id} total={h.exitoData?.total} />
          ) : (
            <div className="p-5 md:p-6 space-y-5">
              <ErrorPanel />
              <ErroresPanel />

              <div className="pos-product-section space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <label className="pos-section-title">1. Productos Comprados</label>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <button
                      onClick={() => h.compraItems.agregarItem({ tipo: 'bateria' })}
                      className="h-10 px-4 bg-brand-500/10 hover:bg-brand-500/20 text-yellow-100 border border-yellow-100/30 hover:border-yellow-100/50 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-200"
                    >
                      + Agregar Batería
                    </button>
                    <button
                      onClick={() => h.compraItems.agregarItem({ tipo: 'varios' })}
                      className="h-10 px-4 bg-transparent hover:bg-white/5 text-text-muted border border-border-default hover:border-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-200"
                    >
                      + Agregar Varios
                    </button>
                  </div>
                </div>

                <div className="overflow-visible">
                  <TablaItemsVenta
                    items={h.compraItems.items}
                    productos={h.productos}
                    onActualizarCampo={h.compraItems.actualizarCampo}
                    onEliminarItem={h.compraItems.eliminarItem}
                    tipoModal="compra"
                  />

                  {h.compraItems.items.length === 0 && (
                    <div className="text-center py-8 mt-2">
                      <p className="text-text-muted text-sm font-bold">No hay productos en la compra.</p>
                      <p className="text-text-muted text-xs mt-1">Usa los botones de arriba para agregar ítems.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-border-default">
                <label className="pos-section-title">2. Resumen Final</label>
                <div className="space-y-2">
                  <div className="grid grid-cols-[1fr_auto] items-baseline gap-4 font-black text-white text-2xl md:text-3xl">
                    <span>Total</span><span className="money-value">${safeNumber(h.compraItems.totales.total).toFixed(2)}</span>
                  </div>
                  <div className="text-[9px] text-text-muted font-bold uppercase tracking-wider text-right pt-1">
                    {safeNumber(h.compraItems.totales.cantidadItems)} item(s) | {Math.round(safeNumber(h.compraItems.totales.cantidadTotal))} unidad(es)
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1">Notas (Opcional)</label>
                <input type="text" value={h.notas} onChange={e => h.setNotas(e.target.value)} placeholder="Agregue una nota adicional"
                  className="input-premium" />
              </div>

              <div className="flex flex-col sm:flex-row justify-center gap-4 pt-6 mt-6 border-t border-border-default">
                <Button variant="secondary" onClick={() => h.cerrarCompra()} fullWidth>Cancelar</Button>
                <Button onClick={h.ejecutarCompra} loading={h.cargando} fullWidth>{h.cargando ? 'Procesando...' : 'Procesar Compra'}</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    )}

    {/* MODAL CHATARRA */}
    {h.modalChatarra && (
      <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-6 bg-black/85 backdrop-blur-sm overflow-hidden">
        <div className="w-full md:max-w-5xl bg-zinc-900 border border-border-default rounded-t-2xl md:rounded-2xl max-h-[94vh] md:max-h-[88vh] overflow-y-auto overflow-x-hidden shadow-2xl animate-[slideUp_0.3s_ease-out]">
          <div className="px-5 md:px-7 py-5 border-b border-border-default flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-black text-white uppercase italic">Nueva <span className="text-yellow-100">Chatarra</span></h2>
              <p className="text-text-muted text-[10px] uppercase tracking-widest font-bold">Operación de chatarra — Multi-Item</p>
            </div>
            <button onClick={() => h.cerrarChatarra()} className="text-text-muted hover:text-white transition-colors"><X size={24} /></button>
          </div>

          {h.modalExito ? (
            <ModalExito tipo={h.exitoData?.tipo} id={h.exitoData?.id} total={h.exitoData?.total} />
          ) : (
            <div className="p-5 md:p-6 space-y-5">
              <ErrorPanel />
              <ErroresPanel />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button type="button" onClick={() => h.setTipoChatarra('salida')}
                  className={`flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${h.tipoChatarra === 'salida' ? 'bg-error/20 text-error border border-error/30' : 'bg-zinc-900/30 text-text-muted border border-border-default hover:text-text-muted'}`}>
                  Salida (Venta)
                </button>
                <button type="button" onClick={() => h.setTipoChatarra('entrada')}
                  className={`flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${h.tipoChatarra === 'entrada' ? 'bg-success/20 text-success border border-success/30' : 'bg-zinc-900/30 text-text-muted border border-border-default hover:text-text-muted'}`}>
                  Entrada (Compra)
                </button>
              </div>

              <div className="pos-product-section space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <label className="pos-section-title">1. Productos</label>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <button
                      onClick={() => h.chatarraItems.agregarItem({ tipo: 'bateria' })}
                      className="h-10 px-4 bg-brand-500/10 hover:bg-brand-500/20 text-yellow-100 border border-yellow-100/30 hover:border-yellow-100/50 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-200"
                    >
                      + Agregar Batería
                    </button>
                    <button
                      onClick={() => h.chatarraItems.agregarItem({ tipo: 'varios' })}
                      className="h-10 px-4 bg-transparent hover:bg-white/5 text-text-muted border border-border-default hover:border-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-200"
                    >
                      + Agregar Varios
                    </button>
                  </div>
                </div>

                <div className="overflow-visible">
                  <TablaItemsVenta
                    items={h.chatarraItems.items}
                    productos={h.productos}
                    onActualizarCampo={h.chatarraItems.actualizarCampo}
                    onEliminarItem={h.chatarraItems.eliminarItem}
                    tipoModal="chatarra"
                  />

                  {h.chatarraItems.items.length === 0 && (
                    <div className="text-center py-8 mt-2">
                      <p className="text-text-muted text-sm font-bold">No hay productos en la chatarra.</p>
                      <p className="text-text-muted text-xs mt-1">Usa los botones de arriba para agregar ítems.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-border-default">
                <label className="pos-section-title">2. Resumen Final</label>
                <div className="space-y-2">
                  <div className="grid grid-cols-[1fr_auto] items-baseline gap-4 font-black text-white text-2xl md:text-3xl">
                    <span>Total</span><span className="money-value">${safeNumber(h.chatarraItems.totales.total).toFixed(2)}</span>
                  </div>
                  <div className="text-[9px] text-text-muted font-bold uppercase tracking-wider text-right pt-1">
                    {safeNumber(h.chatarraItems.totales.cantidadItems)} item(s) | {Math.round(safeNumber(h.chatarraItems.totales.cantidadTotal))} unidad(es)
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1">Notas (Opcional)</label>
                <input type="text" value={h.notas} onChange={e => h.setNotas(e.target.value)} placeholder="Agregue una nota adicional"
                  className="input-premium" />
              </div>

              <div className="flex flex-col sm:flex-row justify-center gap-4 pt-2">
                <Button variant="secondary" onClick={() => h.cerrarChatarra()} fullWidth>Cancelar</Button>
                <Button onClick={h.ejecutarChatarra} loading={h.cargando} fullWidth className={h.tipoChatarra === 'salida' ? 'bg-warning text-black hover:brightness-110' : 'bg-success text-black hover:brightness-110'}>{h.cargando ? 'Procesando...' : 'Procesar Chatarra'}</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    )}
    </>
  );
};

export default VistaTransacciones;



