/**
 * WallMesh — Renders a single wall as an extruded shape with openings cut out
 * Wall schema: { id, start:[x,z], end:[x,z], height, thickness, material }
 */
import { useMemo } from 'react'
import { useSceneStore } from '../../store/sceneStore'
import * as THREE from 'three'

const MATERIAL_COLORS = {
  wall_paint_white: '#e2e8f0',
  concrete_polished: '#94a3b8',
  brick_exposed: '#a16207',
  default: '#cbd5e1',
}

export default function WallMesh({ wall }) {
  const selectedId = useSceneStore(s => s.selectedId)
  const setSelected = useSceneStore(s => s.setSelected)
  const allOpenings = useSceneStore(s => s.scene.openings || [])
  const isSelected = selectedId === wall.id

  // Filter openings for this wall
  const openings = useMemo(() => {
    return allOpenings.filter(op => op.wall_id === wall.id)
  }, [allOpenings, wall.id])

  const { position, rotation, length, geometry } = useMemo(() => {
    const [x1, z1] = wall.start
    const [x2, z2] = wall.end

    const dx = x2 - x1
    const dz = z2 - z1
    const len = Math.sqrt(dx * dx + dz * dz)
    const angle = Math.atan2(dz, dx)

    const wHeight = wall.height || 3
    const wThickness = wall.thickness || 0.2

    // 1. Create outer wall shape in local space (u = horizontal, v = vertical)
    const shape = new THREE.Shape()
    shape.moveTo(0, 0)
    shape.lineTo(len, 0)
    shape.lineTo(len, wHeight)
    shape.lineTo(0, wHeight)
    shape.closePath()

    // 2. Cut opening holes (winding order clockwise, opposite of outer shape)
    openings.forEach(op => {
      const uCenter = len * op.position
      const uStart = uCenter - op.width / 2
      const uEnd = uCenter + op.width / 2
      
      const vStart = op.type === 'window' ? 0.9 : 0
      const vEnd = vStart + op.height

      const hole = new THREE.Path()
      hole.moveTo(uStart, vStart)
      hole.lineTo(uStart, vEnd)
      hole.lineTo(uEnd, vEnd)
      hole.lineTo(uEnd, vStart)
      hole.closePath()
      
      shape.holes.push(hole)
    })

    // 3. Extrude
    const extrudeSettings = {
      depth: wThickness,
      bevelEnabled: false,
    }
    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings)
    
    // Center the extrusion along thickness (Z axis in shape local space)
    geo.translate(0, 0, -wThickness / 2)

    return {
      position: [x1, 0, z1],
      rotation: [0, -angle, 0],
      length: len,
      geometry: geo,
    }
  }, [wall, openings])

  const color = MATERIAL_COLORS[wall.material] || MATERIAL_COLORS.default
  const thickness = wall.thickness || 0.2

  return (
    <group position={position} rotation={rotation}>
      {/* Wall Solid Mesh */}
      <mesh
        geometry={geometry}
        castShadow
        receiveShadow
        onClick={(e) => { e.stopPropagation(); setSelected(wall.id) }}
      >
        <meshStandardMaterial
          color={isSelected ? '#818cf8' : color}
          roughness={0.8}
          metalness={0.05}
          emissive={isSelected ? '#3730a3' : '#000000'}
          emissiveIntensity={isSelected ? 0.2 : 0}
        />
      </mesh>

      {/* Render Openings Assets (Doors / Windows) */}
      {openings.map(op => {
        const uCenter = length * op.position
        const vStart = op.type === 'window' ? 0.9 : 0
        const frameThick = thickness + 0.02 // slightly proud of wall

        if (op.type === 'door') {
          // Door Frame + Swing Slab
          return (
            <group key={op.id} position={[uCenter, vStart, 0]}>
              {/* Frame */}
              <mesh position={[0, op.height / 2, 0]} castShadow>
                <boxGeometry args={[op.width, op.height, frameThick]} />
                <meshStandardMaterial color="#334155" roughness={0.7} wireframe={true} />
              </mesh>
              
              {/* Door Panel (Slightly Open - swing angle) */}
              <group position={[-op.width / 2, 0, 0]} rotation={[0, Math.PI / 4, 0]}>
                <mesh position={[op.width / 2, op.height / 2, 0]} castShadow>
                  <boxGeometry args={[op.width - 0.04, op.height - 0.04, 0.04]} />
                  <meshStandardMaterial color="#78350f" roughness={0.6} metalness={0.1} />
                </mesh>
                {/* Door Handle */}
                <mesh position={[op.width - 0.1, op.height / 2, 0.03]}>
                  <sphereGeometry args={[0.02, 16, 16]} />
                  <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.1} />
                </mesh>
              </group>
            </group>
          )
        } else if (op.type === 'window') {
          // Window Frame + Glass Pane
          return (
            <group key={op.id} position={[uCenter, vStart + op.height / 2, 0]}>
              {/* Metal Frame Outline */}
              <mesh castShadow>
                <boxGeometry args={[op.width, op.height, frameThick]} />
                <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.8} />
              </mesh>
              {/* Glass Pane */}
              <mesh>
                <boxGeometry args={[op.width - 0.08, op.height - 0.08, 0.02]} />
                <meshStandardMaterial
                  color="#bae6fd"
                  transparent={true}
                  opacity={0.3}
                  roughness={0.1}
                  metalness={0.9}
                />
              </mesh>
            </group>
          )
        }
        return null
      })}
    </group>
  )
}
