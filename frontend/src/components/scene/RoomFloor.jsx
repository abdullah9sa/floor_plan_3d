/**
 * RoomFloor — Renders a room's floor polygon as a filled mesh
 * Room schema: { id, type, polygon: [[x,z],...], ... }
 */
import { useMemo } from 'react'
import * as THREE from 'three'
import { useSceneStore } from '../../store/sceneStore'

const ROOM_COLORS_DARK = {
  living_room: '#ffffff',
  bedroom: '#fafafa',
  kitchen: '#f8fafc',
  bathroom: '#f1f5f9',
  hallway: '#f3f4f6',
  dining_room: '#faf5ff',
  default: '#ffffff',
}

const ROOM_COLORS_LIGHT = {
  living_room: '#ffffff',
  bedroom: '#fafafa',
  kitchen: '#f8fafc',
  bathroom: '#f1f5f9',
  hallway: '#f3f4f6',
  dining_room: '#faf5ff',
  default: '#ffffff',
}

export default function RoomFloor({ room }) {
  const setSelected = useSceneStore(s => s.setSelected)
  const selectedId = useSceneStore(s => s.selectedId)
  const darkMode = useSceneStore(s => s.darkMode)
  const isSelected = selectedId === room.id

  const geometry = useMemo(() => {
    if (!room.polygon || room.polygon.length < 3) return null

    const shape = new THREE.Shape()
    shape.moveTo(room.polygon[0][0], room.polygon[0][1])
    for (let i = 1; i < room.polygon.length; i++) {
      shape.lineTo(room.polygon[i][0], room.polygon[i][1])
    }
    shape.closePath()

    const geo = new THREE.ShapeGeometry(shape)
    // Rotate flat XY shape to XZ plane
    geo.rotateX(-Math.PI / 2)
    return geo
  }, [room.polygon])

  if (!geometry) return null

  const colors = darkMode ? ROOM_COLORS_DARK : ROOM_COLORS_LIGHT
  const color = colors[room.type] || colors.default

  return (
    <mesh
      geometry={geometry}
      position={[0, 0.01, 0]}
      receiveShadow
      onClick={(e) => { e.stopPropagation(); setSelected(room.id) }}
    >
      <meshStandardMaterial
        color={isSelected ? '#1e1b4b' : color}
        roughness={0.9}
        metalness={0}
        side={THREE.DoubleSide}
        emissive={isSelected ? '#3730a3' : '#000000'}
        emissiveIntensity={isSelected ? 0.08 : 0}
      />
    </mesh>
  )
}
