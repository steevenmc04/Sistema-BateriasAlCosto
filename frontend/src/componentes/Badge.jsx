// Premium visual badge for stock states
// Accepts either `cantidad` (number) or explicit `variant` ('success'|'warning'|'danger')
export default function Badge({ cantidad = null, variant = null, size = 'md', children, className = '', ...props }) {
  const n = cantidad !== null && cantidad !== undefined ? Number(cantidad) : null;

  // determine variant by cantidad if not provided
  let v = variant;
  if (!v) {
    if (n === null || Number.isNaN(n)) v = 'neutral';
    else if (n <= 0) v = 'danger';
    else if (n >= 1 && n <= 5) v = 'warning';
    else v = 'success';
  }

  const sizeMap = {
    sm: 'text-[10px] px-2 py-0.5 rounded-xl',
    md: 'text-[11px] px-3 py-1 rounded-xl',
    lg: 'text-[12px] px-4 py-1.5 rounded-xl'
  };

  // map variant to css class defined in index.css
  const variantClass = v === 'danger' ? 'badge-danger' : v === 'warning' ? 'badge-warning' : v === 'success' ? 'badge-success' : '';

  // pulse animation for dot
  const dotPulse = 'animate-pulse';

  // Accessibility: fallback label when children not provided
  let label = children || (n === null ? 'N/A' : (v === 'danger' ? 'SIN STOCK' : v === 'warning' ? 'STOCK BAJO' : 'CON STOCK'));

  return (
    <span
      className={["badge leading-none", sizeMap[size] || sizeMap.md, variantClass, 'transition-transform duration-200 ease-out transform hover:scale-105 hover:shadow-lg', className].join(' ')}
      {...props}
    >
      {/* color dot with pulse - use currentColor fallback */}
      <span className={`inline-block w-2 h-2 rounded-full bg-current ${dotPulse} flex-shrink-0`} aria-hidden="true" />
      <span className="leading-tight truncate min-w-[48px]">{String(label).toUpperCase()}</span>
    </span>
  );
}

