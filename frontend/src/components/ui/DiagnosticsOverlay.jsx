/**
 * DiagnosticsOverlay — Spatial diagnostics panel
 * Shows: collision warnings, blocked paths, invalid placements, accessibility
 */
import { motion, AnimatePresence } from 'framer-motion'
import { useSceneStore } from '../../store/sceneStore'

const SEVERITY_COLORS = {
  error: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', icon: '✕', text: '#ef4444' },
  warning: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', icon: '⚠', text: '#f59e0b' },
  info: { bg: 'rgba(6,182,212,0.1)', border: 'rgba(6,182,212,0.3)', icon: 'ℹ', text: '#06b6d4' },
}

export default function DiagnosticsOverlay() {
  const diagnostics = useSceneStore(s => s.diagnostics)
  const clearDiagnostics = useSceneStore(s => s.clearDiagnostics)

  if (diagnostics.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      style={{
        position: 'absolute',
        top: '80px',
        right: '16px',
        zIndex: 40,
        width: '280px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      {/* Header */}
      <div className="glass" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        borderRadius: '12px',
      }}>
        <span style={{ fontSize: '11px', fontFamily: 'Inter,sans-serif', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Diagnostics ({diagnostics.length})
        </span>
        <button
          onClick={clearDiagnostics}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px' }}
        >
          Clear ✕
        </button>
      </div>

      {/* Items */}
      <AnimatePresence>
        {diagnostics.map((d, i) => {
          const c = SEVERITY_COLORS[d.severity] || SEVERITY_COLORS.info
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: i * 0.05 }}
              style={{
                padding: '10px 12px',
                borderRadius: '10px',
                background: c.bg,
                border: `1px solid ${c.border}`,
                backdropFilter: 'blur(12px)',
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-start',
              }}
            >
              <span style={{ color: c.text, fontSize: '13px', marginTop: '1px' }}>{c.icon}</span>
              <div>
                {d.title && (
                  <div style={{ fontSize: '12px', fontWeight: 600, color: c.text, fontFamily: 'Inter,sans-serif', marginBottom: '2px' }}>
                    {d.title}
                  </div>
                )}
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'Inter,sans-serif', lineHeight: 1.5 }}>
                  {d.message}
                </div>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </motion.div>
  )
}
