import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion'

export function PageTransition({ children, className = '' }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14, scale: 0.995, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: 6, scale: 0.995, filter: 'blur(6px)' }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

export function Reveal({ children, className = '', delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.985, filter: 'blur(8px)' }}
      whileInView={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      viewport={{ once: true, amount: 0.16, margin: '-36px' }}
      transition={{ duration: 0.6, delay: delay / 1000, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function TiltCard({ children, className = '' }) {
  const reduceMotion = useReducedMotion()
  const pointerX = useMotionValue(0)
  const pointerY = useMotionValue(0)
  const xSpring = useSpring(pointerX, { stiffness: 230, damping: 26, mass: 0.55 })
  const ySpring = useSpring(pointerY, { stiffness: 230, damping: 26, mass: 0.55 })
  const rotateX = useTransform(ySpring, [-0.5, 0.5], [7, -7])
  const rotateY = useTransform(xSpring, [-0.5, 0.5], [-7, 7])

  function handleMove(event) {
    if (reduceMotion || !window.matchMedia('(pointer:fine)').matches) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const px = (event.clientX - bounds.left) / bounds.width - 0.5
    const py = (event.clientY - bounds.top) / bounds.height - 0.5
    pointerX.set(Math.max(-0.5, Math.min(0.5, px)))
    pointerY.set(Math.max(-0.5, Math.min(0.5, py)))
  }

  function resetTilt() {
    pointerX.set(0)
    pointerY.set(0)
  }

  return (
    <motion.div
      className={`tilt-card relative rounded-2xl border border-white/10 ${className}`}
      onMouseMove={handleMove}
      onMouseLeave={resetTilt}
      style={reduceMotion ? undefined : { rotateX, rotateY, transformPerspective: 1200 }}
      whileHover={reduceMotion ? { y: -2 } : { y: -4, scale: 1.01 }}
      transition={{ ease: [0.22, 1, 0.36, 1], duration: 0.2 }}
    >
      <div className="tilt-card-glare" />
      {children}
    </motion.div>
  )
}

export function RouteLoader() {
  const location = useLocation()
  const [active, setActive] = useState(true)

  useEffect(() => {
    setActive(true)
    const timeout = window.setTimeout(() => setActive(false), 780)
    return () => window.clearTimeout(timeout)
  }, [location.pathname, location.search])

  return (
    <div className={`route-loader-shell ${active ? 'route-loader-shell-active' : ''}`}>
      <motion.div
        className="route-loader-bar origin-left"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: active ? 1 : 0, opacity: active ? 1 : 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.div
        className="route-loader-glow"
        animate={active ? { x: ['-120%', '120%'], opacity: [0, 1, 0] } : { opacity: 0 }}
        transition={{ duration: 0.9, ease: 'linear', repeat: active ? Infinity : 0 }}
      />
    </div>
  )
}

export function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 160, damping: 32, mass: 0.24 })

  return (
    <div className="scroll-progress-shell">
      <motion.div className="scroll-progress-bar origin-left" style={{ scaleX }} />
    </div>
  )
}

export function ParallaxLayer({ children, className = '', speed = 8, axis = 'y' }) {
  const reduceMotion = useReducedMotion()
  const { scrollYProgress } = useScroll()
  const offset = useTransform(scrollYProgress, [0, 1], [0, speed * 32])

  const style = reduceMotion
    ? undefined
    : axis === 'x'
      ? { x: offset }
      : { y: offset }

  return (
    <motion.div className={className} style={style}>
      {children}
    </motion.div>
  )
}

export function CursorAura() {
  const reduceMotion = useReducedMotion()
  const [enabled, setEnabled] = useState(false)
  const [visible, setVisible] = useState(false)
  const [interactive, setInteractive] = useState(false)
  const [pressed, setPressed] = useState(false)

  const x = useMotionValue(-100)
  const y = useMotionValue(-100)
  const ringX = useSpring(x, { stiffness: 420, damping: 34, mass: 0.42 })
  const ringY = useSpring(y, { stiffness: 420, damping: 34, mass: 0.42 })
  const dotX = useSpring(x, { stiffness: 760, damping: 46, mass: 0.2 })
  const dotY = useSpring(y, { stiffness: 760, damping: 46, mass: 0.2 })

  useEffect(() => {
    if (reduceMotion) return

    const mediaQuery = window.matchMedia('(pointer:fine)')
    setEnabled(mediaQuery.matches)
    const onPointerCapabilityChange = () => setEnabled(mediaQuery.matches)
    mediaQuery.addEventListener('change', onPointerCapabilityChange)

    return () => mediaQuery.removeEventListener('change', onPointerCapabilityChange)
  }, [reduceMotion])

  useEffect(() => {
    if (!enabled) return

    const onMove = (event) => {
      x.set(event.clientX)
      y.set(event.clientY)
      setVisible(true)
    }

    const onOver = (event) => {
      const target = event.target
      if (!(target instanceof Element)) return
      setInteractive(Boolean(target.closest('a,button,input,textarea,select,[role="button"],.cursor-target')))
    }

    const onLeaveDocument = (event) => {
      if (!event.relatedTarget) {
        setVisible(false)
      }
    }
    const onDown = () => setPressed(true)
    const onUp = () => setPressed(false)
    const onWindowBlur = () => setVisible(false)

    window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('mouseover', onOver)
    window.addEventListener('mouseout', onLeaveDocument)
    window.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('blur', onWindowBlur)

    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseover', onOver)
      window.removeEventListener('mouseout', onLeaveDocument)
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('blur', onWindowBlur)
    }
  }, [enabled, x, y])

  if (!enabled) return null

  return (
    <div className={`cursor-aura-root ${visible ? 'is-visible' : ''}`}>
      <motion.div
        className={`cursor-aura-ring ${interactive ? 'is-active' : ''} ${pressed ? 'is-pressed' : ''}`}
        style={{ x: ringX, y: ringY }}
      />
      <motion.div className={`cursor-aura-dot ${interactive ? 'is-active' : ''}`} style={{ x: dotX, y: dotY }} />
    </div>
  )
}
