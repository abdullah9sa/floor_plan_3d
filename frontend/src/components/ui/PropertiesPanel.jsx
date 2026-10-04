/**
 * PropertiesPanel — Left-side panel showing selected object properties or global controls
 */
import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSceneStore } from '../../store/sceneStore'

const TextureGrid = React.memo(({ textures, selectedTextureId, onSelect }) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', maxHeight: '260px', overflowY: 'auto' }}>
      <button
        onClick={() => onSelect(null)}
        style={{
          padding: '8px',
          borderRadius: '8px',
          border: !selectedTextureId ? '2px solid #6366f1' : '1px solid var(--border-subtle)',
          background: !selectedTextureId ? 'rgba(99,102,241,0.1)' : 'var(--bg-secondary)',
          color: 'var(--text-primary)',
          fontSize: '10px',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px'
        }}
      >
        <div style={{ width: '100%', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '16px' }}>⬜</span>
        </div>
        <span>None</span>
      </button>
      {textures.map(t => (
        <button
          key={t.id}
          onClick={() => onSelect(t)}
          style={{
            padding: '4px',
            borderRadius: '8px',
            border: selectedTextureId === t.id ? '2px solid #6366f1' : '1px solid var(--border-subtle)',
            background: selectedTextureId === t.id ? 'rgba(99,102,241,0.1)' : 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            fontSize: '10px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            overflow: 'hidden'
          }}
        >
          {t.diffuse && (
            <img 
              src={t.diffuse} 
              alt={t.name || t.id}
              loading="lazy"
              style={{ width: '100%', height: '50px', objectFit: 'cover', borderRadius: '4px' }}
            />
          )}
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', textAlign: 'center' }}>
            {t.name || t.id}
          </span>
        </button>
      ))}
    </div>
  )
})

function Field({ label, value }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontFamily: 'Inter,sans-serif', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>
        {label}
      </div>
      <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace', background: 'var(--bg-secondary)', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
        {value}
      </div>
    </div>
  )
}

function SliderField({ label, value, min, max, step, onChange }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontFamily: 'Inter,sans-serif', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {label}
        </span>
        <span style={{ fontSize: '10px', color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace' }}>
          {Number(value).toFixed(2)} m
        </span>
      </div>
      <input 
        type="range" 
        min={min} 
        max={max} 
        step={step} 
        value={value} 
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: '#6366f1' }}
      />
    </div>
  )
}

export default function PropertiesPanel() {
  const selectedId = useSceneStore(s => s.selectedId)
  const scene = useSceneStore(s => s.scene)
  const setSelected = useSceneStore(s => s.setSelected)
  const applyMutation = useSceneStore(s => s.applyMutation)

  const [textures, setTextures] = useState([])

  useEffect(() => {
    fetch('http://localhost:8000/api/textures')
      .then(res => res.json())
      .then(data => setTextures(data.textures || []))
      .catch(err => console.error("Failed to load textures", err))
  }, [])

  const selectedObj = selectedId
    ? [...scene.rooms, ...scene.walls, ...scene.furniture, ...(scene.openings || [])].find(o => o.id === selectedId)
    : null

  const handleDelete = () => {
    if (!selectedObj) return
    const id = selectedObj.id
    if (id.startsWith('room_')) {
      applyMutation('REMOVE_ROOM', { id })
    } else if (id.startsWith('wall_')) {
      applyMutation('REMOVE_WALL', { id })
    } else if (id.startsWith('open_')) {
      applyMutation('REMOVE_OPENING', { id })
    } else if (id.startsWith('furn_')) {
      applyMutation('REMOVE_FURNITURE', { id })
    }
    setSelected(null)
  }

  const handleUpdate = (payload) => {
    if (!selectedObj) return
    const id = selectedObj.id
    if (id.startsWith('wall_')) applyMutation('UPDATE_WALL', { id, ...payload })
    if (id.startsWith('open_')) applyMutation('UPDATE_OPENING', { id, ...payload })
    if (id.startsWith('room_')) applyMutation('UPDATE_ROOM', { id, ...payload })
  }

  const handleGlobalUpdate = (type, payload) => {
    applyMutation(type, payload)
  }

  // Find average metrics for global defaults
  const avgWallHeight = scene.walls.length ? scene.walls.reduce((s, w) => s + (w.height || 3), 0) / scene.walls.length : 3
  const avgWallThick = scene.walls.length ? scene.walls.reduce((s, w) => s + (w.thickness || 0.2), 0) / scene.walls.length : 0.2
  const avgOpenHeight = scene.openings?.length ? scene.openings.reduce((s, o) => s + (o.height || 2), 0) / scene.openings.length : 2
  const avgOpenWidth = scene.openings?.length ? scene.openings.reduce((s, o) => s + (o.width || 1), 0) / scene.openings.length : 1

  const isRoom = selectedObj?.id?.startsWith('room_')
  const isWall = selectedObj?.id?.startsWith('wall_')
  const isDoor = selectedObj?.id?.startsWith('open_') && selectedObj?.type === 'door'
  const canBeTextured = isRoom || isWall || isDoor
  const textureLabel = isRoom ? "Floor Texture" : isWall ? "Wall Texture" : "Door Texture"

  return (
    <div style={{ width: '100%' }}>
      <div style={{ padding: '16px' }}>
          {selectedObj ? (
            <>
              {/* Header for Selected Object */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span style={{ fontSize: '12px', color: '#6366f1', fontFamily: 'Inter,sans-serif', fontWeight: 600 }}>
                  Properties
                </span>
                <button
                  onClick={() => setSelected(null)}
                  style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '14px' }}
                >
                  ✕
                </button>
              </div>

              {/* ID */}
              <Field label="ID" value={selectedObj.id} />

              {/* Type-specific fields */}
              {selectedObj.type && <Field label="Type" value={selectedObj.type} />}
              {selectedObj.usable_area && <Field label="Area" value={`${selectedObj.usable_area} m²`} />}
              
              {/* Sliders for Walls & Openings */}
              {selectedObj.height !== undefined && (
                <SliderField label="Height" value={selectedObj.height} min={0.5} max={5.0} step={0.1} onChange={v => handleUpdate({ height: v })} />
              )}
              {selectedObj.thickness !== undefined && (
                <SliderField label="Thickness" value={selectedObj.thickness} min={0.05} max={0.5} step={0.01} onChange={v => handleUpdate({ thickness: v })} />
              )}
              {selectedObj.width !== undefined && (
                <SliderField label="Width" value={selectedObj.width} min={0.5} max={4.0} step={0.1} onChange={v => handleUpdate({ width: v })} />
              )}

              {/* Texture Selector (for Rooms, Walls, Doors) */}
              {canBeTextured && textures.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontFamily: 'Inter,sans-serif', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
                    {textureLabel}
                  </div>
                  <TextureGrid
                    textures={textures}
                    selectedTextureId={selectedObj.texture?.id}
                    onSelect={(t) => handleUpdate({ texture: t })}
                  />
                </div>
              )}

              {/* Texture Scale Control */}
              {canBeTextured && selectedObj.texture && (
                <div style={{ marginBottom: '16px' }}>
                  <SliderField 
                    label="Texture Scale X" 
                    value={selectedObj.textureScaleX || 2.0} 
                    min={0.5} 
                    max={10.0} 
                    step={0.1} 
                    onChange={v => handleUpdate({ textureScaleX: v })} 
                  />
                  <div style={{ height: '8px' }} />
                  <SliderField 
                    label="Texture Scale Y" 
                    value={selectedObj.textureScaleY || 2.0} 
                    min={0.5} 
                    max={10.0} 
                    step={0.1} 
                    onChange={v => handleUpdate({ textureScaleY: v })} 
                  />
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Adjusts the physical size of the texture tile (in meters) per axis.
                  </div>
                </div>
              )}

              {/* Read-only props */}
              {selectedObj.material && <Field label="Material" value={selectedObj.material} />}
              {selectedObj.asset_id && <Field label="Asset" value={selectedObj.asset_id} />}
              {selectedObj.position && !selectedObj.width && (
                <Field label="Position" value={`[${selectedObj.position.map(v => v.toFixed(2)).join(', ')}]`} />
              )}
              {selectedObj.start && (
                <Field label="Start" value={`[${selectedObj.start.map(v => v.toFixed(2)).join(', ')}]`} />
              )}
              {selectedObj.end && (
                <Field label="End" value={`[${selectedObj.end.map(v => v.toFixed(2)).join(', ')}]`} />
              )}

              {/* Delete Object */}
              <button
                id="prop-delete-btn"
                onClick={handleDelete}
                style={{
                  marginTop: '16px',
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  fontSize: '13px',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.18)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'
                }}
              >
                🗑️ Delete Object
              </button>
            </>
          ) : (
            <>
              {/* Header for Global Settings */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span style={{ fontSize: '12px', color: '#10b981', fontFamily: 'Inter,sans-serif', fontWeight: 600 }}>
                  Global Scene Controls
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Scale all objects simultaneously. Select an object to edit individually.
              </div>

              {/* Global Sliders */}
              <SliderField 
                label="All Walls Height" 
                value={avgWallHeight} 
                min={1.0} max={5.0} step={0.1} 
                onChange={v => handleGlobalUpdate('UPDATE_ALL_WALLS', { height: v })} 
              />
              <SliderField 
                label="All Walls Thickness" 
                value={avgWallThick} 
                min={0.05} max={0.5} step={0.01} 
                onChange={v => handleGlobalUpdate('UPDATE_ALL_WALLS', { thickness: v })} 
              />
              <SliderField 
                label="All Openings Height" 
                value={avgOpenHeight} 
                min={1.0} max={4.0} step={0.1} 
                onChange={v => handleGlobalUpdate('UPDATE_ALL_OPENINGS', { height: v })} 
              />
              <SliderField 
                label="All Openings Width" 
                value={avgOpenWidth} 
                min={0.5} max={3.0} step={0.1} 
                onChange={v => handleGlobalUpdate('UPDATE_ALL_OPENINGS', { width: v })} 
              />
            </>
          )}
      </div>
    </div>
  )
}
