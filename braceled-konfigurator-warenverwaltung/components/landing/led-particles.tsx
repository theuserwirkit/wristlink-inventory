"use client"

import { useEffect, useRef } from "react"

type Particle = {
  x: number
  y: number
  r: number
  hue: number
  speed: number
  phase: number
}

export function LedParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reducedMotion) return

    let frame = 0
    let particles: Particle[] = []
    let w = 0
    let h = 0
    let rafId = 0
    let running = true

    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      w = parent.clientWidth
      h = parent.clientHeight
      canvas.width = w
      canvas.height = h
      const count = Math.floor((w * h) / 14000)
      particles = Array.from({ length: Math.min(count, 80) }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 1.5 + Math.random() * 2.5,
        hue: Math.random() * 60 + 240,
        speed: 0.3 + Math.random() * 0.7,
        phase: Math.random() * Math.PI * 2,
      }))
    }

    const draw = () => {
      if (!running) return
      ctx.clearRect(0, 0, w, h)
      for (const p of particles) {
        const pulse = 0.4 + 0.6 * Math.sin(frame * 0.02 * p.speed + p.phase)
        const alpha = 0.15 + pulse * 0.55
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4)
        grad.addColorStop(0, `hsla(${p.hue}, 90%, 65%, ${alpha})`)
        grad.addColorStop(1, `hsla(${p.hue}, 90%, 50%, 0)`)
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2)
        ctx.fill()
        p.y -= p.speed * 0.3
        if (p.y < -10) {
          p.y = h + 10
          p.x = Math.random() * w
        }
      }
      frame++
      rafId = requestAnimationFrame(draw)
    }

    resize()
    const parent = canvas.parentElement
    const ro = parent ? new ResizeObserver(resize) : null
    if (parent && ro) ro.observe(parent)
    rafId = requestAnimationFrame(draw)

    return () => {
      running = false
      ro?.disconnect()
      cancelAnimationFrame(rafId)
    }
  }, [])

  return <canvas ref={canvasRef} className="lp-led-canvas" aria-hidden />
}
