import { useState, useRef, useEffect, useCallback } from 'react'

export default function Autocomplete({ options = [], value = '', onChange = () => {}, placeholder = 'Buscar', label, className = '', ...props }) {
  const [open, setOpen] = useState(false)
  const [filtered, setFiltered] = useState(options)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  useEffect(() => {
    setFiltered(
      value
        ? options.filter(o => o.toLowerCase().includes(value.toLowerCase()))
        : options
    )
  }, [value, options])

  useEffect(() => { setHighlightedIndex(-1) }, [filtered])
  useEffect(() => { if (!open) setHighlightedIndex(-1) }, [open])

  const handleChange = useCallback((e) => {
    onChange(e.target.value)
    setOpen(true)
  }, [onChange])

  const handleSelect = useCallback((option) => {
    onChange(option)
    setOpen(false)
    inputRef.current?.blur()
  }, [onChange])

  const handleKeyDown = useCallback((e) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') { setOpen(true); e.preventDefault() }
      return
    }
    switch (e.key) {
      case 'ArrowDown':
        setHighlightedIndex(prev => Math.min(prev + 1, filtered.length - 1))
        e.preventDefault()
        break
      case 'ArrowUp':
        setHighlightedIndex(prev => Math.max(prev - 1, 0))
        e.preventDefault()
        break
      case 'Enter':
        if (highlightedIndex >= 0 && highlightedIndex < filtered.length) handleSelect(filtered[highlightedIndex])
        e.preventDefault()
        break
      case 'Escape':
        setOpen(false)
        e.preventDefault()
        break
    }
  }, [open, filtered, highlightedIndex, handleSelect])

  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const el = listRef.current.children[highlightedIndex]
      if (el) el.scrollIntoView({ block: 'nearest' })
    }
  }, [highlightedIndex])

  return (
    <div className="relative space-y-2">
      {label && (
        <label className="text-[10px] text-text-muted font-black uppercase tracking-[0.15em] ml-1 block">{label}</label>
      )}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={[
          'input-premium',
          open && filtered.length > 0 ? 'rounded-b-none border-b-0 border-yellow-100' : '',
          className,
        ].join(' ')}
        autoComplete="off"
        {...props}
      />
      {open && filtered.length > 0 && (
        <div ref={listRef} className="dropdown-list">
          {filtered.map((option, i) => (
            <button
              key={option}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleSelect(option) }}
              onMouseEnter={() => setHighlightedIndex(i)}
              className={[
                'dropdown-item',
                highlightedIndex === i ? 'dropdown-item-active' : '',
                i === filtered.length - 1 ? 'rounded-b-[14px]' : '',
              ].join(' ')}
            >
              <span className="text-[10px] font-black uppercase tracking-wider">{option}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

