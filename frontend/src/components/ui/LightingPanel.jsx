/**
 * LightingPanel — Right-side panel for real-time light & shadow controls
 */
import { motion } from 'framer-motion'
import { useSceneStore } from '../../store/sceneStore'

export default function LightingPanel() {
  const lightSettings = useSceneStore(s => s.lightSettings) || { ambientIntensity: 0.4, dirIntensity: 1.2, shadowOpacity: 0.65 }
  const setLightSettings = useSceneStore(s => s.setLightSettings)

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.25 }}
      style={{
        position: 'absolute',
        right: '16px',
        top: '80px',
        zIndex: 40,
        width: '260px',
        pointerEvents: 'auto', // override parent pointer-events: none
      }}
    >
      <div className="glass" style={{ borderRadius: '16px', padding: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <span style={{ fontSize: '16px' }}>☀️</span>
          <span style={{ fontSize: '13px', color: '#6366f1', fontFamily: 'Inter,sans-serif', fontWeight: 600 }}>
            Lighting & Shadows
          </span>
        </div>

        {/* Ambient Light Control */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 500 }}>
            <span>Ambient Light</span>
            <span style={{ fontFamily: 'monospace' }}>{lightSettings.ambientIntensity.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0.05"
            max="1.5"
            step="0.05"
            value={lightSettings.ambientIntensity}
            onChange={(e) => setLightSettings({ ambientIntensity: parseFloat(e.target.value) })}
            style={{ width: '100%', accentColor: '#6366f1', height: '4px', borderRadius: '2px', cursor: 'pointer' }}
          />
        </div>

        {/* Directional Light Control */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 500 }}>
            <span>Sunlight / Direct</span>
            <span style={{ fontFamily: 'monospace' }}>{lightSettings.dirIntensity.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="2.5"
            step="0.1"
            value={lightSettings.dirIntensity}
            onChange={(e) => setLightSettings({ dirIntensity: parseFloat(e.target.value) })}
            style={{ width: '100%', accentColor: '#6366f1', height: '4px', borderRadius: '2px', cursor: 'pointer' }}
          />
        </div>

        {/* Shadow Opacity (Soft Contact Shadows) */}
        <div style={{ marginBottom: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 500 }}>
            <span>Soft Shadow Depth</span>
            <span style={{ fontFamily: 'monospace' }}>{lightSettings.shadowOpacity.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0.0"
            max="1.0"
            step="0.05"
            value={lightSettings.shadowOpacity}
            onChange={(e) => setLightSettings({ shadowOpacity: parseFloat(e.target.value) })}
            style={{ width: '100%', accentColor: '#6366f1', height: '4px', borderRadius: '2px', cursor: 'pointer' }}
          />
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '6px', lineHeight: '1.4' }}>
            Adjusts real-time ambient occlusion shadow intensity beneath wall corners.
          </div>
        </div>
      </div>
    </motion.div>
  )
}
