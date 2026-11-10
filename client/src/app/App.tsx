import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { NetworkBanner } from '../features/shell/NetworkBanner'
import { router } from './router'

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <NetworkBanner />
      <Toaster richColors closeButton position="top-right" />
    </>
  )
}
