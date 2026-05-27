/**
 * FurnitureMesh — Interactive furniture rendering
 * Supports real-time dragging, grid snapping, wall alignment, and collision diagnostics
 */
import { useRef, useState, useEffect } from 'react'
import { useSceneStore } from '../../store/sceneStore'
import { snapToGrid } from '../../utils/geometryKernel'
import { getWallSnapSuggestion } from '../../utils/constraintEngine'
import * as THREE from 'three'

const ASSET_COLORS = {
  sofa: '#374151',
  chair: '#4b5563',
  table: '#78350f',
  bed: '#1e3a5f',
  desk: '#713f12',
  default: '#374151',
}

function getColor(assetId) {
  const lower = (assetId || '').toLowerCase()
  for (const [key, color] of Object.entries(ASSET_COLORS)) {
    if (lower.includes(key)) return color
  }
  return ASSET_COLORS.default
}

export default function FurnitureMesh({ item }) {
  const meshRef = useRef()
  const selectedId = useSceneStore(s => s.selectedId)
  const setSelected = useSceneStore(s => s.setSelected)
  const viewMode = useSceneStore(s => s.viewMode)
  const walls = useSceneStore(s => s.scene.walls || [])
  const applyMutation = useSceneStore(s => s.applyMutation)

  const isSelected = selectedId === item.id
  const [isDragging, setIsDragging] = useState(false)
  const dragOffset = useRef(new THREE.Vector3())

  const [w, h, d] = item.bounding_box || [1, 1, 1]
  const color = getColor(item.asset_id)

  // Sync mesh position with store updates when not dragging
  useEffect(() => {
    if (meshRef.current && !isDragging) {
      const [rx, ry, rz] = item.rotation || [0, 0, 0]
      meshRef.current.position.set(item.position[0], item.position[1], item.position[2])
      meshRef.current.rotation.set(rx * (Math.PI / 180), ry * (Math.PI / 180), rz * (Math.PI / 180))
    }
  }, [item.position, item.rotation, isDragging])

  // Drag interaction handlers
  const handlePointerDown = (e) => {
    if (viewMode !== 'top') return
    e.stopPropagation()
    
    // Select object
    setSelected(item.id)
    setIsDragging(true)
    
    // Capture pointer
    e.target.setPointerCapture(e.pointerId)
    
    // Project mouse to ground XZ plane (Y = 0)
    const intersectionPoint = new THREE.Vector3()
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    e.raycaster.ray.intersectPlane(groundPlane, intersectionPoint)
    
    // Calculate drag offset relative to object center
    dragOffset.current.set(
      intersectionPoint.x - item.position[0],
      0,
      intersectionPoint.z - item.position[2]
    )
  }

  const handlePointerMove = (e) => {
    if (!isDragging) return
    e.stopPropagation()

    const intersectionPoint = new THREE.Vector3()
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    e.raycaster.ray.intersectPlane(groundPlane, intersectionPoint)

    // Calculate new position
    let targetX = intersectionPoint.x - dragOffset.current.x
    let targetZ = intersectionPoint.z - dragOffset.current.z

    // Grid snap
    targetX = snapToGrid(targetX, 0.05)
    targetZ = snapToGrid(targetZ, 0.05)

    let finalPos = [targetX, item.position[1] || h / 2, targetZ]
    let finalRot = [...(item.rotation || [0, 0, 0])]

    // Wall Snap Assistance (when dragging near walls within 0.8m)
    const snapSuggestion = getWallSnapSuggestion(targetX, targetZ, w, d, walls, 0.8)
    if (snapSuggestion) {
      finalPos = [snapSuggestion.position[0], finalPos[1], snapSuggestion.position[2]]
      finalRot[1] = snapSuggestion.rotationY * (180 / Math.PI)
    }

    // Update local mesh visuals immediately for responsiveness
    if (meshRef.current) {
      meshRef.current.position.set(...finalPos)
      meshRef.current.rotation.set(
        finalRot[0] * (Math.PI / 180),
        finalRot[1] * (Math.PI / 180),
        finalRot[2] * (Math.PI / 180)
      )
    }
  }

  const handlePointerUp = (e) => {
    if (!isDragging) return
    e.stopPropagation()
    e.target.releasePointerCapture(e.pointerId)
    setIsDragging(false)

    if (meshRef.current) {
      const pos = [meshRef.current.position.x, meshRef.current.position.y, meshRef.current.position.z]
      const rot = [
        meshRef.current.rotation.x * (180 / Math.PI),
        meshRef.current.rotation.y * (180 / Math.PI),
        meshRef.current.rotation.z * (180 / Math.PI),
      ]
      applyMutation('UPDATE_FURNITURE', { id: item.id, position: pos, rotation: rot })
    }
  }

  return (
    <group>
      <mesh
        ref={meshRef}
        castShadow
        receiveShadow
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
          color={isDragging ? '#6366f1' : isSelected ? '#818cf8' : color}
          roughness={0.7}
          metalness={0.1}
          emissive={isDragging ? '#4338ca' : isSelected ? '#3730a3' : '#000000'}
          emissiveIntensity={isDragging ? 0.4 : isSelected ? 0.25 : 0}
        />
      </mesh>

      {/* Selected/Dragging Highlight Ring (under object) */}
      {(isSelected || isDragging) && (
        <mesh
          position={[
            meshRef.current ? meshRef.current.position.x : item.position[0],
            0.02,
            meshRef.current ? meshRef.current.position.z : item.position[2],
          ]}
          rotation={[
            -Math.PI / 2,
            0,
            meshRef.current ? meshRef.current.rotation.y : (item.rotation?.[1] || 0) * (Math.PI / 180),
          ]}
        >
          <planeGeometry args={[w + 0.15, d + 0.15]} />
          <meshBasicMaterial
            color={isDragging ? '#06b6d4' : '#6366f1'}
            transparent={true}
            opacity={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  )
}
