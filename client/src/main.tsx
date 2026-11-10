import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app/App'
import { Providers } from './app/providers'
import { createStore } from './app/store'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers store={createStore()}>
      <App />
    </Providers>
  </StrictMode>
)
