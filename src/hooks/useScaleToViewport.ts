'use client'
import { useEffect, useRef } from 'react'

// Scales a fixed 1920×1080 canvas element to fill the viewport
// while preserving aspect ratio. Returns the ref to attach to the element.
export function useScaleToViewport(designW = 1920, designH = 1080) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const apply = () => {
      const scaleX = window.innerWidth / designW
      const scaleY = window.innerHeight / designH
      const scale = Math.min(scaleX, scaleY)
      el.style.transform = `scale(${scale})`
      el.style.transformOrigin = 'top left'
      // Centre if viewport is wider/taller than scaled canvas
      const offsetX = (window.innerWidth - designW * scale) / 2
      const offsetY = (window.innerHeight - designH * scale) / 2
      el.style.left = `${offsetX}px`
      el.style.top = `${offsetY}px`
    }

    apply()
    window.addEventListener('resize', apply)
    return () => window.removeEventListener('resize', apply)
  }, [designW, designH])

  return ref
}
