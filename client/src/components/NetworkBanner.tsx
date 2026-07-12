import { WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'

export function NetworkBanner() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const connected = () => setOnline(true)
    const disconnected = () => setOnline(false)
    window.addEventListener('online', connected)
    window.addEventListener('offline', disconnected)
    return () => {
      window.removeEventListener('online', connected)
      window.removeEventListener('offline', disconnected)
    }
  }, [])
  if (online) return null
  return <div role="status" className="fixed inset-x-0 bottom-4 z-[70] mx-auto flex w-fit items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-white shadow-xl"><WifiOff size={16}/> You’re offline. We’ll reconnect automatically.</div>
}
