// CellVFX — partículas confinadas exactamente dentro de las celdas pintadas.
// Se dibuja sobre el mismo canvas de escena, sobre los efectos ya renderizados.
// Cada "emitter" tiene un clipRect (px,py,pw,ph) que es el bounding box
// de las celdas del poder — las partículas nunca salen de ese rect.

const CONFIGS = {
  fire: {
    color: () => `hsl(${20 + Math.random()*30|0},100%,${50+Math.random()*30|0}%)`,
    count: 3, size: () => 2 + Math.random() * 3,
    vx: () => (Math.random() - 0.5) * 1.2,
    vy: () => -1.5 - Math.random() * 2,
    life: () => 0.4 + Math.random() * 0.4,
    gravity: -0.04, flicker: 0.15,
  },
  fire_wall: {
    color: () => `hsl(${10 + Math.random()*20|0},100%,${45+Math.random()*25|0}%)`,
    count: 3, size: () => 2 + Math.random() * 3,
    vx: () => (Math.random() - 0.5) * 0.8,
    vy: () => -1.2 - Math.random() * 1.8,
    life: () => 0.4 + Math.random() * 0.5,
    gravity: -0.03, flicker: 0.1,
  },
  ice: {
    color: () => `hsl(195,${70+Math.random()*30|0}%,${70+Math.random()*20|0}%)`,
    count: 2, size: () => 1.5 + Math.random() * 2.5,
    vx: () => (Math.random() - 0.5) * 0.8,
    vy: () => (Math.random() - 0.5) * 0.8,
    life: () => 0.6 + Math.random() * 0.5,
    gravity: 0.01, flicker: 0,
  },
  lightning: {
    color: () => `hsl(55,100%,${80+Math.random()*20|0}%)`,
    count: 6, size: () => 1 + Math.random() * 2,
    vx: () => (Math.random() - 0.5) * 3,
    vy: () => (Math.random() - 0.5) * 3,
    life: () => 0.1 + Math.random() * 0.2,
    gravity: 0, flicker: 0,
  },
  poison: {
    color: () => `hsl(${270+Math.random()*40|0},${60+Math.random()*30|0}%,${50+Math.random()*20|0}%)`,
    count: 2, size: () => 2 + Math.random() * 3,
    vx: () => (Math.random() - 0.5) * 0.6,
    vy: () => -0.4 - Math.random() * 0.8,
    life: () => 0.6 + Math.random() * 0.6,
    gravity: -0.01, flicker: 0,
  },
  earth: {
    color: () => `hsl(${30+Math.random()*20|0},${50+Math.random()*20|0}%,${35+Math.random()*20|0}%)`,
    count: 3, size: () => 2 + Math.random() * 4,
    vx: () => (Math.random() - 0.5) * 1.5,
    vy: () => -0.5 - Math.random() * 1.5,
    life: () => 0.3 + Math.random() * 0.3,
    gravity: 0.08, flicker: 0,
  },
  holy: {
    color: () => `hsl(50,100%,${80+Math.random()*20|0}%)`,
    count: 2, size: () => 1.5 + Math.random() * 2,
    vx: () => (Math.random() - 0.5) * 0.8,
    vy: () => -0.3 - Math.random() * 0.8,
    life: () => 0.6 + Math.random() * 0.6,
    gravity: -0.02, flicker: 0,
  },
  darkness: {
    color: () => `hsl(${250+Math.random()*30|0},${40+Math.random()*30|0}%,${20+Math.random()*20|0}%)`,
    count: 2, size: () => 3 + Math.random() * 4,
    vx: () => (Math.random() - 0.5) * 0.6,
    vy: () => (Math.random() - 0.5) * 0.6,
    life: () => 0.5 + Math.random() * 0.6,
    gravity: 0, flicker: 0,
  },
  water: {
    color: () => `hsl(${200+Math.random()*20|0},${70+Math.random()*30|0}%,${55+Math.random()*20|0}%)`,
    count: 2, size: () => 1.5 + Math.random() * 2.5,
    vx: () => (Math.random() - 0.5) * 1,
    vy: () => 0.3 + Math.random() * 0.8,
    life: () => 0.4 + Math.random() * 0.4,
    gravity: 0.03, flicker: 0,
  },
  wind: {
    color: () => `hsl(175,${50+Math.random()*30|0}%,${65+Math.random()*20|0}%)`,
    count: 2, size: () => 1 + Math.random() * 2,
    vx: () => 1 + Math.random() * 2,
    vy: () => (Math.random() - 0.5) * 0.8,
    life: () => 0.3 + Math.random() * 0.3,
    gravity: 0, flicker: 0,
  },
  acid: {
    color: () => `hsl(${75+Math.random()*20|0},100%,${45+Math.random()*20|0}%)`,
    count: 2, size: () => 1.5 + Math.random() * 2.5,
    vx: () => (Math.random() - 0.5) * 0.8,
    vy: () => 0.2 + Math.random() * 0.6,
    life: () => 0.4 + Math.random() * 0.4,
    gravity: 0.02, flicker: 0,
  },
  necrotic: {
    color: () => `hsl(${100+Math.random()*30|0},${30+Math.random()*20|0}%,${20+Math.random()*15|0}%)`,
    count: 2, size: () => 2 + Math.random() * 3,
    vx: () => (Math.random() - 0.5) * 0.5,
    vy: () => (Math.random() - 0.5) * 0.5,
    life: () => 0.6 + Math.random() * 0.5,
    gravity: 0, flicker: 0,
  },
};
// Aliases
CONFIGS.fire_wall = CONFIGS.fire;

export class CellVFX {
  constructor() {
    this.particles = [];  // { x,y,vx,vy,size,color,life,maxLife,cfg,clipRect }
    this.running   = false;
    this.rafId     = null;
    this.canvas    = null;
  }

  attach(canvas) { this.canvas = canvas; }

  /** Emite un burst de partículas confinadas al rect {x,y,w,h} en canvas pixels */
  burst(powerId, clipRect) {
    const cfg = CONFIGS[powerId];
    if (!cfg || !clipRect) return;
    const { x, y, w, h } = clipRect;
    // Spawn partículas distribuidas por todo el rect
    const area    = w * h;
    const density = Math.max(12, Math.min(80, area / 400));
    for (let i = 0; i < density; i++) {
      const px = x + Math.random() * w;
      const py = y + Math.random() * h;
      this.particles.push({
        x: px, y: py,
        vx: cfg.vx(), vy: cfg.vy(),
        size: cfg.size(),
        color: cfg.color(),
        life: cfg.life(), maxLife: 0,
        cfg,
        clip: { x, y, w, h },
      });
      this.particles[this.particles.length - 1].maxLife = this.particles[this.particles.length - 1].life;
    }
    if (!this.running) this._start();
  }

  /** Emite partículas sostenidas para el tablero actual */
  tickBoard(board, gridRows, gridCols, getIR) {
    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        const cell = board[r]?.[c];
        if (!cell?.effects?.length) continue;
        for (const eff of cell.effects) {
          const cfg = CONFIGS[eff.powerId];
          if (!cfg) continue;
          if (Math.random() > 0.18) continue; // sparse sustained emission
          const ir    = getIR();
          const cellW = ir.w / gridCols;
          const cellH = ir.h / gridRows;
          const cx    = ir.x + c * cellW;
          const cy    = ir.y + r * cellH;
          this.particles.push({
            x: cx + Math.random() * cellW,
            y: cy + Math.random() * cellH,
            vx: cfg.vx(), vy: cfg.vy(),
            size: cfg.size(),
            color: cfg.color(),
            life: cfg.life() * 0.6, maxLife: 0,
            cfg,
            clip: { x: cx, y: cy, w: cellW, h: cellH },
          });
          const p = this.particles[this.particles.length - 1];
          p.maxLife = p.life;
        }
      }
    }
    if (this.particles.length > 0 && !this.running) this._start();
  }

  _start() {
    this.running = true;
    const tick = () => {
      if (!this.running || !this.canvas) return;
      this._tick();
      if (this.particles.length > 0) {
        this.rafId = requestAnimationFrame(tick);
      } else {
        this.running = false;
      }
    };
    this.rafId = requestAnimationFrame(tick);
  }

  stop() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.particles = [];
  }

  _tick() {
    const ctx = this.canvas?.getContext("2d");
    if (!ctx) return;
    const dt = 1 / 60;

    this.particles = this.particles.filter(p => {
      p.life -= dt;
      if (p.life <= 0) return false;

      // Update position
      p.vx += p.cfg.flicker ? (Math.random() - 0.5) * p.cfg.flicker : 0;
      p.vy += p.cfg.gravity || 0;
      p.x  += p.vx;
      p.y  += p.vy;

      // Clamp inside clip rect — bounce off walls
      const { x: cx, y: cy, w: cw, h: ch } = p.clip;
      if (p.x < cx)        { p.x = cx;        p.vx = Math.abs(p.vx) * 0.5; }
      if (p.x > cx + cw)   { p.x = cx + cw;   p.vx = -Math.abs(p.vx) * 0.5; }
      if (p.y < cy)        { p.y = cy;         p.vy = Math.abs(p.vy) * 0.5; }
      if (p.y > cy + ch)   { p.y = cy + ch;    p.vy = -Math.abs(p.vy) * 0.5; }

      const alpha = (p.life / p.maxLife) * 0.9;
      const size  = p.size * Math.max(0.1, p.life / p.maxLife);

      ctx.save();
      // Hard clip to cell rect — nothing escapes
      ctx.beginPath();
      ctx.rect(p.clip.x, p.clip.y, p.clip.w, p.clip.h);
      ctx.clip();

      ctx.globalAlpha = alpha;
      ctx.fillStyle   = p.color;
      if (p.size > 2) {
        ctx.shadowBlur  = size * 1.5;
        ctx.shadowColor = p.color;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      return true;
    });
  }
}
