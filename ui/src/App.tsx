import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './store/auth'
import { ToastProvider } from './store/toast'
import Layout         from './components/Layout'
import Login          from './pages/Login'
import ChangePassword from './pages/ChangePassword'
import Dashboard      from './pages/Dashboard'
import Nodes          from './pages/Nodes'
import Tunnels        from './pages/Tunnels'
import Forwards       from './pages/Forwards'
import Users          from './pages/Users'
import Speed          from './pages/Speed'
import Config         from './pages/Config'
import Profile        from './pages/Profile'

function Guard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  return user ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login"           element={<Login />} />
            <Route path="/change-password" element={<ChangePassword />} />
            <Route element={<Guard><Layout /></Guard>}>
              <Route path="/"          element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/forwards"  element={<Forwards />} />
              <Route path="/tunnels"   element={<Tunnels />} />
              <Route path="/nodes"     element={<Nodes />} />
              <Route path="/speed"     element={<Speed />} />
              <Route path="/users"     element={<Users />} />
              <Route path="/config"    element={<Config />} />
              <Route path="/profile"   element={<Profile />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
