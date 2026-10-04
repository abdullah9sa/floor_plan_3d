import { useState, useRef, useEffect } from 'react'
import { useSceneStore } from '../../store/sceneStore'
import PropertiesPanel from './PropertiesPanel'
import LightingPanel from './LightingPanel'

export default function InspectorToolbox() {
  const [activeTab, setActiveTab] = useState('properties') // 'properties', 'lighting', 'tools'
  const viewMode = useSceneStore(s => s.viewMode)
  const setViewMode = useSceneStore(s => s.setViewMode)
  const undo = useSceneStore(s => s.undo)
  const redo = useSceneStore(s => s.redo)
  const undoStack = useSceneStore(s => s.undoStack)
  const redoStack = useSceneStore(s => s.redoStack)
  
  const scene = useSceneStore(s => s.scene)
  const importScene = useSceneStore(s => s.importScene)
  const triggerGltfExport = useSceneStore(s => s.triggerGltfExport)
  const toggleUploadModal = useSceneStore(s => s.toggleUploadModal)

  const fileInputRef = useRef(null)
  const sceneName = scene.project?.name || 'Untitled'

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(scene, null, 2))
    const link = document.createElement('a')
    link.href = dataStr
    link.download = `${sceneName.toLowerCase().replace(/\s+/g, '_')}_scene.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleImportJson = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result)
        if (parsed.walls && parsed.rooms) {
          importScene(parsed)
        } else {
          alert("Invalid file format: Make sure it's a valid Plany project JSON.")
        }
      } catch (err) {
        alert("Failed to parse JSON file.")
      }
    }
    reader.readAsText(file)
  }

  const handleExportGltf = () => {
    triggerGltfExport()
  }

  const handleCaptureScreenshot = () => {
    const wrapper = document.getElementById('scene-canvas')
    const canvas = wrapper ? wrapper.querySelector('canvas') : null
    if (!canvas) {
      alert("Canvas element not found.")
      return
    }
    try {
      const dataUrl = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = `${sceneName.toLowerCase().replace(/\s+/g, '_')}_screenshot.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error(err)
      alert("Failed to capture screenshot.")
    }
  }

  const TABS = [
    { id: 'properties', label: 'Properties', icon: '📝' },
    { id: 'lighting', label: 'Environment', icon: '⚙️' },
    { id: 'tools', label: 'Tools', icon: '🛠️' },
  ]

  const MODES = [
    { id: 'top', icon: '⊞', label: 'Top View' },
    { id: 'orbit', icon: '⛶', label: '3D Orbit' },
    { id: 'walkthrough', icon: '👁', label: 'Walkthrough' },
    { id: 'material', icon: '◈', label: 'Materials' },
  ]

  return (
    <div style={{
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      width: '320px',
      background: 'var(--bg-primary)',
      borderLeft: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100,
      pointerEvents: 'auto'
    }}>
      {/* Top Header / View Modes */}
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Inspector</div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={undo} disabled={undoStack.length === 0} style={{ padding: '4px 8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: undoStack.length === 0 ? 'var(--text-muted)' : 'var(--text-secondary)', cursor: undoStack.length === 0 ? 'not-allowed' : 'pointer' }}>↩</button>
            <button onClick={redo} disabled={redoStack.length === 0} style={{ padding: '4px 8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: redoStack.length === 0 ? 'var(--text-muted)' : 'var(--text-secondary)', cursor: redoStack.length === 0 ? 'not-allowed' : 'pointer' }}>↪</button>
          </div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          {MODES.map(mode => (
            <button
              key={mode.id}
              onClick={() => setViewMode(mode.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 8px',
                borderRadius: '8px', fontSize: '11px', fontWeight: 500, cursor: 'pointer',
                background: viewMode === mode.id ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                color: viewMode === mode.id ? '#fff' : 'var(--text-secondary)',
                border: viewMode === mode.id ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                transition: 'all 0.2s'
              }}
            >
              <span style={{ fontSize: '14px' }}>{mode.icon}</span>
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', padding: '8px 16px 0 16px', gap: '16px' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 4px',
              border: 'none',
              background: 'transparent',
              color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              borderBottom: activeTab === tab.id ? '2px solid var(--accent-primary)' : '2px solid transparent',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, overflowY: 'auto' }} className="hide-scrollbar">
        {activeTab === 'properties' && <PropertiesPanel />}
        {activeTab === 'lighting' && <LightingPanel />}
        {activeTab === 'tools' && (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Import / Export
            </div>
            
            <input type="file" ref={fileInputRef} onChange={handleImportJson} accept=".json" style={{ display: 'none' }} />
            
            <button onClick={() => fileInputRef.current?.click()} style={{ width: '100%', padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '12px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📥</span> Import Plan (JSON)
            </button>
            <button onClick={handleExportJson} style={{ width: '100%', padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '12px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📂</span> Export Plan (JSON)
            </button>
            <button onClick={handleExportGltf} style={{ width: '100%', padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '12px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🧱</span> Export 3D Model (GLTF)
            </button>
            <button onClick={handleCaptureScreenshot} style={{ width: '100%', padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '12px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📸</span> Capture Image (PNG)
            </button>

            <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '8px 0' }} />

            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              AI Computer Vision (Phase 2)
            </div>
            <button onClick={() => toggleUploadModal(true)} style={{ width: '100%', padding: '10px', background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1))', border: '1px solid var(--border-accent)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '12px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📤</span> Upload Floor Plan Image
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
