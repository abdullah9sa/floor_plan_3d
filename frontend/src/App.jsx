/**
 * App.jsx — Root application shell
 * Layout: Full-viewport 3D canvas + floating UI panels
 */
import './index.css'
import SceneCanvas from './components/scene/SceneCanvas'
import TopDock from './components/ui/TopDock'
import AICommandBar from './components/ui/AICommandBar'
import DiagnosticsOverlay from './components/ui/DiagnosticsOverlay'
import PropertiesPanel from './components/ui/PropertiesPanel'
import SceneInfoBar from './components/ui/SceneInfoBar'
import FloorPlanUpload from './components/ui/FloorPlanUpload'
import LightingPanel from './components/ui/LightingPanel'
import { useEffect } from 'react'
import { useSceneStore } from './store/sceneStore'

// Demo scene to showcase Phase 1 rendering and Phase 3 Geometry Engine
const DEMO_MUTATIONS = [
  { type: 'ADD_ROOM', payload: { type: 'living_room', polygon: [[0,0],[0,6],[8,6],[8,0]], usable_area: 48 } },
  { type: 'ADD_ROOM', payload: { type: 'bedroom', polygon: [[8,0],[8,5],[14,5],[14,0]], usable_area: 30 } },
  { type: 'ADD_ROOM', payload: { type: 'kitchen', polygon: [[0,6],[0,10],[6,10],[6,6]], usable_area: 24 } },
  // Walls (no hardcoded IDs — store generates unique UUIDs)
  { type: 'ADD_WALL', payload: { start: [0,0], end: [14,0], height: 3, thickness: 0.2, material: 'wall_paint_white' } },
  { type: 'ADD_WALL', payload: { start: [0,0], end: [0,10], height: 3, thickness: 0.2, material: 'wall_paint_white' } },
  { type: 'ADD_WALL', payload: { start: [14,0], end: [14,5], height: 3, thickness: 0.2, material: 'wall_paint_white' } },
  { type: 'ADD_WALL', payload: { start: [0,10], end: [6,10], height: 3, thickness: 0.2, material: 'wall_paint_white' } },
  { type: 'ADD_WALL', payload: { start: [8,0], end: [8,6], height: 3, thickness: 0.15, material: 'wall_paint_white' } },
  { type: 'ADD_WALL', payload: { start: [0,6], end: [8,6], height: 3, thickness: 0.15, material: 'wall_paint_white' } },
  // Furniture
  { type: 'ADD_FURNITURE', payload: { asset_id: 'sofa_modern_01', position: [2,0,3], rotation: [0,0,0], bounding_box: [2.2,0.9,0.85] } },
  { type: 'ADD_FURNITURE', payload: { asset_id: 'coffee_table_01', position: [2,0,1.8], rotation: [0,0,0], bounding_box: [1.2,0.45,0.6] } },
  { type: 'ADD_FURNITURE', payload: { asset_id: 'bed_king_01', position: [10,0,2.5], rotation: [0,0,0], bounding_box: [1.8,0.6,2.2] } },
]

export default function App() {
  const applyMutation = useSceneStore(s => s.applyMutation)
  const undo = useSceneStore(s => s.undo)
  const redo = useSceneStore(s => s.redo)
  const showUploadModal = useSceneStore(s => s.showUploadModal)
  const toggleUploadModal = useSceneStore(s => s.toggleUploadModal)
  const darkMode = useSceneStore(s => s.darkMode)
  const viewMode = useSceneStore(s => s.viewMode)

  // Toggle body light class for theme switcher
  useEffect(() => {
    if (darkMode) {
      document.body.classList.remove('light')
    } else {
      document.body.classList.add('light')
    }
  }, [darkMode])

  // Load demo scene on mount
  useEffect(() => {
    DEMO_MUTATIONS.forEach(m => applyMutation(m.type, m.payload))
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redo() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo])

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', background: 'var(--bg-primary)' }}>
      {/* Background gradient */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        background: darkMode 
          ? 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(99,102,241,0.08) 0%, transparent 70%), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(139,92,246,0.05) 0%, transparent 60%)'
          : 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(99,102,241,0.04) 0%, transparent 70%), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(139,92,246,0.03) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />

      {/* 3D Canvas */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        <SceneCanvas />
      </div>

      {/* UI Layer */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none' }}>
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          {/* All UI children must explicitly enable pointer events */}
          <div style={{ pointerEvents: 'auto' }}>
            <TopDock />
            <PropertiesPanel />
            {viewMode === 'lighting' && <LightingPanel />}
            <DiagnosticsOverlay />
            <AICommandBar />
            <SceneInfoBar />
            <FloorPlanUpload isOpen={showUploadModal} onClose={() => toggleUploadModal(false)} />
          </div>
        </div>
      </div>
    </div>
  )
}
