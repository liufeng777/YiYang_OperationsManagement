import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
// Noto Sans SC 通过 CDN 在线引入（见 index.html），加载失败自动回退系统字体
import '@/styles/global.less'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
