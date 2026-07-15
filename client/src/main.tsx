import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { HelmetProvider } from 'react-helmet-async'
import App from './App'
import { store } from './app/store'
import { ErrorBoundary } from './components/ErrorBoundary'
import './index.css'
createRoot(document.getElementById('root')!).render(<StrictMode><ErrorBoundary><HelmetProvider><Provider store={store}><App/></Provider></HelmetProvider></ErrorBoundary></StrictMode>)
