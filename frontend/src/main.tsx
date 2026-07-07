import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { palette } from './theme/palette'

const prefix = '--color-'
Object.entries(palette).forEach(([key, value]) => {
  if (key === 'shadow') return
  const cssVar = `${prefix}${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`
  document.documentElement.style.setProperty(cssVar, value)
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
