import { Canvas, useThree } from '@react-three/fiber'
import { OrthographicCamera, PerspectiveCamera, Grid, Environment, ContactShadows, OrbitControls } from '@react-three/drei'
import { Suspense, useEffect } from 'react'
import * as THREE from 'three'
import { useSceneStore } from '../../store/sceneStore'
import WallMesh from './WallMesh'
import FurnitureMesh from './FurnitureMesh'
import RoomFloor from './RoomFloor'
import WalkthroughControls from './WalkthroughControls'
import TopViewControls from './TopViewControls'

function TopViewSetup() {
  const { camera } = useThree()
  const sceneCenter = useSceneStore(s => s.sceneCenter)
  const sceneRadius = useSceneStore(s => s.sceneRadius)
  useEffect(() => {
    camera.position.set(sceneCenter[0], 30, sceneCenter[2])
    camera.lookAt(sceneCenter[0], 0, sceneCenter[2])
    // Adjust zoom based on scene radius (larger scenes = lower zoom)
    camera.zoom = Math.max(8, Math.min(40, 200 / sceneRadius))
    camera.updateProjectionMatrix()
  }, [camera, sceneCenter, sceneRadius])
  return null
}

function OrbitViewSetup() {
  const { camera } = useThree()
  const sceneCenter = useSceneStore(s => s.sceneCenter)
  const sceneRadius = useSceneStore(s => s.sceneRadius)
  useEffect(() => {
    const dist = sceneRadius * 1.5
    camera.position.set(sceneCenter[0] + dist, dist * 0.8, sceneCenter[2] + dist)
    camera.lookAt(sceneCenter[0], 0, sceneCenter[2])
    camera.updateProjectionMatrix()
  }, [camera, sceneCenter, sceneRadius])
  return null
}

function SceneContent() {
  const viewMode = useSceneStore(s => s.viewMode)
  const scene = useSceneStore(s => s.scene)
  const darkMode = useSceneStore(s => s.darkMode)
  const lightSettings = useSceneStore(s => s.lightSettings) || { ambientIntensity: 0.4, dirIntensity: 1.2, shadowOpacity: 0.65 }

  // Dynamic theme settings
  const ambientIntensity = lightSettings.ambientIntensity
  const dirIntensity = lightSettings.dirIntensity
  const shadowOpacity = lightSettings.shadowOpacity

  const skyColor = darkMode ? "#1e1b4b" : "#ffffff"
  const groundColor = darkMode ? "#0a0a0f" : "#cbd5e1"
  const cellColor = darkMode ? "#1e293b" : "#cbd5e1"
  const sectionColor = darkMode ? "#1e40af" : "#94a3b8"

  return (
    <>
      {/* Cameras */}
      {viewMode === 'top' ? (
        <>
          <OrthographicCamera makeDefault position={[7, 30, 5]} zoom={30} near={0.1} far={200} />
          <TopViewSetup />
        </>
      ) : viewMode === 'orbit' ? (
        <>
          <PerspectiveCamera makeDefault position={[12, 10, 12]} fov={50} near={0.1} far={200} />
          <OrbitViewSetup />
        </>
      ) : (
        <PerspectiveCamera makeDefault position={[7, 1.7, 15]} fov={75} near={0.1} far={200} />
      )}

      {/* Controls */}
      {viewMode === 'top' ? (
        <TopViewControls />
      ) : viewMode === 'orbit' ? (
        <OrbitControls makeDefault enableDamping dampingFactor={0.05} maxPolarAngle={Math.PI / 2.1} />
      ) : (
        <WalkthroughControls />
      )}

      {/* Lighting */}
      <ambientLight intensity={ambientIntensity} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={dirIntensity}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      <hemisphereLight skyColor={skyColor} groundColor={groundColor} intensity={darkMode ? 0.4 : 0.6} />

      {/* Environment */}
      <Environment preset="studio" background={false} />

      {/* Ground Floor Slab */}
      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial 
          color={darkMode ? "#1a1a2e" : "#f8fafc"} 
          roughness={0.85} 
          metalness={0}
        />
      </mesh>

      {/* Grid (below the floor slab to avoid overlap with room floors) */}
      {(viewMode === 'top' || viewMode === 'orbit') && (
        <Grid
          position={[0, -0.03, 0]}
          args={[40, 40]}
          cellSize={1}
          cellThickness={0.5}
          cellColor={cellColor}
          sectionSize={5}
          sectionThickness={1}
          sectionColor={sectionColor}
          fadeDistance={60}
          fadeStrength={1}
          infiniteGrid
        />
      )}

      {/* Contact Shadows (Simulates AO dynamic soft shadows) */}
      <ContactShadows
        position={[0, 0.005, 0]}
        opacity={shadowOpacity}
        scale={40}
        blur={1.8}
        far={1.5}
        resolution={1024}
      />

      {/* Scene Objects */}
      {scene.rooms.map(room => (
        <RoomFloor key={room.id} room={room} />
      ))}
      {scene.walls.map(wall => (
        <WallMesh key={wall.id} wall={wall} />
      ))}
      {scene.furniture.map(item => (
        <FurnitureMesh key={item.id} item={item} />
      ))}
    </>
  )
}

export default function SceneCanvas() {
  return (
    <Canvas
      id="scene-canvas"
      shadows
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      style={{ background: 'transparent', width: '100%', height: '100%' }}
      dpr={[1, 2]}
    >
      <Suspense fallback={null}>
        <SceneContent />
      </Suspense>
    </Canvas>
  )
}
