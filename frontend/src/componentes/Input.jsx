import { forwardRef } from 'react'

const Input = forwardRef(({ label, error, icon, className = '', ...props }, ref) => {
  return (
    <div className="space-y-2">
      {label && (
        <label className="text-[10px] text-text-muted font-black uppercase tracking-[0.15em] ml-1 block">{label}</label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 flex items-center pl-5 pointer-events-none text-text-muted">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={[
            'input-premium',
            error ? 'border-error/50 focus:border-error' : 'border-border-default',
            icon ? 'pl-14' : '',
            className,
          ].join(' ')}
          {...props}
        />
      </div>
      {error && (
        <p className="text-[10px] font-black uppercase tracking-widest text-error ml-1">{error}</p>
      )}
    </div>
  )
})

Input.displayName = 'Input'

export default Input

