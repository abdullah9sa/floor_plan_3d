/**
 * TopDock — Floating mode switcher toolbar
 * Modes: top-view | walkthrough | material | lighting
 */
import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useSceneStore } from '../../store/sceneStore'
import SavedScenesModal from './SavedScenesModal'

const MODES = [
  { id: 'top', icon: '⊞', label: 'Top View' },
  { id: 'orbit', icon: '⛶', label: '3D Orbit' },
  { id: 'walkthrough', icon: '👁', label: 'Walkthrough' },
  { id: 'material', icon: '◈', label: 'Materials' },
]

export default function TopDock() {
  const viewMode = useSceneStore(s => s.viewMode)
  const setViewMode = useSceneStore(s => s.setViewMode)
  const undo = useSceneStore(s => s.undo)
  const redo = useSceneStore(s => s.redo)
  const undoStack = useSceneStore(s => s.undoStack)
  const redoStack = useSceneStore(s => s.redoStack)
  const toggleUploadModal = useSceneStore(s => s.toggleUploadModal)
  const darkMode = useSceneStore(s => s.darkMode)
  const toggleDarkMode = useSceneStore(s => s.toggleDarkMode)
  const showLightingPanel = useSceneStore(s => s.showLightingPanel)
  const toggleLightingPanel = useSceneStore(s => s.toggleLightingPanel)

  const scene = useSceneStore(s => s.scene)
  const importScene = useSceneStore(s => s.importScene)
  const triggerGltfExport = useSceneStore(s => s.triggerGltfExport)

  const [showSavedModal, setShowSavedModal] = useState(false)
  const [showExportDropdown, setShowExportDropdown] = useState(false)
  const fileInputRef = useRef(null)

  const sceneName = scene.project.name || 'Untitled'

  useEffect(() => {
    if (!showExportDropdown) return
    const handleClickOutside = (e) => {
      if (!e.target.closest('#export-menu-container')) {
        setShowExportDropdown(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showExportDropdown])

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(scene, null, 2))
    const link = document.createElement('a')
    link.href = dataStr
    link.download = `${sceneName.toLowerCase().replace(/\s+/g, '_')}_scene.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setShowExportDropdown(false)
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
          setShowExportDropdown(false)
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
    setShowExportDropdown(false)
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
      setShowExportDropdown(false)
    } catch (err) {
      console.error(err)
      alert("Failed to capture screenshot.")
    }
  }


  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1"
    >
      <div className="glass rounded-2xl p-1 flex items-center gap-1">
        {/* Mode Buttons */}
        {MODES.map(mode => (
          <button
            key={mode.id}
            id={`mode-btn-${mode.id}`}
            onClick={() => setViewMode(mode.id)}
            title={mode.label}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 500,
              transition: 'all 0.2s ease',
              background: viewMode === mode.id
                ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                : 'transparent',
              color: viewMode === mode.id ? '#fff' : 'var(--text-secondary)',
              boxShadow: viewMode === mode.id
                ? '0 2px 12px rgba(99,102,241,0.4)'
                : 'none',
            }}
          >
            <span style={{ fontSize: '15px' }}>{mode.icon}</span>
            <span>{mode.label}</span>
          </button>
        ))}
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 28, background: 'var(--border-subtle)', margin: '0 4px' }} />

      {/* Undo / Redo */}
      <div className="glass rounded-2xl p-1 flex items-center gap-1">
        <button
          id="btn-undo"
          onClick={undo}
          disabled={undoStack.length === 0}
          title="Undo (Ctrl+Z)"
          style={{
            padding: '8px 12px',
            borderRadius: '10px',
            border: 'none',
            cursor: undoStack.length === 0 ? 'not-allowed' : 'pointer',
            background: 'transparent',
            color: undoStack.length === 0 ? 'var(--text-muted)' : 'var(--text-secondary)',
            fontSize: '14px',
            transition: 'all 0.2s',
          }}
        >↩</button>
        <button
          id="btn-redo"
          onClick={redo}
          disabled={redoStack.length === 0}
          title="Redo (Ctrl+Y)"
          style={{
            padding: '8px 12px',
            borderRadius: '10px',
            border: 'none',
            cursor: redoStack.length === 0 ? 'not-allowed' : 'pointer',
            background: 'transparent',
            color: redoStack.length === 0 ? 'var(--text-muted)' : 'var(--text-secondary)',
            fontSize: '14px',
            transition: 'all 0.2s',
          }}
        >↪</button>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 28, background: 'var(--border-subtle)', margin: '0 4px' }} />

      {/* Floor Plan Upload Button */}
      <div className="glass rounded-2xl p-1 flex items-center">
        <button
          id="btn-upload-floorplan"
          onClick={() => toggleUploadModal(true)}
          title="Upload Floor Plan (Phase 2)"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '12px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '13px',
            fontFamily: 'Inter, sans-serif',
            fontWeight: 500,
            transition: 'all 0.2s ease',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(139,92,246,0.06))',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-accent)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))'
            e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(139,92,246,0.06))'
            e.currentTarget.style.borderColor = 'var(--border-accent)'
          }}
        >
          <span style={{ fontSize: '15px' }}>📤</span>
          <span>Upload Plan</span>
        </button>
      </div>

      {/* Saved Plans Button */}
      <div className="glass rounded-2xl p-1 flex items-center">
        <button
          onClick={() => setShowSavedModal(true)}
          title="Saved Plans"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '12px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '13px',
            fontFamily: 'Inter, sans-serif',
            fontWeight: 500,
            transition: 'all 0.2s ease',
            background: 'transparent',
            color: 'var(--text-secondary)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text-primary)'
            e.currentTarget.style.background = 'var(--bg-panel-hover)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-secondary)'
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <span style={{ fontSize: '15px' }}>💾</span>
          <span>Saved</span>
        </button>
      </div>

      {/* Export Options Dropdown */}
      <div id="export-menu-container" className="glass rounded-2xl p-1 flex items-center relative">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImportJson}
          accept=".json"
          style={{ display: 'none' }}
        />
        <button
          onClick={() => setShowExportDropdown(!showExportDropdown)}
          title="Export Options (JSON, GLTF, PNG)"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '12px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '13px',
            fontFamily: 'Inter, sans-serif',
            fontWeight: 500,
            transition: 'all 0.2s ease',
            background: showExportDropdown ? 'var(--bg-panel-hover)' : 'transparent',
            color: 'var(--text-secondary)',
          }}
          onMouseEnter={(e) => {
            if (!showExportDropdown) {
              e.currentTarget.style.color = 'var(--text-primary)'
              e.currentTarget.style.background = 'var(--bg-panel-hover)'
            }
          }}
          onMouseLeave={(e) => {
            if (!showExportDropdown) {
              e.currentTarget.style.color = 'var(--text-secondary)'
              e.currentTarget.style.background = 'transparent'
            }
          }}
        >
          <span style={{ fontSize: '15px' }}>📥</span>
          <span>Export</span>
          <span style={{ fontSize: '9px', opacity: 0.7 }}>▼</span>
        </button>

        {showExportDropdown && (
          <div
            className="absolute top-12 right-0 w-52 rounded-xl p-1.5 flex flex-col gap-0.5 glass border border-[var(--border-subtle)] shadow-xl z-50"
            style={{ pointerEvents: 'auto' }}
          >
            <button
              onClick={handleExportJson}
              className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs font-medium rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-panel-hover)] transition-colors duration-150 cursor-pointer"
            >
              <span>📂</span> Export Plan (JSON)
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs font-medium rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-panel-hover)] transition-colors duration-150 cursor-pointer"
            >
              <span>📤</span> Import Plan (JSON)
            </button>
            <button
              onClick={handleExportGltf}
              className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs font-medium rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-panel-hover)] transition-colors duration-150 cursor-pointer"
            >
              <span>🧱</span> Export 3D Model (GLTF)
            </button>
            <button
              onClick={handleCaptureScreenshot}
              className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs font-medium rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-panel-hover)] transition-colors duration-150 cursor-pointer"
            >
              <span>📸</span> Capture Image (PNG)
            </button>
          </div>
        )}
      </div>

      {/* Lighting Panel Toggle */}
      <div className="glass rounded-2xl p-1 flex items-center">
        <button
          onClick={toggleLightingPanel}
          title="Toggle Settings Panel (Environment & Lighting)"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '12px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '13px',
            fontFamily: 'Inter, sans-serif',
            fontWeight: 500,
            transition: 'all 0.2s ease',
            background: showLightingPanel ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
            color: showLightingPanel ? '#fff' : 'var(--text-secondary)',
            boxShadow: showLightingPanel ? '0 2px 12px rgba(99,102,241,0.4)' : 'none',
          }}
          onMouseEnter={(e) => {
            if (!showLightingPanel) {
              e.currentTarget.style.color = 'var(--text-primary)'
              e.currentTarget.style.background = 'var(--bg-panel-hover)'
            }
          }}
          onMouseLeave={(e) => {
            if (!showLightingPanel) {
              e.currentTarget.style.color = 'var(--text-secondary)'
              e.currentTarget.style.background = 'transparent'
            }
          }}
        >
          <span style={{ fontSize: '15px' }}>⚙️</span>
          <span>Settings</span>
        </button>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 28, background: 'var(--border-subtle)', margin: '0 4px' }} />

      {/* Theme Switcher Toggle */}
      <div className="glass rounded-2xl p-1 flex items-center">
        <button
          id="btn-toggle-theme"
          onClick={toggleDarkMode}
          title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '34px',
            height: '34px',
            borderRadius: '10px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            background: 'transparent',
            color: 'var(--text-primary)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-panel-hover)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
          }}
        >
          {darkMode ? '☀️' : '🌙'}
        </button>
      </div>

      <SavedScenesModal isOpen={showSavedModal} onClose={() => setShowSavedModal(false)} />
    </motion.div>
  )
}
