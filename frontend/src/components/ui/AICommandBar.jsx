/**
 * AICommandBar — Persistent natural language interface
 * Bottom-center prompt bar for AI-assisted scene mutations
 */
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSceneStore } from '../../store/sceneStore'
import ModelSelector from './ModelSelector'

const CATEGORIES = [
  { id: 'rooms', label: 'Rooms', icon: '🏠', suggestions: ['Make living room 15% bigger', 'Add bedroom 4x5m', 'Create a 5x4 living room'] },
  { id: 'walls', label: 'Walls', icon: '🧱', suggestions: ['Add wall from (0,0) to (5,0)', 'Remove north wall', 'Make walls thicker'] },
  { id: 'openings', label: 'Openings', icon: '🚪', suggestions: ['Add window to bedroom', 'Add door between kitchen and hallway'] },
  { id: 'furniture', label: 'Furniture', icon: '🪑', suggestions: ['Add a modern sofa near the window', 'Place a dining table for 6', 'Move table to center'] },
  { id: 'transform', label: 'Transform', icon: '📐', suggestions: ['Scale bedroom by 20%', 'Rotate the sofa 90 degrees'] },
  { id: 'lighting', label: 'Lighting', icon: '💡', suggestions: ['Add warm ceiling lighting', 'Brighten living room'] },
  { id: 'materials', label: 'Materials', icon: '🎨', suggestions: ['Apply oak wood flooring', 'Change walls to concrete'] },
]

export default function AICommandBar() {
  const [input, setInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeCategory, setActiveCategory] = useState(null)
  const inputRef = useRef(null)
  const historyRef = useRef(null)

  const aiLoading = useSceneStore(s => s.aiLoading)
  const setAiLoading = useSceneStore(s => s.setAiLoading)
  const applyMutation = useSceneStore(s => s.applyMutation)
  const scene = useSceneStore(s => s.scene)
  const selectedModel = useSceneStore(s => s.selectedModel)
  const selectedId = useSceneStore(s => s.selectedId)
  
  const history = useSceneStore(s => s.aiChatHistory)
  const addAiChatMessage = useSceneStore(s => s.addAiChatMessage)

  // Scroll history to bottom when it changes
  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight
    }
  }, [history])

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    if (!input.trim() || aiLoading) return

    const prompt = input.trim()
    setInput('')
    setShowSuggestions(false)
    setActiveCategory(null)
    addAiChatMessage({ role: 'user', text: prompt })
    setAiLoading(true)

    try {
      const res = await fetch('/api/ai/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt,
          model: selectedModel,
          scene_id: scene.project.id,
          scene_snapshot: scene,
          selected_object_id: selectedId
        }),
      })
      const data = await res.json()

      if (data.mutations && data.mutations.length > 0) {
        data.mutations.forEach(m => applyMutation(m.type, m.payload))
      }

      addAiChatMessage({ 
        role: 'ai', 
        text: data.response || 'Done.', 
        cached: data.cached,
        mutations: data.mutations?.length
      })
    } catch (err) {
      addAiChatMessage({ role: 'error', text: 'Backend unavailable. Running in offline mode.' })
    } finally {
      setAiLoading(false)
    }
  }

  const selectSuggestion = (s) => {
    setInput(s)
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  const activeSuggestions = activeCategory 
    ? CATEGORIES.find(c => c.id === activeCategory)?.suggestions || []
    : CATEGORIES[3].suggestions // Default to furniture

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2, ease: 'easeOut' }}
      style={{
        position: 'absolute',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
        width: '100%',
        maxWidth: '720px',
        padding: '0 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px'
      }}
    >
      {/* Categories Bar */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', maxWidth: '100%', paddingBottom: '4px' }} className="hide-scrollbar">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => {
              setActiveCategory(cat.id === activeCategory ? null : cat.id)
              setShowSuggestions(true)
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '20px',
              border: `1px solid ${activeCategory === cat.id ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
              background: activeCategory === cat.id ? 'rgba(99,102,241,0.1)' : 'var(--bg-panel)',
              color: activeCategory === cat.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '12px',
              fontFamily: 'Inter, sans-serif',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s',
              backdropFilter: 'blur(8px)'
            }}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Main Command Bar Container */}
      <div
        className="glass-accent"
        style={{
          width: '100%',
          borderRadius: '20px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Chat History Panel */}
        <AnimatePresence>
          {history.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              style={{ 
                maxHeight: '200px', 
                overflowY: 'auto',
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column-reverse', // latest at bottom
                gap: '8px',
                borderBottom: '1px solid var(--border-subtle)',
                borderTopLeftRadius: '20px',
                borderTopRightRadius: '20px'
              }}
              className="hide-scrollbar"
              ref={historyRef}
            >
              {history.map((item, i) => (
                <div
                  key={i}
                  style={{
                    alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    padding: '8px 12px',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontFamily: 'Inter, sans-serif',
                    lineHeight: 1.4,
                    background: item.role === 'user'
                      ? 'rgba(99,102,241,0.15)'
                      : item.role === 'error'
                        ? 'rgba(239,68,68,0.1)'
                        : 'rgba(16,185,129,0.1)',
                    border: `1px solid ${
                      item.role === 'user' ? 'rgba(99,102,241,0.3)'
                      : item.role === 'error' ? 'rgba(239,68,68,0.2)'
                      : 'rgba(16,185,129,0.2)'
                    }`,
                    color: item.role === 'error' ? '#ef4444' : 'var(--text-primary)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                    <span style={{ opacity: 0.6, fontSize: '12px', marginTop: '1px' }}>
                      {item.role === 'user' ? '👤' : item.role === 'ai' ? '✦' : '⚠'}
                    </span>
                    <span>{item.text}</span>
                  </div>
                  
                  {item.role === 'ai' && (
                    <div style={{ display: 'flex', gap: '8px', marginLeft: '22px', fontSize: '11px', opacity: 0.7 }}>
                      {item.cached && <span style={{ color: '#f59e0b' }}>⚡ Cached</span>}
                      {item.mutations > 0 && <span>🔧 {item.mutations} mutations</span>}
                    </div>
                  )}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Suggestions Panel */}
        <AnimatePresence>
          {showSuggestions && !aiLoading && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.2)' }}
            >
              {activeSuggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => selectSuggestion(s)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    fontSize: '13px',
                    fontFamily: 'Inter, sans-serif',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={e => e.target.style.background = 'transparent'}
                >
                  <span style={{ color: 'var(--accent-primary)', marginRight: '8px' }}>✦</span>
                  {s}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Area */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px' }}>
          <ModelSelector />

          <input
            ref={inputRef}
            id="ai-command-input"
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder="Describe what you want to build or change..."
            disabled={aiLoading}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '14px',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 400,
            }}
          />

          <button
            type="submit"
            id="ai-submit-btn"
            disabled={!input.trim() || aiLoading}
            style={{
              padding: '8px 16px',
              borderRadius: '12px',
              border: 'none',
              cursor: input.trim() && !aiLoading ? 'pointer' : 'not-allowed',
              background: input.trim() && !aiLoading
                ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                : 'var(--bg-secondary)',
              color: '#fff',
              fontSize: '13px',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 500,
              transition: 'all 0.2s',
              opacity: input.trim() && !aiLoading ? 1 : 0.4,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {aiLoading ? (
              <span style={{ display: 'inline-block', animation: 'spin-slow 1s linear infinite' }}>◌</span>
            ) : (
              <>Send <span>→</span></>
            )}
          </button>
        </form>
      </div>
    </motion.div>
  )
}
