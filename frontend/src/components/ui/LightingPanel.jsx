import { useState } from 'react'
import { motion } from 'framer-motion'
import { useSceneStore } from '../../store/sceneStore'

const PRESETS = [
  { id: 'studio', name: 'Studio', icon: '🏢' },
  { id: 'sunset', name: 'Sunset', icon: '🌇' },
  { id: 'dawn', name: 'Dawn', icon: '🌅' },
  { id: 'night', name: 'Night', icon: '🌃' },
  { id: 'warehouse', name: 'Warehouse', icon: '🏭' },
  { id: 'forest', name: 'Forest', icon: '🌲' },
  { id: 'apartment', name: 'Apartment', icon: '🏠' },
  { id: 'city', name: 'City', icon: '🌆' },
  { id: 'park', name: 'Park', icon: '🏞️' },
  { id: 'lobby', name: 'Lobby', icon: '🏨' },
]

export default function LightingPanel() {
  const lightSettings = useSceneStore(s => s.lightSettings) || {}
  const setLightSettings = useSceneStore(s => s.setLightSettings)
  const saveLightSettingsAsDefault = useSceneStore(s => s.saveLightSettingsAsDefault)
  const darkMode = useSceneStore(s => s.darkMode)
  
  const [activeTab, setActiveTab] = useState('environment') 
  const [saved, setSaved] = useState(false)

  const {
    ambientIntensity = 0.4,
    dirIntensity = 1.2,
    shadowOpacity = 0.65,
    envIntensity = 0.5,
    envPreset = 'studio',
    envBackground = false,
    envBlur = 0,
    envRotation = 0,
    showGrid = true,
    bgColor = '',
    gridColor = '',
    showFog = false,
    fogDensity = 0.02,
    fogColor = '',
    // Post-Processing
    toneMapping = 'aces',
    toneMappingExposure = 1.0,
    bloomEnabled = false,
    bloomIntensity = 0.5,
    bloomThreshold = 0.9,
    bloomSmoothing = 0.3,
    ssaoEnabled = false,
    ssaoIntensity = 15,
    ssaoRadius = 5,
    dofEnabled = false,
    dofFocusDistance = 0.02,
    dofFocalLength = 0.05,
    dofBokehScale = 3,
    vignetteEnabled = false,
    vignetteOffset = 0.3,
    vignetteDarkness = 0.7,
    aaMode = 'smaa',
    msaaSamples = 4,
    postProcessingEnabled = true,
  } = lightSettings

  // Theme-aware resolved fallback values for visual displays
  const resolvedBgColor = bgColor || (darkMode ? '#0a0a0f' : '#f8fafc')
  const resolvedGridColor = gridColor || (darkMode ? '#1e293b' : '#cbd5e1')
  const resolvedFogColor = fogColor || resolvedBgColor

  // Unified theme colors/styles to look perfect on both dark/light glass panels
  const colors = {
    textPrimary: 'var(--text-primary)',
    textSecondary: 'var(--text-secondary)',
    textMuted: 'var(--text-muted)',
    accent: '#6366f1',
    border: 'var(--border-subtle)',
    bgSecondary: 'var(--bg-secondary)',
    bgHover: 'var(--bg-panel-hover)',
  }

  const s = {
    sectionTitle: {
      fontSize: '11px',
      color: 'var(--accent-primary)',
      marginBottom: '10px',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      display: 'flex',
      alignItems: 'center',
      gap: '5px'
    },
    labelRow: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: '11px',
      color: colors.textSecondary,
      marginBottom: '6px',
      fontWeight: 500
    },
    value: {
      fontFamily: 'monospace',
      fontWeight: 600,
      color: colors.accent
    },
    slider: (disabled) => ({
      width: '100%',
      accentColor: colors.accent,
      height: '4px',
      borderRadius: '2px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      background: 'var(--border-subtle)',
      outline: 'none',
      opacity: disabled ? 0.3 : 1
    }),
    toggleSwitch: (active) => ({
      width: '34px',
      height: '18px',
      borderRadius: '9px',
      background: active ? 'var(--accent-primary)' : 'rgba(128,128,128,0.2)',
      cursor: 'pointer',
      position: 'relative',
      transition: 'all 0.2s ease',
      border: `1px solid ${active ? 'transparent' : 'var(--border-subtle)'}`
    }),
    toggleKnob: (active) => ({
      width: '12px',
      height: '12px',
      borderRadius: '50%',
      background: '#fff',
      position: 'absolute',
      top: '2px',
      left: active ? '18px' : '2px',
      transition: 'left 0.2s cubic-bezier(0.4,0,0.2,1)',
      boxShadow: '0 1px 2px rgba(0,0,0,0.3)'
    }),
    gridButton: (active) => ({
      padding: '6px 8px',
      borderRadius: '8px',
      border: active ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
      background: active ? 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))' : 'var(--bg-secondary)',
      color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
      cursor: 'pointer',
      fontSize: '10px',
      fontWeight: active ? 600 : 500,
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '4px'
    }),
    rowAlign: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '10px'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ type: 'spring', damping: 25, stiffness: 120 }}
      style={{
        position: 'absolute',
        top: '80px',
        right: '20px',
        width: '300px',
        pointerEvents: 'auto', // override parent pointer-events: none
        maxHeight: 'calc(100vh - 120px)',
        overflowY: 'auto',
      }}
    >
      <div className="glass" style={{ borderRadius: '16px', padding: '18px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <span style={{ fontSize: '16px' }}>⚙️</span>
          <span style={{ fontSize: '13px', color: '#6366f1', fontFamily: 'Inter,sans-serif', fontWeight: 600 }}>
            Scene Settings
          </span>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-secondary)', padding: '3px', borderRadius: '10px', marginBottom: '18px', border: '1px solid var(--border-subtle)' }}>
          <button
            onClick={() => setActiveTab('environment')}
            style={{
              flex: 1,
              padding: '8px 6px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'environment' ? 'var(--bg-panel-hover)' : 'transparent',
              color: activeTab === 'environment' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}
          >
            <span>🌍</span> Env
          </button>
          <button
            onClick={() => setActiveTab('lighting')}
            style={{
              flex: 1,
              padding: '8px 6px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'lighting' ? 'var(--bg-panel-hover)' : 'transparent',
              color: activeTab === 'lighting' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}
          >
            <span>💡</span> Lights
          </button>
          <button
            onClick={() => setActiveTab('postfx')}
            style={{
              flex: 1,
              padding: '8px 6px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'postfx' ? 'var(--bg-panel-hover)' : 'transparent',
              color: activeTab === 'postfx' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}
          >
            <span>✨</span> Post-FX
          </button>
        </div>

        {/* Tab Contents */}
        {activeTab === 'environment' ? (
          <div>
            {/* SECTION 1: HDRI Presets & Intensity */}
            <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '12px' }}>
              <div style={s.sectionTitle}>
                <span>🌅</span> HDRI Presets
              </div>

              {/* Grid of Preset Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', marginBottom: '12px' }}>
                {PRESETS.map(p => {
                  const active = envPreset === p.id
                  return (
                    <button
                      key={p.id}
                      onClick={() => setLightSettings({ envPreset: p.id })}
                      style={s.gridButton(active)}
                    >
                      <span style={{ fontSize: '12px' }}>{p.icon}</span>
                      <span>{p.name}</span>
                    </button>
                  )
                })}
              </div>

              {/* Environment Intensity Control */}
              <div style={{ marginBottom: '10px' }}>
                <div style={s.labelRow}>
                  <span>HDRI Intensity (IBL)</span>
                  <span style={s.value}>{envIntensity.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="2.0"
                  step="0.05"
                  value={envIntensity}
                  onChange={(e) => setLightSettings({ envIntensity: parseFloat(e.target.value) })}
                  style={s.slider(false)}
                />
              </div>

              {/* Environment Rotation Control */}
              <div>
                <div style={s.labelRow}>
                  <span>HDRI Sun Rotation</span>
                  <span style={s.value}>{envRotation}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="5"
                  value={envRotation}
                  onChange={(e) => setLightSettings({ envRotation: parseInt(e.target.value, 10) })}
                  style={s.slider(false)}
                />
              </div>
            </div>

            {/* SECTION 2: Background & Grid */}
            <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '12px' }}>
              <div style={s.sectionTitle}>
                <span>🖥️</span> Background & Grid
              </div>

              {/* Toggle Skybox Background */}
              <div style={s.rowAlign}>
                <span style={{ fontSize: '11px', color: colors.textSecondary, fontWeight: 500 }}>
                  Show HDRI Background
                </span>
                <div 
                  onClick={() => setLightSettings({ envBackground: !envBackground })}
                  style={s.toggleSwitch(envBackground)}
                >
                  <div style={s.toggleKnob(envBackground)} />
                </div>
              </div>

              {/* Background Blur Control */}
              <div style={{ marginBottom: '10px', opacity: envBackground ? 1 : 0.4, pointerEvents: envBackground ? 'auto' : 'none', transition: 'opacity 0.2s' }}>
                <div style={s.labelRow}>
                  <span>Background Blur</span>
                  <span style={s.value}>{envBlur.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={envBlur}
                  disabled={!envBackground}
                  onChange={(e) => setLightSettings({ envBlur: parseFloat(e.target.value) })}
                  style={s.slider(!envBackground)}
                />
              </div>

              {/* Solid Background Color Picker */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', opacity: envBackground ? 0.4 : 1, transition: 'opacity 0.2s' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '11px', color: colors.textSecondary, fontWeight: 500 }}>Background Color</span>
                  {envBackground && <span style={{ fontSize: '9px', color: colors.textMuted }}>Overridden by HDRI map</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '10px', fontFamily: 'monospace', color: colors.textSecondary }}>{resolvedBgColor}</span>
                  <div style={{ position: 'relative', width: '18px', height: '18px', borderRadius: '50%', border: '1px solid var(--border-subtle)', background: resolvedBgColor, cursor: envBackground ? 'not-allowed' : 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
                    <input 
                      type="color" 
                      value={resolvedBgColor} 
                      disabled={envBackground}
                      onChange={(e) => setLightSettings({ bgColor: e.target.value })} 
                      style={{ position: 'absolute', top: '-5px', left: '-5px', width: '28px', height: '28px', opacity: 0, cursor: envBackground ? 'not-allowed' : 'pointer' }}
                    />
                  </div>
                </div>
              </div>

              {/* Show Grid Toggle */}
              <div style={s.rowAlign}>
                <span style={{ fontSize: '11px', color: colors.textSecondary, fontWeight: 500 }}>
                  Show Ground Grid
                </span>
                <div 
                  onClick={() => setLightSettings({ showGrid: !showGrid })}
                  style={s.toggleSwitch(showGrid)}
                >
                  <div style={s.toggleKnob(showGrid)} />
                </div>
              </div>

              {/* Grid Line Color Picker */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: showGrid ? 1 : 0.4, transition: 'opacity 0.2s' }}>
                <span style={{ fontSize: '11px', color: colors.textSecondary, fontWeight: 500 }}>Grid Line Color</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '10px', fontFamily: 'monospace', color: colors.textSecondary }}>{resolvedGridColor}</span>
                  <div style={{ position: 'relative', width: '18px', height: '18px', borderRadius: '50%', border: '1px solid var(--border-subtle)', background: resolvedGridColor, cursor: showGrid ? 'pointer' : 'not-allowed', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
                    <input 
                      type="color" 
                      value={resolvedGridColor} 
                      disabled={!showGrid}
                      onChange={(e) => setLightSettings({ gridColor: e.target.value })} 
                      style={{ position: 'absolute', top: '-5px', left: '-5px', width: '28px', height: '28px', opacity: 0, cursor: showGrid ? 'pointer' : 'not-allowed' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 3: Fog & Atmosphere */}
            <div style={{ paddingBottom: '4px' }}>
              <div style={s.sectionTitle}>
                <span>🌫️</span> Fog & Atmosphere
              </div>

              {/* Show Fog Toggle */}
              <div style={s.rowAlign}>
                <span style={{ fontSize: '11px', color: colors.textSecondary, fontWeight: 500 }}>
                  Enable Depth Fog
                </span>
                <div 
                  onClick={() => setLightSettings({ showFog: !showFog })}
                  style={s.toggleSwitch(showFog)}
                >
                  <div style={s.toggleKnob(showFog)} />
                </div>
              </div>

              {/* Fog Color Picker */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', opacity: showFog ? 1 : 0.4, transition: 'opacity 0.2s' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '11px', color: colors.textSecondary, fontWeight: 500 }}>Fog Color</span>
                  {!fogColor && <span style={{ fontSize: '9px', color: colors.textMuted }}>Matches background color</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '10px', fontFamily: 'monospace', color: colors.textSecondary }}>{resolvedFogColor}</span>
                  <div style={{ position: 'relative', width: '18px', height: '18px', borderRadius: '50%', border: '1px solid var(--border-subtle)', background: resolvedFogColor, cursor: showFog ? 'pointer' : 'not-allowed', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
                    <input 
                      type="color" 
                      value={resolvedFogColor} 
                      disabled={!showFog}
                      onChange={(e) => setLightSettings({ fogColor: e.target.value })} 
                      style={{ position: 'absolute', top: '-5px', left: '-5px', width: '28px', height: '28px', opacity: 0, cursor: showFog ? 'pointer' : 'not-allowed' }}
                    />
                  </div>
                </div>
              </div>

              {/* Fog Density Control */}
              <div style={{ opacity: showFog ? 1 : 0.4, pointerEvents: showFog ? 'auto' : 'none', transition: 'opacity 0.2s' }}>
                <div style={s.labelRow}>
                  <span>Fog Density</span>
                  <span style={s.value}>{(fogDensity * 100).toFixed(1)}%</span>
                </div>
                <input
                  type="range"
                  min="0.002"
                  max="0.10"
                  step="0.002"
                  value={fogDensity}
                  disabled={!showFog}
                  onChange={(e) => setLightSettings({ fogDensity: parseFloat(e.target.value) })}
                  style={s.slider(!showFog)}
                />
              </div>
            </div>
          </div>
        ) : activeTab === 'lighting' ? (
          <div>
            {/* Ambient Light Control */}
            <div style={{ marginBottom: '16px' }}>
              <div style={s.labelRow}>
                <span>Ambient Light</span>
                <span style={s.value}>{ambientIntensity.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="1.5"
                step="0.05"
                value={ambientIntensity}
                onChange={(e) => setLightSettings({ ambientIntensity: parseFloat(e.target.value) })}
                style={s.slider(false)}
              />
            </div>

            {/* Directional Light Control */}
            <div style={{ marginBottom: '16px' }}>
              <div style={s.labelRow}>
                <span>Sunlight / Direct</span>
                <span style={s.value}>{dirIntensity.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="2.5"
                step="0.1"
                value={dirIntensity}
                onChange={(e) => setLightSettings({ dirIntensity: parseFloat(e.target.value) })}
                style={s.slider(false)}
              />
            </div>

            {/* Shadow Opacity (Soft Contact Shadows) */}
            <div style={{ marginBottom: '8px' }}>
              <div style={s.labelRow}>
                <span>Soft Shadow Depth</span>
                <span style={s.value}>{shadowOpacity.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={shadowOpacity}
                onChange={(e) => setLightSettings({ shadowOpacity: parseFloat(e.target.value) })}
                style={s.slider(false)}
              />
              <div style={{ fontSize: '10px', color: colors.textSecondary, marginTop: '6px', lineHeight: '1.4' }}>
                Adjusts real-time ambient occlusion shadow intensity beneath wall corners.
              </div>
            </div>
          </div>
        ) : (
          /* ── Post-FX Tab ─────────────────────────────────── */
          <div>
            {/* Global Post-Processing Toggle Banner */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              padding: '10px', 
              borderRadius: '10px', 
              background: 'var(--bg-secondary)', 
              border: '1px solid var(--border-subtle)', 
              marginBottom: '14px' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px' }}>✨</span>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)' }}>Enable Post-FX</span>
                  <span style={{ fontSize: '9px', color: colors.textSecondary }}>Global toggle for all effects</span>
                </div>
              </div>
              <div 
                onClick={() => setLightSettings({ postProcessingEnabled: !postProcessingEnabled })}
                style={s.toggleSwitch(postProcessingEnabled)}
              >
                <div style={s.toggleKnob(postProcessingEnabled)} />
              </div>
            </div>

            {/* Sub-controls conditional on postProcessingEnabled */}
            <div style={{ 
              opacity: postProcessingEnabled ? 1 : 0.4, 
              pointerEvents: postProcessingEnabled ? 'auto' : 'none', 
              transition: 'opacity 0.2s ease' 
            }}>
              {/* SECTION: Tonemapping */}
              <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '12px' }}>
                <div style={s.sectionTitle}>
                  <span>🎬</span> Tonemapping
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '5px', marginBottom: '10px' }}>
                  {['aces', 'reinhard', 'cineon', 'linear'].map(tm => {
                    const active = toneMapping === tm
                    const labels = { aces: 'ACES Filmic', reinhard: 'Reinhard', cineon: 'Cineon', linear: 'Linear' }
                    return (
                      <button
                        key={tm}
                        disabled={!postProcessingEnabled}
                        onClick={() => setLightSettings({ toneMapping: tm })}
                        style={s.gridButton(active)}
                      >
                        {labels[tm]}
                      </button>
                    )
                  })}
                </div>
                <div>
                  <div style={s.labelRow}>
                    <span>Exposure</span>
                    <span style={s.value}>{toneMappingExposure.toFixed(2)}</span>
                  </div>
                  <input
                    type="range" min="0.1" max="3.0" step="0.05"
                    disabled={!postProcessingEnabled}
                    value={toneMappingExposure}
                    onChange={(e) => setLightSettings({ toneMappingExposure: parseFloat(e.target.value) })}
                    style={s.slider(!postProcessingEnabled)}
                  />
                </div>
              </div>

              {/* SECTION: Anti-Aliasing */}
              <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '12px' }}>
                <div style={s.sectionTitle}>
                  <span>🔍</span> Anti-Aliasing
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '10px', color: colors.textSecondary, marginBottom: '5px', fontWeight: 500 }}>AA Mode</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '5px' }}>
                    {['smaa', 'fxaa', 'none'].map(mode => {
                      const active = aaMode === mode
                      const labels = { smaa: 'SMAA', fxaa: 'FXAA', none: 'None' }
                      return (
                        <button
                          key={mode}
                          disabled={!postProcessingEnabled}
                          onClick={() => setLightSettings({ aaMode: mode })}
                          style={s.gridButton(active)}
                        >
                          {labels[mode]}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: colors.textSecondary, marginBottom: '5px', fontWeight: 500 }}>MSAA Samples</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '5px' }}>
                    {[0, 2, 4, 8].map(n => {
                      const active = msaaSamples === n
                      return (
                        <button
                          key={n}
                          disabled={!postProcessingEnabled}
                          onClick={() => setLightSettings({ msaaSamples: n })}
                          style={s.gridButton(active)}
                        >
                          {n === 0 ? 'Off' : `${n}x`}
                        </button>
                      )
                    })}
                  </div>
                  <div style={{ fontSize: '9px', color: colors.textSecondary, marginTop: '5px', lineHeight: '1.4' }}>
                    SMAA is recommended for best quality edge smoothing on architecture.
                  </div>
                </div>
              </div>

              {/* SECTION: Bloom */}
              <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '12px' }}>
                <div style={s.rowAlign}>
                  <div style={s.sectionTitle}>
                    <span>💫</span> Bloom
                  </div>
                  <div
                    onClick={() => setLightSettings({ bloomEnabled: !bloomEnabled })}
                    style={s.toggleSwitch(bloomEnabled)}
                  >
                    <div style={s.toggleKnob(bloomEnabled)} />
                  </div>
                </div>
                <div style={{ opacity: bloomEnabled ? 1 : 0.4, pointerEvents: bloomEnabled ? 'auto' : 'none', transition: 'opacity 0.2s' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <div style={s.labelRow}>
                      <span>Intensity</span><span style={s.value}>{bloomIntensity.toFixed(2)}</span>
                    </div>
                    <input type="range" min="0" max="3" step="0.05" value={bloomIntensity}
                      disabled={!bloomEnabled}
                      onChange={(e) => setLightSettings({ bloomIntensity: parseFloat(e.target.value) })}
                      style={s.slider(!bloomEnabled)} />
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <div style={s.labelRow}>
                      <span>Threshold</span><span style={s.value}>{bloomThreshold.toFixed(2)}</span>
                    </div>
                    <input type="range" min="0" max="1" step="0.05" value={bloomThreshold}
                      disabled={!bloomEnabled}
                      onChange={(e) => setLightSettings({ bloomThreshold: parseFloat(e.target.value) })}
                      style={s.slider(!bloomEnabled)} />
                  </div>
                  <div>
                    <div style={s.labelRow}>
                      <span>Smoothing</span><span style={s.value}>{bloomSmoothing.toFixed(2)}</span>
                    </div>
                    <input type="range" min="0" max="1" step="0.05" value={bloomSmoothing}
                      disabled={!bloomEnabled}
                      onChange={(e) => setLightSettings({ bloomSmoothing: parseFloat(e.target.value) })}
                      style={s.slider(!bloomEnabled)} />
                  </div>
                </div>
              </div>

              {/* SECTION: SSAO */}
              <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '12px' }}>
                <div style={s.rowAlign}>
                  <div style={s.sectionTitle}>
                    <span>🕳️</span> SSAO
                  </div>
                  <div
                    onClick={() => setLightSettings({ ssaoEnabled: !ssaoEnabled })}
                    style={s.toggleSwitch(ssaoEnabled)}
                  >
                    <div style={s.toggleKnob(ssaoEnabled)} />
                  </div>
                </div>
                <div style={{ opacity: ssaoEnabled ? 1 : 0.4, pointerEvents: ssaoEnabled ? 'auto' : 'none', transition: 'opacity 0.2s' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <div style={s.labelRow}>
                      <span>Intensity</span><span style={s.value}>{ssaoIntensity.toFixed(1)}</span>
                    </div>
                    <input type="range" min="1" max="30" step="0.5" value={ssaoIntensity}
                      disabled={!ssaoEnabled}
                      onChange={(e) => setLightSettings({ ssaoIntensity: parseFloat(e.target.value) })}
                      style={s.slider(!ssaoEnabled)} />
                  </div>
                  <div>
                    <div style={s.labelRow}>
                      <span>Radius</span><span style={s.value}>{ssaoRadius.toFixed(1)}</span>
                    </div>
                    <input type="range" min="1" max="20" step="0.5" value={ssaoRadius}
                      disabled={!ssaoEnabled}
                      onChange={(e) => setLightSettings({ ssaoRadius: parseFloat(e.target.value) })}
                      style={s.slider(!ssaoEnabled)} />
                  </div>
                </div>
              </div>

              {/* SECTION: Depth of Field */}
              <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '12px' }}>
                <div style={s.rowAlign}>
                  <div style={s.sectionTitle}>
                    <span>📷</span> Depth of Field
                  </div>
                  <div
                    onClick={() => setLightSettings({ dofEnabled: !dofEnabled })}
                    style={s.toggleSwitch(dofEnabled)}
                  >
                    <div style={s.toggleKnob(dofEnabled)} />
                  </div>
                </div>
                <div style={{ opacity: dofEnabled ? 1 : 0.4, pointerEvents: dofEnabled ? 'auto' : 'none', transition: 'opacity 0.2s' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <div style={s.labelRow}>
                      <span>Focus Distance</span><span style={s.value}>{dofFocusDistance.toFixed(3)}</span>
                    </div>
                    <input type="range" min="0" max="0.2" step="0.001" value={dofFocusDistance}
                      disabled={!dofEnabled}
                      onChange={(e) => setLightSettings({ dofFocusDistance: parseFloat(e.target.value) })}
                      style={s.slider(!dofEnabled)} />
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <div style={s.labelRow}>
                      <span>Focal Length</span><span style={s.value}>{dofFocalLength.toFixed(3)}</span>
                    </div>
                    <input type="range" min="0" max="0.2" step="0.001" value={dofFocalLength}
                      disabled={!dofEnabled}
                      onChange={(e) => setLightSettings({ dofFocalLength: parseFloat(e.target.value) })}
                      style={s.slider(!dofEnabled)} />
                  </div>
                  <div>
                    <div style={s.labelRow}>
                      <span>Bokeh Scale</span><span style={s.value}>{dofBokehScale.toFixed(1)}</span>
                    </div>
                    <input type="range" min="0" max="10" step="0.5" value={dofBokehScale}
                      disabled={!dofEnabled}
                      onChange={(e) => setLightSettings({ dofBokehScale: parseFloat(e.target.value) })}
                      style={s.slider(!dofEnabled)} />
                  </div>
                </div>
              </div>

              {/* SECTION: Vignette */}
              <div style={{ paddingBottom: '4px' }}>
                <div style={s.rowAlign}>
                  <div style={s.sectionTitle}>
                    <span>🔲</span> Vignette
                  </div>
                  <div
                    onClick={() => setLightSettings({ vignetteEnabled: !vignetteEnabled })}
                    style={s.toggleSwitch(vignetteEnabled)}
                  >
                    <div style={s.toggleKnob(vignetteEnabled)} />
                  </div>
                </div>
                <div style={{ opacity: vignetteEnabled ? 1 : 0.4, pointerEvents: vignetteEnabled ? 'auto' : 'none', transition: 'opacity 0.2s' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <div style={s.labelRow}>
                      <span>Offset</span><span style={s.value}>{vignetteOffset.toFixed(2)}</span>
                    </div>
                    <input type="range" min="0" max="1" step="0.05" value={vignetteOffset}
                      disabled={!vignetteEnabled}
                      onChange={(e) => setLightSettings({ vignetteOffset: parseFloat(e.target.value) })}
                      style={s.slider(!vignetteEnabled)} />
                  </div>
                  <div>
                    <div style={s.labelRow}>
                      <span>Darkness</span><span style={s.value}>{vignetteDarkness.toFixed(2)}</span>
                    </div>
                    <input type="range" min="0" max="1" step="0.05" value={vignetteDarkness}
                      disabled={!vignetteEnabled}
                      onChange={(e) => setLightSettings({ vignetteDarkness: parseFloat(e.target.value) })}
                      style={s.slider(!vignetteEnabled)} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Save as Default button */}
        <button
          onClick={() => {
            const success = saveLightSettingsAsDefault()
            if (success) {
              setSaved(true)
              setTimeout(() => setSaved(false), 2000)
            }
          }}
          style={{
            marginTop: '16px',
            width: '100%',
            padding: '10px 14px',
            borderRadius: '10px',
            border: 'none',
            background: saved ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.1)',
            color: saved ? '#10b981' : '#6366f1',
            fontSize: '12px',
            fontFamily: 'Inter, sans-serif',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.25s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            border: saved ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid transparent'
          }}
        >
          {saved ? '✔️ Saved Settings!' : '💾 Save as Default'}
        </button>
      </div>
    </motion.div>
  )
}
