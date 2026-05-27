/**
 * Geometry Kernel — Math utilities for 2D/3D operations
 * Includes: Point-to-segment distance, SAT rotated-rect collision, grid snapping
 */

/**
 * Snaps a value to the nearest step.
 */
export function snapToGrid(val, step = 0.05) {
  return Math.round(val / step) * step
}

/**
 * Snaps an angle (in radians) to the nearest 90-degree increment (PI/2)
 * if it falls within the tolerance angle.
 */
export function snapToAngle(angle, toleranceRad = 0.15) {
  const increment = Math.PI / 2
  const nearest = Math.round(angle / increment) * increment
  const diff = Math.abs(angle - nearest)
  return diff <= toleranceRad ? nearest : angle
}

/**
 * Calculates the nearest point on a line segment to a target point.
 * Returns { distance, point: [x, z], t }
 */
export function getNearestPointOnSegment(px, pz, x1, z1, x2, z2) {
  const dx = x2 - x1
  const dz = z2 - z1
  const lenSq = dx * dx + dz * dz

  if (lenSq === 0) {
    return {
      distance: Math.sqrt((px - x1) ** 2 + (pz - z1) ** 2),
      point: [x1, z1],
      t: 0,
    }
  }

  // Projection parameter
  let t = ((px - x1) * dx + (pz - z1) * dz) / lenSq
  t = Math.max(0, Math.min(1, t))

  const nx = x1 + t * dx
  const nz = z1 + t * dz
  const distance = Math.sqrt((px - nx) ** 2 + (pz - nz) ** 2)

  return { distance, point: [nx, nz], t }
}

/**
 * Gets the 4 corner vertices of a rotated 2D rectangle in the XZ plane.
 * Center: [x, z], Size: [w, d] (width along local X, depth along local Z), Rotation: Ry (radians)
 */
export function getRotatedRectCorners(cx, cz, w, d, rotationY) {
  const halfW = w / 2
  const halfD = d / 2

  const cos = Math.cos(rotationY)
  const sin = Math.sin(rotationY)

  // Local corners relative to center
  const localCorners = [
    [-halfW, -halfD], // Min X, Min Z
    [halfW, -halfD],  // Max X, Min Z
    [halfW, halfD],   // Max X, Max Z
    [-halfW, halfD],  // Min X, Max Z
  ]

  // Rotate and translate to world space (XZ)
  return localCorners.map(([lx, lz]) => {
    return [
      cx + (lx * cos - lz * sin),
      cz + (lx * sin + lz * cos),
    ]
  })
}

/**
 * Separating Axis Theorem (SAT) for 2D Oriented Bounding Box (OBB) collision.
 * Returns true if the two rotated rectangles overlap.
 */
export function checkOBBOverlap(rectA, rectB) {
  // rectA and rectB are arrays of 4 points: [[x0, z0], [x1, z1], [x2, z2], [x3, z3]]
  const getAxes = (corners) => {
    const axes = []
    for (let i = 0; i < 4; i++) {
      const p1 = corners[i]
      const p2 = corners[(i + 1) % 4]
      // Normal vector of the edge (perpendicular axis)
      const edgeX = p2[0] - p1[0]
      const edgeZ = p2[1] - p1[1]
      const len = Math.sqrt(edgeX * edgeX + edgeZ * edgeZ)
      if (len > 0.0001) {
        axes.push([-edgeZ / len, edgeX / len]) // Normalized normal
      }
    }
    return axes
  }

  const project = (corners, axis) => {
    let min = Infinity
    let max = -Infinity
    for (const p of corners) {
      const dot = p[0] * axis[0] + p[1] * axis[1]
      if (dot < min) min = dot
      if (dot > max) max = dot
    }
    return { min, max }
  }

  const axes = [...getAxes(rectA), ...getAxes(rectB)]

  for (const axis of axes) {
    const projA = project(rectA, axis)
    const projB = project(rectB, axis)

    // Check overlap
    if (projA.max < projB.min || projB.max < projA.min) {
      // Found a separating axis, no collision
      return false
    }
  }

  return true
}

/**
 * Gets a simplified OBB for the player (as an axis-aligned square in local space)
 * which can be used with checkOBBOverlap.
 */
export function getPlayerOBB(x, z, radius) {
  // A bounding box of size (2*radius) by (2*radius)
  return getRotatedRectCorners(x, z, radius * 2, radius * 2, 0)
}
