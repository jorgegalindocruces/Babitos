export function getEnemyPatrolDirection(position, home, radius, currentDirection = 1) {
  if (position >= home + radius) return -1;
  if (position <= home - radius) return 1;
  return currentDirection < 0 ? -1 : 1;
}

export function getEnemyWallDirection(blocked, currentDirection = 1) {
  if (blocked?.right) return -1;
  if (blocked?.left) return 1;
  return currentDirection < 0 ? -1 : 1;
}
