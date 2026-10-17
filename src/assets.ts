import { Assets, Rectangle, Texture } from 'pixi.js';
import { GroundTheme, MAPS, WEAPONS } from './data';
import { rand, TAU } from './util';

export interface AnimDef { frames: number; frame_width: number; frame_height: number; fps?: number; loop?: boolean }
export interface Anim { tex: Texture[]; fps: number; loop: boolean; w: number; h: number; strip: string }
interface Manifest {
  characters: Record<string, Record<string, AnimDef>>;
  enemies: Record<string, Record<string, AnimDef>>;
  bosses: Record<string, Record<string, AnimDef>>;
  fx: Record<string, AnimDef>;
  weapons: string[];
}

export const BASE = import.meta.env.BASE_URL + 'assets/';

export const A = {
  manifest: null as unknown as Manifest,
  chars: {} as Record<string, Record<string, Anim>>,
  enemies: {} as Record<string, Record<string, Anim>>,
  fx: {} as Record<string, Anim>,
  weapon: {} as Record<string, Texture>,
  glow: null as unknown as Texture,
  spark: null as unknown as Texture,
  ring: null as unknown as Texture,
  shadow: null as unknown as Texture,
  coin: null as unknown as Texture,
  chest: null as unknown as Texture,
  gems: [] as Texture[],
  fruits: [] as Texture[], arrow: null as unknown as Texture, ground: null as unknown as Texture, grounds: {} as Record<string, Texture>, groundUrls: {} as Record<string, string>,
  orb: null as unknown as Texture,
};

function sliceStrip(base: Texture, d: AnimDef, strip: string): Anim {
  const tex: Texture[] = [];
  for (let i = 0; i < d.frames; i++) {
    tex.push(new Texture({ source: base.source, frame: new Rectangle(i * d.frame_width, 0, d.frame_width, d.frame_height) }));
  }
  return { tex, fps: d.fps ?? 14, loop: d.loop ?? false, w: d.frame_width, h: d.frame_height, strip };
}

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')!];
}
function toTex(c: HTMLCanvasElement): Texture {
  const t = Texture.from(c);
  t.source.scaleMode = 'linear';
  return t;
}

function makeGenerated() {
  // yumuşak parıltı
  let [c, g] = canvas(64, 64);
  let gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.7)');
  gr.addColorStop(0.6, 'rgba(255,255,255,0.18)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  A.glow = toTex(c);

  // kıvılcım
  [c, g] = canvas(16, 16);
  gr = g.createRadialGradient(8, 8, 0, 8, 8, 8);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 16, 16);
  A.spark = toTex(c);

  // meyveler (can iyileştirir)
  const fruit = (draw: (g: CanvasRenderingContext2D) => void) => { const [fc, fg] = canvas(48, 48); fg.lineJoin = 'round'; fg.lineCap = 'round'; fg.fillStyle = 'rgba(0,0,0,0.3)'; fg.beginPath(); fg.ellipse(24, 43, 13, 4, 0, 0, 7); fg.fill(); draw(fg); A.fruits.push(toTex(fc)); };
  const shine = (g: CanvasRenderingContext2D, x: number, y: number, r: number) => { g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.ellipse(x, y, r, r * 0.55, -0.7, 0, 7); g.fill(); };
  const leaf = (g: CanvasRenderingContext2D, x: number, y: number) => { g.fillStyle = '#4fae45'; g.strokeStyle = '#1f5a22'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(x, y, 7, 3.5, -0.5, 0, 7); g.fill(); g.stroke(); g.strokeStyle = '#5a3a1a'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(24, 12); g.lineTo(26, 5); g.stroke(); };
  // elma
  fruit((g) => { const gr = g.createRadialGradient(19, 22, 2, 24, 27, 17); gr.addColorStop(0, '#ff7a6a'); gr.addColorStop(1, '#b3162a'); g.fillStyle = gr; g.strokeStyle = '#5a0a14'; g.lineWidth = 2; g.beginPath(); g.moveTo(24, 14); g.bezierCurveTo(34, 8, 42, 18, 38, 30); g.bezierCurveTo(35, 41, 28, 40, 24, 38); g.bezierCurveTo(20, 40, 13, 41, 10, 30); g.bezierCurveTo(6, 18, 14, 8, 24, 14); g.closePath(); g.fill(); g.stroke(); shine(g, 17, 20, 4); leaf(g, 30, 9); });
  // yeşil elma / armut
  fruit((g) => { const gr = g.createRadialGradient(20, 24, 2, 24, 28, 16); gr.addColorStop(0, '#d8f58a'); gr.addColorStop(1, '#5a9a2a'); g.fillStyle = gr; g.strokeStyle = '#2a5a14'; g.lineWidth = 2; g.beginPath(); g.moveTo(24, 10); g.bezierCurveTo(30, 10, 31, 20, 36, 28); g.bezierCurveTo(40, 38, 30, 42, 24, 41); g.bezierCurveTo(18, 42, 8, 38, 12, 28); g.bezierCurveTo(17, 20, 18, 10, 24, 10); g.closePath(); g.fill(); g.stroke(); shine(g, 18, 26, 4); leaf(g, 31, 8); });
  // portakal
  fruit((g) => { const gr = g.createRadialGradient(19, 24, 2, 24, 27, 17); gr.addColorStop(0, '#ffc060'); gr.addColorStop(1, '#e06a10'); g.fillStyle = gr; g.strokeStyle = '#7a3004'; g.lineWidth = 2; g.beginPath(); g.arc(24, 27, 15, 0, 7); g.fill(); g.stroke(); shine(g, 18, 21, 4); g.fillStyle = '#3f9a3a'; g.beginPath(); g.ellipse(24, 12.5, 6, 2.5, 0, 0, 7); g.fill(); });
  // kiraz
  fruit((g) => { g.strokeStyle = '#3f7a2a'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(16, 28); g.quadraticCurveTo(20, 12, 30, 6); g.moveTo(32, 30); g.quadraticCurveTo(30, 14, 30, 6); g.stroke(); for (const [x, y] of [[16, 32], [32, 34]]) { const gr = g.createRadialGradient(x - 3, y - 3, 1, x, y, 9); gr.addColorStop(0, '#ff6a7a'); gr.addColorStop(1, '#a00a2a'); g.fillStyle = gr; g.strokeStyle = '#4a0614'; g.lineWidth = 1.8; g.beginPath(); g.arc(x, y, 8.5, 0, 7); g.fill(); g.stroke(); shine(g, x - 3, y - 3, 2.6); } });
  // üzüm
  fruit((g) => { g.strokeStyle = '#5a3a1a'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(24, 16); g.lineTo(26, 6); g.stroke(); leaf(g, 31, 8); const pts: [number, number][] = [[16, 20], [26, 20], [34, 22], [20, 28], [30, 29], [24, 36], [12, 28]]; for (const [x, y] of pts) { const gr = g.createRadialGradient(x - 2, y - 2, 1, x, y, 7); gr.addColorStop(0, '#c08aff'); gr.addColorStop(1, '#5a1aa8'); g.fillStyle = gr; g.strokeStyle = '#2a0a5a'; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, 6.5, 0, 7); g.fill(); g.stroke(); shine(g, x - 2, y - 2, 2); } });

  // ok
  [c, g] = canvas(56, 16);
  g.strokeStyle = '#7a5230'; g.lineWidth = 3; g.beginPath(); g.moveTo(6, 8); g.lineTo(44, 8); g.stroke();
  g.fillStyle = '#e8eef8'; g.strokeStyle = '#4a5468'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(54, 8); g.lineTo(42, 2.5); g.lineTo(42, 13.5); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#d8d8e8'; for (const x of [4, 9]) { g.beginPath(); g.moveTo(x, 8); g.lineTo(x - 3, 2); g.lineTo(x + 4, 6); g.closePath(); g.fill(); g.beginPath(); g.moveTo(x, 8); g.lineTo(x - 3, 14); g.lineTo(x + 4, 10); g.closePath(); g.fill(); }
  A.arrow = toTex(c);

  // çekirdekli orb (mermi)
  [c, g] = canvas(64, 64);
  gr = g.createRadialGradient(32, 32, 0, 32, 32, 30);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.18, 'rgba(255,255,255,0.95)');
  gr.addColorStop(0.32, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  A.orb = toTex(c);

  // halka (aura / nova / uyarı)
  [c, g] = canvas(256, 256);
  gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, 'rgba(255,255,255,0.10)'); gr.addColorStop(0.7, 'rgba(255,255,255,0.14)');
  gr.addColorStop(0.9, 'rgba(255,255,255,0.55)'); gr.addColorStop(0.96, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(128, 128, 128, 0, TAU); g.fill();
  A.ring = toTex(c);

  // gölge
  [c, g] = canvas(64, 24);
  g.translate(32, 12); g.scale(1, 0.38);
  gr = g.createRadialGradient(0, 0, 0, 0, 0, 30);
  gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(0.7, 'rgba(0,0,0,0.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 30, 0, TAU); g.fill();
  A.shadow = toTex(c);

  // XP kristalleri (mavi, yeşil, kırmızı)
  const gemColors: [string, string, string][] = [['#9fd8ff', '#3a8dff', '#1b4fb5'], ['#b8ffc8', '#3fd96b', '#16813a'], ['#ffb3b3', '#ff4a4a', '#9b1a2a']];
  for (const [hi, mid, lo] of gemColors) {
    [c, g] = canvas(28, 34);
    g.translate(14, 17);
    g.beginPath(); g.moveTo(0, -14); g.lineTo(10, -2); g.lineTo(0, 14); g.lineTo(-10, -2); g.closePath();
    const lg = g.createLinearGradient(-10, -14, 10, 14);
    lg.addColorStop(0, hi); lg.addColorStop(0.5, mid); lg.addColorStop(1, lo);
    g.fillStyle = lg; g.fill();
    g.lineWidth = 1.5; g.strokeStyle = 'rgba(255,255,255,0.8)'; g.stroke();
    g.beginPath(); g.moveTo(0, -14); g.lineTo(3, -2); g.lineTo(0, 14); g.lineTo(-10, -2); g.closePath();
    g.fillStyle = 'rgba(255,255,255,0.25)'; g.fill();
    A.gems.push(toTex(c));
  }

  // altın
  [c, g] = canvas(22, 22);
  gr = g.createRadialGradient(9, 8, 1, 11, 11, 10);
  gr.addColorStop(0, '#fff3b0'); gr.addColorStop(0.6, '#ffc83a'); gr.addColorStop(1, '#b07a12');
  g.fillStyle = gr; g.beginPath(); g.arc(11, 11, 9, 0, TAU); g.fill();
  g.strokeStyle = '#6d4a08'; g.lineWidth = 1.5; g.stroke();
  g.fillStyle = 'rgba(120,80,10,0.55)'; g.fillRect(10, 6, 2, 10);
  A.coin = toTex(c);

  // sandık
  [c, g] = canvas(56, 48);
  const wood = g.createLinearGradient(0, 8, 0, 44);
  wood.addColorStop(0, '#8a5a2b'); wood.addColorStop(1, '#4c2e14');
  g.fillStyle = wood; g.strokeStyle = '#1d1008'; g.lineWidth = 2;
  g.beginPath(); g.roundRect(4, 18, 48, 26, 3); g.fill(); g.stroke();
  const lid = g.createLinearGradient(0, 4, 0, 20);
  lid.addColorStop(0, '#a56f36'); lid.addColorStop(1, '#6b4220');
  g.fillStyle = lid; g.beginPath(); g.moveTo(4, 20); g.quadraticCurveTo(28, -6, 52, 20); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#e6b84a'; g.strokeStyle = '#5a3d0a';
  for (const x of [12, 40]) { g.fillRect(x, 8, 5, 36); g.strokeRect(x, 8, 5, 36); }
  g.beginPath(); g.roundRect(23, 22, 10, 12, 2); g.fill(); g.stroke();
  g.fillStyle = '#2a1a06'; g.fillRect(27, 26, 2, 5);
  A.chest = toTex(c);

  for (const m of MAPS) { A.grounds[m.id] = makeGround(m.theme); }
  A.ground = A.grounds[MAPS[0].id];
}

export async function loadAll(onProgress: (p: number, label: string) => void) {
  const man: Manifest = await (await fetch(BASE + 'manifest.json')).json();
  A.manifest = man;
  makeGenerated();

  type Job = () => Promise<void>;
  const jobs: Job[] = [];
  const loadTex = (url: string) => Assets.load<Texture>({ src: url, data: { scaleMode: 'linear' } });

  for (const [id, anims] of Object.entries(man.characters)) {
    A.chars[id] = {};
    for (const [name, d] of Object.entries(anims)) jobs.push(async () => { A.chars[id][name] = sliceStrip(await loadTex(`${BASE}characters/${id}/${name}.png`), d, `characters/${id}/${name}.png`); });
  }
  for (const grp of ['enemies', 'bosses'] as const) {
    for (const [id, anims] of Object.entries(man[grp])) {
      A.enemies[id] = {};
      for (const [name, d] of Object.entries(anims)) jobs.push(async () => { A.enemies[id][name] = sliceStrip(await loadTex(`${BASE}${grp}/${id}/${name}.png`), d, `${grp}/${id}/${name}.png`); });
    }
  }
  for (const [id, d] of Object.entries(man.fx)) {
    jobs.push(async () => { A.fx[id] = sliceStrip(await loadTex(`${BASE}fx/${id}.png`), { ...d, fps: 24 }, `fx/${id}.png`); });
  }
  const icons = new Set(Object.values(WEAPONS).map((w) => w.icon));
  for (const ic of icons) jobs.push(async () => { A.weapon[ic] = await loadTex(`${BASE}weapons/${ic}.png`); });

  let done = 0; const total = jobs.length;
  const queue = jobs.slice();
  const worker = async () => {
    while (queue.length) {
      const j = queue.shift()!;
      await j();
      done++; onProgress(done / total, 'Karanlık yükleniyor…');
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));
  onProgress(1, 'Hazır');
}

export function weaponIconUrl(icon: string) { return `${BASE}weapons/${icon}.png`; }

function makeGround(th: GroundTheme): Texture {
  let c: HTMLCanvasElement, g: CanvasRenderingContext2D;
  const N0 = 512; const T0 = 128;
  const N = N0; const T = T0;
  [c, g] = canvas(N, N);
  g.fillStyle = th.base; g.fillRect(0, 0, N, N);
  for (let ty = 0; ty < N / T; ty++) for (let tx = 0; tx < N / T; tx++) {
    const jx = rand(-3, 3), jy = rand(-3, 3);
    const v = rand(-6, 6);
    g.fillStyle = `rgb(${th.tile[0] + v},${th.tile[1] + v},${th.tile[2] + v})`;
    g.fillRect(tx * T + 3 + jx, ty * T + 3 + jy, T - 6, T - 6);
    g.fillStyle = 'rgba(255,255,255,0.035)'; g.fillRect(tx * T + 3 + jx, ty * T + 3 + jy, T - 6, 2);
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(tx * T + 3 + jx, ty * T + T - 5 + jy, T - 6, 2);
  }
  // lekeler (kenarlardan taşan kısımlar karşı tarafa da çizilir)
  const blot = (x: number, y: number, r: number, col: string) => {
    for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) {
      const gg = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
      gg.addColorStop(0, col); gg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gg; g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
    }
  };
  for (let i = 0; i < 26; i++) blot(rand(N), rand(N), rand(30, 90), `rgba(${Math.random() < 0.5 ? th.blotDark : th.blotLight},${rand(0.12, 0.3)})`);
  for (let i = 0; i < 7; i++) blot(rand(N), rand(N), rand(20, 50), `rgba(${th.accent},${th.accentA})`);
  // çatlaklar
  g.strokeStyle = `rgba(0,0,0,${th.crack})`; g.lineWidth = 1.5;
  for (let i = 0; i < 14; i++) {
    let x = rand(N), y = rand(N); g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 6; k++) { x += rand(-14, 14); y += rand(4, 18); g.lineTo(x, y); }
    g.stroke();
  }
  // gren
  for (let i = 0; i < 5200; i++) {
    g.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.04)';
    g.fillRect(rand(N), rand(N), 1.5, 1.5);
  }
  A.groundUrls[th.base] = c.toDataURL('image/jpeg', 0.8);
  const gt = Texture.from(c); gt.source.scaleMode = 'linear'; gt.source.addressMode = 'repeat';
  return gt;
}
