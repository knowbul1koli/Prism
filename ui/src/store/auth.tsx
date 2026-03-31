import React, { createContext, useContext, useState, ReactNode } from 'react'
interface AuthUser { username: string; role_id: number }

const AuthContext = createContext<any>(null)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const name = localStorage.getItem('name')
    const role = localStorage.getItem('role_id')
    return name ? { username: name, role_id: Number(role) } : null
  })

  const setAuth = (token: string, u: AuthUser) => {
    localStorage.setItem('token', token)
    localStorage.setItem('name', u.username)
    localStorage.setItem('role_id', String(u.role_id))
    setUser(u)
  }

  const clearAuth = () => {
    localStorage.clear()
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, setAuth, clearAuth }}>{children}</AuthContext.Provider>
}
