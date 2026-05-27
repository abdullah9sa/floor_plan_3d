/**
 * AICommandBar — Persistent natural language interface
 * Bottom-center prompt bar for AI-assisted scene mutations
 */
import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSceneStore } from '../../store/sceneStore'

const SUGGESTIONS = [
  'Add a modern sofa near the window',
  'Create a 5x4 living room',
  'Add warm ceiling lighting',
  'Place a dining table for 6',
  'Apply oak wood flooring',
]

export default function AICommandBar() {
  const [input, setInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [history, setHistory] = useState([])
  const inputRef = useRef(null)

  const aiLoading = useSceneStore(s => s.aiLoading)
  const setAiLoading = useSceneStore(s => s.setAiLoading)
  const applyMutation = useSceneStore(s => s.applyMutation)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim() || aiLoading) return

    const prompt = input.trim()
    setInput('')
    setShowSuggestions(false)
    setHistory(h => [{ role: 'user', text: prompt }, ...h])
    setAiLoading(true)

    try {
      const res = await fetch('/api/ai/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      const data = await res.json()

      if (data.mutations) {
        data.mutations.forEach(m => applyMutation(m.type, m.payload))
      }

      setHistory(h => [{ role: 'ai', text: data.response || 'Done.' }, ...h])
    } catch (err) {
      setHistory(h => [{ role: 'error', text: 'Backend unavailable. Running in offline mode.' }, ...h])
    } finally {
      setAiLoading(false)
    }
  }

  const selectSuggestion = (s) => {
    setInput(s)
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

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
        maxWidth: '680px',
        padding: '0 16px',
      }}
    >
      {/* Recent AI History */}
      <AnimatePresence>
        {history.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ marginBottom: '8px' }}
          >
            {history.slice(0, 2).map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  padding: '8px 14px',
                  marginBottom: '4px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontFamily: 'Inter, sans-serif',
                  background: item.role === 'user'
                    ? 'rgba(99,102,241,0.12)'
                    : item.role === 'error'
                      ? 'rgba(239,68,68,0.1)'
                      : 'rgba(16,185,129,0.1)',
                  border: `1px solid ${
                    item.role === 'user' ? 'rgba(99,102,241,0.2)'
                    : item.role === 'error' ? 'rgba(239,68,68,0.2)'
                    : 'rgba(16,185,129,0.2)'
                  }`,
                  color: item.role === 'error' ? '#ef4444' : 'var(--text-secondary)',
                }}
              >
                <span style={{ opacity: 0.5, marginRight: '6px' }}>
                  {item.role === 'user' ? '→' : item.role === 'ai' ? '✦' : '⚠'}
                </span>
                {item.text}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Suggestions */}
      <AnimatePresence>
        {showSuggestions && !aiLoading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="glass"
            style={{ borderRadius: '16px', padding: '8px', marginBottom: '8px' }}
          >
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => selectSuggestion(s)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  fontSize: '13px',
                  fontFamily: 'Inter, sans-serif',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => e.target.style.background = 'var(--bg-panel-hover)'}
                onMouseLeave={e => e.target.style.background = 'transparent'}
              >
                <span style={{ color: '#6366f1', marginRight: '8px' }}>✦</span>
                {s}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <form onSubmit={handleSubmit}>
        <div
          className="glass-accent"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            borderRadius: '18px',
            padding: '12px 16px',
          }}
        >
          <span style={{ fontSize: '18px', flexShrink: 0 }}>
            {aiLoading ? (
              <span style={{ display: 'inline-block', animation: 'spin-slow 1s linear infinite' }}>◌</span>
            ) : '✦'}
          </span>

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
              padding: '6px 14px',
              borderRadius: '10px',
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
            }}
          >
            {aiLoading ? 'Thinking…' : 'Send →'}
          </button>
        </div>
      </form>
    </motion.div>
  )
}
