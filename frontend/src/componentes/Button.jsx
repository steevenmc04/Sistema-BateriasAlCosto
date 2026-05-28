const variants = {
  primary:   'bg-brand-500 text-black hover:bg-brand-400 shadow-glow-sm active:shadow-glow-md font-black',
  secondary: 'bg-black border border-border-default text-text-muted hover:bg-zinc-900/80 hover:text-white',
  danger:    'bg-error/10 border border-red-500/30 text-error hover:brightness-110',
  warning:   'bg-warning/10 border border-yellow-500/30 text-warning hover:brightness-110',
  ghost:     'text-text-muted hover:bg-zinc-900/80 hover:text-white',
}

const sizes = {
  sm: 'px-4 py-2 text-[10px] min-h-[36px]',
  md: 'px-6 py-3 text-[11px] min-h-[44px]',
  lg: 'px-8 py-4 text-[11px] min-h-[52px]',
}

export default function Button({ variant = 'primary', size = 'lg', loading, disabled, icon, fullWidth, children, className = '', ...props }) {
  return (
    <button
      className={[
        'inline-flex items-center justify-center gap-2 font-black uppercase tracking-widest rounded-xl transition-all duration-200',
        'active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed select-none',
        variants[variant] || variants.primary,
        sizes[size] || sizes.lg,
        fullWidth ? 'w-full' : '',
        loading ? 'opacity-70 cursor-wait' : '',
        className,
      ].join(' ')}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  )
}


