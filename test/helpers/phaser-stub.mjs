// The slice of Phaser that game logic modules touch outside rendering.
class Vector2 {
  constructor(x = 0, y = 0) { this.x = x; this.y = y; }
  set(x, y = x) { this.x = x; this.y = y; return this; }
}

const Phaser = {
  Math: {
    Vector2,
    Clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
    // Deterministic: tests never depend on random decision delays.
    Between: (min) => min,
    Angle: { Between: (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1) },
    Distance: { Between: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1) },
  },
  Scenes: { Events: { SHUTDOWN: 'shutdown' } },
};

export default Phaser;
