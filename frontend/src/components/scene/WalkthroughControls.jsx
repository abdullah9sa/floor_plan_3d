/**
 * WalkthroughControls — First-person WASD + pointer lock
 * Phase 1: Basic movement. Phase 5: Full navmesh collision.
 */
import { useThree, useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useSceneStore } from '../../store/sceneStore'
import { checkPlayerCollisions } from '../../utils/constraintEngine'

export default function WalkthroughControls() {
  const { camera, gl } = useThree()
  const keys = useRef({})
  const yaw = useRef(0)
  const pitch = useRef(0)
  const isLocked = useRef(false)
  const velocity = useRef(new THREE.Vector3())

  useEffect(() => {
    const canvas = gl.domElement

    const onKeyDown = (e) => { keys.current[e.code] = true }
    const onKeyUp = (e) => { keys.current[e.code] = false }

    const onClick = () => {
      if (!isLocked.current) canvas.requestPointerLock()
    }

    const onPointerLockChange = () => {
      isLocked.current = document.pointerLockElement === canvas
    }

    const onMouseMove = (e) => {
      if (!isLocked.current) return
      yaw.current -= e.movementX * 0.002
      pitch.current = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, pitch.current - e.movementY * 0.002))
    }

    canvas.addEventListener('click', onClick)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    document.addEventListener('pointerlockchange', onPointerLockChange)
    document.addEventListener('mousemove', onMouseMove)

    return () => {
      canvas.removeEventListener('click', onClick)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      document.removeEventListener('pointerlockchange', onPointerLockChange)
      document.removeEventListener('mousemove', onMouseMove)
    }
  }, [gl])

  useFrame((_, delta) => {
    const speed = keys.current['ShiftLeft'] ? 8 : 4

    // Camera rotation
    const euler = new THREE.Euler(pitch.current, yaw.current, 0, 'YXZ')
    camera.quaternion.setFromEuler(euler)

    // Movement direction
    const dir = new THREE.Vector3()
    if (keys.current['KeyW'] || keys.current['ArrowUp']) dir.z -= 1
    if (keys.current['KeyS'] || keys.current['ArrowDown']) dir.z += 1
    if (keys.current['KeyA'] || keys.current['ArrowLeft']) dir.x -= 1
    if (keys.current['KeyD'] || keys.current['ArrowRight']) dir.x += 1

    dir.normalize().applyEuler(new THREE.Euler(0, yaw.current, 0))
    velocity.current.lerp(dir.multiplyScalar(speed * delta), 0.3)

    const scene = useSceneStore.getState().scene
    const PLAYER_RADIUS = 0.3
    const currentPos = camera.position

    // Proposed X move
    let nextX = currentPos.x + velocity.current.x
    if (checkPlayerCollisions(nextX, currentPos.z, PLAYER_RADIUS, scene)) {
      velocity.current.x = 0
    } else {
      camera.position.x = nextX
    }

    // Proposed Z move
    let nextZ = currentPos.z + velocity.current.z
    if (checkPlayerCollisions(camera.position.x, nextZ, PLAYER_RADIUS, scene)) {
      velocity.current.z = 0
    } else {
      camera.position.z = nextZ
    }

    camera.position.y = 1.7 // fixed eye height
  })

  return null
}
