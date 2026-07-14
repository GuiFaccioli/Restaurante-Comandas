'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowUp } from 'lucide-react'

import { Button } from '@/components/ui/button'

export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false)
  const [scrolling, setScrolling] = useState(false)
  const timeoutRef = useRef<number | null>(null)

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 320)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current)
    }
  }, [])

  function scrollToTop() {
    setScrolling(true)
    timeoutRef.current = window.setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      setScrolling(false)
    }, 500)
  }

  if (!visible) return null

  return (
    <Button
      type="button"
      intent="informational"
      appearance="solid"
      size="icon"
      className="fixed right-4 bottom-24 z-40 size-11 rounded-full shadow-md sm:right-6"
      aria-label="Voltar ao topo"
      aria-busy={scrolling}
      disabled={scrolling}
      onClick={scrollToTop}
    >
      <ArrowUp aria-hidden="true" />
    </Button>
  )
}
