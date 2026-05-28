import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { ChevronDown } from 'lucide-react'

export default function SelectPremium({
  options = [],
  value = '',
  onChange = () => {},
  onSelect,
  placeholder = '',
  label,
  className = '',
  disabled = false,
  clearable = false,
  size = 'md',
  openDirection = 'auto',
  id,
  name,
  ...props
}) {
  const [open, setOpen] = useState(false)
  const [openUp, setOpenUp] = useState(false)
  const [query, setQuery] = useState('')
  const [filtered, setFiltered] = useState([])
  const [highlighted, setHighlighted] = useState(-1)
  const ref = useRef(null)
  const listRef = useRef(null)

  const normalizedOptions = useMemo(() => {
    return (options || [])
      .map((opt) => {
        if (typeof opt === 'string') return { label: opt, value: opt }
        if (!opt || typeof opt !== 'object') return null
        const rawLabel = opt.label ?? opt.nombre ?? opt.value ?? opt.id
        const rawValue = opt.value ?? opt.id ?? opt.label ?? opt.nombre
        if (rawLabel === null || rawLabel === undefined || rawValue === null || rawValue === undefined) return null
        return {
          ...opt,
          label: String(rawLabel),
          value: String(rawValue),
        }
      })
      .filter(Boolean)
  }, [options])

  useEffect(() => { setFiltered(normalizedOptions) }, [normalizedOptions])

  useEffect(() => {
    if (!query) {
      setFiltered(normalizedOptions)
      return
    }
    const q = String(query).toLowerCase()
    setFiltered(normalizedOptions.filter((o) => (o.label || '').toLowerCase().includes(q)))
  }, [query, normalizedOptions])

  useEffect(() => { setHighlighted(-1) }, [filtered])

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (highlighted >= 0 && listRef.current) {
      const el = listRef.current.children[highlighted]
      if (el) el.scrollIntoView({ block: 'nearest' })
    }
  }, [highlighted])

  useEffect(() => {
    if (!open) return
    ref.current?.setAttribute('data-select-premium-open', 'true')
    return () => ref.current?.removeAttribute('data-select-premium-open')
  }, [open])

  useEffect(() => {
    if (!open || !ref.current) return
    if (openDirection === 'up') {
      setOpenUp(true)
      return
    }
    if (openDirection === 'down') {
      setOpenUp(false)
      return
    }
    const rect = ref.current.getBoundingClientRect()
    const estimatedDropdownHeight = Math.min(320, Math.max(120, (filtered.length || 1) * 44))
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    setOpenUp(spaceBelow < estimatedDropdownHeight && spaceAbove > spaceBelow)
  }, [open, filtered.length, openDirection])

  useEffect(() => {
    if (!open) return
    const onEsc = (e) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      setQuery('')
    }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [open])

  const displayLabel = (() => {
    const found = normalizedOptions.find((o) => String(o.value) === String(value))
    return found ? found.label : (placeholder || '')
  })()

  const handleKeyDown = useCallback((e) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setOpen(true)
        setQuery('')
        e.preventDefault()
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        setHighlighted((p) => Math.min(p + 1, filtered.length - 1))
        e.preventDefault()
        break
      case 'ArrowUp':
        setHighlighted((p) => Math.max(p - 1, 0))
        e.preventDefault()
        break
      case 'Enter':
        if (highlighted >= 0) {
          const opt = filtered[highlighted]
          onChange({ target: { value: opt.value } })
          onSelect?.(opt)
          setOpen(false)
          setQuery('')
        }
        e.preventDefault()
        break
      case 'Escape':
        setOpen(false)
        e.preventDefault()
        break
      default:
        break
    }
  }, [open, filtered, highlighted, onChange, onSelect])

  const handleSelect = (opt) => {
    onChange({ target: { value: opt.value } })
    onSelect?.(opt)
    setOpen(false)
    setQuery('')
  }

  const inputValue = open ? query : displayLabel
  const isSmall = size === 'sm'

  return (
    <div className={`space-y-2 overflow-visible ${className}`} ref={ref} id={id}>
      {label && <label className="text-[10px] text-text-muted font-black uppercase tracking-[0.15em] ml-1 block">{label}</label>}
      <div className="relative overflow-visible">
        <div
          role="combobox"
          aria-expanded={open}
          onKeyDown={handleKeyDown}
          className={`relative w-full ${isSmall ? 'min-w-0 h-11' : 'min-w-[180px] h-12'} bg-zinc-950 border border-border-default rounded-xl px-4 text-text-primary cursor-text transition-all duration-200 flex items-center ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${open ? 'border-yellow-400 ring-2 ring-yellow-500/20' : ''} focus-within:border-yellow-400 focus-within:ring-2 focus-within:ring-yellow-500/20`}
          onClick={() => {
            if (disabled) return
            setOpen(true)
            setQuery('')
          }}
          {...props}
        >
          <input
            aria-label={label || placeholder}
            className={`select-premium-input w-full h-full min-w-0 bg-transparent border-0 outline-none ring-0 focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none px-0 pr-10 text-text-primary ${isSmall ? 'text-[13px]' : 'text-sm'} leading-tight placeholder:text-text-muted`}
            placeholder={open ? (placeholder || 'Buscar') : ''}
            value={inputValue}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => {}, 120)}
            autoComplete="off"
            disabled={disabled}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {clearable && value && (
              <button type="button" onClick={() => onChange({ target: { value: '' } })} className="text-text-muted hover:text-white p-0 m-0 bg-transparent border-0">
                x
              </button>
            )}
            <ChevronDown size={16} className={`text-text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
          </div>
        </div>

        {open && (
          <div
            ref={listRef}
            className={`absolute left-0 right-0 z-50 w-full min-w-full rounded-xl border border-border-default bg-zinc-950 shadow-xl max-h-72 overflow-y-auto overflow-x-hidden custom-scrollbar ${openUp ? 'bottom-full mb-2' : 'top-full mt-2'}`}
          >
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-sm text-text-muted">Sin opciones</div>
            ) : (
              filtered.map((opt, i) => {
                const isActive = String(opt.value) === String(value)
                return (
                  <div
                    key={`${opt.value}-${i}`}
                    role="option"
                    aria-selected={isActive}
                    onClick={() => handleSelect(opt)}
                    onMouseEnter={() => setHighlighted(i)}
                    className={`px-4 py-3 text-sm cursor-pointer transition-all duration-100 border-b border-border-default truncate ${isActive ? 'bg-yellow-500/20 border-l-4 border-l-yellow-400 text-white' : highlighted === i ? 'bg-yellow-500/10 text-white' : 'text-text-muted hover:bg-yellow-500/10 hover:text-white'}`}
                  >
                    {opt.label}
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
      {name && <input type="hidden" name={name} value={value} />}
    </div>
  )
}
