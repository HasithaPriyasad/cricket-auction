'use client'
import { useState, useEffect } from 'react'

// Two rAF frames before enabling CSS entrance animations.
// Prevents frozen animations when SSR/iframes have a stale timeline.
export function useAnimGate(): boolean {
  const [animOn, setAnimOn] = useState(false)
  useEffect(() => {
    let r1: number, r2: number
    r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => setAnimOn(true))
    })
    return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2) }
  }, [])
  return animOn
}
