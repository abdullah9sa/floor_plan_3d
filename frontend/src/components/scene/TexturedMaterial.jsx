import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useAsyncTexture } from '../../hooks/useAsyncTexture'

/**
 * Reusable textured standard material component.
 * Maps diffuse, normal, displacement, and roughness texture sets onto the mesh.
 */
export default function TexturedMaterial({
  texture,
  textureScaleX = 2.0,
  textureScaleY = 2.0,
  baseColor = '#ffffff',
  isSelected = false,
  selectedColor = '#818cf8',
  sizeX = 1,
  sizeY = 1,
  metalness = 0,
  roughness = 0.8,
  side = THREE.FrontSide,
  displacementScale = 0.02
}) {
  const repeatX = sizeX / (textureScaleX || 2.0)
  const repeatY = sizeY / (textureScaleY || 2.0)

  const map = useAsyncTexture(texture?.diffuse)
  const normalMap = useAsyncTexture(texture?.normal)
  const displacementMap = useAsyncTexture(texture?.displacement)
  const roughnessMap = useAsyncTexture(texture?.roughness)

  const finalColor = map ? '#ffffff' : baseColor
  const matRef = useRef()

  // Dynamically update repeats and trigger update when loaded
  useEffect(() => {
    if (map) map.repeat.set(repeatX, repeatY)
    if (normalMap) normalMap.repeat.set(repeatX, repeatY)
    if (displacementMap) displacementMap.repeat.set(repeatX, repeatY)
    if (roughnessMap) roughnessMap.repeat.set(repeatX, repeatY)
    
    if (matRef.current) {
      matRef.current.needsUpdate = true
    }
  }, [map, normalMap, displacementMap, roughnessMap, repeatX, repeatY])

  return (
    <meshStandardMaterial
      ref={matRef}
      attach="material"
      color={isSelected && !map ? selectedColor : finalColor}
      map={map || null}
      normalMap={normalMap || null}
      displacementMap={displacementMap || null}
      roughnessMap={roughnessMap || null}
      displacementScale={displacementMap ? displacementScale : 0}
      roughness={roughnessMap ? 1.0 : roughness}
      metalness={metalness}
      side={side}
      emissive={isSelected ? '#3730a3' : '#000000'}
      emissiveIntensity={isSelected ? 0.2 : 0}
    />
  )
}
