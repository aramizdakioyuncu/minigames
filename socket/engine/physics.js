// 2D Vector & Circle Physics Engine for PuckArena (Disk Futbolu / Agar / Sumo Mechanics)

export class Vec2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  set(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }

  add(v) {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  sub(v) {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  scale(s) {
    this.x *= s;
    this.y *= s;
    return this;
  }

  length() {
    return Math.hypot(this.x, this.y);
  }

  normalize() {
    const len = this.length();
    if (len > 0.00001) {
      this.x /= len;
      this.y /= len;
    }
    return this;
  }

  dot(v) {
    return this.x * v.x + this.y * v.y;
  }

  dist(v) {
    return Math.hypot(this.x - v.x, this.y - v.y);
  }

  clone() {
    return new Vec2(this.x, this.y);
  }
}

export class PhysicsBody {
  constructor(options = {}) {
    this.id = options.id || Math.random().toString(36).substring(2, 9);
    this.pos = new Vec2(options.x || 0, options.y || 0);
    this.vel = new Vec2(options.vx || 0, options.vy || 0);
    this.radius = options.radius || 15;
    this.mass = options.mass ?? 1;
    this.invMass = this.mass === 0 ? 0 : 1 / this.mass;
    this.damping = options.damping !== undefined ? options.damping : 0.96; // Surface friction
    this.restitution = options.restitution !== undefined ? options.restitution : 0.6; // Bounciness
    this.isStatic = !!options.isStatic;
    this.type = options.type || 'disc'; // 'player', 'ball', 'post', 'pellet'
  }

  get mass() { return this._mass; }
  set mass(value) {
    this._mass = Math.max(0, Number(value) || 0);
    this.invMass = this._mass === 0 ? 0 : 1 / this._mass;
  }

  update(dt = 1) {
    if (this.isStatic) return;

    // Normalize time delta to 60 FPS frame steps (so 60Hz dt=0.0166s gives step=1.0)
    const step = Math.max(0, dt * 60);

    // Apply velocity in pixels per frame step
    this.pos.x += this.vel.x * step;
    this.pos.y += this.vel.y * step;

    // Apply damping per frame step
    const dampFactor = Math.pow(this.damping, step);
    this.vel.x *= dampFactor;
    this.vel.y *= dampFactor;

    // Zero out tiny velocities to avoid precision float jitter
    if (Math.abs(this.vel.x) < 0.001) this.vel.x = 0;
    if (Math.abs(this.vel.y) < 0.001) this.vel.y = 0;
  }

  applyImpulse(fx, fy) {
    if (this.isStatic) return;
    this.vel.x += fx * this.invMass;
    this.vel.y += fy * this.invMass;
  }
}

// Circle to Circle Elastic Collision Resolution
export function resolveCircleCollision(a, b) {
  const dx = b.pos.x - a.pos.x;
  const dy = b.pos.y - a.pos.y;
  const dist = Math.hypot(dx, dy);
  const minDist = a.radius + b.radius;

  if (dist < minDist) {
    // Normal vector
    const nx = dist > 0.0001 ? dx / dist : 1;
    const ny = dist > 0.0001 ? dy / dist : 0;

    // Overlap separation (push apart based on mass)
    const overlap = minDist - dist;
    const totalMass = (a.isStatic ? 0 : a.invMass) + (b.isStatic ? 0 : b.invMass);
    if (totalMass === 0) return false;

    const sepA = a.isStatic ? 0 : (a.invMass / totalMass) * overlap;
    const sepB = b.isStatic ? 0 : (b.invMass / totalMass) * overlap;

    a.pos.x -= nx * sepA;
    a.pos.y -= ny * sepA;
    b.pos.x += nx * sepB;
    b.pos.y += ny * sepB;

    // Relative velocity
    const rvx = b.vel.x - a.vel.x;
    const rvy = b.vel.y - a.vel.y;

    // Velocity along normal
    const velAlongNormal = rvx * nx + rvy * ny;

    // Do not resolve if velocities are separating
    if (velAlongNormal > 0) return true;

    // Restitution (elasticity)
    const e = Math.min(a.restitution, b.restitution);

    // Impulse scalar
    const j = -(1 + e) * velAlongNormal / totalMass;

    // Apply impulse
    const impulseX = j * nx;
    const impulseY = j * ny;

    if (!a.isStatic) {
      a.vel.x -= impulseX * a.invMass;
      a.vel.y -= impulseY * a.invMass;
    }
    if (!b.isStatic) {
      b.vel.x += impulseX * b.invMass;
      b.vel.y += impulseY * b.invMass;
    }

    return true;
  }
  return false;
}

// Circle vs Line Segment collision (e.g. goal lines, border boundaries)
export function resolveSegmentCollision(body, p1, p2, restitution = 0.6) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return false;

  // Projection of body on segment [0, 1]
  const t = Math.max(0, Math.min(1, ((body.pos.x - p1.x) * dx + (body.pos.y - p1.y) * dy) / lenSq));
  const closestX = p1.x + t * dx;
  const closestY = p1.y + t * dy;

  const diffX = body.pos.x - closestX;
  const diffY = body.pos.y - closestY;
  const dist = Math.hypot(diffX, diffY);

  if (dist < body.radius) {
    const nx = dist > 0.0001 ? diffX / dist : -dy / Math.sqrt(lenSq);
    const ny = dist > 0.0001 ? diffY / dist : dx / Math.sqrt(lenSq);

    // Push body out of segment
    const overlap = body.radius - dist;
    body.pos.x += nx * overlap;
    body.pos.y += ny * overlap;

    // Reflect velocity
    const dot = body.vel.x * nx + body.vel.y * ny;
    if (dot < 0) {
      const e = restitution;
      body.vel.x -= (1 + e) * dot * nx;
      body.vel.y -= (1 + e) * dot * ny;
    }
    return true;
  }
  return false;
}
