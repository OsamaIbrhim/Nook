import Lenis from 'lenis'
import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

export function SmoothScroll() {
  const progress = useRef<HTMLDivElement>(null)
  const lenis = useRef<Lenis | null>(null)
  const location = useLocation()

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!reduced) {
      lenis.current = new Lenis({ duration: 1.05, smoothWheel: true, wheelMultiplier: 0.9, touchMultiplier: 1.15 })
      let frame = 0
      const animate = (time: number) => {
        lenis.current?.raf(time)
        frame = requestAnimationFrame(animate)
      }
      frame = requestAnimationFrame(animate)
      return () => {
        cancelAnimationFrame(frame)
        lenis.current?.destroy()
        lenis.current = null
      }
    }
  }, [])

  useEffect(() => {
    const update = () => {
      const height = document.documentElement.scrollHeight - window.innerHeight
      const amount = height > 0 ? window.scrollY / height : 0
      if (progress.current) progress.current.style.transform = `scaleX(${Math.min(1, amount)})`
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      lenis.current?.scrollTo(0, { immediate: true })
      if (!lenis.current) window.scrollTo({ top: 0, behavior: 'auto' })
    })
    return () => cancelAnimationFrame(frame)
  }, [location.pathname])

  useEffect(() => {
    const scrollToTop = () => {
      if (lenis.current) lenis.current.scrollTo(0, { duration: 0.85, force: true })
      else window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    window.addEventListener('nook:scroll-top', scrollToTop)
    return () => window.removeEventListener('nook:scroll-top', scrollToTop)
  }, [])

  return <div className="pointer-events-none fixed inset-x-0 top-0 z-[90] h-[2px] origin-left bg-transparent"><div ref={progress} className="h-full origin-left scale-x-0 bg-[#d7ff39] will-change-transform"/></div>
}
