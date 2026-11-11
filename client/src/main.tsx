import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app/App'
import { Providers } from './app/providers'
import { createStore } from './app/store'
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
import '@fontsource-variable/hanken-grotesk'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers store={createStore()}>
      <App />
    </Providers>
  </StrictMode>
)
