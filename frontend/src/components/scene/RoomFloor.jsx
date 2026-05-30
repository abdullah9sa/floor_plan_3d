/**
 * RoomFloor — Renders a room's floor polygon as a filled mesh
 * Room schema: { id, type, polygon: [[x,z],...], texture?: { diffuse, normal, displacement } }
 */
import { useMemo } from 'react'
import * as THREE from 'three'
import { useSceneStore } from '../../store/sceneStore'
import TexturedMaterial from './TexturedMaterial'

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

  const { geometry, sizeX, sizeY } = useMemo(() => {
    if (!room.polygon || room.polygon.length < 3) return { geometry: null, sizeX: 1, sizeY: 1 }

    const shape = new THREE.Shape()
    shape.moveTo(room.polygon[0][0], room.polygon[0][1])
    for (let i = 1; i < room.polygon.length; i++) {
      shape.lineTo(room.polygon[i][0], room.polygon[i][1])
    }
    shape.closePath()

    const geo = new THREE.ShapeGeometry(shape)
    
    // Compute bounding box before rotating so we get the XY (which maps to XZ in world) size for UVs
    geo.computeBoundingBox()
    const sizeX = geo.boundingBox.max.x - geo.boundingBox.min.x
    const sizeY = geo.boundingBox.max.y - geo.boundingBox.min.y

    // Rotate flat XY shape to XZ plane correctly (+90 deg)
    geo.rotateX(Math.PI / 2)
    return { geometry: geo, sizeX, sizeY }
  }, [room.polygon])

  if (!geometry) return null

  const colors = darkMode ? ROOM_COLORS_DARK : ROOM_COLORS_LIGHT
  const baseColor = colors[room.type] || colors.default

  // The key on the group forces a full remount when texture changes,
  // which ensures the Three.js material shader recompiles with/without maps
  const textureKey = room.texture?.id || 'no-texture'

  return (
    <mesh
      key={textureKey}
      geometry={geometry}
      position={[0, 0.01, 0]}
      receiveShadow
      onClick={(e) => { e.stopPropagation(); setSelected(room.id) }}
    >
      <TexturedMaterial 
        texture={room.texture} 
        textureScaleX={room.textureScaleX}
        textureScaleY={room.textureScaleY}
        baseColor={baseColor} 
        isSelected={isSelected} 
        sizeX={sizeX}
        sizeY={sizeY}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
