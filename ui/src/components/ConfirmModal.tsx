import React from 'react'
import { X, AlertTriangle } from 'lucide-react'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  details?: { label: string; value: string }[]
  confirmText?: string
  cancelText?: string
  type?: 'warning' | 'danger'
}

export function ConfirmModal({
  isOpen, onClose, onConfirm, title, message, details,
  confirmText = '确认', cancelText = '取消', type = 'warning'
}: ConfirmModalProps) {
  if (!isOpen) return null

  const colors = {
    warning: { bg: 'rgba(245,158,11,0.15)', border: '#fbbf24', icon: '#fbbf24' },
    danger: { bg: 'rgba(239,68,68,0.15)', border: '#ef4444', icon: '#ef4444' }
  }
  const theme = colors[type]

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn 0.2s ease'
    }} onClick={onClose}>
      <div className="glass-card" style={{
        width: 420, maxWidth: '90vw', borderRadius: 16, padding: 0,
        animation: 'slideUp 0.3s ease', border: `1px solid ${theme.border}40`
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: theme.bg, display: 'flex',
              alignItems: 'center', justifyContent: 'center'
            }}>
              <AlertTriangle size={18} color={theme.icon} />
            </div>
            <h3 style={{
              margin: 0, fontSize: 16, fontWeight: 600,
              color: '#e2e4f0', fontFamily: "'Sora',sans-serif"
            }}>{title}</h3>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: '#6b7099', padding: 4, display: 'flex', transition: 'color 0.15s'
          }} onMouseEnter={e => e.currentTarget.style.color = '#e2e4f0'}
             onMouseLeave={e => e.currentTarget.style.color = '#6b7099'}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 24 }}>
          <p style={{
            margin: '0 0 16px 0', fontSize: 14, lineHeight: 1.6,
            color: '#9ca3af', fontFamily: "'DM Sans',sans-serif"
          }}>{message}</p>

          {details && details.length > 0 && (
            <div style={{
              background: 'rgba(255,255,255,0.02)', borderRadius: 10,
              padding: 16, border: '1px solid rgba(255,255,255,0.05)'
            }}>
              {details.map((item, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between',
                  marginBottom: i < details.length - 1 ? 12 : 0
                }}>
                  <span style={{ fontSize: 13, color: '#6b7099' }}>{item.label}</span>
                  <span className="mono" style={{
                    fontSize: 13, fontWeight: 600, color: '#e2e4f0'
                  }}>{item.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', gap: 10, justifyContent: 'flex-end'
        }}>
          <button onClick={onClose} style={{
            padding: '9px 20px', borderRadius: 9, border: 'none',
            background: 'rgba(255,255,255,0.05)', color: '#9ca3af',
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
            fontFamily: "'DM Sans',sans-serif", transition: 'all 0.15s'
          }} onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
            e.currentTarget.style.color = '#e2e4f0'
          }} onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
            e.currentTarget.style.color = '#9ca3af'
          }}>{cancelText}</button>

          <button onClick={() => { onConfirm(); onClose() }} style={{
            padding: '9px 20px', borderRadius: 9, border: 'none',
            background: theme.border, color: '#0f172a',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            fontFamily: "'DM Sans',sans-serif", transition: 'all 0.15s',
            boxShadow: `0 0 20px ${theme.border}40`
          }} onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.boxShadow = `0 4px 24px ${theme.border}60`
          }} onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = `0 0 20px ${theme.border}40`
          }}>{confirmText}</button>
        </div>
      </div>
    </div>
  )
}
