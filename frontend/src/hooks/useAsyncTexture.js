import { useState, useEffect } from 'react'
import * as THREE from 'three'

/**
 * Custom hook to load texture maps asynchronously without using React Suspense.
 * @param {string} url - URL of the image texture.
 * @returns {THREE.Texture | null} Loaded texture instance or null.
 */
export function useAsyncTexture(url) {
  const [tex, setTex] = useState(null)
  
  useEffect(() => {
    if (!url) {
      setTex(null)
      return
    }
    console.log(`[TextureLoader] Loading: ${url}`)
    let isMounted = true
    const loader = new THREE.TextureLoader()
    loader.load(
      url, 
      t => {
        if (!isMounted) {
          t.dispose()
          return
        }
        console.log(`[TextureLoader] Loaded OK: ${url}`)
        t.wrapS = t.wrapT = THREE.RepeatWrapping
        t.colorSpace = THREE.SRGBColorSpace
        t.needsUpdate = true
        setTex(t)
      },
      undefined,
      err => {
        if (isMounted) console.error(`[TextureLoader] Error loading ${url}:`, err)
      }
    )
    
    return () => {
      isMounted = false
      setTex(null)
    }
  }, [url])
  
  return tex
}
