import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
// Noto Sans SC 本地字体（@fontsource），避免依赖外部 CDN
import '@fontsource/noto-sans-sc/400.css'
import '@fontsource/noto-sans-sc/500.css'
import '@fontsource/noto-sans-sc/700.css'
import '@/styles/global.less'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
