# AI-Powered 2D-to-3D Interactive Real Estate Generation Platform

# Vision

A next-generation AI-assisted architectural platform capable of transforming 2D floor plans into fully interactive, editable, semantically-aware 3D environments with real-time walkthroughs, procedural validation, and intelligent interior generation.

The system is not merely a renderer.

It is designed as an AI-assisted spatial operating system combining:

- Computer Vision
- Geometric Reconstruction
- Procedural Constraints
- Spatial AI Reasoning
- Real-Time 3D Rendering
- Semantic Scene Intelligence

---

# Core Architectural Philosophy

## AI Should Suggest — Not Control Geometry

LLMs are probabilistic.

Architectural geometry must remain deterministic.

The system architecture therefore separates:

```text
AI Reasoning
    ↓
Constraint + Geometry Engine
    ↓
Validated Scene Graph
    ↓
3D Renderer
```

This ensures:
- stability
- reproducibility
- scalability
- professional-grade editing
- deterministic layouts

---

# High-Level System Architecture

```text
                  ┌────────────────────┐
                  │  User Input Layer  │
                  │--------------------│
                  │ Floorplan Upload   │
                  │ Text Instructions  │
                  │ Manual Editing     │
                  └─────────┬──────────┘
                            │
                            ▼
              ┌──────────────────────────┐
              │  Vision Processing Layer │
              │--------------------------│
              │ Wall Detection           │
              │ OCR Extraction           │
              │ Symbol Detection         │
              │ Vectorization            │
              └─────────┬────────────────┘
                        │
                        ▼
             ┌───────────────────────────┐
             │ Canonical Scene Graph     │
             │---------------------------│
             │ Rooms                     │
             │ Walls                     │
             │ Furniture                 │
             │ Materials                 │
             │ Constraints               │
             │ Navigation Mesh           │
             └─────────┬─────────────────┘
                       │
       ┌───────────────┼────────────────┐
       ▼               ▼                ▼
┌─────────────┐ ┌──────────────┐ ┌──────────────┐
│ AI Agents   │ │ Geometry     │ │ Constraint   │
│             │ │ Kernel       │ │ Engine       │
└──────┬──────┘ └──────┬───────┘ └──────┬───────┘
       │               │                │
       └───────────────┼────────────────┘
                       ▼
             ┌────────────────────┐
             │ Mutation Validator │
             └─────────┬──────────┘
                       ▼
             ┌────────────────────┐
             │ Rendering Engine   │
             │ Three.js / R3F     │
             └────────────────────┘
```

---

# Technology Stack

# Frontend

| Component | Technology |
|---|---|
| UI Framework | React |
| 3D Engine | Three.js |
| Renderer Abstraction | React Three Fiber |
| Helper Utilities | Drei |
| State Management | Zustand |
| Styling | TailwindCSS |
| Animation | Framer Motion |

---

# Backend

| Component | Technology |
|---|---|
| API Framework | FastAPI |
| Async Tasks | Celery / RQ |
| Queue System | Redis |
| Database | PostgreSQL |
| Asset Storage | S3-Compatible Storage |
| Real-Time Sync | WebSockets |

---

# AI Stack

| Component | Technology |
|---|---|
| Conversational Spatial AI | Groq |
| Vision Parsing | Gemini Flash / GPT-4o-mini |
| Object Detection | YOLOv8 |
| OCR | Tesseract |
| Segmentation | OpenCV / Detectron2 |

---

# Geometry Stack

| Component | Technology |
|---|---|
| Polygon Operations | Clipper2 |
| Boolean Geometry | polygon-clipping |
| Triangulation | earcut |
| Navigation Mesh | Recast Navigation |

---

# Core Data Architecture

# Canonical Scene Graph

The scene graph is the single source of truth.

Everything mutates this graph.

```json
{
  "project": {
    "id": "proj_001",
    "name": "Modern Apartment"
  },

  "rooms": [],

  "walls": [],

  "openings": [],

  "furniture": [],

  "materials": [],

  "lights": [],

  "constraints": [],

  "navigation_mesh": [],

  "metadata": {}
}
```

---

# Room Schema

```json
{
  "id": "room_living",
  "type": "living_room",
  "polygon": [
    [0,0],
    [0,5],
    [6,5],
    [6,0]
  ],
  "usable_area": 28.4,
  "adjacent_rooms": ["kitchen_01"],
  "entry_points": ["door_01"],
  "lighting_score": 0.82
}
```

---

# Wall Schema

```json
{
  "id": "wall_01",
  "start": [0,0],
  "end": [0,5],
  "height": 3.0,
  "thickness": 0.2,
  "material": "wall_paint_white"
}
```

---

# Furniture Schema

```json
{
  "id": "furn_sofa_01",
  "asset_id": "sofa_modern_01",
  "position": [2.1,0,1.4],
  "rotation": [0,90,0],
  "scale": [1,1,1],
  "bounding_box": [2.2,0.9,0.85]
}
```

---

# Event Sourcing System

Instead of saving scene snapshots, the system stores mutations.

This enables:
- undo/redo
- replayability
- branching
- collaboration
- AI explainability

---

# Event Schema

```json
{
  "event_id": "evt_101",
  "timestamp": 171000000,
  "type": "MOVE_OBJECT",
  "target": "chair_12",
  "payload": {
    "from": [1,0,1],
    "to": [2,0,4]
  }
}
```

---

# Mutation Pipeline

No AI action directly edits the scene.

All changes pass through a validation system.

```text
User Prompt
    ↓
AI Proposal
    ↓
Constraint Validation
    ↓
Geometry Repair
    ↓
Simulation
    ↓
Commit Mutation
    ↓
Render Scene
```

---

# Vision Processing Pipeline

# Stage 1 — Image Preprocessing

### Tasks
- grayscale conversion
- denoising
- edge enhancement
- thresholding

### Tools
- OpenCV

---

# Stage 2 — Structural Detection

### Detect:
- walls
- doors
- windows
- stairs
- room labels
- dimensions

### Tools
- YOLOv8
- Detectron2

---

# Stage 3 — OCR Extraction

### Extract:
- room names
- scale indicators
- dimensions
- annotations

### Tools
- Tesseract OCR

---

# Stage 4 — Vector Reconstruction

Convert raster image data into vector geometry.

```json
{
  "segments": [],
  "intersections": [],
  "loops": []
}
```

---

# Stage 5 — Topology Reconstruction

Generate:
- rooms
- adjacency maps
- openings
- wall continuity

---

# Stage 6 — Constraint Repair

Automatically:
- connect disjoint walls
- close loops
- straighten near-orthogonal walls
- repair topology

---

# Geometry Kernel

# Responsibilities

The geometry engine handles:

- polygon generation
- room reconstruction
- wall extrusion
- triangulation
- boolean operations
- hole cutting
- collision resolution

---

# Rendering Pipeline

# Rendering Engine

### Technologies
- React Three Fiber
- Three.js
- Drei

---

# Features

## Top View Editing Mode

- orthographic camera
- XZ-plane editing
- snapping system
- drag-and-drop manipulation

---

## Walkthrough Mode

- first-person controls
- WASD movement
- collision detection
- smooth transitions
- room-aware navigation

---

# Navigation Mesh System

Automatically generate navigation meshes for:

- walkthrough movement
- AI pathfinding
- furniture validation
- accessibility checks

### Technology
- Recast Navigation

---

# Real-Time Constraint Engine

# Constraint Categories

## Spatial Constraints

- no object overlap
- wall collision prevention
- room bounds enforcement

---

## Architectural Constraints

- minimum door widths
- hallway clearance
- staircase regulations
- accessibility spacing

---

## Semantic Constraints

- sofa faces focal point
- dining table clearance
- kitchen adjacency logic
- bedroom privacy optimization

---

# AI Agent Architecture

The system uses specialized micro-agents.

---

# Vision Agent

Responsible for:
- image parsing
- structure extraction
- vectorization

---

# Repair Agent

Responsible for:
- wall snapping
- topology correction
- loop closure

---

# Furnishing Agent

Responsible for:
- furniture placement
- spatial reasoning
- collision-aware layouts

---

# Material Agent

Responsible for:
- material assignments
- style interpretation
- texture mapping

---

# Lighting Agent

Responsible for:
- light placement
- ambience optimization
- daylight simulation

---

# Optimization Agent

Responsible for:
- scene performance
- polygon reduction
- LOD generation

---

# Export Agent

Responsible for:
- glTF export
- IFC export
- CAD interoperability

---

# AI Prompt Engineering

# Geometry Repair Protocol

## System Prompt

```text
You are an architectural CAD verification engine.

Your task is to repair imperfect floor plan geometry.

Rules:
- connect walls within 0.25m tolerance
- snap near-orthogonal walls to exact 90°
- ensure all rooms form closed loops
- preserve structural continuity
- return only valid JSON
```

---

# Furnishing Protocol

## System Prompt

```text
You are an interior staging AI.

You receive:
- room boundaries
- furniture inventory
- collision constraints

You must:
- place objects without overlap
- maintain walking clearance
- orient furniture logically
- avoid wall clipping

Output only structured mutation JSON.
```

---

# Material Protocol

## System Prompt

```text
You are a material assignment engine.

Translate aesthetic requests into material IDs.

Available materials:
- wood_oak_dark
- concrete_polished
- tile_white
- paint_beige

Return only JSON.
```

---

# Asset Management System

# Asset Metadata

```json
{
  "asset_id": "chair_01",
  "category": "seating",
  "dimensions": [0.6,0.6,1.0],
  "bounding_box": [0.7,0.7,1.1],
  "snap_points": [],
  "lod_levels": [],
  "materials": []
}
```

---

# Asset Optimization

## Features

- LOD generation
- mesh instancing
- texture atlasing
- lazy loading
- streaming assets

---

# Real-Time Collaboration

# Multiplayer Editing

### Features

- collaborative editing
- mutation synchronization
- cursor visibility
- room-level locking
- conflict resolution

---

# WebSocket Event Example

```json
{
  "type": "SCENE_MUTATION",
  "user": "user_01",
  "mutation": {}
}
```

---

# Performance Optimization

# Rendering Optimization

## Techniques

- frustum culling
- instanced meshes
- texture compression
- shadow baking
- chunk loading

---

# Backend Optimization

## Techniques

- async AI requests
- Redis queues
- cached geometry
- incremental updates

---

# User Interface Design

# Design Philosophy

Minimalist architectural workspace focused on the 3D viewport.

---

# UI Components

## Floating Top Dock

Contains:
- top view toggle
- walkthrough mode
- material mode
- lighting mode

---

## AI Command Bar

Persistent bottom-center prompt interface.

Example:
```text
"Add a modern sofa near the window"
```

---

## Spatial Diagnostics Overlay

Displays:
- collision warnings
- blocked pathways
- invalid placements
- accessibility issues

---

# Advanced Features

# Semantic Room Intelligence

Rooms understand:
- their purpose
- adjacency
- accessibility
- lighting conditions
- circulation

---

# Procedural Layout Intelligence

Automatically infer:
- focal points
- furniture zones
- traffic paths
- viewing angles

---

# Parametric Editing

Example:
```text
"Increase kitchen size by 15% while preserving hallway width"
```

The geometry engine recalculates:
- wall positions
- room boundaries
- adjacency rules
- navigation mesh

---

# Future Expansion

# Planned Features

## BIM Integration
- IFC support
- Revit interoperability

---

## Photoreal Rendering
- ray tracing
- baked global illumination
- HDRI environments

---

## AI Design Recommendations
- automatic staging
- style generation
- energy optimization

---

## Smart Cost Estimation
- furniture pricing
- renovation estimation
- material budgeting

---

# Development Phases

# Phase 1 — Foundation

- FastAPI backend
- scene graph
- Three.js renderer
- asset pipeline

---

# Phase 2 — Vision Reconstruction

- floorplan parsing
- OCR extraction
- vectorization
- room detection

---

# Phase 3 — Geometry Engine

- polygon operations
- wall extrusion
- topology repair
- constraint system

---

# Phase 4 — AI Integration

- furnishing agent
- repair agent
- material agent

---

# Phase 5 — Walkthrough System

- navigation mesh
- first-person movement
- collision handling

---

# Phase 6 — Real-Time Collaboration

- WebSockets
- multiplayer editing
- mutation syncing

---

# Phase 7 — Advanced Intelligence

- semantic room AI
- procedural design
- parametric architecture

---

# Final Architectural Principle

The platform should behave like:

```text
AI-Assisted CAD
```

—not—

```text
AI Scene Generator
```

The core differentiator is:

- deterministic geometry
- procedural validation
- semantic spatial intelligence
- constraint-driven editing
- real architectural reasoning

This transforms the project from a visual AI demo into a scalable next-generation architectural platform.