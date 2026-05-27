/**
 * FloorPlanUpload — Phase 2 Vision Reconstruction UI
 *
 * Premium drag-and-drop upload modal that sends floor plan images
 * to the vision pipeline and displays results with debug overlays.
 */
import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSceneStore } from '../../store/sceneStore'
import './FloorPlanUpload.css'

const PIPELINE_STAGES = [
  { id: 'preprocess', label: 'Image Preprocessing', icon: '🔧' },
  { id: 'walls', label: 'Wall Detection', icon: '🧱' },
  { id: 'ocr', label: 'OCR Extraction', icon: '🔤' },
  { id: 'vectorize', label: 'Vectorization', icon: '📐' },
  { id: 'topology', label: 'Topology Reconstruction', icon: '🏗️' },
  { id: 'repair', label: 'Constraint Repair', icon: '✨' },
]

const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/bmp']
const MAX_SIZE_MB = 20

export default function FloorPlanUpload({ isOpen, onClose }) {
  const applyMutation = useSceneStore(s => s.applyMutation)
  const resetScene = useSceneStore(s => s.resetScene)

  // Local state
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [status, setStatus] = useState('idle') // idle | uploading | processing | complete | error
  const [currentStage, setCurrentStage] = useState(-1)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [debugTab, setDebugTab] = useState(null)
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.2)
  const [enableAiFix, setEnableAiFix] = useState(false)

  const fileInputRef = useRef(null)
  const dropRef = useRef(null)

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Delay reset so close animation plays
      const t = setTimeout(() => {
        setFile(null)
        setPreview(null)
        setStatus('idle')
        setCurrentStage(-1)
        setResult(null)
        setError(null)
        setDebugTab(null)
      }, 300)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  // ── File handling ──────────────────────────────────────────────────────

  const handleFile = useCallback((f) => {
    if (!f) return

    // Validate type
    if (!ACCEPTED_TYPES.includes(f.type)) {
      setError(`Unsupported file type: ${f.type}. Use JPEG, PNG, or WebP.`)
      return
    }

    // Validate size
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File too large (${(f.size / 1024 / 1024).toFixed(1)}MB). Max ${MAX_SIZE_MB}MB.`)
      return
    }

    setError(null)
    setFile(f)
    setStatus('idle')
    setResult(null)

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target.result)
    reader.readAsDataURL(f)
  }, [])

  // ── Drag & Drop ────────────────────────────────────────────────────────
  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
    const f = e.dataTransfer?.files?.[0]
    if (f) handleFile(f)
  }, [handleFile])

  const handleInputChange = useCallback((e) => {
    handleFile(e.target.files?.[0])
  }, [handleFile])

  // ── Upload & Process ───────────────────────────────────────────────────
  const handleUpload = useCallback(async () => {
    if (!file) return
    setStatus('uploading')
    setError(null)
    setCurrentStage(-1)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('confidence_threshold', confidenceThreshold.toString())
    formData.append('enable_ai_fix', enableAiFix ? 'true' : 'false')

    try {
      // Simulate stage progression (backend processes synchronously but we animate)
      setStatus('processing')

      // Start stage animation
      for (let i = 0; i < PIPELINE_STAGES.length; i++) {
        setCurrentStage(i)
        // Small delay between stages for visual effect
        await new Promise(r => setTimeout(r, 350))
      }

      const response = await fetch('/api/vision/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.detail || `Upload failed (${response.status})`)
      }

      const data = await response.json()
      setResult(data)
      setStatus('complete')
      setCurrentStage(PIPELINE_STAGES.length) // all complete

      // Set first debug tab
      const debugKeys = Object.keys(data.debug_images || {})
      if (debugKeys.length > 0) setDebugTab(debugKeys[0])

    } catch (err) {
      setError(err.message || 'An unexpected error occurred')
      setStatus('error')
    }
  }, [file, confidenceThreshold, enableAiFix])


  // ── Apply Results to Scene ─────────────────────────────────────────────
  const handleApply = useCallback(() => {
    if (!result?.mutations?.length) return

    // Reset current scene first
    resetScene()

    // Apply each mutation from the vision pipeline
    for (const mut of result.mutations) {
      // Skip CLEAR_SCENE (we already reset)
      if (mut.type === 'CLEAR_SCENE') continue
      applyMutation(mut.type, mut.payload)
    }

    // Re-center camera on the new geometry
    setTimeout(() => {
      useSceneStore.getState().computeSceneCenter()
    }, 50)

    // Close modal
    onClose?.()
  }, [result, applyMutation, resetScene, onClose])

  // ── Remove selected file ───────────────────────────────────────────────
  const handleRemoveFile = useCallback(() => {
    setFile(null)
    setPreview(null)
    setStatus('idle')
    setResult(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  // ── Render ─────────────────────────────────────────────────────────────
  if (!isOpen) return null

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const progressPercent = status === 'complete'
    ? 100
    : status === 'processing'
      ? Math.min(95, ((currentStage + 1) / PIPELINE_STAGES.length) * 95)
      : 0

  return (
    <AnimatePresence>
      <motion.div
        className="fpu-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}
      >
        <motion.div
          className="fpu-modal"
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: 'spring', damping: 28, stiffness: 350 }}
        >
          {/* ── Header ────────────────────────────────────────── */}
          <div className="fpu-header">
            <div>
              <div className="fpu-title">Upload Floor Plan</div>
              <div className="fpu-subtitle">AI-powered 2D to 3D reconstruction</div>
            </div>
            <button
              className="fpu-close"
              onClick={onClose}
              title="Close"
              id="fpu-close-btn"
            >✕</button>
          </div>

          {/* ── Drop Zone ─────────────────────────────────────── */}
          {!file && status === 'idle' && (
            <div
              ref={dropRef}
              className={`fpu-dropzone ${dragging ? 'dragging' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <span className="fpu-drop-icon">{dragging ? '📥' : '🏠'}</span>
              <div className="fpu-drop-text">
                Drop your floor plan here, or{' '}
                <span className="fpu-drop-browse">browse</span>
              </div>
              <div className="fpu-drop-hint">
                Supports JPEG, PNG, WebP, BMP • Max {MAX_SIZE_MB}MB
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_TYPES.join(',')}
                onChange={handleInputChange}
                style={{ display: 'none' }}
                id="fpu-file-input"
              />
            </div>
          )}

          {/* ── Image Preview ─────────────────────────────────── */}
          {file && preview && (
            <div className="fpu-preview">
              <img src={preview} alt="Floor plan preview" className="fpu-preview-img" />
              <div className="fpu-preview-info">
                <span className="fpu-preview-name">{file.name}</span>
                <span className="fpu-preview-size">{formatSize(file.size)}</span>
                {status === 'idle' && (
                  <button
                    className="fpu-preview-remove"
                    onClick={handleRemoveFile}
                    id="fpu-remove-file"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Detection Controls ────────────────────────────── */}
          {file && status === 'idle' && (
            <div className="fpu-controls">
              <div className="fpu-controls-title">⚙️ Detection Controls</div>

              {/* Confidence Threshold Slider */}
              <div className="fpu-control-row">
                <div className="fpu-control-label">
                  <span>Detection Sensitivity</span>
                  <span className="fpu-control-value">{(1 - confidenceThreshold).toFixed(0) === '1' ? 'Very High' : confidenceThreshold <= 0.2 ? 'High' : confidenceThreshold <= 0.4 ? 'Medium' : confidenceThreshold <= 0.6 ? 'Low' : 'Very Low'}</span>
                </div>
                <div className="fpu-slider-row">
                  <span className="fpu-slider-hint">Sensitive</span>
                  <input
                    id="fpu-confidence-slider"
                    type="range"
                    min="0.05"
                    max="0.8"
                    step="0.05"
                    value={confidenceThreshold}
                    onChange={e => setConfidenceThreshold(parseFloat(e.target.value))}
                    className="fpu-slider"
                  />
                  <span className="fpu-slider-hint">Strict</span>
                </div>
                <div className="fpu-control-hint">
                  Lower = more features detected. Higher = fewer, more confident results.
                </div>
              </div>

              {/* AI Fix Toggle */}
              <div className="fpu-control-row">
                <div className="fpu-control-label">
                  <span>🤖 AI Structural Fix</span>
                  <label className="fpu-toggle" htmlFor="fpu-ai-fix-toggle">
                    <input
                      id="fpu-ai-fix-toggle"
                      type="checkbox"
                      checked={enableAiFix}
                      onChange={e => setEnableAiFix(e.target.checked)}
                    />
                    <span className="fpu-toggle-track">
                      <span className="fpu-toggle-thumb" />
                    </span>
                  </label>
                </div>
                <div className="fpu-control-hint">
                  Uses AI to fix missing windows, unconnected walls, and illogical room connections.
                  Requires a Gemini or Groq API key in backend config.
                </div>
              </div>
            </div>
          )}

          {/* ── Upload Button ─────────────────────────────────── */}
          {file && status === 'idle' && (
            <div className="fpu-actions">
              <button
                className="fpu-btn-upload"
                onClick={handleUpload}
                id="fpu-upload-btn"
              >
                🚀 Analyze Floor Plan
              </button>
              <button
                className="fpu-btn-cancel"
                onClick={handleRemoveFile}
              >
                Cancel
              </button>
            </div>
          )}

          {/* ── Processing Stages ─────────────────────────────── */}
          {(status === 'uploading' || status === 'processing') && (
            <div className="fpu-processing">
              <div className="fpu-processing-title">
                <span className="fpu-spinner" />
                Processing floor plan…
              </div>

              <div className="fpu-stages">
                {PIPELINE_STAGES.map((stage, i) => {
                  let stageState = 'pending'
                  if (i < currentStage) stageState = 'complete'
                  else if (i === currentStage) stageState = 'active'

                  return (
                    <motion.div
                      key={stage.id}
                      className={`fpu-stage ${stageState}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <div className="fpu-stage-icon">
                        {stageState === 'complete' ? '✓' : stageState === 'active' ? '◉' : '○'}
                      </div>
                      <span className="fpu-stage-label">
                        {stage.icon} {stage.label}
                      </span>
                    </motion.div>
                  )
                })}
              </div>

              {/* Progress Bar */}
              <div className="fpu-progress-bar">
                <motion.div
                  className="fpu-progress-fill"
                  initial={{ width: '0%' }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              </div>
            </div>
          )}

          {/* ── Error ─────────────────────────────────────────── */}
          {error && (
            <motion.div
              className="fpu-error"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <span className="fpu-error-icon">⚠️</span>
              <span>{error}</span>
            </motion.div>
          )}

          {/* ── Results ───────────────────────────────────────── */}
          {status === 'complete' && result && (
            <motion.div
              className="fpu-results"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="fpu-results-header">
                ✅ Analysis Complete
              </div>

              {/* Stats */}
              <div className="fpu-results-stats">
                <div className="fpu-stat">
                  <div className="fpu-stat-value">{result.walls_detected}</div>
                  <div className="fpu-stat-label">Walls</div>
                </div>
                <div className="fpu-stat">
                  <div className="fpu-stat-value">{result.rooms_detected}</div>
                  <div className="fpu-stat-label">Rooms</div>
                </div>
                <div className="fpu-stat">
                  <div className="fpu-stat-value">{result.openings_detected ?? 0}</div>
                  <div className="fpu-stat-label">Openings</div>
                </div>
              </div>

              {/* Debug Images */}
              {result.debug_images && Object.keys(result.debug_images).length > 0 && (
                <div className="fpu-debug">
                  <div className="fpu-debug-title">Debug Overlays</div>
                  <div className="fpu-debug-tabs">
                    {Object.keys(result.debug_images).map(name => (
                      <button
                        key={name}
                        className={`fpu-debug-tab ${debugTab === name ? 'active' : ''}`}
                        onClick={() => setDebugTab(name)}
                      >
                        {name.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>
                  {debugTab && result.debug_images[debugTab] && (
                    <img
                      src={`data:image/png;base64,${result.debug_images[debugTab]}`}
                      alt={`Debug: ${debugTab}`}
                      className="fpu-debug-img"
                    />
                  )}
                </div>
              )}

              {/* AI Fixes Applied */}
              {result.fixes_applied?.length > 0 && (
                <div className="fpu-ai-fixes">
                  <div className="fpu-ai-fixes-title">🤖 AI Fixes Applied ({result.fixes_applied.length})</div>
                  {result.fixes_applied.map((fix, i) => {
                    const isError = fix.toLowerCase().includes('error') || fix.toLowerCase().includes('skip');
                    return (
                      <div key={i} className={`fpu-ai-fix-item ${isError ? 'error' : ''}`}>
                        {isError ? '⚠️' : '✓'} {fix}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Warnings */}
              {result.warnings?.length > 0 && (
                <div className="fpu-warnings">
                  <div className="fpu-warnings-title">Warnings</div>
                  {result.warnings.map((w, i) => (
                    <div key={i} className="fpu-warning-item">{w}</div>
                  ))}
                </div>
              )}

              {/* Apply Button */}
              <button
                className="fpu-btn-apply"
                onClick={handleApply}
                id="fpu-apply-btn"
              >
                🏗️ Apply to Scene — {result.walls_detected} walls, {result.rooms_detected} rooms
              </button>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
