import { Application, Container, Graphics, Sprite, Texture, TilingSprite } from 'pixi.js';
import { A, Anim } from './assets';
import {
  CHARACTERS, CharDef, ENEMIES, ENEMY_NAMES, EnemyDef, MAPS, MapDef, MAX_PASSIVES, MAX_WEAPONS, META, PASSIVES, PlayerStats, WEAPONS, WeaponDef, baseStats,
} from './data';
import { Fx } from './fx';
import { save } from './save';
import { Decor } from './decor';
import { SpatialHash } from './spatial';
import { clamp, pick, rand, TAU } from './util';
import { WeaponInst, updateWeapon } from './weapons';

const MAX_ENEMIES = 900;
const MAX_ITEMS = 700;

export class Enemy {
  idx = 0; uid = 0; active = false; dying = false; def!: EnemyDef; x = 0; y = 0; hp = 1; maxHp = 1; dmg = 1; speed = 1; r = 10;
  kx = 0; ky = 0; flash = 0; animT = 0; dieT = 0; slowT = 0; slowF = 1; face = 1; h = 60; boss = false; bossName = ''; bossT = 4; slamT = 0; slamX = 0; slamY = 0; slamN = 0;
  hitT = new Float32Array(10);
  anims!: Record<string, Anim>; walk!: Anim; death!: Anim;
  sprite: Sprite; shadow: Sprite;
  constructor(sprite: Sprite, shadow: Sprite) { this.sprite = sprite; this.shadow = shadow; }
}

interface Proj {
  active: boolean; x: number; y: number; vx: number; vy: number; dmg: number; pierce: number; life: number; r: number; homing: number;
  trail: number; hit: number[]; sprite: Sprite; rot: boolean; spin: number; boom: number; ret: boolean; maxLife: number; turned: boolean; tint: number;
}
interface Item { active: boolean; kind: 'gem' | 'coin' | 'chest' | 'heart'; value: number; x: number; y: number; vx: number; vy: number; magnet: boolean; sprite: Sprite; t: number }

export interface Option { key: string; kind: 'weapon' | 'passive' | 'heal' | 'gold'; id: string; isNew: boolean; level: number; name: string; desc: string; icon?: string; glyph?: string; color?: string }
export interface ChestResult { evolved: { from: WeaponDef; to: WeaponDef }[]; upgrades: Option[] }
export interface RunResult { time: number; kills: number; level: number; gold: number; won: boolean; killer: string; map: MapDef; weapons: { def: WeaponDef; level: number }[]; char: CharDef }
export interface Hooks {
  onLevelUp(opts: Option[], rerolls: number, banishes: number): void;
  onChest(res: ChestResult): void;
  onEnd(res: RunResult): void;
  banner(title: string, sub?: string, kind?: 'boss' | 'info' | 'danger'): void;
  onHurt(): void;
}

type State = 'idle' | 'run' | 'levelup' | 'chest' | 'dead' | 'won';

export class Game {
  app: Application; hooks: Hooks;
  world = new Container(); ground!: TilingSprite;
  layers = { shadow: new Container(), low: new Container(), items: new Container(), ent: new Container(), top: new Container(), text: new Container(), bars: new Container() };
  fx: Fx; decor!: Decor; hpBar = new Graphics(); light!: Sprite;
  hash = new SpatialHash(96, 4096, MAX_ENEMIES);
  enemies: Enemy[] = []; projs: Proj[] = []; items: Item[] = [];
  qOrbit = new Int32Array(256); qAura = new Int32Array(MAX_ENEMIES); qTmp = new Int32Array(MAX_ENEMIES); qSep = new Int32Array(64); qHit = new Int32Array(128);
  state: State = 'idle'; paused = false;
  t = 0; kills = 0; gold = 0; level = 1; xp = 0; xpNeed = 5; pending = 0; hp = 100; uidCounter = 1;
  char: CharDef = CHARACTERS[0]; map: MapDef = MAPS[0]; stats: PlayerStats = baseStats();
  weapons: WeaponInst[] = []; passives = new Map<string, number>();
  rerolls = 2; banishes = 2; banished = new Set<string>(); curOptions: Option[] = [];
  player = { x: 0, y: 0, vx: 0, vy: 0, r: 14, fx: 1, fy: 0, face: 1, inv: 0, hurtT: 0, sprite: null as unknown as Sprite, shadow: null as unknown as Sprite, anims: null as unknown as Record<string, Anim>, animT: 0, dead: false, moving: false };
  keys = new Set<string>();
  waveAcc = new Map<number, number>(); eliteIdx = 0; bossIdx = 0; nextSwarm = 75; nextHeal = 120;
  shakeAmt = 0; zoom = 1; boss: Enemy | null = null; allocScan = 0; timeScale = 1; accum = 0;
  godMode = false; revivesUsed = 0;

  constructor(app: Application, hooks: Hooks) {
    this.app = app; this.hooks = hooks;
    this.ground = new TilingSprite({ texture: A.ground, width: app.screen.width, height: app.screen.height });
    app.stage.addChild(this.ground, this.world);
    this.layers.ent.sortableChildren = true; this.layers.top.sortableChildren = true;
    for (const l of [this.layers.shadow, this.layers.low, this.layers.items, this.layers.ent, this.layers.top, this.layers.text, this.layers.bars]) this.world.addChild(l);
    this.layers.bars.addChild(this.hpBar);
    this.light = new Sprite(A.glow); this.light.anchor.set(0.5); this.light.blendMode = 'add'; this.light.tint = 0xffc78a; this.light.alpha = 0.16; this.light.scale.set(11);
    this.layers.low.addChild(this.light);
    this.decor = new Decor(this.layers.shadow, this.layers.ent);
    this.fx = new Fx(this.layers.low, this.layers.top, this.layers.text);
    window.addEventListener('keydown', (e) => { this.keys.add(e.code); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault(); });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
  }

  // ───────────── Başlat / sıfırla ─────────────
  start(char: CharDef, map: MapDef = this.map) {
    this.char = char; this.map = map;
    this.ground.texture = A.grounds[map.id]; this.app.renderer.background.color = map.theme.bg; this.decor.setMap(map.id);
    for (const e of this.enemies) this.releaseEnemy(e);
    for (const p of this.projs) { p.active = false; p.sprite.visible = false; }
    for (const i of this.items) { i.active = false; i.sprite.visible = false; }
    for (const w of this.weapons) w.destroy(this);
    this.weapons = []; this.passives.clear(); this.fx.clear();
    this.t = 0; this.kills = 0; this.gold = 0; this.level = 1; this.xp = 0; this.xpNeed = this.needFor(1); this.pending = 0;
    this.banished.clear(); this.waveAcc.clear(); this.eliteIdx = 0; this.bossIdx = 0; this.nextSwarm = 75; this.nextHeal = 20;
    this.boss = null; this.shakeAmt = 0; this.accum = 0; this.paused = false; this.revivesUsed = 0;
    const p = this.player;
    p.x = p.y = p.vx = p.vy = 0; p.fx = 1; p.fy = 0; p.face = 1; p.inv = 0; p.hurtT = 0; p.dead = false; p.animT = 0;
    p.anims = A.chars[char.sprite];
    if (!p.sprite) {
      p.sprite = new Sprite(); p.sprite.anchor.set(0.5, 0.94); this.layers.ent.addChild(p.sprite);
      p.shadow = new Sprite(A.shadow); p.shadow.anchor.set(0.5); this.layers.shadow.addChild(p.shadow);
    }
    p.sprite.visible = true; p.sprite.texture = p.anims.idle.tex[0]; p.sprite.tint = 0xffffff; p.sprite.alpha = 1;
    this.stats = baseStats(); this.recompute(true);
    this.hp = this.stats.maxHp; this.rerolls = this.stats.rerolls; this.banishes = this.stats.banishes;
    this.addWeapon(WEAPONS[char.weapon]);
    this.state = 'run';
  }

  // ───────────── İstatistikler ─────────────
  recompute(initial = false) {
    const old = this.stats.maxHp;
    const s = baseStats();
    const m = this.char.mods as Record<string, number>;
    for (const k of Object.keys(m)) {
      if (k === 'hpAdd') s.maxHp += m[k];
      else if (k === 'regen' || k === 'armor' || k === 'amount' || k === 'revives') (s as unknown as Record<string, number>)[k] += m[k];
      else (s as unknown as Record<string, number>)[k] *= m[k];
    }
    for (const md of META) { const r = save.ranks[md.id] ?? 0; if (r) md.apply(s, r); }
    for (const [id, l] of this.passives) PASSIVES[id].apply(s, l);
    s.greed *= this.map.gold;
    s.maxHp = Math.round(s.maxHp);
    this.stats = s;
    if (!initial && s.maxHp > old) this.hp += s.maxHp - old;
    this.hp = Math.min(this.hp, s.maxHp);
  }

  needFor(l: number) { return Math.floor(4 + 5 * (l - 1) + 0.24 * (l - 1) * (l - 1)); }

  addWeapon(def: WeaponDef) {
    const used = new Set(this.weapons.map((w) => w.slot));
    let slot = 0; while (used.has(slot)) slot++;
    this.weapons.push(new WeaponInst(def, slot));
  }

  // ───────────── Havuzlar ─────────────
  private allocEnemy(): Enemy | null {
    const n = this.enemies.length;
    for (let k = 0; k < n; k++) {
      const i = (this.allocScan + k) % n;
      if (!this.enemies[i].active) { this.allocScan = i + 1; return this.enemies[i]; }
    }
    if (n >= MAX_ENEMIES) return null;
    const s = new Sprite(); s.anchor.set(0.5, 0.95); this.layers.ent.addChild(s); s.visible = false;
    const sh = new Sprite(A.shadow); sh.anchor.set(0.5); sh.visible = false; this.layers.shadow.addChild(sh);
    const e = new Enemy(s, sh); e.idx = n; this.enemies.push(e); return e;
  }
  private releaseEnemy(e: Enemy) { e.active = false; e.dying = false; e.sprite.visible = false; e.shadow.visible = false; }
  activeEnemies() { let n = 0; for (const e of this.enemies) if (e.active && !e.dying) n++; return n; }

  spawnEnemy(id: string, x: number, y: number, hpMul = 1, boss = false, hpAbs = 0): Enemy | null {
    const def = ENEMIES[id]; const e = this.allocEnemy(); if (!e) return null;
    e.active = true; e.dying = false; e.def = def; e.uid = this.uidCounter++;
    e.x = x; e.y = y; e.kx = e.ky = 0; e.flash = 0; e.slowT = 0; e.slowF = 1; e.dieT = 0; e.animT = rand(10);
    const tm = (this.t / 60) * this.map.pace;
    e.maxHp = e.hp = hpAbs > 0 ? hpAbs : Math.ceil(def.hp * hpMul * this.map.hpMul * (1 + tm * 0.22 + tm * tm * 0.01));
    e.bossT = 4; e.slamT = 0; e.slamN = 0;
    e.dmg = def.dmg * this.map.dmgMul * (1 + tm * 0.035); e.speed = def.speed * (1 + Math.min(tm / 25, 0.22)) * rand(0.92, 1.08);
    e.r = def.r; e.boss = !!def.boss; e.hitT.fill(0);
    e.anims = A.enemies[id]; e.walk = e.anims[def.anim ?? 'walk'] ?? e.anims.walk; e.death = e.anims.death;
    e.h = e.walk.h * def.scale;
    const s = e.sprite; s.visible = true; s.tint = 0xffffff; s.alpha = 1; s.texture = e.walk.tex[0]; s.scale.set(def.scale);
    e.shadow.visible = true; e.shadow.alpha = 1; e.shadow.scale.set(Math.max(0.5, def.r / 14));
    return e;
  }

  spawnProj(o: { x: number; y: number; vx: number; vy: number; dmg: number; pierce: number; life: number; r: number; tex: Texture; scale: number; tint: number; add: boolean; homing: number; trail: number; rot: boolean; boom?: number; ret?: boolean }) {
    let p = this.projs.find((q) => !q.active);
    if (!p) {
      if (this.projs.length > 400) return;
      const s = new Sprite(); s.anchor.set(0.5); this.layers.top.addChild(s);
      p = { active: false, x: 0, y: 0, vx: 0, vy: 0, dmg: 0, pierce: 1, life: 1, r: 8, homing: 0, trail: 0, hit: [], sprite: s, rot: false, spin: 0, boom: 0, ret: false, maxLife: 1, turned: false, tint: 0xffffff }; this.projs.push(p);
    }
    p.active = true; p.x = o.x; p.y = o.y; p.vx = o.vx; p.vy = o.vy; p.dmg = o.dmg; p.pierce = o.pierce; p.life = o.life; p.r = o.r; p.homing = o.homing; p.trail = o.trail; p.hit.length = 0; p.rot = o.rot; p.boom = o.boom ?? 0; p.ret = !!o.ret; p.maxLife = o.life; p.turned = false; p.tint = o.tint;
    const s = p.sprite; s.visible = true; s.texture = o.tex; s.scale.set(o.scale); s.tint = o.tint; s.blendMode = o.add ? 'add' : 'normal'; s.alpha = 1; s.zIndex = 99999;
    s.rotation = o.rot ? Math.atan2(o.vy, o.vx) : 0;
  }

  dropItem(kind: Item['kind'], value: number, x: number, y: number, scatter = 30) {
    if (kind === 'gem') {
      let n = 0; for (const i of this.items) if (i.active && i.kind === 'gem') n++;
      if (n > 480) { this.addXp(value); return; }
    }
    let it = this.items.find((q) => !q.active);
    if (!it) {
      if (this.items.length >= MAX_ITEMS) { if (kind === 'gem') this.addXp(value); return; }
      const s = new Sprite(); s.anchor.set(0.5); this.layers.items.addChild(s);
      it = { active: false, kind, value, x, y, vx: 0, vy: 0, magnet: false, sprite: s, t: 0 }; this.items.push(it);
    }
    it.active = true; it.kind = kind; it.value = value; it.x = x; it.y = y; it.magnet = false; it.t = 0;
    const a = rand(TAU), sp = rand(0.3, 1) * scatter * 3; it.vx = Math.cos(a) * sp; it.vy = Math.sin(a) * sp;
    const s = it.sprite; s.visible = true; s.alpha = 1; s.rotation = 0;
    if (kind === 'gem') { s.texture = A.gems[value >= 25 ? 2 : value >= 5 ? 1 : 0]; s.scale.set(0.55 + Math.min(0.5, value / 80)); s.anchor.set(0.5); }
    else if (kind === 'coin') { s.texture = A.coin; s.scale.set(0.8); }
    else if (kind === 'chest') { s.texture = A.chest; s.scale.set(1.2); it.vx = it.vy = 0; }
    else { s.texture = A.fruits[value % A.fruits.length]; s.scale.set(0.85); }
  }

  // ───────────── Sorgular ─────────────
  queryEnemies(x: number, y: number, r: number, out: Int32Array) { return this.hash.query(x, y, r + 30, out); }

  nearestEnemies(x: number, y: number, r: number, k: number): Enemy[] {
    const best: { e: Enemy; d: number }[] = []; const r2 = r * r;
    for (const e of this.enemies) {
      if (!e.active || e.dying) continue;
      const d = (e.x - x) ** 2 + (e.y - y) ** 2; if (d > r2) continue;
      if (best.length < k) { best.push({ e, d }); best.sort((a, b) => a.d - b.d); }
      else if (d < best[best.length - 1].d) { best[best.length - 1] = { e, d }; best.sort((a, b) => a.d - b.d); }
    }
    return best.map((b) => b.e);
  }

  randomEnemies(x: number, y: number, r: number, k: number): Enemy[] {
    const c: Enemy[] = []; const r2 = r * r;
    for (const e of this.enemies) if (e.active && !e.dying && (e.x - x) ** 2 + (e.y - y) ** 2 < r2) c.push(e);
    for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; }
    return c.slice(0, k);
  }

  /** Menzildeki canlı boss (yoksa null). Şimşek/göktaşı gibi rastgele hedefleyen silahlar ilk atışını buna yöneltir. */
  bossInRange(x: number, y: number, r: number): Enemy | null {
    const b = this.boss;
    return b && b.active && !b.dying && (b.x - x) ** 2 + (b.y - y) ** 2 <= r * r ? b : null;
  }

  /** (x,y) çevresindeki r yarıçaplı bölgedeki düşmanların toplam canı. Boss sayılmaz: canı yoğunluğu domine eder, ona zaten ilk atış gider. */
  hpDensity(x: number, y: number, r: number): number {
    const n = this.hash.query(x, y, r, this.qTmp); const r2 = r * r; let sum = 0;
    for (let i = 0; i < n; i++) {
      const e = this.enemies[this.qTmp[i]];
      if (e.active && !e.dying && !e.boss && (e.x - x) ** 2 + (e.y - y) ** 2 <= r2) sum += e.hp;
    }
    return sum;
  }

  /** Menzildeki rastgele aday düşmanlardan, çevresindeki toplam canı en yüksek olanları seçer (birbirinden en az minSep uzakta). */
  hpTargets(x: number, y: number, range: number, k: number, minSep: number, exclude?: Enemy): Enemy[] {
    if (k <= 0) return [];
    const scored = this.randomEnemies(x, y, range, 24).filter((e) => e !== exclude)
      .map((e) => ({ e, s: this.hpDensity(e.x, e.y, 100) })).sort((a, b) => b.s - a.s);
    const out: Enemy[] = []; const sep2 = minSep * minSep;
    for (const c of scored) {
      if (out.length >= k) break;
      if (out.every((o) => (o.x - c.e.x) ** 2 + (o.y - c.e.y) ** 2 >= sep2)) out.push(c.e);
    }
    for (const c of scored) { if (out.length >= k) break; if (!out.includes(c.e)) out.push(c.e); }
    return out;
  }

  densePoint(px: number, py: number, range: number): { x: number; y: number } {
    const cand = this.randomEnemies(px, py, range, 10).filter((e) => !e.boss);
    let best = { x: px + rand(-220, 220), y: py + rand(-160, 160) }; let bs = -1;
    for (const e of cand) {
      const s = this.hpDensity(e.x, e.y, 100);
      if (s > bs) { bs = s; best = { x: e.x, y: e.y }; }
    }
    if (bs < 0) { const b = this.bossInRange(px, py, range); if (b) return { x: b.x, y: b.y }; } // boss'tan başka düşman yoksa boş yere düşmesin
    return best;
  }

  aoe(x: number, y: number, r: number, dmg: number, knock: number) {
    const n = this.queryEnemies(x, y, r, this.qHit);
    for (let i = 0; i < n; i++) {
      const e = this.enemies[this.qHit[i]]; if (e.dying) continue;
      const dx = e.x - x, dy = e.y - y; const d = Math.hypot(dx, dy) || 1;
      if (d > r + e.r * 0.6) continue;
      this.hurt(e, dmg, dx / d, dy / d, knock);
    }
  }

  // ───────────── Hasar ─────────────
  hurt(e: Enemy, dmg: number, kx: number, ky: number, knock: number) {
    if (e.dying || !e.active) return;
    e.hp -= dmg; e.flash = 0.1;
    const kf = e.boss ? 0.12 : e.r > 20 ? 0.45 : 1;
    e.kx += kx * knock * kf; e.ky += ky * knock * kf;
    this.fx.number(e.x, e.y - e.h * 0.75, String(Math.max(1, Math.ceil(dmg))), dmg >= 60 ? 0xffd45a : 0xffffff, dmg >= 60 ? 1.25 : 1);
    if (e.hp <= 0) this.kill(e);
  }

  kill(e: Enemy) {
    e.dying = true; e.dieT = 0; this.kills++;
    this.fx.play('anim/death_dust', e.x, e.y + 6, { scale: Math.max(0.35, e.r / 40), ay: 0.9, tint: 0x6f6585, add: true, alpha: 0.55, speed: 1.3 });
    const xp = e.def.xp;
    if (e.boss) {
      const n = Math.ceil(xp / 20);
      for (let i = 0; i < n; i++) this.dropItem('gem', 20, e.x + rand(-40, 40), e.y + rand(-30, 30), 60);
      this.dropItem('chest', 0, e.x, e.y);
      for (let i = 0; i < 8; i++) this.dropItem('coin', Math.max(1, Math.round(4 * this.stats.greed)), e.x, e.y, 70);
      this.fx.ring(e.x, e.y, 20, 260, { dur: 0.6, tint: 0xffd070 }); this.shake(9);
      if (this.boss === e) this.boss = null;
    } else {
      this.dropItem('gem', xp, e.x, e.y, 20);
      if (Math.random() < 0.012) this.dropItem('heart', Math.floor(rand(5)), e.x, e.y, 30);
      if (Math.random() < 0.035) this.dropItem('coin', Math.max(1, Math.round(this.stats.greed)), e.x, e.y, 30);
    }
  }

  lastHit = { src: '', dmg: 0 };
  hurtPlayer(dmg: number, src = '') {
    const p = this.player;
    if (p.inv > 0 || p.dead || this.godMode) return;
    const d = Math.min(Math.max(1, Math.round(dmg - this.stats.armor)), Math.ceil(this.stats.maxHp * 0.28));
    this.lastHit = { src, dmg: d };
    this.hp -= d; p.inv = d > this.stats.maxHp * 0.15 ? 1.0 : 0.65; p.hurtT = 0.25;
    this.shake(5); this.hooks.onHurt();
    this.fx.number(p.x, p.y - 70, String(d), 0xff5a5a, 1.2, true);
    this.fx.burst(p.x, p.y - 30, 8, { tint: 0xff4040, speed: 160, life: 0.4, size: 1 });
    if (this.hp <= 0) this.playerDie();
  }

  playerDie() {
    const p = this.player;
    if (this.stats.revives - this.revivesUsed > 0) {
      this.revivesUsed++;
      this.hp = this.stats.maxHp * 0.5; p.inv = 2.5;
      this.fx.ring(p.x, p.y, 20, 420, { dur: 0.7, tint: 0xffe9a0 });
      this.fx.play('anim/levelup_beam', p.x, p.y, { scale: 1.6, ay: 0.95, tint: 0xfff0b0 });
      this.aoe(p.x, p.y, 420, 40, 420); this.shake(10);
      this.hooks.banner('Yeniden Doğuş!', 'İkinci şans kullanıldı', 'info');
      return;
    }
    p.dead = true; this.state = 'dead';
    this.fx.burst(p.x, p.y - 30, 30, { tint: 0xff5050, speed: 260, life: 0.8, size: 1.2 });
    setTimeout(() => this.finish(false), 1500);
  }

  heal(n: number) { this.hp = Math.min(this.stats.maxHp, this.hp + n); }
  shake(a: number) { this.shakeAmt = Math.min(14, Math.max(this.shakeAmt, a)); }

  finish(won: boolean) {
    const res: RunResult = { time: this.t, kills: this.kills, level: this.level, gold: this.gold, won, map: this.map, killer: won ? '' : `${this.lastHit.src} · ${this.lastHit.dmg} hasar`, weapons: this.weapons.map((w) => ({ def: w.def, level: w.level })), char: this.char };
    this.hooks.onEnd(res);
  }

  // ───────────── Deneyim / seviye ─────────────
  addXp(v: number) {
    this.xp += v * this.stats.growth;
    while (this.xp >= this.xpNeed) {
      this.xp -= this.xpNeed; this.level++; this.pending++; this.heal(this.stats.maxHp * 0.08); this.xpNeed = this.needFor(this.level);
    }
    if (this.pending > 0 && this.state === 'run') this.openLevelUp();
  }

  openLevelUp() {
    this.state = 'levelup';
    const p = this.player;
    this.fx.play('anim/levelup_beam', p.x, p.y, { scale: 1.3, ay: 0.95, tint: 0xfff0b0 });
    this.fx.ring(p.x, p.y, 10, 230, { dur: 0.5, tint: 0xffe08a });
    this.aoe(p.x, p.y, 230, 0, 380);
    for (const it of this.items) if (it.active && it.kind === 'gem' && Math.hypot(it.x - p.x, it.y - p.y) < this.stats.magnet * 1.6) it.magnet = true;
    this.curOptions = this.rollOptions(3);
    this.hooks.onLevelUp(this.curOptions, this.rerolls, this.banishes);
  }

  private optWeapon(def: WeaponDef, level: number, isNew: boolean): Option {
    return { key: 'w:' + def.id, kind: 'weapon', id: def.id, isNew, level, name: def.name, desc: isNew ? def.desc : (def.notes[level - 2] ?? def.desc), icon: def.icon };
  }
  private optPassive(id: string, level: number, isNew: boolean): Option {
    const d = PASSIVES[id];
    return { key: 'p:' + id, kind: 'passive', id, isNew, level, name: d.name, desc: isNew ? d.desc : d.perLevel, glyph: d.glyph, color: d.color };
  }

  rollOptions(n: number): Option[] {
    const cand: { o: Option; w: number }[] = [];
    for (const w of this.weapons) if (!w.def.isEvolved && w.level < w.def.maxLevel) cand.push({ o: this.optWeapon(w.def, w.level + 1, false), w: 3 });
    // evrimleşmiş bir silahın temel hali de "sahip olunan" sayılır
    const owned = new Set(this.weapons.map((w) => w.def.id));
    for (const d of Object.values(WEAPONS)) if (d.evolvesTo && owned.has(d.evolvesTo)) owned.add(d.id);
    if (this.weapons.length < MAX_WEAPONS) for (const d of Object.values(WEAPONS)) if (!d.isEvolved && !owned.has(d.id)) cand.push({ o: this.optWeapon(d, 1, true), w: 1 });
    for (const [id, l] of this.passives) if (l < PASSIVES[id].maxLevel) cand.push({ o: this.optPassive(id, l + 1, false), w: 1.1 });
    if (this.passives.size < MAX_PASSIVES) for (const id of Object.keys(PASSIVES)) if (!this.passives.has(id)) cand.push({ o: this.optPassive(id, 1, true), w: 0.8 });
    const pool = cand.filter((c) => !this.banished.has(c.o.key));
    const out: Option[] = [];
    while (out.length < n && pool.length) {
      const tot = pool.reduce((a, c) => a + c.w, 0); let r = Math.random() * tot; let idx = 0;
      for (; idx < pool.length; idx++) { r -= pool[idx].w; if (r <= 0) break; }
      idx = Math.min(idx, pool.length - 1);
      out.push(pool[idx].o); pool.splice(idx, 1);
    }
    // her seçimde en az bir sahip olunan silah yükseltmesi çıksın (silahlar gücün ana kaynağı)
    const ups = cand.filter((c) => c.o.kind === 'weapon' && !c.o.isNew && !this.banished.has(c.o.key));
    if (ups.length && n >= 2 && !out.some((o) => o.kind === 'weapon' && !o.isNew)) out[out.length - 1] = ups[Math.floor(Math.random() * ups.length)].o;
    while (out.length < n) {
      out.push(out.length % 2 === 0
        ? { key: 'f:heal', kind: 'heal', id: 'heal', isNew: false, level: 0, name: 'Şifa İksiri', desc: 'Canının %30\'unu yeniler.', glyph: '✚', color: '#7ee07a' }
        : { key: 'f:gold', kind: 'gold', id: 'gold', isNew: false, level: 0, name: 'Altın Kesesi', desc: '+60 altın.', glyph: '¤', color: '#ffc83a' });
    }
    return out;
  }

  choose(o: Option) {
    this.applyOption(o);
    this.pending--;
    if (this.pending > 0) { this.openLevelUp(); return; }
    this.state = 'run';
  }

  applyOption(o: Option) {
    if (o.kind === 'weapon') {
      const w = this.weapons.find((q) => q.def.id === o.id);
      if (w) w.level++; else this.addWeapon(WEAPONS[o.id]);
    } else if (o.kind === 'passive') {
      this.passives.set(o.id, o.level); this.recompute();
    } else if (o.kind === 'heal') this.heal(this.stats.maxHp * 0.3);
    else { this.gold += Math.round(60 * this.stats.greed); }
  }

  reroll() {
    if (this.rerolls <= 0) return; this.rerolls--;
    this.curOptions = this.rollOptions(3); this.hooks.onLevelUp(this.curOptions, this.rerolls, this.banishes);
  }
  banish(o: Option) {
    if (this.banishes <= 0 || o.kind === 'heal' || o.kind === 'gold') return; this.banishes--; this.banished.add(o.key);
    this.curOptions = this.rollOptions(3); this.hooks.onLevelUp(this.curOptions, this.rerolls, this.banishes);
  }

  openChest() {
    const res: ChestResult = { evolved: [], upgrades: [] };
    for (const w of this.weapons) {
      const d = w.def;
      if (d.evolvesTo && w.level >= d.maxLevel && d.evolveWith && this.passives.has(d.evolveWith)) {
        const to = WEAPONS[d.evolvesTo]; res.evolved.push({ from: d, to });
        const slot = w.slot; w.destroy(this); const idx = this.weapons.indexOf(w); this.weapons[idx] = new WeaponInst(to, slot);
      }
    }
    if (!res.evolved.length) {
      for (let i = 0; i < 2; i++) {
        const opts = this.rollOptions(1).filter((o) => o.kind === 'weapon' || o.kind === 'passive');
        if (opts.length) { this.applyOption(opts[0]); res.upgrades.push(opts[0]); }
      }
      this.gold += Math.round(25 * this.stats.greed);
    }
    this.state = 'chest';
    this.hooks.onChest(res);
  }
  resume() { if (this.state === 'chest') { this.state = this.pending > 0 ? 'levelup' : 'run'; if (this.pending > 0) this.openLevelUp(); } }

  evolvableCount() { return this.weapons.filter((w) => w.def.evolvesTo && w.level >= w.def.maxLevel && w.def.evolveWith && this.passives.has(w.def.evolveWith)).length; }

  // ───────────── Ana döngü ─────────────
  frame(dtReal: number) {
    const dt = Math.min(dtReal, 0.05);
    if (this.state === 'run' && !this.paused) {
      this.accum += dt * this.timeScale;
      let steps = 0;
      while (this.accum >= 1 / 60 && steps < 6) { this.update(1 / 60); this.accum -= 1 / 60; steps++; }
    } else if (this.state === 'dead' || this.state === 'levelup' || this.state === 'chest' || this.state === 'won') {
      // animasyonlar için efektleri akıt
      if (this.state === 'dead') this.fx.update(dt);
    }
    this.render(dt);
  }

  private moveDir() {
    const k = this.keys; let x = 0, y = 0;
    if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1; if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
    if (k.has('KeyW') || k.has('ArrowUp')) y -= 1; if (k.has('KeyS') || k.has('ArrowDown')) y += 1;
    const l = Math.hypot(x, y); return l ? { x: x / l, y: y / l } : { x: 0, y: 0 };
  }

  update(dt: number) {
    this.t += dt; const p = this.player;
    // oyuncu
    const d = this.autoDir ? this.autoDir() : this.moveDir();
    const sp = this.stats.speed; const k = 1 - Math.exp(-14 * dt);
    p.vx += (d.x * sp - p.vx) * k; p.vy += (d.y * sp - p.vy) * k;
    p.x += p.vx * dt; p.y += p.vy * dt; p.moving = Math.hypot(d.x, d.y) > 0;
    if (p.moving) { p.fx = d.x; p.fy = d.y; if (Math.abs(d.x) > 0.1) p.face = d.x > 0 ? 1 : -1; }
    p.inv = Math.max(0, p.inv - dt); p.hurtT = Math.max(0, p.hurtT - dt);
    if (this.stats.regen > 0) this.heal(this.stats.regen * dt);

    // düşman uzamsal karması
    this.hash.clear();
    for (const e of this.enemies) if (e.active && !e.dying) this.hash.insert(e.idx, e.x, e.y);

    this.updateSpawns(dt);
    this.updateEnemies(dt);
    for (const w of this.weapons) updateWeapon(this, w, dt);
    this.updateProjs(dt);
    this.updateItems(dt);
    this.fx.update(dt);
    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 22);

    if (this.t >= this.map.minutes * 60 && this.state === 'run') {
      this.state = 'won'; this.hooks.banner('Şafak Söktü', 'Karanlığı yendin', 'info');
      setTimeout(() => this.finish(true), 900);
    }
  }

  autoDir?: () => { x: number; y: number };

  // ───────────── Doğurma ─────────────
  private ringPos(extra = 0) {
    const R = Math.hypot(this.app.screen.width, this.app.screen.height) / 2 / this.zoom + 70 + extra;
    const a = rand(TAU); return { x: this.player.x + Math.cos(a) * R, y: this.player.y + Math.sin(a) * R, a, R };
  }

  private updateSpawns(dt: number) {
    const t = this.t; const alive = this.activeEnemies();
    const cap = Math.min(MAX_ENEMIES - 60, 160 + t * 0.35);
    const dens = (1 + (t * this.map.pace) / 360) * Math.min(1, 0.35 + t / 100) * (this.map.spawn ?? 1);
    if (alive < cap) {
      this.map.waves.forEach((w, i) => {
        if (t < w.t0 || t > w.t1) return;
        let acc = (this.waveAcc.get(i) ?? 0) + w.rate * dens * dt;
        while (acc >= 1) {
          acc -= 1;
          const pos = this.ringPos(); const n = w.pack ?? 1;
          for (let k = 0; k < n; k++) this.spawnEnemy(w.id, pos.x + rand(-28, 28), pos.y + rand(-28, 28));
        }
        this.waveAcc.set(i, acc);
      });
    }
    // elit
    const ELITES = this.map.elites, BOSSES = this.map.bosses;
    if (this.eliteIdx < ELITES.length && t >= ELITES[this.eliteIdx].t) {
      const el = ELITES[this.eliteIdx++]; const pos = this.ringPos(); this.spawnEnemy(el.id, pos.x, pos.y, 1.5);
      this.hooks.banner('Elit düşman yaklaşıyor', undefined, 'danger');
    }
    // boss
    if (this.bossIdx < BOSSES.length && t >= BOSSES[this.bossIdx].t) {
      const b = BOSSES[this.bossIdx++]; const pos = this.ringPos(); const e = this.spawnEnemy(b.id, pos.x, pos.y, 1, true, b.hp);
      if (e) { e.bossName = b.name; this.boss = e; this.hooks.banner(b.name, 'uyandı', 'boss'); this.shake(6); }
    }
    // sürü
    if (t >= this.nextSwarm) {
      this.nextSwarm += 75;
      const sw = this.map.swarms; const ids = sw[Math.min(sw.length - 1, Math.floor((t / (this.map.minutes * 60)) * sw.length))];
      const id = pick(ids); const n = Math.min(70, 26 + Math.floor(t / 14)); const R = this.ringPos().R;
      for (let i = 0; i < n; i++) { const a = (i / n) * TAU; this.spawnEnemy(id, this.player.x + Math.cos(a) * R, this.player.y + Math.sin(a) * R); }
      this.hooks.banner('Sürü yaklaşıyor!', undefined, 'danger');
    }
    // zaman zaman iyileştirme
    if (t >= this.nextHeal) { this.nextHeal += 30; const pp = this.ringPos(-200); this.dropItem('heart', Math.floor(rand(5)), pp.x * 0.4 + this.player.x * 0.6, pp.y * 0.4 + this.player.y * 0.6); }
  }

  // ───────────── Düşmanlar ─────────────
  private updateEnemies(dt: number) {
    const p = this.player; const pr = p.r;
    const farR = Math.hypot(this.app.screen.width, this.app.screen.height) / 2 / this.zoom + 520;
    for (const e of this.enemies) {
      if (!e.active) continue;
      if (e.dying) {
        e.dieT += dt; e.animT += dt;
        e.x += e.kx * dt; e.y += e.ky * dt; e.kx *= 1 - 6 * dt; e.ky *= 1 - 6 * dt;
        if (e.dieT > e.death.tex.length / (e.death.fps * 2.4) + 0.05) this.releaseEnemy(e);
        continue;
      }
      let dx = p.x - e.x, dy = p.y - e.y; let d = Math.hypot(dx, dy) || 1;
      // çok uzaktakiler öne ışınlanır
      if (d > farR && !e.boss) { const pos = this.ringPos(); e.x = pos.x; e.y = pos.y; dx = p.x - e.x; dy = p.y - e.y; d = Math.hypot(dx, dy) || 1; }
      e.slowT = Math.max(0, e.slowT - dt); const sf = e.slowT > 0 ? e.slowF : 1;
      if (e.boss) this.bossAI(e, dt);
      const v = e.speed * sf * (e.boss && e.slamT > 0 ? 0.15 : 1); const nx = dx / d, ny = dy / d;
      e.x += (nx * v + e.kx) * dt; e.y += (ny * v + e.ky) * dt;
      const kd = 1 - Math.min(1, 9 * dt); e.kx *= kd; e.ky *= kd;
      e.flash = Math.max(0, e.flash - dt);
      // ayrışma
      if (!e.def.fly) {
        const n = this.hash.query(e.x, e.y, e.r * 1.4, this.qSep);
        for (let i = 0; i < n; i++) {
          const o = this.enemies[this.qSep[i]]; if (o === e || o.def.fly || o.dying) continue;
          const ox = e.x - o.x, oy = e.y - o.y; const min = (e.r + o.r) * 0.82; const dd2 = ox * ox + oy * oy;
          if (dd2 >= min * min || dd2 === 0) continue;
          const dd = Math.sqrt(dd2); const push = (min - dd) * (o.r / (e.r + o.r)) * 0.55;
          e.x += (ox / dd) * push; e.y += (oy / dd) * push;
        }
      }
      e.animT += dt * (0.7 + sf * 0.3);
      e.face = (dx >= 0 ? 1 : -1) * (e.def.faceRight ? 1 : -1);
      // temas hasarı
      const cr = e.r * 0.8 + pr;
      if (d < cr + 2) this.hurtPlayer(e.dmg, ENEMY_NAMES[e.def.id] ?? e.def.id);
    }
  }

  /** Boss özel saldırısı: işaretli alana yere vurma + ara sıra yardımcı çağırma */
  private bossAI(e: Enemy, dt: number) {
    const R = 78 + e.r; const p = this.player;
    if (e.slamT > 0) {
      e.slamT -= dt;
      if (Math.floor(e.slamT * 10) !== Math.floor((e.slamT + dt) * 10) && Math.floor(e.slamT * 10) % 3 === 0) this.fx.ring(e.slamX, e.slamY, R * 0.2, R, { dur: 0.5, tint: 0xff3a3a, a0: 0.55, low: true });
      if (e.slamT <= 0) {
        this.fx.play('skill/boom', e.slamX, e.slamY, { scale: (R * 2.2) / 256, ay: 0.6, tint: 0xff5a3a });
        this.fx.burst(e.slamX, e.slamY, 18, { tint: 0xff7a3a, speed: 260, life: 0.6, size: 1.2, g: 200 });
        this.shake(7);
        if (Math.hypot(p.x - e.slamX, p.y - e.slamY) < R + p.r) this.hurtPlayer(e.dmg * 1.15, (ENEMY_NAMES[e.def.id] ?? e.def.id) + ' (yere vurma)');
        if (e.slamN % 2 === 0) {
          const ids = this.map.waves.filter((w) => w.t0 <= this.t).map((w) => w.id); const n = Math.min(10, 5 + Math.floor(this.t / 150));
          if (ids.length && this.activeEnemies() < MAX_ENEMIES - 120) for (let i = 0; i < n; i++) { const a = (i / n) * TAU; this.spawnEnemy(pick(ids), e.x + Math.cos(a) * (e.r + 40), e.y + Math.sin(a) * (e.r + 40)); }
        }
        e.slamN++;
      }
      return;
    }
    e.bossT -= dt;
    if (e.bossT <= 0) {
      e.slamT = 1.7; e.slamX = p.x; e.slamY = p.y; e.bossT = Math.max(3.5, 7 - MAPS.indexOf(this.map) * 0.6);
      this.fx.ring(e.slamX, e.slamY, R * 0.2, R, { dur: 1.7, tint: 0xff2a2a, a0: 0.7, low: true });
    }
  }

  // ───────────── Mermiler ─────────────
  private updateProjs(dt: number) {
    for (const p of this.projs) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) { p.active = false; p.sprite.visible = false; continue; }
      if (p.homing) {
        let best: Enemy | null = null; let bd = 360 * 360;
        const n = this.hash.query(p.x, p.y, 360, this.qHit);
        for (let i = 0; i < n; i++) { const e = this.enemies[this.qHit[i]]; if (e.dying) continue; const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2; if (d < bd) { bd = d; best = e; } }
        if (best) {
          const sp = Math.hypot(p.vx, p.vy); const want = Math.atan2(best.y - p.y, best.x - p.x); const cur = Math.atan2(p.vy, p.vx);
          let df = want - cur; while (df > Math.PI) df -= TAU; while (df < -Math.PI) df += TAU;
          const na = cur + clamp(df, -p.homing * dt, p.homing * dt); p.vx = Math.cos(na) * sp; p.vy = Math.sin(na) * sp;
        }
      }
      if (p.ret && p.life < p.maxLife * 0.5) {
        if (!p.turned) { p.turned = true; p.hit.length = 0; p.pierce = 99; }
        const pl = this.player; const dx = pl.x - p.x, dy = (pl.y - 20) - p.y; const d = Math.hypot(dx, dy) || 1; const sp = Math.max(Math.hypot(p.vx, p.vy), 380);
        p.vx += (dx / d * sp - p.vx) * Math.min(1, 7 * dt); p.vy += (dy / d * sp - p.vy) * Math.min(1, 7 * dt);
        if (d < 24) { p.active = false; p.sprite.visible = false; continue; }
      }
      p.x += p.vx * dt; p.y += p.vy * dt;
      const n = this.hash.query(p.x, p.y, p.r, this.qHit);
      for (let i = 0; i < n && p.active; i++) {
        const e = this.enemies[this.qHit[i]]; if (e.dying || p.hit.includes(e.uid)) continue;
        const rr = p.r + e.r * 0.85; if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 > rr * rr) continue;
        p.hit.push(e.uid); const sp = Math.hypot(p.vx, p.vy) || 1;
        this.hurt(e, p.dmg, p.vx / sp, p.vy / sp, 70);
        this.fx.burst(p.x, p.y, 3, { tint: p.sprite.tint === 0xffffff ? 0xdde6ff : p.sprite.tint as number, speed: 120, life: 0.3, size: 0.8 });
        if (p.boom) {
          this.aoe(p.x, p.y, p.boom, p.dmg * 0.7, 140);
          this.fx.play('skill/boom', p.x, p.y, { scale: (p.boom * 2) / 256, ay: 0.6, tint: 0xff9a50 });
          this.fx.burst(p.x, p.y, 8, { tint: 0xffa040, speed: 200, life: 0.45, size: 1, g: 160 }); this.shake(2.5);
          p.active = false; p.sprite.visible = false; break;
        }
        p.pierce--; if (p.pierce <= 0) { p.active = false; p.sprite.visible = false; }
      }
      if (p.active && p.trail && Math.random() < 0.5) this.fx.burst(p.x, p.y, 1, { tint: p.trail, speed: 14, life: 0.28, size: 0.9 });
      if (p.active) { p.sprite.position.set(p.x, p.y); if (p.rot) p.sprite.rotation = Math.atan2(p.vy, p.vx); }
    }
  }

  // ───────────── Eşyalar ─────────────
  private updateItems(dt: number) {
    const p = this.player; const mag = this.stats.magnet;
    for (const it of this.items) {
      if (!it.active) continue;
      it.t += dt;
      const dx = p.x - it.x, dy = p.y - it.y; const d = Math.hypot(dx, dy) || 1;
      if (it.kind === 'chest') {
        if (d < 46) { it.active = false; it.sprite.visible = false; this.fx.burst(it.x, it.y, 18, { tint: 0xffd070, speed: 200, life: 0.6, size: 1.2 }); this.openChest(); return; }
        it.sprite.position.set(it.x, it.y + Math.sin(it.t * 3) * 3); it.sprite.zIndex = it.y; continue;
      }
      if (!it.magnet && d < mag * (it.kind === 'heart' ? 0.5 : 1)) it.magnet = true;
      if (it.magnet) {
        const sp = 260 + it.t * 40 + Math.max(0, 200 - d) * 3; it.x += (dx / d) * sp * dt; it.y += (dy / d) * sp * dt;
        if (d < 18) {
          it.active = false; it.sprite.visible = false;
          if (it.kind === 'gem') this.addXp(it.value);
          else if (it.kind === 'coin') { this.gold += it.value; }
          else if (it.kind === 'heart') { const hv = this.stats.maxHp * 0.1; this.heal(hv); this.fx.number(p.x, p.y - 70, '+' + Math.round(hv), 0x7ee07a, 1, true); this.fx.burst(p.x, p.y - 30, 10, { tint: 0x7ee07a, speed: 110, life: 0.5, size: 1 }); }
          continue;
        }
      } else { it.x += it.vx * dt; it.y += it.vy * dt; const f = 1 - Math.min(1, 7 * dt); it.vx *= f; it.vy *= f; }
      it.sprite.position.set(it.x, it.y);
      if (it.kind === 'coin') it.sprite.scale.x = 0.8 * Math.abs(Math.cos(it.t * 5 + it.x));
    }
  }

  // ───────────── Çizim ─────────────
  render(dt: number) {
    const W = this.app.screen.width, H = this.app.screen.height;
    this.zoom = clamp(H / 780, 0.72, 1.55);
    const p = this.player;
    let sx = 0, sy = 0;
    if (this.shakeAmt > 0) { sx = rand(-1, 1) * this.shakeAmt; sy = rand(-1, 1) * this.shakeAmt; }
    this.world.scale.set(this.zoom);
    this.world.position.set(W / 2 - p.x * this.zoom + sx, H / 2 - p.y * this.zoom + sy);
    this.ground.width = W; this.ground.height = H;
    this.ground.tileScale.set(this.zoom);
    this.ground.tilePosition.set(W / 2 - p.x * this.zoom + sx, H / 2 - p.y * this.zoom + sy);
    if (this.state === 'idle') return;
    this.decor.update(p.x, p.y, W / 2 / this.zoom, H / 2 / this.zoom);

    // oyuncu
    if (p.anims) {
      p.animT += dt;
      let an = p.anims.idle;
      if (p.dead) an = p.anims.death; else if (p.hurtT > 0) an = p.anims.hurt; else if (p.moving) an = p.anims.run;
      let f = Math.floor(p.animT * an.fps);
      if (an.loop || an === p.anims.idle || an === p.anims.run) f %= an.tex.length; else f = Math.min(f, an.tex.length - 1);
      p.sprite.texture = an.tex[f];
      p.sprite.scale.set(0.62 * p.face, 0.62);
      p.sprite.position.set(p.x, p.y); p.sprite.zIndex = p.y;
      p.sprite.alpha = p.inv > 0 && !p.dead ? 0.55 + 0.45 * Math.abs(Math.sin(this.t * 30)) : 1;
      p.shadow.position.set(p.x, p.y - 2); p.shadow.scale.set(1.1);
      this.light.position.set(p.x, p.y - 20);
    }
    // sağlık çubuğu
    this.hpBar.clear();
    if (!p.dead) {
      const w = 40; const x = p.x - w / 2, y = p.y + 6;
      this.hpBar.roundRect(x - 1, y - 1, w + 2, 7, 2).fill(0x0c0710);
      this.hpBar.roundRect(x, y, w * clamp(this.hp / this.stats.maxHp, 0, 1), 5, 2).fill(this.hp / this.stats.maxHp < 0.3 ? 0xff3a3a : 0xd9374a);
    }
    // düşmanlar
    for (const e of this.enemies) {
      if (!e.active) continue;
      const s = e.sprite;
      if (e.dying) {
        const an = e.death; const f = Math.min(an.tex.length - 1, Math.floor(e.animT * an.fps * 2.4));
        s.texture = an.tex[f]; s.alpha = 1; e.shadow.alpha = Math.max(0, 1 - e.dieT * 3);
      } else {
        const an = e.walk; s.texture = an.tex[Math.floor(e.animT * an.fps) % an.tex.length];
        s.tint = e.flash > 0 ? 0xff7a7a : e.slowT > 0 ? 0x9fd4ff : 0xffffff;
      }
      s.scale.set(e.def.scale * e.face, e.def.scale);
      s.position.set(e.x, e.y); s.zIndex = e.y;
      e.shadow.position.set(e.x, e.y - 1);
    }
    if (this.boss && (!this.boss.active || this.boss.dying)) this.boss = null;
  }

  worldToScreen(x: number, y: number) { return { x: this.world.x + x * this.zoom, y: this.world.y + y * this.zoom }; }
}
