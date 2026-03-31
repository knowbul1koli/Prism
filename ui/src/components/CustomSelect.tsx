import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'

interface Option {
  label: string | React.ReactNode
  value: any
}

interface Props {
  options: Option[]
  value: any
  onChange: (val: any) => void
  placeholder?: string
}

export function CustomSelect({ options, value, onChange, placeholder }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  
  const selectedOption = options.find(o => o.value === value)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setIsOpen(false)
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="custom-dropdown-container" ref={ref}>
      <div 
        className="prism-input" 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          cursor: 'pointer',
          borderColor: isOpen ? '#818cf8' : undefined,
          background: isOpen ? 'rgba(0,0,0,0.4)' : undefined
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span style={{ color: selectedOption ? '#fff' : 'rgba(255,255,255,0.2)' }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown 
          size={16} 
          style={{ 
            color: 'rgba(255,255,255,0.3)', 
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s'
          }} 
        />
      </div>

      {isOpen && (
        <div className="custom-dropdown-list">
          {options.map((opt) => (
            <div 
              key={String(opt.value)} 
              className={`custom-dropdown-item ${opt.value === value ? 'active' : ''}`}
              onClick={() => {
                onChange(opt.value)
                setIsOpen(false)
              }}
            >
              <span>{opt.label}</span>
              {opt.value === value && <Check size={14} style={{ color: 'inherit' }} />}
            </div>
          ))}
          {options.length === 0 && (
            <div style={{ padding: '12px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>
              暂无选项
            </div>
          )}
        </div>
      )}
    </div>
  )
}
