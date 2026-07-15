'use client'

import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'

import { Button } from '@/components/ui/button'

export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 320)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
      onClick={scrollToTop}
    >
      <ArrowUp aria-hidden="true" />
    </Button>
  )
}
