import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSceneStore } from '../../store/sceneStore'

export default function SavedScenesModal({ isOpen, onClose }) {
  const [saveName, setSaveName] = useState('')
  const [scenes, setScenes] = useState([])
  
  const saveScene = useSceneStore(s => s.saveScene)
  const loadScene = useSceneStore(s => s.loadScene)
  const deleteSavedScene = useSceneStore(s => s.deleteSavedScene)
  const getSavedScenes = useSceneStore(s => s.getSavedScenes)
  const currentScene = useSceneStore(s => s.scene)

  useEffect(() => {
    if (isOpen) {
      setScenes(getSavedScenes())
    }
  }, [isOpen, getSavedScenes])

  const handleSave = () => {
    if (!saveName.trim()) return
    saveScene(saveName.trim())
    setSaveName('')
    setScenes(getSavedScenes())
  }

  const handleLoad = (name) => {
    loadScene(name)
    onClose()
  }

  const handleDelete = (name) => {
    deleteSavedScene(name)
    setScenes(getSavedScenes())
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          onClick={e => e.stopPropagation()}
          className="glass border border-[var(--border-subtle)]"
          style={{
            width: '100%',
            maxWidth: '500px',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '16px',
            background: 'var(--bg-panel)',
            color: 'var(--text-primary)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            overflow: 'hidden'
          }}
        >
          {/* Header */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>💾 Saved Floor Plans</h2>
            <button 
              onClick={onClose}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px' }}
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Save Current */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="text" 
                placeholder="Name your current plan..."
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                style={{
                  flex: 1,
                  background: 'var(--bg-app)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: 'var(--text-primary)',
                  outline: 'none'
                }}
              />
              <button 
                onClick={handleSave}
                disabled={!saveName.trim() || currentScene.walls.length === 0}
                style={{
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 16px',
                  cursor: (!saveName.trim() || currentScene.walls.length === 0) ? 'not-allowed' : 'pointer',
                  fontWeight: 500,
                  opacity: (!saveName.trim() || currentScene.walls.length === 0) ? 0.5 : 1
                }}
              >
                Save
              </button>
            </div>

            <div style={{ height: '1px', background: 'var(--border-subtle)' }} />

            {/* Saved List */}
            {scenes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                No saved plans yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {scenes.map(s => (
                  <div key={s.name} style={{
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: 'var(--bg-app)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)'
                  }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '15px' }}>{s.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {s.wallCount} walls, {s.roomCount} rooms • {new Date(s.savedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => handleLoad(s.name)}
                        style={{
                          background: 'rgba(99,102,241,0.1)',
                          color: '#818cf8',
                          border: '1px solid rgba(99,102,241,0.2)',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: 500
                        }}
                      >Load</button>
                      <button 
                        onClick={() => handleDelete(s.name)}
                        style={{
                          background: 'rgba(239,68,68,0.1)',
                          color: '#f87171',
                          border: '1px solid rgba(239,68,68,0.2)',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                        title="Delete"
                      >🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
