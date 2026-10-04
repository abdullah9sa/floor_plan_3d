# 🏢 Plany — AI 2D-to-3D Floor Plan Platform

> Transform architectural 2D floor plans into interactive, semantically-aware 3D spaces in real time.

[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React Three Fiber](https://img.shields.io/badge/React_Three_Fiber-000000?style=for-the-badge&logo=threedotjs&logoColor=white)](https://docs.pmnd.rs/react-three-fiber)
[![PyTorch](https://img.shields.io/badge/PyTorch-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white)](https://pytorch.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

Plany combines computer vision, geometric reconstruction, and spatial AI to automatically convert static floor plan drawings into deterministic, editable 3D scenes. Featuring a **FastAPI + PyTorch (CubiCasa5k)** backend and a **React Three Fiber (Three.js)** frontend, users can explore plans via first-person walkthroughs, inspect room metadata, modify textures, and manipulate spatial layouts with AI-assisted commands.

---

## ✨ Key Features

- **Automated Floor Plan Vectorization**: Deep-learning segmentation (walls, doors, windows, and room labels) powered by a CubiCasa5k neural network with deterministic geometric cleanup.
- **Interactive 3D Walkthroughs**: Real-time rendering, collision-aware first-person exploration (WASD + mouse look), orbit controls, and top-down architectural blueprint modes.
- **Canonical Scene Graph**: Robust separation of AI reasoning and deterministic geometry to keep architectural dimensions stable, clean, and validated.
- **PBR Materials & Lighting Studio**: Realistic floor finishes (hardwood, laminate, granite, marble) with customizable sun angle, intensity, and interior ambient lighting.
- **AI Spatial Commands**: Natural language interior manipulation powered by LLMs (Groq / Gemini) to dynamically update materials, layouts, and furniture.
- **Interactive Inspector**: Inspect room dimensions, wall heights, and component properties with visual diagnostic debug overlays.

---

## 🏗️ System Architecture

```text
2D Floor Plan Image (PNG/JPG)
             │
             ▼
   [ FastAPI Backend ]
             │
             ├──► CubiCasa5k PyTorch Model (Wall/Door/Room Segmentation)
             ├──► Geometric Vectorizer & Polygon Extractor
             └──► Canonical Scene Graph Generator
             │
             ▼
   [ React Three Fiber Frontend ]
             │
             ├──► Top-Down & Orbit Architectural Camera
             ├──► First-Person Collision Walkthrough
             ├──► Dynamic Lighting & Post-Processing
             └──► AI Command Bar (Groq / Gemini)
```

---

## 📋 Prerequisites

Ensure you have installed:
- **Node.js** (v18 or higher) and **npm**
- **Python** (v3.10 or higher)
- **Git**
- *(Recommended)* CUDA-compatible GPU for accelerated PyTorch neural segmentation (falls back to CPU automatically if unavailable).

---

## 🚀 Quick Start (Automated)

The project includes one-click runner scripts to launch both the backend and frontend development servers concurrently:

### Windows (PowerShell)
```powershell
./run.ps1
```

### Linux / macOS (Bash)
```bash
chmod +x run.sh
./run.sh
```

The frontend will be available at **`http://localhost:5173`** and the backend API at **`http://localhost:8000`**.

---

## 🛠️ Manual Installation & Setup

### 1. Backend Setup

1. **Navigate to the backend directory and set up a virtual environment:**
   ```bash
   cd backend
   python -m venv venv

   # Activate virtual environment
   # Windows (PowerShell):
   venv\Scripts\Activate.ps1
   # Linux / macOS:
   source venv/bin/activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure Environment Variables:**
   Create or edit `backend/.env`:
   ```env
   APP_NAME=Plany
   DEBUG=True
   CORS_ORIGINS=["http://localhost:5173", "http://localhost:3000"]
   DATABASE_URL=sqlite:///./plany.db
   REDIS_URL=redis://localhost:6379/0

   # Optional: AI Command Bar (Groq or Gemini)
   GROQ_API_KEY=your_groq_api_key_here
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Download Model Weights (CubiCasa5k):**
   The neural network requires the pre-trained weights file (`model_best_val_loss_var.pkl`, ~200MB). Run the downloader script:
   ```bash
   python download_weights.py
   ```
   Ensure the downloaded `model_best_val_loss_var.pkl` is located in `backend/app/services/`:
   ```bash
   # Move the file if downloaded in backend root
   mv model_best_val_loss_var.pkl app/services/
   ```

5. **Start the FastAPI backend:**
   ```bash
   python -m uvicorn main:app --reload --port 8000
   ```
   - Interactive Swagger API docs: **`http://localhost:8000/docs`**

---

### 2. Frontend Setup

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the Vite dev server:**
   ```bash
   npm run dev
   ```
   - Open your browser at **`http://localhost:5173`**

---

## 🎮 How to Fully Use Plany

### 1. Uploading a Floor Plan
1. Open the web interface at `http://localhost:5173`.
2. Click **Upload Floor Plan** or drag and drop a clear 2D floor plan image (PNG, JPG).
3. The backend neural pipeline will:
   - Run multi-class segmentation on walls, doors, windows, and rooms.
   - Vectorize coordinates into canonical walls and floor polygons.
   - Automatically generate the 3D scene.

### 2. Navigating the 3D Scene
Use the camera toolbar in the top dock to switch between exploration modes:
- **Top-Down Mode (2D / Orthographic)**: Ideal for reviewing spatial layouts, room dimensions, and structural alignment.
- **Orbit Mode (Perspective 3D)**: Click and drag to rotate around the entire model, scroll to zoom in/out, and right-click drag to pan.
- **First-Person Walkthrough**:
  - Click to lock the pointer.
  - **`W` / `A` / `S` / `D`**: Walk forward, left, backward, right.
  - **Mouse**: Look around inside rooms.
  - **`Space` / `Shift`**: Ascend / descend or toggle sprint speed.
  - **`Esc`**: Exit walkthrough mode.

### 3. Customizing Materials & Lighting
- **Lighting Panel**: Adjust sun azimuth, elevation angle, ambient light intensity, shadow quality, and toggle interior warm/cool lighting presets.
- **Properties & Materials Inspector**: Click on any room floor or wall to change materials (e.g. laminate wood, marble, herringbone parquet, granite tiles).

### 4. Using the AI Command Bar
In the bottom command bar, you can issue natural language design prompts (requires `GROQ_API_KEY` or `GEMINI_API_KEY` in `backend/.env`):
- *"Change the living room floor to herringbone parquet"*
- *"Set kitchen floor to granite tile"*
- *"Make the bedroom walls warm white"*

### 5. Diagnostics & Debugging
- Toggle the **Diagnostics Overlay** in the top dock to view the raw segmentation mask, detected OCR labels, and neural feature extraction overlays generated during the upload phase.

---

## 📁 Repository Structure

```text
plany/
├── backend/
│   ├── app/
│   │   ├── core/               # Configuration and environment settings
│   │   ├── routers/            # FastAPI endpoints (vision, scene, ai, textures)
│   │   ├── services/           # Neural pipeline, floortrans model, AI agent
│   │   │   └── model_best_val_loss_var.pkl # PyTorch model weights (~200MB)
│   │   └── schemas/            # Pydantic models for scene graph & requests
│   ├── download_weights.py     # Helper script to download model weights
│   ├── main.py                 # FastAPI application entry point
│   └── requirements.txt        # Python backend dependencies
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── scene/          # Three.js / React Three Fiber canvas & meshes
│   │   │   └── ui/             # Dock, panels, upload modal, AI command bar
│   │   ├── store/              # Zustand state store for scene graph & UI
│   │   └── App.jsx             # Main application layout
│   └── package.json            # Node.js dependencies & scripts
├── textures/                   # High-res PBR texture assets (ignored in Git)
├── run.ps1                     # PowerShell one-click runner
├── run.sh                      # Bash one-click runner
└── README.md
```

---

## 📄 License

This project is licensed under the MIT License — see the LICENSE file for details.
