import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

export default function Select({ label, error, options = [], placeholder, className = '', value, onChange, children, name, ...props }) {
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  const ref = useRef(null)
  const listRef = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => { setHighlighted(-1) }, [open])

  useEffect(() => {
    if (highlighted >= 0 && listRef.current?.children[highlighted]) {
      listRef.current.children[highlighted].scrollIntoView({ block: 'nearest' })
    }
  }, [highlighted])

  const allOptions = [...(options || [])]
  const displayValue = allOptions.find(o => (typeof o === 'string' ? o : o.value) === value)
  const displayLabel = displayValue ? (typeof displayValue === 'string' ? displayValue : displayValue.label) : placeholder || ''

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === 'ArrowDown') { setOpen(true); e.preventDefault() }
      return
    }
    switch (e.key) {
      case 'ArrowDown':
        setHighlighted(p => Math.min(p + 1, allOptions.length - 1))
        e.preventDefault()
        break
      case 'ArrowUp':
        setHighlighted(p => Math.max(p - 1, 0))
        e.preventDefault()
        break
      case 'Enter':
        if (highlighted >= 0) {
          const opt = allOptions[highlighted]
          const val = typeof opt === 'string' ? opt : opt.value
          onChange?.({ target: { value: val } })
          setOpen(false)
        }
        e.preventDefault()
        break
      case 'Escape':
        setOpen(false)
        e.preventDefault()
        break
    }
  }

  return (
    <div className="space-y-2" ref={ref}>
      {label && (
        <label className="text-[10px] text-text-muted font-black uppercase tracking-[0.15em] ml-1 block">{label}</label>
      )}
      <div className="relative overflow-visible">
        <div
          tabIndex={0}
          role="combobox"
          aria-expanded={open}
          onKeyDown={handleKeyDown}
          onClick={() => setOpen(!open)}
          className={[
            'w-full input-premium cursor-pointer flex items-center justify-between',
            open ? 'border-border-strong rounded-b-none' : '',
            error ? 'border border-error/50' : '',
            !value ? 'text-text-muted/60' : '',
            className,
          ].join(' ')}
          {...props}
        >
          <span className="truncate">{displayLabel}</span>
          <ChevronDown size={16} className={`text-text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </div>

        {open && (
          <div ref={listRef} className="absolute top-full z-50 w-full dropdown-list mt-2">
            {allOptions.map((opt, i) => {
              const val = typeof opt === 'string' ? opt : opt.value
              const lbl = typeof opt === 'string' ? opt : opt.label
              const isSelected = val === value
              return (
                <div
                  key={val}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => { onChange?.({ target: { value: val } }); setOpen(false) }}
                  onMouseEnter={() => setHighlighted(i)}
                  className={['dropdown-item', isSelected ? 'dropdown-item-active' : '', highlighted === i && !isSelected ? 'dropdown-item-active' : ''].join(' ')}
                >
                  {lbl}
                </div>
              )
            })}
            {allOptions.length === 0 && (
              <div className="px-5 py-4 text-sm text-text-muted">Sin opciones</div>
            )}
          </div>
        )}
      </div>
      {error && (
        <p className="text-[10px] font-black uppercase tracking-widest text-error ml-1">{error}</p>
      )}
      {/* hidden input for form compatibility */}
      {name && <input type="hidden" name={name} value={value} />}
    </div>
  )
}
