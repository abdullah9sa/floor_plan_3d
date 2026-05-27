/**
 * Canonical Scene Graph — Single Source of Truth
 *
 * Matches the schema defined in plan.md.
 * All mutations pass through the store's mutation pipeline.
 */
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { v4 as uuid } from 'uuid'
import { runSceneDiagnostics } from '../utils/constraintEngine'

// ─── Initial Scene Graph ─────────────────────────────────────────────────────
const INITIAL_SCENE = {
  project: {
    id: 'proj_001',
    name: 'Untitled Project',
    createdAt: Date.now(),
  },
  rooms: [],
  walls: [],
  openings: [],    // doors + windows
  furniture: [],
  materials: [],
  lights: [],
  constraints: [],
  navigation_mesh: null,
  metadata: {
    scale: 1,         // 1 unit = 1 meter
    version: '1.0.0',
  },
}

// ─── Event Log (Event Sourcing) ───────────────────────────────────────────────
const INITIAL_EVENT_LOG = []

// ─── Store ────────────────────────────────────────────────────────────────────
export const useSceneStore = create(
  subscribeWithSelector((set, get) => ({
    // ── State ─────────────────────────────────────────────────────────────────
    scene: INITIAL_SCENE,
    eventLog: INITIAL_EVENT_LOG,
    undoStack: [],
    redoStack: [],

    // UI state
    viewMode: 'top',          // 'top' | 'walkthrough' | 'material' | 'lighting'
    darkMode: true,           // light/dark mode toggle
    selectedId: null,
    hoveredId: null,
    aiLoading: false,
    diagnostics: [],
    sceneCenter: [7, 0, 5],   // auto-computed camera target [x, y, z]
    sceneRadius: 10,          // approximate scene radius for camera zoom
    lightSettings: {
      ambientIntensity: 0.4,
      dirIntensity: 1.2,
      shadowOpacity: 0.65,
    },

    // Vision state (Phase 2)
    visionResult: null,
    isVisionProcessing: false,
    visionJobId: null,
    showUploadModal: false,

    // ── Selectors ─────────────────────────────────────────────────────────────
    getRoom: (id) => get().scene.rooms.find(r => r.id === id),
    getWall: (id) => get().scene.walls.find(w => w.id === id),
    getFurniture: (id) => get().scene.furniture.find(f => f.id === id),

    // ── Mutation Pipeline ─────────────────────────────────────────────────────
    /**
     * The ONLY entry-point for scene mutations.
     * Validates → Applies → Commits → Logs
     */
    applyMutation: (type, payload) => {
      const state = get()
      const event = {
        event_id: `evt_${uuid().slice(0, 8)}`,
        timestamp: Date.now(),
        type,
        payload,
      }

      // Save snapshot for undo
      const snapshot = JSON.parse(JSON.stringify(state.scene))

      // Apply mutation
      const nextScene = applyMutationToScene(state.scene, type, payload)

      // Run real-time constraint validations
      const diagnostics = runSceneDiagnostics(nextScene)

      set({
        scene: nextScene,
        eventLog: [...state.eventLog, event],
        undoStack: [...state.undoStack, snapshot],
        redoStack: [], // clear redo on new mutation
        diagnostics,
      })

      return event
    },

    // ── Undo / Redo ───────────────────────────────────────────────────────────
    undo: () => {
      const { undoStack, scene, redoStack } = get()
      if (undoStack.length === 0) return
      const prev = undoStack[undoStack.length - 1]
      set({
        scene: prev,
        undoStack: undoStack.slice(0, -1),
        redoStack: [...redoStack, JSON.parse(JSON.stringify(scene))],
      })
    },

    redo: () => {
      const { redoStack, scene, undoStack } = get()
      if (redoStack.length === 0) return
      const next = redoStack[redoStack.length - 1]
      set({
        scene: next,
        redoStack: redoStack.slice(0, -1),
        undoStack: [...undoStack, JSON.parse(JSON.stringify(scene))],
      })
    },

    // ── UI Mutations ──────────────────────────────────────────────────────────
    setViewMode: (mode) => set({ viewMode: mode }),
    setSelected: (id) => set({ selectedId: id }),
    setHovered: (id) => set({ hoveredId: id }),
    setAiLoading: (v) => set({ aiLoading: v }),
    addDiagnostic: (d) => set(s => ({ diagnostics: [...s.diagnostics, d] })),
    clearDiagnostics: () => set({ diagnostics: [] }),

    // ── Theme Actions ─────────────────────────────────────────────────────
    toggleDarkMode: () => set(s => ({ darkMode: !s.darkMode })),

    // ── Lighting Actions ──────────────────────────────────────────────────
    setLightSettings: (settings) => set(s => ({ lightSettings: { ...s.lightSettings, ...settings } })),
    
    // ── Vision Actions (Phase 2) ──────────────────────────────────────────
    setVisionResult: (result) => set({ visionResult: result }),
    setVisionProcessing: (v) => set({ isVisionProcessing: v }),
    setVisionJobId: (id) => set({ visionJobId: id }),
    toggleUploadModal: (v) => set(s => ({ showUploadModal: v !== undefined ? v : !s.showUploadModal })),

    applyVisionResult: () => {
      const { visionResult, resetScene, applyMutation } = get()
      if (!visionResult?.mutations?.length) return

      // Reset scene first
      resetScene()

      // Apply each mutation from vision pipeline
      for (const mut of visionResult.mutations) {
        if (mut.type === 'CLEAR_SCENE') continue
        applyMutation(mut.type, mut.payload)
      }
    },

    // ── Scene Reset ───────────────────────────────────────────────────────────
    resetScene: () => set({
      scene: { ...INITIAL_SCENE, project: { ...INITIAL_SCENE.project, id: `proj_${uuid().slice(0,6)}`, createdAt: Date.now() } },
      eventLog: [],
      undoStack: [],
      redoStack: [],
      selectedId: null,
    }),

    // ── Auto-Center Camera ────────────────────────────────────────────────────
    computeSceneCenter: () => {
      const { scene } = get()
      const allPts = []
      for (const w of scene.walls) {
        if (w.start) allPts.push(w.start)
        if (w.end) allPts.push(w.end)
      }
      for (const r of scene.rooms) {
        if (r.polygon) {
          for (const pt of r.polygon) allPts.push(pt)
        }
      }
      if (allPts.length === 0) return

      let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
      for (const [x, z] of allPts) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (z < minZ) minZ = z
        if (z > maxZ) maxZ = z
      }

      const cx = (minX + maxX) / 2
      const cz = (minZ + maxZ) / 2
      const radius = Math.max(maxX - minX, maxZ - minZ) / 2
      set({ sceneCenter: [cx, 0, cz], sceneRadius: Math.max(radius, 2) })
    },

    // ── Save / Load Scene (localStorage) ──────────────────────────────────────
    saveScene: (name) => {
      const { scene } = get()
      const saved = JSON.parse(localStorage.getItem('plany_saved_scenes') || '{}')
      saved[name] = {
        scene: JSON.parse(JSON.stringify(scene)),
        savedAt: Date.now(),
      }
      localStorage.setItem('plany_saved_scenes', JSON.stringify(saved))
    },

    loadScene: (name) => {
      const saved = JSON.parse(localStorage.getItem('plany_saved_scenes') || '{}')
      if (!saved[name]) return false
      set({
        scene: saved[name].scene,
        eventLog: [],
        undoStack: [],
        redoStack: [],
        selectedId: null,
      })
      // Auto-center camera after loading
      setTimeout(() => get().computeSceneCenter(), 50)
      return true
    },

    deleteSavedScene: (name) => {
      const saved = JSON.parse(localStorage.getItem('plany_saved_scenes') || '{}')
      delete saved[name]
      localStorage.setItem('plany_saved_scenes', JSON.stringify(saved))
    },

    getSavedScenes: () => {
      const saved = JSON.parse(localStorage.getItem('plany_saved_scenes') || '{}')
      return Object.entries(saved).map(([name, data]) => ({
        name,
        savedAt: data.savedAt,
        wallCount: data.scene?.walls?.length || 0,
        roomCount: data.scene?.rooms?.length || 0,
      }))
    },
  }))
)

// ─── Pure Mutation Reducer ────────────────────────────────────────────────────
function applyMutationToScene(scene, type, payload) {
  const s = JSON.parse(JSON.stringify(scene)) // deep clone

  switch (type) {
    // Rooms
    case 'ADD_ROOM':
      s.rooms.push({ id: `room_${uuid().slice(0,6)}`, ...payload })
      break
    case 'UPDATE_ROOM':
      s.rooms = s.rooms.map(r => r.id === payload.id ? { ...r, ...payload } : r)
      break
    case 'REMOVE_ROOM':
      s.rooms = s.rooms.filter(r => r.id !== payload.id)
      break
    case 'SCALE_ROOM': {
      const roomIndex = s.rooms.findIndex(r => r.id === payload.id)
      if (roomIndex === -1) break
      
      const room = s.rooms[roomIndex]
      const sf = payload.scale_factor || 1.0
      
      // Calculate centroid
      let cx = 0, cz = 0
      for (const [x, z] of room.polygon) {
        cx += x; cz += z
      }
      cx /= room.polygon.length
      cz /= room.polygon.length
      
      const newPolygon = room.polygon.map(([x, z]) => [
        cx + (x - cx) * sf,
        cz + (z - cz) * sf
      ])
      
      // Update walls
      for (let i = 0; i < room.polygon.length; i++) {
        const p1 = room.polygon[i]
        const p2 = room.polygon[(i + 1) % room.polygon.length]
        const np1 = newPolygon[i]
        const np2 = newPolygon[(i + 1) % newPolygon.length]
        
        for (const w of s.walls) {
          const startMatches = (Math.abs(w.start[0] - p1[0]) < 0.1 && Math.abs(w.start[1] - p1[1]) < 0.1)
          const endMatches = (Math.abs(w.end[0] - p2[0]) < 0.1 && Math.abs(w.end[1] - p2[1]) < 0.1)
          
          const startMatchesRev = (Math.abs(w.start[0] - p2[0]) < 0.1 && Math.abs(w.start[1] - p2[1]) < 0.1)
          const endMatchesRev = (Math.abs(w.end[0] - p1[0]) < 0.1 && Math.abs(w.end[1] - p1[1]) < 0.1)
          
          if (startMatches && endMatches) {
            w.start = [...np1]
            w.end = [...np2]
          } else if (startMatchesRev && endMatchesRev) {
            w.start = [...np2]
            w.end = [...np1]
          }
        }
      }
      
      // Point in polygon helper
      const pointInPoly = (x, y, poly) => {
        let inside = false
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
          const xi = poly[i][0], yi = poly[i][1]
          const xj = poly[j][0], yj = poly[j][1]
          if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi + 0.0001) + xi)) inside = !inside
        }
        return inside
      }
      
      // Move furniture
      for (const f of s.furniture) {
        if (pointInPoly(f.position[0], f.position[2], room.polygon)) {
          f.position[0] = cx + (f.position[0] - cx) * sf
          f.position[2] = cz + (f.position[2] - cz) * sf
        }
      }
      
      room.polygon = newPolygon
      break
    }

    // Walls
    case 'ADD_WALL':
      s.walls.push({ id: `wall_${uuid().slice(0,6)}`, height: 3.0, thickness: 0.2, material: 'wall_paint_white', ...payload })
      break
    case 'UPDATE_WALL':
      s.walls = s.walls.map(w => w.id === payload.id ? { ...w, ...payload } : w)
      break
    case 'REMOVE_WALL':
      s.walls = s.walls.filter(w => w.id !== payload.id)
      break
    case 'UPDATE_ALL_WALLS':
      s.walls = s.walls.map(w => ({ ...w, ...payload }))
      break

    // Furniture
    case 'ADD_FURNITURE':
      s.furniture.push({ id: `furn_${uuid().slice(0,6)}`, rotation: [0,0,0], scale: [1,1,1], ...payload })
      break
    case 'MOVE_OBJECT':
      s.furniture = s.furniture.map(f =>
        f.id === payload.target ? { ...f, position: payload.to } : f
      )
      break
    case 'UPDATE_FURNITURE':
      s.furniture = s.furniture.map(f =>
        f.id === payload.id ? { ...f, ...payload } : f
      )
      break
    case 'REMOVE_FURNITURE':
      s.furniture = s.furniture.filter(f => f.id !== payload.id)
      break

    // Materials
    case 'SET_MATERIAL':
      s.materials.push({ id: `mat_${uuid().slice(0,6)}`, ...payload })
      break

    // Lights
    case 'ADD_LIGHT':
      s.lights.push({ id: `light_${uuid().slice(0,6)}`, ...payload })
      break

    // Openings (doors/windows)
    case 'ADD_OPENING':
      s.openings.push({ id: `open_${uuid().slice(0,6)}`, ...payload })
      break
    case 'UPDATE_OPENING':
      s.openings = s.openings.map(o => o.id === payload.id ? { ...o, ...payload } : o)
      break
    case 'REMOVE_OPENING':
      s.openings = s.openings.filter(o => o.id !== payload.id)
      break
    case 'UPDATE_ALL_OPENINGS':
      s.openings = s.openings.map(o => ({ ...o, ...payload }))
      break

    // Project metadata
    case 'UPDATE_PROJECT':
      s.project = { ...s.project, ...payload }
      break

    // Navigation mesh (set wholesale)
    case 'SET_NAV_MESH':
      s.navigation_mesh = payload
      break

    default:
      console.warn('[SceneStore] Unknown mutation type:', type)
  }

  return s
}
