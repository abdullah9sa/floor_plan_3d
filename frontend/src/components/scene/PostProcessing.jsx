/**
 * PostProcessing.jsx
 * 
 * Cinematic post-processing pipeline for the 3D scene.
 * All effects are individually togglable from the Settings panel.
 * 
 * Effects: Anti-Aliasing (SMAA/FXAA), Bloom, SSAO (N8AO), Depth of Field, Vignette
 * Tonemapping is handled at the renderer level in SceneCanvas.
 */
import {
  EffectComposer,
  Bloom,
  DepthOfField,
  Vignette,
  N8AO,
  SMAA,
  FXAA,
} from '@react-three/postprocessing'
import { BlendFunction, SMAAPreset } from 'postprocessing'
import { useSceneStore } from '../../store/sceneStore'

export default function PostProcessing() {
  const lightSettings = useSceneStore(s => s.lightSettings) || {}

  const {
    aaMode = 'smaa',
    msaaSamples = 4,
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
    postProcessingEnabled = true,
  } = lightSettings

  // If globally disabled, skip immediately
  if (!postProcessingEnabled) return null

  // Determine if any visual effect is active (AA alone also needs the composer)
  const hasAA = aaMode === 'smaa' || aaMode === 'fxaa'
  const anyEnabled = bloomEnabled || ssaoEnabled || dofEnabled || vignetteEnabled || hasAA

  // Skip entire composer if nothing is enabled (saves GPU cycles)
  if (!anyEnabled) return null

  return (
    <EffectComposer
      multisampling={msaaSamples}
      disableNormalPass={!ssaoEnabled}
    >
      {/* SMAA — High quality post-process anti-aliasing */}
      {aaMode === 'smaa' && (
        <SMAA preset={SMAAPreset.HIGH} />
      )}

      {/* FXAA — Fast approximate anti-aliasing */}
      {aaMode === 'fxaa' && (
        <FXAA />
      )}

      {/* N8AO — High quality SSAO */}
      {ssaoEnabled && (
        <N8AO
          aoRadius={ssaoRadius}
          intensity={ssaoIntensity}
          distanceFalloff={1}
          halfRes
        />
      )}

      {/* Bloom — Bright area glow */}
      {bloomEnabled && (
        <Bloom
          intensity={bloomIntensity}
          luminanceThreshold={bloomThreshold}
          luminanceSmoothing={bloomSmoothing}
          mipmapBlur
        />
      )}

      {/* Depth of Field — Bokeh blur */}
      {dofEnabled && (
        <DepthOfField
          focusDistance={dofFocusDistance}
          focalLength={dofFocalLength}
          bokehScale={dofBokehScale}
        />
      )}

      {/* Vignette — Subtle edge darkening */}
      {vignetteEnabled && (
        <Vignette
          offset={vignetteOffset}
          darkness={vignetteDarkness}
          blendFunction={BlendFunction.NORMAL}
        />
      )}
    </EffectComposer>
  )
}
