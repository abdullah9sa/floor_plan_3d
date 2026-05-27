/**
 * Constraint Engine — Layout validation and snap-assistance
 * Validates furniture placement, wall snapping, and boundary checks.
 */
import {
  getNearestPointOnSegment,
  getRotatedRectCorners,
  checkOBBOverlap,
  getPlayerOBB
} from './geometryKernel'

/**
 * Validates a furniture item's placement against all other items in the scene.
 * Returns a list of diagnostic warning objects.
 */
export function validateFurniturePlacement(item, allFurniture) {
  const diagnostics = []
  const [w, h, d] = item.bounding_box || [1, 1, 1]
  const ry = item.rotation?.[1] || 0

  const cornersA = getRotatedRectCorners(item.position[0], item.position[2], w, d, ry)

  for (const other of allFurniture) {
    if (other.id === item.id) continue

    const [ow, oh, od] = other.bounding_box || [1, 1, 1]
    const ory = other.rotation?.[1] || 0
    const cornersB = getRotatedRectCorners(other.position[0], other.position[2], ow, od, ory)

    if (checkOBBOverlap(cornersA, cornersB)) {
      diagnostics.push({
        id: `col_${item.id}_${other.id}`,
        severity: 'warning',
        category: 'collision',
        message: `Collision: "${item.asset_id}" overlaps with "${other.asset_id}"`,
        targets: [item.id, other.id],
      })
    }
  }

  return diagnostics
}

/**
 * Finds the nearest wall to a given XZ position.
 * Returns suggestion for alignment if within the threshold.
 */
export function getWallSnapSuggestion(x, z, w, d, walls, threshold = 1.0) {
  let nearestWall = null
  let minDistance = Infinity
  let snapPoint = null

  for (const wall of walls) {
    const { distance, point } = getNearestPointOnSegment(
      x, z,
      wall.start[0], wall.start[1],
      wall.end[0], wall.end[1]
    )

    if (distance < minDistance) {
      minDistance = distance
      nearestWall = wall
      snapPoint = point
    }
  }

  if (nearestWall && minDistance <= threshold) {
    const [x1, z1] = nearestWall.start
    const [x2, z2] = nearestWall.end

    // Angle of the wall
    const wallAngle = Math.atan2(z2 - z1, x2 - x1)

    // Furniture back wall alignment angle (needs to be parallel to the wall)
    // We can snap to wallAngle, wallAngle + PI, wallAngle + PI/2, etc. depending on closest orientation.
    // Let's snap to the angle that is closest to current rotation
    const snapAngle = wallAngle

    // Calculate position offset to place the back of the object flush against the wall
    // Let's assume the back of the object is along its depth (z-axis, offset by d/2)
    const thickness = nearestWall.thickness || 0.2
    const offsetDistance = d / 2 + thickness / 2

    // Direction vector perpendicular to the wall pointing towards the furniture
    const wallDirX = x2 - x1
    const wallDirZ = z2 - z1
    const wallLength = Math.sqrt(wallDirX * wallDirX + wallDirZ * wallDirZ)
    
    // Normal vector pointing in +90 degrees from wall direction
    const normalX = -wallDirZ / wallLength
    const normalZ = wallDirX / wallLength

    // Determine which side of the wall the furniture is on
    const dotSide = (x - snapPoint[0]) * normalX + (z - snapPoint[1]) * normalZ
    const sideSign = dotSide >= 0 ? 1 : -1

    const finalX = snapPoint[0] + normalX * sideSign * offsetDistance
    const finalZ = snapPoint[1] + normalZ * sideSign * offsetDistance

    // The rotation should orient the object facing away from the wall
    // Rotation of normal vector: Math.atan2(normalZ, normalX)
    let rotationY = Math.atan2(normalZ * sideSign, normalX * sideSign) - Math.PI / 2

    return {
      position: [finalX, 0, finalZ],
      rotationY,
      wallId: nearestWall.id,
      distance: minDistance,
    }
  }

  return null
}

/**
 * Phase 7: Semantic Room Intelligence
 * Evaluates architectural and functional semantics of rooms.
 */
export function runSemanticDiagnostics(scene) {
  const diagnostics = []

  for (const room of scene.rooms) {
    const itemsInRoom = scene.furniture.filter(f => 
      isPointInPolygon(f.position[0], f.position[2], room.polygon)
    )

    if (room.type === 'living_room') {
      const hasSeating = itemsInRoom.some(f => f.asset_id.includes('sofa') || f.asset_id.includes('chair'))
      if (!hasSeating) {
        diagnostics.push({
          id: `sem_seating_${room.id}`,
          severity: 'info',
          category: 'semantic',
          title: 'Semantic Intelligence',
          message: 'Living room lacks seating. Try saying "furnish the living room".',
          targets: [room.id],
        })
      }
    }
    
    if (room.type === 'bedroom') {
      const hasBed = itemsInRoom.some(f => f.asset_id.includes('bed'))
      if (!hasBed) {
        diagnostics.push({
          id: `sem_bed_${room.id}`,
          severity: 'info',
          category: 'semantic',
          title: 'Semantic Intelligence',
          message: 'Bedroom lacks a bed. Try saying "furnish the bedroom".',
          targets: [room.id],
        })
      }
    }
  }

  return diagnostics
}

/**
 * Performs full scene validations, checking all items and updating diagnostics.
 */
export function runSceneDiagnostics(scene) {
  const diagnostics = []

  // Check all furniture collisions
  for (let i = 0; i < scene.furniture.length; i++) {
    const item = scene.furniture[i]
    const collWarnings = validateFurniturePlacement(item, scene.furniture)
    diagnostics.push(...collWarnings)
  }

  // Check if any furniture is outside room boundaries
  // For simplicity, we can verify that the center of the furniture falls inside at least one room polygon.
  for (const item of scene.furniture) {
    let insideAnyRoom = false
    
    for (const room of scene.rooms) {
      if (isPointInPolygon(item.position[0], item.position[2], room.polygon)) {
        insideAnyRoom = true
        break
      }
    }

    if (!insideAnyRoom && scene.rooms.length > 0) {
      diagnostics.push({
        id: `out_${item.id}`,
        severity: 'warning',
        category: 'boundary',
        title: 'Spatial Boundary',
        message: `Staging: "${item.asset_id}" is placed outside room boundaries`,
        targets: [item.id],
      })
    }
  }

  // Phase 7: Semantic Diagnostics
  const semanticDiagnostics = runSemanticDiagnostics(scene)
  diagnostics.push(...semanticDiagnostics)

  return diagnostics
}

/**
 * Standard ray-casting algorithm to detect point-in-polygon.
 */
function isPointInPolygon(x, y, polygon) {
  if (!polygon || polygon.length < 3) return false
  
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1]
    const xj = polygon[j][0], yj = polygon[j][1]
    
    const intersect = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi + 0.0001) + xi)
    if (intersect) inside = !inside
  }
  
  return inside
}

/**
 * Checks if a proposed player position collides with any walls or furniture.
 * Returns true if a collision is detected.
 */
export function checkPlayerCollisions(x, z, radius, scene) {
  // Check Wall Collisions
  for (const wall of scene.walls) {
    const thickness = wall.thickness || 0.2
    const { distance, t } = getNearestPointOnSegment(
      x, z,
      wall.start[0], wall.start[1],
      wall.end[0], wall.end[1]
    )
    if (distance < radius + thickness / 2) {
      // Check if player is inside an opening (door/window)
      let inOpening = false
      const wallOpenings = (scene.openings || []).filter(op => op.wall_id === wall.id)
      
      const dx = wall.end[0] - wall.start[0]
      const dz = wall.end[1] - wall.start[1]
      const wallLen = Math.sqrt(dx * dx + dz * dz)

      for (const op of wallOpenings) {
        const opCenterDist = op.position * wallLen
        const playerDist = t * wallLen
        const passWidth = (op.width || 1) / 2

        if (Math.abs(opCenterDist - playerDist) < passWidth) {
          inOpening = true
          break
        }
      }

      if (!inOpening) {
        return true
      }
    }
  }

  // Check Furniture Collisions
  const playerOBB = getPlayerOBB(x, z, radius)
  for (const item of scene.furniture) {
    const [w, h, d] = item.bounding_box || [1, 1, 1]
    const ry = item.rotation?.[1] || 0
    const itemOBB = getRotatedRectCorners(item.position[0], item.position[2], w, d, ry)
    
    if (checkOBBOverlap(playerOBB, itemOBB)) {
      return true
    }
  }

  return false
}
