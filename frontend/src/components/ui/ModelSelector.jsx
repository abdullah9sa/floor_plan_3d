import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSceneStore } from '../../store/sceneStore'

const MODELS = [
  { id: 'gemini-1.5-pro-latest', label: 'Gemini 1.5 Pro', provider: 'Google', icon: '✨' },
  { id: 'gemini-1.5-flash-latest', label: 'Gemini 1.5 Flash', provider: 'Google', icon: '⚡' },
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', provider: 'Google', icon: '🚀' },
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B', provider: 'Groq', icon: '🦙' },
  { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B', provider: 'Groq', icon: '🦙' },
  { id: 'fallback', label: 'Offline Mode', provider: 'Local', icon: '🛠️' }
]

export default function ModelSelector() {
  const [isOpen, setIsOpen] = useState(false)
  const selectedModelId = useSceneStore(s => s.selectedModel)
  const setSelectedModel = useSceneStore(s => s.setSelectedModel)
  const dropdownRef = useRef(null)

  const selectedModel = MODELS.find(m => m.id === selectedModelId) || MODELS[0]

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          padding: '4px 10px',
          cursor: 'pointer',
          color: 'var(--text-secondary)',
          fontSize: '12px',
          fontFamily: 'Inter, sans-serif',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
      >
        <span>{selectedModel.icon}</span>
        <span style={{ fontWeight: 500 }}>{selectedModel.label}</span>
        <span style={{ opacity: 0.5, fontSize: '10px' }}>▼</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.15 }}
            className="glass"
            style={{
              position: 'absolute',
              bottom: '100%',
              left: 0,
              marginBottom: '8px',
              borderRadius: '12px',
              padding: '6px',
              minWidth: '200px',
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}
          >
            <div style={{ padding: '4px 8px', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
              Select AI Model
            </div>
            {MODELS.map(model => (
              <button
                key={model.id}
                onClick={() => {
                  setSelectedModel(model.id)
                  setIsOpen(false)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '8px 10px',
                  background: selectedModel.id === model.id ? 'rgba(99,102,241,0.15)' : 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  color: selectedModel.id === model.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                  textAlign: 'left',
                  transition: 'background 0.1s'
                }}
                onMouseEnter={(e) => {
                  if (selectedModel.id !== model.id) e.currentTarget.style.background = 'var(--bg-panel-hover)'
                }}
                onMouseLeave={(e) => {
                  if (selectedModel.id !== model.id) e.currentTarget.style.background = 'transparent'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{model.icon}</span>
                  <span style={{ fontSize: '13px', fontFamily: 'Inter, sans-serif' }}>{model.label}</span>
                </div>
                {selectedModel.id === model.id && (
                  <span style={{ color: 'var(--accent-primary)', fontSize: '14px' }}>✓</span>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
