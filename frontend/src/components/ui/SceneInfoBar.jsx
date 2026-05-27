/**
 * SceneInfoBar — Bottom-left status bar
 * Shows: room count, wall count, furniture count, event count
 */
import { useSceneStore } from '../../store/sceneStore'

export default function SceneInfoBar() {
  const scene = useSceneStore(s => s.scene)
  const eventLog = useSceneStore(s => s.eventLog)
  const viewMode = useSceneStore(s => s.viewMode)

  const stats = [
    { label: 'Rooms', value: scene.rooms.length },
    { label: 'Walls', value: scene.walls.length },
    { label: 'Objects', value: scene.furniture.length },
    { label: 'Events', value: eventLog.length },
  ]

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '24px',
        left: '16px',
        zIndex: 40,
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
      }}
    >
      <div
        className="glass"
        style={{
          display: 'flex',
          gap: '12px',
          padding: '8px 14px',
          borderRadius: '12px',
        }}
      >
        {stats.map(s => (
          <div key={s.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#6366f1', fontFamily: 'JetBrains Mono, monospace' }}>
              {s.value}
            </span>
            <span style={{ fontSize: '9px', color: 'var(--text-secondary)', fontFamily: 'Inter,sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Mode badge */}
      <div style={{
        padding: '6px 12px',
        background: 'rgba(99,102,241,0.12)',
        border: '1px solid rgba(99,102,241,0.25)',
        borderRadius: '10px',
        backdropFilter: 'blur(12px)',
        fontSize: '11px',
        fontFamily: 'Inter,sans-serif',
        fontWeight: 500,
        color: '#818cf8',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}>
        {viewMode === 'top' ? '⊞ Top View'
         : viewMode === 'orbit' ? '⛶ 3D Orbit'
         : viewMode === 'walkthrough' ? '👁 Walkthrough'
         : viewMode === 'material' ? '◈ Materials'
         : '☀ Lighting'}
      </div>
    </div>
  )
}
