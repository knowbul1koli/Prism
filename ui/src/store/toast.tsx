import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'

interface Toast { id: number; type: 'success' | 'error' | 'info'; msg: string }
interface ToastCtx { toast: (type: Toast['type'], msg: string) => void }

const Ctx = createContext<ToastCtx>({ toast: () => {} })
export const useToast = () => useContext(Ctx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  let seq = 0

  const toast = useCallback((type: Toast['type'], msg: string) => {
    const id = ++seq
    setToasts(p => [...p, { id, type, msg }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500)
  }, [])

  const Icon = { success: CheckCircle, error: XCircle, info: Info }

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="toast-container">
        {toasts.map(t => {
          const I = Icon[t.type]
          return (
            <div key={t.id} className={`toast toast-${t.type}`}>
              <I size={15} style={{ flexShrink: 0,
                color: t.type === 'success' ? '#10b981' : t.type === 'error' ? '#f43f5e' : '#7c3aed' }} />
              <span style={{ flex: 1 }}>{t.msg}</span>
              <button onClick={() => setToasts(p => p.filter(x => x.id !== t.id))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7099', padding: 0 }}>
                <X size={13} />
              </button>
            </div>
          )
        })}
      </div>
    </Ctx.Provider>
  )
}
