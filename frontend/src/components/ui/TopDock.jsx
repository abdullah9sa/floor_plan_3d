/**
 * TopDock — Floating mode switcher toolbar
 * Modes: top-view | walkthrough | material | lighting
 */
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useSceneStore } from '../../store/sceneStore'
import SavedScenesModal from './SavedScenesModal'

const MODES = [
  { id: 'top', icon: '⊞', label: 'Top View' },
  { id: 'orbit', icon: '⛶', label: '3D Orbit' },
  { id: 'walkthrough', icon: '👁', label: 'Walkthrough' },
  { id: 'material', icon: '◈', label: 'Materials' },
  { id: 'lighting', icon: '☀', label: 'Lighting' },
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
  const [showSavedModal, setShowSavedModal] = useState(false)

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
