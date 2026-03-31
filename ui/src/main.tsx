import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { applyCustomSettings } from './utils/theme'

// 在应用启动前立刻应用自定义主题配置
applyCustomSettings()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
