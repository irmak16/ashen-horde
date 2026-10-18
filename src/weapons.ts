import { Sprite } from 'pixi.js';
import type { Game } from './game';
import { A } from './assets';
import type { WeaponDef, WS } from './data';
import { rand, TAU } from './util';

interface Shot { t: number; fn: () => void }

export class WeaponInst {
  level = 1; cd = 0.2; t = 0; ang = 0; side = 1;
  queue: Shot[] = []; blades: Sprite[] = []; auraA?: Sprite; auraB?: Sprite;
  constructor(public def: WeaponDef, public slot: number) {}
  get s(): WS { return this.def.stats(this.level); }
  destroy(g: Game) {
    for (const b of this.blades) b.destroy(); this.blades = [];
    this.auraA?.destroy(); this.auraB?.destroy(); this.auraA = this.auraB = undefined;
    void g;
  }
}

export function updateWeapon(g: Game, w: WeaponInst, dt: number) {
  const st = g.stats; const s = w.s; const k = w.def.kind;
  const dmg = s.dmg * st.might;
  const area = s.area * st.area;
  const amount = Math.round(s.amount + (k === 'aura' || k === 'nova' ? 0 : st.amount));

  // sıradaki gecikmeli atışlar
  for (let i = w.queue.length - 1; i >= 0; i--) {
    const q = w.queue[i]; q.t -= dt;
    if (q.t <= 0) { w.queue.splice(i, 1); q.fn(); }
  }

  if (k === 'orbit') return updateOrbit(g, w, s, dmg, area, amount, dt);
  if (k === 'aura') return updateAura(g, w, s, dmg, area, dt);

  w.cd -= dt;
  if (w.cd > 0) return;
  const cdFull = Math.max(0.12, s.cd * st.cooldown);

  switch (k) {
    case 'proj': if (fireProj(g, w, s, dmg, amount, area)) w.cd = cdFull; else w.cd = 0.12; break;
    case 'strike': if (fireStrike(g, w, s, dmg, amount, area)) w.cd = cdFull; else w.cd = 0.2; break;
    case 'nova': fireNova(g, w, s, dmg, area); w.cd = cdFull; break;
    case 'slash': fireSlash(g, w, s, dmg, amount, area); w.cd = cdFull; break;
  }
}

// ───────────── Mermiler ─────────────
function fireProj(g: Game, w: WeaponInst, s: WS, dmg: number, amount: number, area: number): boolean {
  const p = g.player; const tint = w.def.tint ?? 0xffffff;
  const kind = s.arrow ? 'arrow' : s.boom ? 'boom' : s.ret ? 'spear' : s.fan ? 'dagger' : 'orb';
  const sprite = kind === 'dagger' || kind === 'spear';
  const speed = s.speed * g.stats.projSpeed;
  const icon = A.weapon[w.def.icon];
  const shoot = (ang: number) => {
    const o = { x: p.x, y: p.y - 22, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, dmg, pierce: s.pierce, life: 2.0, r: 13 * area, tex: A.orb, scale: 0.55 * area, tint, add: true, homing: s.homing ? 6 : 0, trail: tint, rot: false } as Parameters<Game['spawnProj']>[0];
    if (kind === 'dagger') Object.assign(o, { life: 1.3, r: 12 * area, tex: icon, scale: (50 / icon.width) * (0.9 + area * 0.1), tint: 0xffffff, add: false, trail: 0, rot: true });
    else if (kind === 'spear') Object.assign(o, { life: 1.9, r: 18 * area, tex: icon, scale: (78 / icon.width) * (0.9 + area * 0.1), tint: 0xffffff, add: false, trail: tint, rot: true, ret: true });
    else if (kind === 'arrow') Object.assign(o, { life: 1.7, r: 9 * area, tex: A.arrow, scale: 0.95 * (0.9 + area * 0.1), tint: 0xffffff, add: false, trail: 0, rot: true });
    else if (kind === 'boom') Object.assign(o, { life: 2.4, r: 16 * area, scale: 0.95 * area, boom: s.boom * area, tint: 0xff9a40, trail: 0xff7a2a });
    g.spawnProj(o);
  };
  if (kind === 'dagger' || kind === 'spear') {
    const base = Math.atan2(p.fy, p.fx); const dirs = [base]; if (s.both) dirs.push(base + Math.PI);
    const spread = kind === 'spear' ? 0.28 : 0.17;
    for (const d of dirs) for (let i = 0; i < amount; i++) {
      const ang = d + (i - (amount - 1) / 2) * spread;
      w.queue.push({ t: i * 0.035, fn: () => shoot(ang) });
    }
    return true;
  }
  const range = kind === 'arrow' ? 900 : 680;
  let targets = g.nearestEnemies(p.x, p.y, range, kind === 'arrow' ? 40 : Math.max(1, amount));
  if (kind === 'arrow') targets = targets.sort(() => Math.random() - 0.5); // menzilin tamamını kullan: rastgele hedef
  if (!targets.length && !s.radial) return false;
  for (let i = 0; i < amount && targets.length; i++) {
    const t = targets[i % targets.length];
    const jitter = targets.length < amount ? rand(-0.18, 0.18) : 0;
    const ang = Math.atan2(t.y - (p.y - 22), t.x - p.x) + jitter;
    w.queue.push({ t: i * 0.07, fn: () => shoot(ang) });
  }
  if (s.radial) {
    w.ang += 0.4;
    for (let i = 0; i < s.radial; i++) { const ang = w.ang + (i / s.radial) * TAU; w.queue.push({ t: 0.05, fn: () => shoot(ang) }); }
  }
  return true;
}

// ───────────── Dönen kılıçlar ─────────────
function updateOrbit(g: Game, w: WeaponInst, s: WS, dmg: number, area: number, n: number, dt: number) {
  const p = g.player; const tex = A.weapon[w.def.icon];
  while (w.blades.length < n) {
    const b = new Sprite(tex); b.anchor.set(0.5); g.layers.top.addChild(b); b.tint = 0xffffff; w.blades.push(b);
  }
  while (w.blades.length > n) w.blades.pop()!.destroy();
  w.ang += s.speed * g.stats.projSpeed * dt;
  const R = s.radius * area; const big = !!s.big;
  const len = (big ? 82 : 52) * Math.sqrt(area);
  const hitR = (big ? 34 : 22) * Math.sqrt(area);
  for (let i = 0; i < n; i++) {
    const a = w.ang + (i * TAU) / n;
    const bx = p.x + Math.cos(a) * R, by = p.y - 14 + Math.sin(a) * R * 0.92;
    const b = w.blades[i]; b.position.set(bx, by); b.rotation = a + Math.PI / 2 + Math.PI / 2 * 0; b.scale.set(len / tex.width);
    b.zIndex = 1;
    if (g.t % 0.07 < dt) g.fx.burst(bx, by, 1, { tint: w.def.tint, size: 0.7, life: 0.3, speed: 20 });
    const cnt = g.queryEnemies(bx, by, hitR, g.qOrbit);
    for (let j = 0; j < cnt; j++) {
      const e = g.enemies[g.qOrbit[j]];
      if (e.dying || e.hitT[w.slot] > g.t) continue;
      if (Math.hypot(e.x - bx, (e.y - 10) - by) > hitR + e.r * 0.6) continue;
      e.hitT[w.slot] = g.t + s.tick;
      g.hurt(e, dmg, Math.cos(a + Math.PI / 2), Math.sin(a + Math.PI / 2), 90);
    }
  }
}

// ───────────── Aura ─────────────
function updateAura(g: Game, w: WeaponInst, s: WS, dmg: number, area: number, dt: number) {
  const p = g.player; const R = s.radius * area; const tint = w.def.tint ?? 0xffffff;
  if (!w.auraA) {
    w.auraA = new Sprite(A.ring); w.auraA.anchor.set(0.5); w.auraA.blendMode = 'add'; g.layers.low.addChild(w.auraA);
    w.auraB = new Sprite(A.glow); w.auraB.anchor.set(0.5); w.auraB.blendMode = 'add'; g.layers.low.addChild(w.auraB);
  }
  const pulse = 1 + Math.sin(g.t * 3.2) * 0.025;
  w.auraA.position.set(p.x, p.y - 4); w.auraA.scale.set((R * 2 * pulse) / 256); w.auraA.tint = tint; w.auraA.alpha = 0.55;
  w.auraB!.position.set(p.x, p.y - 4); w.auraB!.scale.set((R * 2.1) / 64); w.auraB!.tint = tint; w.auraB!.alpha = 0.22 + Math.sin(g.t * 2.4) * 0.04;
  w.t += dt;
  if (w.t < s.tick * g.stats.cooldown) return;
  w.t = 0;
  const cnt = g.queryEnemies(p.x, p.y, R, g.qAura); let hits = 0;
  for (let i = 0; i < cnt; i++) {
    const e = g.enemies[g.qAura[i]]; if (e.dying) continue;
    const dx = e.x - p.x, dy = e.y - p.y; const d = Math.hypot(dx, dy) || 1;
    if (d > R + e.r * 0.4) continue;
    hits++;
    g.hurt(e, dmg, dx / d, dy / d, 60 * (s.knock ?? 0));
    if (s.heal === undefined) { e.slowT = 0.6; e.slowF = 0.8; }
  }
  if (hits) g.fx.ring(p.x, p.y - 4, R * 0.55, R, { dur: 0.35, tint, a0: 0.35, low: true });
  if (s.heal && hits >= 3) g.heal(0.8);
}

// ───────────── Şimşek / Göktaşı ─────────────
function fireStrike(g: Game, w: WeaponInst, s: WS, dmg: number, amount: number, area: number): boolean {
  const p = g.player; const tint = w.def.tint ?? 0xffffff;
  if (s.mode === 0) {
    // menzilde boss varsa ilk şimşek ona düşer, kalanlar toplam can yoğunluğuna göre seçilir
    const boss = g.bossInRange(p.x, p.y, 560);
    const targets = g.hpTargets(p.x, p.y, 560, boss ? amount - 1 : amount, 70, boss ?? undefined);
    if (boss) { if (!targets.length) for (let i = 0; i < amount; i++) targets.push(boss); else targets.unshift(boss); } // boss'tan başka düşman yoksa hepsi boss'a
    if (!targets.length) return false;
    targets.forEach((t, i) => w.queue.push({
      t: i * 0.09, fn: () => {
        const x = t.x, y = t.y; const r = 40 * area;
        g.fx.play('skill/lightning', x, y + 4, { scale: 0.85 * Math.sqrt(area), ay: 0.9, tint });
        g.fx.play('hit/hit_spark', x, y - 14, { scale: 1.1 * area, tint: 0xffffff });
        g.aoe(x, y, r, dmg, 40);
        g.shake(2.2);
        if (s.chain) {
          const c = g.queryEnemies(x, y, 170, g.qTmp); let m = 0;
          for (let j = 0; j < c && m < 3; j++) {
            const e = g.enemies[g.qTmp[j]]; if (e.dying || e === t || Math.hypot(e.x - x, e.y - y) > 170) continue; m++;
            g.fx.play('skill/chain', e.x, e.y + 4, { scale: 0.5, ay: 0.9, tint });
            g.hurt(e, dmg * 0.6, 0, 0, 0);
          }
        }
      },
    }));
    return true;
  }
  // göktaşı
  const R = s.radius * area;
  const boss = g.bossInRange(p.x, p.y, 480);
  for (let i = 0; i < amount; i++) {
    // menzilde boss varsa ilk göktaşı ona düşer, kalanlar toplam can yoğunluğuna göre seçilir
    const first = i === 0 ? boss : null;
    const c = first ? { x: first.x, y: first.y } : g.densePoint(p.x, p.y, 480);
    const j = first ? 10 : 26;
    const x = c.x + rand(-j, j), y = c.y + rand(-j, j);
    w.queue.push({
      t: i * 0.16, fn: () => {
        g.fx.ring(x, y, 8, R, { dur: 0.62, tint: 0xff6a3a, a0: 0.8, low: true });
        w.queue.push({ t: 0.4, fn: () => g.fx.play('skill/meteor', x, y, { scale: (R * 2.5) / 230, ay: 0.85, tint: 0xffd2a0 }) });
        w.queue.push({
          t: 0.62, fn: () => {
            g.aoe(x, y, R, dmg, 160); g.fx.play('skill/boom', x, y, { scale: (R * 2) / 256, ay: 0.6, tint: 0xff9a50 }); g.shake(4);
            g.fx.burst(x, y, 12, { tint: 0xffa040, speed: 220, life: 0.5, size: 1.1, g: 200 });
            g.fx.ring(x, y, R * 0.5, R * 1.1, { dur: 0.3, tint: 0xffb070 });
          },
        });
      },
    });
  }
  return true;
}

// ───────────── Buz dalgası ─────────────
function fireNova(g: Game, w: WeaponInst, s: WS, dmg: number, area: number) {
  const p = g.player; const R = s.radius * area; const tint = w.def.tint ?? 0xffffff;
  g.fx.play('skill/nova', p.x, p.y - 8, { scale: R / 112, tint });
  g.fx.ring(p.x, p.y - 4, R * 0.3, R, { dur: 0.4, tint, a0: 0.7, low: true });
  const cnt = g.queryEnemies(p.x, p.y, R, g.qTmp);
  for (let i = 0; i < cnt; i++) {
    const e = g.enemies[g.qTmp[i]]; if (e.dying) continue;
    const dx = e.x - p.x, dy = e.y - p.y; const d = Math.hypot(dx, dy) || 1;
    if (d > R + e.r * 0.5) continue;
    e.slowT = 2.4; e.slowF = 1 - (s.slow ?? 0.5);
    g.hurt(e, dmg, dx / d, dy / d, 110);
  }
  g.shake(2);
}

// ───────────── Hilal kesik ─────────────
function fireSlash(g: Game, w: WeaponInst, s: WS, dmg: number, amount: number, area: number) {
  const p = g.player; const R = s.radius * area; const tint = w.def.tint ?? 0xffffff;
  const base = Math.atan2(p.fy, p.fx);
  const dirs = amount >= 2 ? [base, base + Math.PI] : [w.side > 0 ? base : base + Math.PI];
  if (amount < 2) w.side *= -1;
  dirs.forEach((a, i) => w.queue.push({
    t: i * 0.1, fn: () => {
      const cx = p.x + Math.cos(a) * R * 0.3, cy = p.y - 18 + Math.sin(a) * R * 0.3;
      if (s.big) g.fx.play('anim/arc', p.x, p.y - 18, { scale: (R * 2) / 190, tint, rot: a + Math.PI * 0.5 });
      else g.fx.play('skill/slash', cx, cy, { scale: R / 90, tint, rot: a + Math.PI });
      const cnt = g.queryEnemies(p.x, p.y, R, g.qTmp);
      const ca = Math.cos(a), sa = Math.sin(a);
      for (let j = 0; j < cnt; j++) {
        const e = g.enemies[g.qTmp[j]]; if (e.dying) continue;
        const dx = e.x - p.x, dy = e.y - p.y; const d = Math.hypot(dx, dy) || 1;
        if (d > R + e.r) continue;
        if ((dx * ca + dy * sa) / d < 0.2 && d > e.r + 24) continue;
        g.hurt(e, dmg, dx / d, dy / d, 130 * (s.knock ?? 1));
        g.fx.play('hit/hit_spark', e.x, e.y - 10, { scale: 0.7 });
      }
      g.shake(s.big ? 3.5 : 1.6);
    },
  }));
}
