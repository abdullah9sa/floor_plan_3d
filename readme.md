# 🏢 Plany — AI 2D-to-3D Floor Plan Platform

> Transform architectural 2D floor plans into interactive, semantically-aware 3D spaces in real time.

Plany combines computer vision, geometric reconstruction, and spatial AI to automatically convert static floor plan drawings into deterministic, editable 3D scenes. Featuring a FastAPI + PyTorch backend and a React Three Fiber frontend, users can explore plans via first-person walkthroughs, inspect room metadata, and manipulate spatial layouts with AI-assisted commands.

### ✨ Key Highlights
- **Automated Floor Plan Vectorization**: Deep-learning segmentation (walls, doors, windows, and room labels) with deterministic geometric cleanup.
- **Interactive 3D Walkthroughs**: Real-time rendering, collision-aware first-person exploration, and top-down architectural views powered by Three.js.
- **Canonical Scene Graph**: Robust separation of AI reasoning and deterministic geometry to keep architectural dimensions stable and validated.
- **AI Spatial Commands**: Natural language interior manipulation and procedural layout modifications.
