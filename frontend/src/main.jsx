import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { bootTheme } from './lib/branding'

// Before the first render, not in an effect: applying the theme and the
// institution's colours after React mounts means every visit paints once in
// the built-in defaults and then visibly changes.
bootTheme()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
