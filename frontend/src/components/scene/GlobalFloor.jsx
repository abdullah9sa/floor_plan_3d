import { useMemo } from 'react'
import * as THREE from 'three'
import { useSceneStore } from '../../store/sceneStore'
import TexturedMaterial from './TexturedMaterial'

export default function GlobalFloor() {
  const scene = useSceneStore(s => s.scene)
  const isSelected = useSceneStore(s => s.selectedId === 'global_floor')
  const setSelected = useSceneStore(s => s.setSelected)
  const globalFloor = scene.globalFloor || {}

  const boundingBox = useMemo(() => {
    if (!scene.walls || scene.walls.length === 0) return null
    let minX = Infinity, minZ = Infinity
    let maxX = -Infinity, maxZ = -Infinity
    scene.walls.forEach(w => {
      minX = Math.min(minX, w.start[0], w.end[0])
      minZ = Math.min(minZ, w.start[1], w.end[1])
      maxX = Math.max(maxX, w.start[0], w.end[0])
      maxZ = Math.max(maxZ, w.start[1], w.end[1])
    })
    // Add a small margin
    return { minX: minX - 0.2, minZ: minZ - 0.2, maxX: maxX + 0.2, maxZ: maxZ + 0.2 }
  }, [scene.walls])

  if (!boundingBox) return null

  const width = boundingBox.maxX - boundingBox.minX
  const depth = boundingBox.maxZ - boundingBox.minZ
  const centerX = (boundingBox.minX + boundingBox.maxX) / 2
  const centerZ = (boundingBox.minZ + boundingBox.maxZ) / 2

  const handleClick = (e) => {
    e.stopPropagation()
    setSelected('global_floor')
  }

  // Draw the floor slightly lower to avoid Z-fighting with room floors (y=0)
  return (
    <mesh
      position={[centerX, -0.01, centerZ]}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
      onClick={handleClick}
    >
      <planeGeometry args={[width, depth]} />
      <TexturedMaterial
        texture={globalFloor.texture}
        textureScaleX={globalFloor.textureScaleX}
        textureScaleY={globalFloor.textureScaleY}
        baseColor="#e2e8f0"
        isSelected={isSelected}
        sizeX={width}
        sizeY={depth}
      />
    </mesh>
  )
}
