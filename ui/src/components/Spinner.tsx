import React from 'react'

export function PageSpinner({ text }: { text?: string }) {
  // 仅显示一个干净的转圈，不附带任何文本或背景方框
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '40px 0',
      width: '100%',
      height: '100%',
      minHeight: '120px',
      background: 'transparent'
    }}>
      <span style={{
        display: 'block', width: 32, height: 32,
        border: '3px solid rgba(99,102,241,0.15)',
        borderTopColor: '#818cf8',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }}/>
    </div>
  )
}
