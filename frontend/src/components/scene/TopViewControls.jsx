/**
 * TopViewControls — Orthographic pan, zoom, drag editing
 */
import { useThree, useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function TopViewControls() {
  const { camera, gl } = useThree()
  const isDragging = useRef(false)
  const lastMouse = useRef({ x: 0, y: 0 })
  const panOffset = useRef({ x: 7, z: 5 }) // center of demo scene

  useEffect(() => {
    const canvas = gl.domElement

    const onMouseDown = (e) => {
      if (e.button === 1 || e.button === 2) {
        isDragging.current = true
        lastMouse.current = { x: e.clientX, y: e.clientY }
      }
    }

    const onMouseMove = (e) => {
      if (!isDragging.current) return
      const dx = (e.clientX - lastMouse.current.x) / camera.zoom
      const dy = (e.clientY - lastMouse.current.y) / camera.zoom
      panOffset.current.x -= dx * 0.05
      panOffset.current.z -= dy * 0.05
      lastMouse.current = { x: e.clientX, y: e.clientY }
    }

    const onMouseUp = () => { isDragging.current = false }

    const onWheel = (e) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      camera.zoom = Math.max(10, Math.min(200, camera.zoom * delta))
      camera.updateProjectionMatrix()
    }

    canvas.addEventListener('mousedown', onMouseDown)
    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('mouseup', onMouseUp)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    canvas.addEventListener('contextmenu', e => e.preventDefault())

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown)
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('mouseup', onMouseUp)
      canvas.removeEventListener('wheel', onWheel)
    }
  }, [camera, gl])

  useFrame(() => {
    camera.position.x += (panOffset.current.x - camera.position.x) * 0.12
    camera.position.z += (panOffset.current.z - camera.position.z) * 0.12
  })

  return null
}
