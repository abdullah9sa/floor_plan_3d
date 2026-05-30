import { Canvas, useThree } from '@react-three/fiber'
import { OrthographicCamera, PerspectiveCamera, Grid, Environment, ContactShadows, OrbitControls } from '@react-three/drei'
import { Suspense, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'

import { useSceneStore } from '../../store/sceneStore'
import WallMesh from './WallMesh'
import FurnitureMesh from './FurnitureMesh'
import RoomFloor from './RoomFloor'
import GlobalFloor from './GlobalFloor'
import WalkthroughControls from './WalkthroughControls'
import TopViewControls from './TopViewControls'
import PostProcessing from './PostProcessing'

const TONE_MAP = {
  aces: THREE.ACESFilmicToneMapping,
  reinhard: THREE.ReinhardToneMapping,
  cineon: THREE.CineonToneMapping,
  linear: THREE.LinearToneMapping,
}

/** Reactively updates the WebGL renderer's tonemapping each frame */
function ToneMappingSetup() {
  const { gl } = useThree()
  const lightSettings = useSceneStore(s => s.lightSettings) || {}
  const toneMapping = lightSettings.toneMapping || 'aces'
  const exposure = lightSettings.toneMappingExposure ?? 1.0

  useEffect(() => {
    gl.toneMapping = TONE_MAP[toneMapping] || THREE.ACESFilmicToneMapping
    gl.toneMappingExposure = exposure
  }, [gl, toneMapping, exposure])

  return null
}

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

function GLTFExporterHelper({ modelGroupRef }) {
  const gltfExportTriggeredAt = useSceneStore(s => s.gltfExportTriggeredAt)
  const sceneName = useSceneStore(s => s.scene.project.name || 'Untitled')

  useEffect(() => {
    if (!gltfExportTriggeredAt || !modelGroupRef.current) return

    const exporter = new GLTFExporter()
    exporter.parse(
      modelGroupRef.current,
      (gltf) => {
        const output = JSON.stringify(gltf, null, 2)
        const blob = new Blob([output], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        
        const link = document.createElement('a')
        link.href = url
        link.download = `${sceneName.toLowerCase().replace(/\s+/g, '_')}_model.gltf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      },
      (error) => {
        console.error('An error occurred exporting GLTF:', error)
      },
      {
        binary: false,
        animations: [],
        includeCustomExtensions: true
      }
    )
  }, [gltfExportTriggeredAt])

  return null
}

function SceneContent() {
  const modelGroupRef = useRef()
  const viewMode = useSceneStore(s => s.viewMode)
  const scene = useSceneStore(s => s.scene)
  const darkMode = useSceneStore(s => s.darkMode)
  const lightSettings = useSceneStore(s => s.lightSettings) || {
    ambientIntensity: 0.4,
    dirIntensity: 1.2,
    shadowOpacity: 0.65,
    envIntensity: 0.5,
    envPreset: 'studio',
    envBackground: false,
    envBlur: 0,
    envRotation: 0,
    showGrid: true,
    bgColor: '',
    gridColor: '',
    showFog: false,
    fogDensity: 0.02,
    fogColor: '',
  }

  // Dynamic theme settings
  const ambientIntensity = lightSettings.ambientIntensity
  const dirIntensity = lightSettings.dirIntensity
  const shadowOpacity = lightSettings.shadowOpacity

  const defaultBgColor = darkMode ? "#0a0a0f" : "#f8fafc"
  const bgColor = lightSettings.bgColor || defaultBgColor

  const skyColor = darkMode ? "#1e1b4b" : "#ffffff"
  const groundColor = darkMode ? "#0a0a0f" : "#cbd5e1"
  const cellColor = lightSettings.gridColor || (darkMode ? "#1e293b" : "#cbd5e1")
  const sectionColor = lightSettings.gridColor || (darkMode ? "#1e40af" : "#94a3b8")

  return (
    <>
      {/* Background Color */}
      <color attach="background" args={[bgColor]} />

      {/* Fog / Fade */}
      {lightSettings.showFog && (
        <fogExp2
          attach="fog"
          args={[
            lightSettings.fogColor || bgColor,
            lightSettings.fogDensity !== undefined ? lightSettings.fogDensity : 0.02
          ]}
        />
      )}

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
      <Environment
        preset={lightSettings.envPreset || 'studio'}
        background={!!lightSettings.envBackground}
        blur={lightSettings.envBlur || 0}
        environmentIntensity={lightSettings.envIntensity !== undefined ? lightSettings.envIntensity : 0.5}
        rotation={[0, ((lightSettings.envRotation || 0) * Math.PI) / 180, 0]}
      />

      {/* Ground Floor Slab removed per request */}

      {/* Grid (below the floor slab to avoid overlap with room floors) */}
      {(viewMode === 'top' || viewMode === 'orbit') && lightSettings.showGrid !== false && (
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
      <group ref={modelGroupRef} name="floor-plan-model">
        <GlobalFloor />
        {scene.rooms.map(room => (
          <RoomFloor key={room.id} room={room} />
        ))}
        {scene.walls.map(wall => (
          <WallMesh key={wall.id} wall={wall} />
        ))}
        {scene.furniture.map(item => (
          <FurnitureMesh key={item.id} item={item} />
        ))}
      </group>

      <GLTFExporterHelper modelGroupRef={modelGroupRef} />

      {/* Post-Processing Pipeline */}
      <ToneMappingSetup />
      <PostProcessing />
    </>
  )
}

export default function SceneCanvas() {
  return (
    <Canvas
      id="scene-canvas"
      shadows
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.0,
        preserveDrawingBuffer: true,
      }}
      style={{ background: 'transparent', width: '100%', height: '100%' }}
      dpr={[1, 2]}
    >
      <Suspense fallback={null}>
        <SceneContent />
      </Suspense>
    </Canvas>
  )
}
