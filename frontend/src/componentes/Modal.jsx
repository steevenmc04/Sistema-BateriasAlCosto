import { useEffect } from 'react'

const modalSizes = {
  sm: 'modal-sm',
  md: 'modal-md',
  lg: 'modal-lg',
  xl: 'modal-xl',
}

export default function Modal({ open, onClose, title, subtitle, size = 'lg', children, footer }) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    const handler = (e) => {
      if (e.key !== 'Escape') return
      if (document.querySelector('[data-select-premium-open="true"]')) return
      onClose?.()
    }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="modal-backdrop">
      <div
        className={[
          modalSizes[size] || modalSizes.lg,
          'modal-premium max-h-[95vh] md:max-h-[90vh] overflow-y-auto animate-[slideUp_0.3s_ease-out] custom-scrollbar',
        ].join(' ')}
      >
        {(title || subtitle) && (
          <div className="modal-header">
            <div className="min-w-0 flex-1">
              {title && (
                <h2 className="text-xl md:text-2xl font-black text-text-primary uppercase italic truncate">{title}</h2>
              )}
              {subtitle && (
                <p className="text-[10px] uppercase tracking-widest font-bold mt-1 text-text-muted">{subtitle}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-xl text-text-muted hover:text-text-primary hover:bg-zinc-900/80 transition-all shrink-0 ml-4"
              aria-label="Cerrar"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}
