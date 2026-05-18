// VFX Particle Engine
// Each power has a unique particle system drawn on a dedicated canvas layer

// ── Particle pool ─────────────────────────────────────────────────────────────

class Particle {
  constructor() { this.reset(); }
  reset(x=0, y=0, config={}) {
    this.x    = x;
    this.y    = y;
    this.vx   = (Math.random() - 0.5) * (config.spread  ?? 3);
    this.vy   = (Math.random() - 0.5) * (config.spread  ?? 3) + (config.gravity ?? -1);
    this.life = Math.random() * (config.lifeVar ?? 0.5) + (config.lifeBase ?? 0.5);
    this.maxLife = this.life;
    this.size = Math.random() * (config.sizeVar ?? 4) + (config.sizeBase ?? 2);
    this.color  = config.color  ?? "#ffffff";
    this.color2 = config.color2 ?? config.color ?? "#ffffff";
    this.shape  = config.shape  ?? "circle";   // circle | square | spark | snowflake
    this.glow   = config.glow   ?? false;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 0.2;
    this.alive = true;
  }
}

// ── Power VFX configs ─────────────────────────────────────────────────────────

export const VFX_CONFIGS = {
  fire: {
    rate: 6, // particles per cell per frame burst
    config: {
      spread: 2.5, gravity: -2.2, lifeBase: 0.4, lifeVar: 0.4,
      sizeBase: 3, sizeVar: 6, shape: "circle", glow: true,
      color: "#ff6600", color2: "#ffdd00",
    },
    update(p, dt) {
      p.vy  -= 0.06;               // rise
      p.vx  += (Math.random() - 0.5) * 0.3; // flicker
      p.size *= 0.97;
    },
    colorAt(p) {
      const t = 1 - p.life / p.maxLife;
      return t < 0.4 ? "#ffee44" : t < 0.7 ? "#ff6600" : "#cc2200";
    },
  },

  fire_wall: {
    rate: 5,
    config: {
      spread: 1.5, gravity: -1.8, lifeBase: 0.5, lifeVar: 0.3,
      sizeBase: 4, sizeVar: 5, shape: "spark", glow: true,
      color: "#ff4400", color2: "#ff9900",
    },
    update(p) {
      p.vy -= 0.04;
      p.vx += (Math.random() - 0.5) * 0.2;
    },
    colorAt(p) {
      const t = 1 - p.life / p.maxLife;
      return t < 0.5 ? "#ffaa00" : "#cc3300";
    },
  },

  ice: {
    rate: 3,
    config: {
      spread: 2, gravity: 0.2, lifeBase: 0.6, lifeVar: 0.5,
      sizeBase: 2, sizeVar: 5, shape: "snowflake", glow: true,
      color: "#88eeff", color2: "#ffffff",
    },
    update(p) {
      p.vx += Math.sin(p.life * 10) * 0.05;
      p.size *= 0.995;
    },
    colorAt(p) {
      const t = 1 - p.life / p.maxLife;
      return t < 0.5 ? "#ffffff" : "#44ccff";
    },
  },

  lightning: {
    rate: 12,
    config: {
      spread: 6, gravity: 0, lifeBase: 0.15, lifeVar: 0.15,
      sizeBase: 1, sizeVar: 3, shape: "spark", glow: true,
      color: "#ffffaa", color2: "#aaaaff",
    },
    update(p) {
      p.vx *= 0.85;
      p.vy *= 0.85;
    },
    colorAt(p) {
      const t = 1 - p.life / p.maxLife;
      return t < 0.3 ? "#ffffff" : t < 0.6 ? "#ffffaa" : "#8888ff";
    },
  },

  poison: {
    rate: 3,
    config: {
      spread: 1.5, gravity: -0.5, lifeBase: 0.7, lifeVar: 0.6,
      sizeBase: 3, sizeVar: 4, shape: "circle", glow: false,
      color: "#aa44ff", color2: "#44ff88",
    },
    update(p) {
      p.vx += Math.sin(p.life * 5) * 0.08;
      p.vy += Math.cos(p.life * 3) * 0.05;
      p.size *= 0.993;
    },
    colorAt(p) {
      const t = 1 - p.life / p.maxLife;
      return t < 0.5 ? "#bb55ff" : "#55cc66";
    },
  },

  earth: {
    rate: 8,
    config: {
      spread: 4, gravity: 1.5, lifeBase: 0.3, lifeVar: 0.3,
      sizeBase: 3, sizeVar: 6, shape: "square", glow: false,
      color: "#c9a84c", color2: "#7a5c3a",
    },
    update(p) {
      p.vy += 0.1;  // fall
      p.size *= 0.98;
    },
    colorAt(p) {
      const t = 1 - p.life / p.maxLife;
      return t < 0.4 ? "#c9a84c" : "#7a5c3a";
    },
  },

  holy: {
    rate: 3,
    config: {
      spread: 2, gravity: -0.8, lifeBase: 0.8, lifeVar: 0.5,
      sizeBase: 2, sizeVar: 5, shape: "circle", glow: true,
      color: "#ffffaa", color2: "#ffffff",
    },
    update(p) {
      const angle = p.life * 3;
      p.vx = Math.cos(angle) * 0.8;
      p.vy = Math.sin(angle) * 0.8 - 0.3;
      p.size *= 0.996;
    },
    colorAt(p) { return "#ffffcc"; },
  },

  darkness: {
    rate: 4,
    config: {
      spread: 3, gravity: 0.1, lifeBase: 0.6, lifeVar: 0.5,
      sizeBase: 4, sizeVar: 8, shape: "circle", glow: false,
      color: "#4433aa", color2: "#220055",
    },
    update(p) {
      p.size *= 0.992;
      p.vx  *= 0.96;
      p.vy  *= 0.96;
    },
    colorAt(p) {
      const t = 1 - p.life / p.maxLife;
      return t < 0.5 ? "#6644cc" : "#110033";
    },
  },

  water: {
    rate: 4,
    config: {
      spread: 2, gravity: 0.4, lifeBase: 0.5, lifeVar: 0.4,
      sizeBase: 2, sizeVar: 4, shape: "circle", glow: false,
      color: "#44aaff", color2: "#aaddff",
    },
    update(p) {
      p.vy += 0.05;
      p.vx += Math.sin(p.life * 8) * 0.04;
      p.size *= 0.99;
    },
    colorAt(p) {
      const t = 1 - p.life / p.maxLife;
      return t < 0.4 ? "#aaeeff" : "#2288cc";
    },
  },

  wind: {
    rate: 3,
    config: {
      spread: 4, gravity: 0, lifeBase: 0.4, lifeVar: 0.3,
      sizeBase: 1, sizeVar: 3, shape: "spark", glow: false,
      color: "#aaffee", color2: "#ffffff",
    },
    update(p) {
      p.vx *= 1.04;  // accelerate
      p.size *= 0.98;
    },
    colorAt(p) { return "#99eedd"; },
  },

  acid: {
    rate: 4,
    config: {
      spread: 2, gravity: 0.3, lifeBase: 0.5, lifeVar: 0.4,
      sizeBase: 2, sizeVar: 4, shape: "circle", glow: false,
      color: "#aadd00", color2: "#55aa00",
    },
    update(p) {
      p.vy += 0.04;
      p.vx += (Math.random() - 0.5) * 0.1;
      p.size *= 0.994;
    },
    colorAt(p) {
      const t = 1 - p.life / p.maxLife;
      return t < 0.5 ? "#ccff00" : "#448800";
    },
  },

  necrotic: {
    rate: 3,
    config: {
      spread: 2.5, gravity: -0.3, lifeBase: 0.7, lifeVar: 0.5,
      sizeBase: 3, sizeVar: 5, shape: "circle", glow: true,
      color: "#336622", color2: "#004400",
    },
    update(p) {
      p.vx += Math.sin(p.life * 4) * 0.06;
      p.size *= 0.994;
    },
    colorAt(p) {
      const t = 1 - p.life / p.maxLife;
      return t < 0.4 ? "#66cc44" : "#224411";
    },
  },
};

// ── VFX Manager ───────────────────────────────────────────────────────────────

export class VFXManager {
  constructor() {
    this.particles = [];
    this.animId    = null;
    this.canvas    = null;
    this.ctx       = null;
    this.running   = false;
    this.activeEmitters = new Map(); // powerId+cell → { frames }
  }

  attach(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext("2d");
  }

  // Burst: emit particles for a set of cells (on draw)
  // cells: array of pixel coords [[px, py], ...]
  burst(powerId, cells, cellSize) {
    const cfg = VFX_CONFIGS[powerId];
    if (!cfg) return;
    for (const [px, py] of cells) {
      for (let i = 0; i < cfg.rate; i++) {
        const p = new Particle();
        p.reset(
          px + (Math.random() - 0.5) * cellSize * 0.6,
          py + (Math.random() - 0.5) * cellSize * 0.6,
          cfg.config
        );
        p.powerId = powerId;
        this.particles.push(p);
      }
    }
    if (!this.running) this.start();
  }

  // Continuous: add particles each frame for active cells
  // originX/Y = canvas pixel offset of grid top-left (from containRect)
  tickEmitters(board, cellSize, rows, cols, originX = 0, originY = 0) {
    const cfg_map = VFX_CONFIGS;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = board[r]?.[c];
        if (!cell?.effects?.length) continue;
        for (const eff of cell.effects) {
          const cfg = cfg_map[eff.powerId];
          if (!cfg) continue;
          // Emit at reduced rate for sustained effects
          if (Math.random() > 0.25) continue;
          const cx = originX + c * cellSize + cellSize / 2;
          const cy = originY + r * cellSize + cellSize / 2;
          const p  = new Particle();
          p.reset(
            cx + (Math.random() - 0.5) * cellSize * 0.7,
            cy + (Math.random() - 0.5) * cellSize * 0.7,
            cfg.config
          );
          p.powerId = eff.powerId;
          this.particles.push(p);
        }
      }
    }
  }

  start() {
    this.running = true;
    const loop = () => {
      if (!this.running || !this.canvas) return;
      this.tick();
      this.animId = requestAnimationFrame(loop);
    };
    this.animId = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    if (this.animId) cancelAnimationFrame(this.animId);
  }

  tick() {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const dt = 1 / 60;
    this.particles = this.particles.filter(p => {
      p.life -= dt;
      if (p.life <= 0) { p.alive = false; return false; }

      // Update position
      const cfg = VFX_CONFIGS[p.powerId];
      if (cfg?.update) cfg.update(p, dt);
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotSpeed;

      // Draw
      const alpha = Math.max(0, p.life / p.maxLife);
      const color = cfg?.colorAt?.(p) ?? p.color;

      ctx.save();
      ctx.globalAlpha = alpha;

      if (p.glow) {
        ctx.shadowBlur  = p.size * 2.5;
        ctx.shadowColor = color;
      }

      ctx.fillStyle = color;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      switch (p.shape) {
        case "square":
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          break;
        case "spark":
          ctx.beginPath();
          ctx.moveTo(0, -p.size * 2);
          ctx.lineTo(p.size * 0.3, 0);
          ctx.lineTo(0, p.size * 0.5);
          ctx.lineTo(-p.size * 0.3, 0);
          ctx.closePath();
          ctx.fill();
          break;
        case "snowflake":
          for (let a = 0; a < 6; a++) {
            ctx.save();
            ctx.rotate((a * Math.PI) / 3);
            ctx.fillRect(-0.8, -p.size, 1.6, p.size * 2);
            ctx.restore();
          }
          break;
        default: // circle
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
      }

      ctx.restore();
      return true;
    });

    // Stop loop when no particles
    if (this.particles.length === 0) {
      this.running = false;
    }
  }

  resize(w, h) {
    if (this.canvas) {
      this.canvas.width  = w;
      this.canvas.height = h;
    }
  }

  clear() {
    this.particles = [];
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
}
