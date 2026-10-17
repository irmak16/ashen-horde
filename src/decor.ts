// Haritaya özel zemin süsleri: tamamen üretilmiş dokular, çakışması yok (sadece görsel).
import { Container, Sprite, Texture } from 'pixi.js';

type Shape = 'stone' | 'tree' | 'crystal' | 'mushroom' | 'puddle' | 'rune' | 'bones' | 'spire' | 'lava';
interface Prop { shape: Shape; c1: string; c2: string; w: number; flat?: boolean; add?: boolean; tall?: number }

const PROPS: Record<string, Prop[]> = {
  crypt: [{ shape: 'stone', c1: '#4b4659', c2: '#2a2634', w: 5 }, { shape: 'tree', c1: '#2a2230', c2: '#14101a', w: 3 }, { shape: 'bones', c1: '#cfc7b0', c2: '#6f6a58', w: 3, flat: true }],
  marsh: [{ shape: 'mushroom', c1: '#7be07a', c2: '#2f6a3a', w: 4, add: false }, { shape: 'tree', c1: '#2c3a22', c2: '#141c10', w: 3 }, { shape: 'puddle', c1: '#2f5a3c', c2: '#10261a', w: 4, flat: true }],
  ember: [{ shape: 'spire', c1: '#5a3a2e', c2: '#241410', w: 4 }, { shape: 'lava', c1: '#ff7a2a', c2: '#a02a08', w: 5, flat: true, add: true }, { shape: 'tree', c1: '#1e1210', c2: '#0c0605', w: 2 }],
  frost: [{ shape: 'crystal', c1: '#bfe6ff', c2: '#4f86c4', w: 4 }, { shape: 'spire', c1: '#8ea7c4', c2: '#3a4f6c', w: 3 }, { shape: 'tree', c1: '#6f8aa8', c2: '#2a3a52', w: 2 }],
  void: [{ shape: 'crystal', c1: '#e08bff', c2: '#6a2aa8', w: 4 }, { shape: 'rune', c1: '#c070ff', c2: '#7a2ac8', w: 2, flat: true, add: true }, { shape: 'spire', c1: '#3a2a52', c2: '#160c26', w: 3 }],
};

function cv(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')!];
}
const R = (a: number, b: number) => a + Math.random() * (b - a);

function draw(p: Prop): { tex: Texture; ay: number } {
  const [c, g] = cv(128, 128); g.lineJoin = 'round'; g.lineCap = 'round';
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(64, 112, 26, 7, 0, 0, 7); g.fill();
  const lin = (y0: number, y1: number) => { const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, p.c1); gr.addColorStop(1, p.c2); return gr; };
  let ay = 0.9;
  switch (p.shape) {
    case 'stone': {
      g.fillStyle = lin(40, 112); g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(40, 112); g.lineTo(42, 58); g.quadraticCurveTo(64, 26, 86, 58); g.lineTo(88, 112); g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.22)'; g.lineWidth = 4; g.beginPath(); g.moveTo(46, 100); g.lineTo(47, 62); g.stroke();
      g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 4; g.beginPath(); g.moveTo(64, 56); g.lineTo(64, 82); g.moveTo(54, 66); g.lineTo(74, 66); g.stroke();
      break;
    }
    case 'tree': {
      g.strokeStyle = p.c2; g.fillStyle = p.c2; g.lineWidth = 9;
      g.beginPath(); g.moveTo(64, 114); g.quadraticCurveTo(58, 80, 64, 50); g.stroke();
      g.lineWidth = 5;
      for (const [x, y, ex, ey] of [[63, 78, 36, 52], [63, 66, 92, 40], [64, 52, 44, 26], [63, 50, 80, 20], [61, 90, 86, 78]]) { g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo((x + ex) / 2 + R(-8, 8), (y + ey) / 2, ex, ey); g.stroke(); }
      g.strokeStyle = p.c1; g.lineWidth = 2; g.beginPath(); g.moveTo(60, 112); g.quadraticCurveTo(54, 80, 60, 52); g.stroke();
      ay = 0.92; break;
    }
    case 'crystal': {
      for (const [x, h, w, s] of [[64, 82, 18, 1], [44, 50, 12, 0.8], [84, 58, 13, 0.85]]) {
        g.fillStyle = lin(112 - h, 112); g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 2 * s;
        g.beginPath(); g.moveTo(x - w, 112); g.lineTo(x - w * 0.7, 112 - h * 0.72); g.lineTo(x, 112 - h); g.lineTo(x + w * 0.7, 112 - h * 0.72); g.lineTo(x + w, 112); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.28)'; g.beginPath(); g.moveTo(x - w * 0.5, 108); g.lineTo(x - w * 0.4, 112 - h * 0.7); g.lineTo(x, 112 - h * 0.95); g.lineTo(x - 2, 108); g.fill();
      }
      break;
    }
    case 'mushroom': {
      for (const [x, y, r] of [[64, 100, 26], [38, 108, 14], [92, 106, 16]]) {
        g.fillStyle = '#d8d0b0'; g.fillRect(x - r * 0.18, y - r * 0.7, r * 0.36, r * 0.7);
        const gr = g.createRadialGradient(x, y - r * 0.8, 0, x, y - r * 0.8, r); gr.addColorStop(0, p.c1); gr.addColorStop(1, p.c2);
        g.fillStyle = gr; g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 2;
        g.beginPath(); g.ellipse(x, y - r * 0.75, r, r * 0.62, 0, Math.PI, 0); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.5)'; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(x + R(-r * 0.6, r * 0.6), y - r * R(0.8, 1.1), r * 0.1, 0, 7); g.fill(); }
      }
      break;
    }
    case 'puddle': {
      g.clearRect(0, 0, 128, 128);
      const gr = g.createRadialGradient(64, 64, 0, 64, 64, 56); gr.addColorStop(0, p.c1 + 'cc'); gr.addColorStop(0.7, p.c2 + 'aa'); gr.addColorStop(1, p.c2 + '00');
      g.fillStyle = gr; g.save(); g.translate(64, 64); g.scale(1, 0.45); g.translate(-64, -64); g.beginPath(); g.arc(64, 64, 56, 0, 7); g.fill(); g.restore();
      ay = 0.5; break;
    }
    case 'bones': {
      g.clearRect(0, 0, 128, 128); g.strokeStyle = p.c1; g.lineWidth = 5;
      for (let i = 0; i < 4; i++) { const x = R(40, 88), y = R(86, 108), a = R(0, 3.14); g.beginPath(); g.moveTo(x - Math.cos(a) * 14, y - Math.sin(a) * 6); g.lineTo(x + Math.cos(a) * 14, y + Math.sin(a) * 6); g.stroke(); }
      g.fillStyle = p.c1; g.strokeStyle = p.c2; g.lineWidth = 2; g.beginPath(); g.arc(64, 96, 11, 0, 7); g.fill(); g.stroke();
      g.fillStyle = '#18141c'; g.fillRect(58, 94, 4, 5); g.fillRect(66, 94, 4, 5);
      ay = 0.78; break;
    }
    case 'spire': {
      g.fillStyle = lin(24, 112); g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(34, 112); g.lineTo(52, 56); g.lineTo(60, 18); g.lineTo(72, 50); g.lineTo(80, 36); g.lineTo(96, 112); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.1)'; g.beginPath(); g.moveTo(60, 18); g.lineTo(52, 56); g.lineTo(46, 112); g.lineTo(62, 112); g.fill();
      break;
    }
    case 'lava': {
      g.clearRect(0, 0, 128, 128);
      for (let k = 0; k < 2; k++) {
        g.strokeStyle = k ? p.c1 : p.c2; g.lineWidth = k ? 3 : 8; g.globalAlpha = k ? 1 : 0.5;
        g.beginPath(); let x = R(10, 30), y = R(50, 80); g.moveTo(x, y);
        const pts: [number, number][] = []; for (let i = 0; i < 6; i++) { x += R(14, 20); y += R(-14, 14); pts.push([x, y]); }
        pts.forEach(([a, b]) => g.lineTo(a, b)); g.stroke();
      }
      g.globalAlpha = 1; ay = 0.5; break;
    }
    case 'rune': {
      g.clearRect(0, 0, 128, 128); g.strokeStyle = p.c1; g.lineWidth = 3;
      g.save(); g.translate(64, 64); g.scale(1, 0.5); g.translate(-64, -64);
      g.beginPath(); g.arc(64, 64, 50, 0, 7); g.stroke(); g.lineWidth = 2; g.beginPath(); g.arc(64, 64, 38, 0, 7); g.stroke();
      g.beginPath(); for (let i = 0; i < 5; i++) { const a = -1.57 + i * 2.513; const x = 64 + Math.cos(a) * 38, y = 64 + Math.sin(a) * 38; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); g.stroke();
      g.restore(); ay = 0.5; break;
    }
  }
  return { tex: Texture.from(c), ay };
}

export class Decor {
  private cache = new Map<string, { tex: Texture; ay: number }[]>();
  private chunks = new Map<string, Sprite[]>();
  private pool: Sprite[] = [];
  private mapId = 'crypt';
  constructor(private flat: Container, private tall: Container) {}

  setMap(id: string) {
    this.clear(); this.mapId = id;
    if (!this.cache.has(id)) this.cache.set(id, (PROPS[id] ?? PROPS.crypt).map((p) => draw(p)));
  }
  clear() { for (const arr of this.chunks.values()) for (const s of arr) { s.visible = false; this.pool.push(s); } this.chunks.clear(); }

  private hash(x: number, y: number, k: number) { let h = (x * 374761393 + y * 668265263 + k * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }

  update(px: number, py: number, halfW: number, halfH: number) {
    const C = 360; const props = PROPS[this.mapId] ?? PROPS.crypt; const tex = this.cache.get(this.mapId)!;
    const total = props.reduce((a, p) => a + p.w, 0);
    const x0 = Math.floor((px - halfW - 120) / C), x1 = Math.floor((px + halfW + 120) / C), y0 = Math.floor((py - halfH - 160) / C), y1 = Math.floor((py + halfH + 160) / C);
    const want = new Set<string>();
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
      const key = cx + ',' + cy; want.add(key);
      if (this.chunks.has(key)) continue;
      const arr: Sprite[] = []; const n = Math.floor(this.hash(cx, cy, 1) * 4.2);
      for (let i = 0; i < n; i++) {
        const x = (cx + this.hash(cx, cy, 10 + i)) * C, y = (cy + this.hash(cx, cy, 20 + i)) * C;
        if (Math.hypot(x, y) < 130) continue;
        let r = this.hash(cx, cy, 30 + i) * total, k = 0; while (k < props.length - 1 && r > props[k].w) { r -= props[k].w; k++; }
        const pr = props[k]; const t = tex[k];
        const s = this.pool.pop() ?? new Sprite();
        s.texture = t.tex; s.anchor.set(0.5, t.ay); s.visible = true; s.position.set(x, y);
        const sc = 0.8 + this.hash(cx, cy, 40 + i) * 0.7; s.scale.set(pr.flat ? sc * 1.1 : sc);
        s.alpha = pr.add ? 0.85 : 1; s.blendMode = pr.add ? 'add' : 'normal'; s.zIndex = y;
        (pr.flat ? this.flat : this.tall).addChild(s); arr.push(s);
      }
      this.chunks.set(key, arr);
    }
    for (const [key, arr] of this.chunks) if (!want.has(key)) { for (const s of arr) { s.visible = false; this.pool.push(s); } this.chunks.delete(key); }
  }
}
