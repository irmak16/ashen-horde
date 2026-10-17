import { BitmapText, Container, Sprite, Texture } from 'pixi.js';
import { A } from './assets';
import { rand, TAU } from './util';

interface AnimFx { s: Sprite; key: string; t: number; speed: number; active: boolean; follow?: { x: number; y: number }; ox: number; oy: number; alpha: number }
interface Puff { s: Sprite; t: number; dur: number; s0: number; s1: number; a0: number; a1: number; active: boolean; vx: number; vy: number; rot: number; spin: number }
interface Particle { s: Sprite; vx: number; vy: number; life: number; max: number; g: number; s0: number; s1: number; drag: number; active: boolean; a0: number }
interface FloatT { b: BitmapText; t: number; dur: number; vy: number; active: boolean; s0: number; force: boolean }

export interface PlayOpts { scale?: number; rot?: number; tint?: number; add?: boolean; ay?: number; speed?: number; alpha?: number; low?: boolean; follow?: { x: number; y: number }; ox?: number; oy?: number }

export class Fx {
  low: Container; top: Container; text: Container;
  anims: AnimFx[] = []; puffs: Puff[] = []; parts: Particle[] = []; texts: FloatT[] = [];
  textBudget = 0;
  constructor(low: Container, top: Container, text: Container) { this.low = low; this.top = top; this.text = text; }

  private mk(tex: Texture, layer: Container): Sprite {
    const s = new Sprite(tex); s.anchor.set(0.5); s.visible = false; layer.addChild(s); return s;
  }

  play(key: string, x: number, y: number, o: PlayOpts = {}): void {
    const a = A.fx[key]; if (!a) return;
    let f = this.anims.find((q) => !q.active);
    if (!f) { f = { s: this.mk(a.tex[0], this.top), key, t: 0, speed: 1, active: false, ox: 0, oy: 0, alpha: 1 }; this.anims.push(f); }
    const layer = o.low ? this.low : this.top;
    if (f.s.parent !== layer) layer.addChild(f.s);
    f.active = true; f.key = key; f.t = 0; f.speed = o.speed ?? 1; f.follow = o.follow; f.ox = o.ox ?? 0; f.oy = o.oy ?? 0; f.alpha = o.alpha ?? 1;
    const s = f.s; s.visible = true; s.texture = a.tex[0];
    s.anchor.set(0.5, o.ay ?? 0.5); s.position.set(x, y); s.scale.set(o.scale ?? 1); s.rotation = o.rot ?? 0;
    s.tint = o.tint ?? 0xffffff; s.blendMode = (o.add ?? true) ? 'add' : 'normal'; s.alpha = f.alpha; s.zIndex = 0;
  }

  puff(tex: Texture, x: number, y: number, o: { dur?: number; s0?: number; s1?: number; a0?: number; a1?: number; tint?: number; add?: boolean; low?: boolean; vx?: number; vy?: number; rot?: number; spin?: number } = {}): void {
    let p = this.puffs.find((q) => !q.active);
    if (!p) { p = { s: this.mk(tex, this.top), t: 0, dur: 1, s0: 1, s1: 1, a0: 1, a1: 0, active: false, vx: 0, vy: 0, rot: 0, spin: 0 }; this.puffs.push(p); }
    const layer = o.low ? this.low : this.top;
    if (p.s.parent !== layer) layer.addChild(p.s);
    p.active = true; p.t = 0; p.dur = o.dur ?? 0.5; p.s0 = o.s0 ?? 1; p.s1 = o.s1 ?? 1; p.a0 = o.a0 ?? 1; p.a1 = o.a1 ?? 0;
    p.vx = o.vx ?? 0; p.vy = o.vy ?? 0; p.rot = o.rot ?? 0; p.spin = o.spin ?? 0;
    const s = p.s; s.texture = tex; s.visible = true; s.position.set(x, y); s.tint = o.tint ?? 0xffffff; s.blendMode = (o.add ?? true) ? 'add' : 'normal';
    s.scale.set(p.s0); s.alpha = p.a0; s.rotation = p.rot;
  }

  /** Halka efekti: yarıçap px cinsinden */
  ring(x: number, y: number, r0: number, r1: number, o: { dur?: number; tint?: number; a0?: number; low?: boolean } = {}): void {
    this.puff(A.ring, x, y, { dur: o.dur ?? 0.45, s0: (r0 * 2) / 256, s1: (r1 * 2) / 256, a0: o.a0 ?? 0.9, a1: 0, tint: o.tint ?? 0xffffff, low: o.low });
  }

  burst(x: number, y: number, n: number, o: { tint?: number; speed?: number; life?: number; size?: number; g?: number; add?: boolean; spread?: number; dir?: number } = {}): void {
    for (let i = 0; i < n; i++) {
      let p = this.parts.find((q) => !q.active);
      if (!p) { if (this.parts.length > 420) return; p = { s: this.mk(A.spark, this.top), vx: 0, vy: 0, life: 0, max: 1, g: 0, s0: 1, s1: 0, drag: 2, active: false, a0: 1 }; this.parts.push(p); }
      const ang = o.dir !== undefined ? o.dir + rand(-(o.spread ?? Math.PI), o.spread ?? Math.PI) : rand(TAU);
      const sp = rand(0.3, 1) * (o.speed ?? 140);
      p.active = true; p.vx = Math.cos(ang) * sp; p.vy = Math.sin(ang) * sp; p.max = p.life = rand(0.6, 1) * (o.life ?? 0.45);
      p.g = o.g ?? 0; p.s0 = (o.size ?? 0.8) * rand(0.7, 1.2); p.s1 = 0; p.drag = 2.4; p.a0 = 1;
      const s = p.s; s.visible = true; s.position.set(x, y); s.tint = o.tint ?? 0xffffff; s.blendMode = (o.add ?? true) ? 'add' : 'normal'; s.scale.set(p.s0); s.alpha = 1;
    }
  }

  number(x: number, y: number, txt: string, tint = 0xffffff, size = 1, force = false) {
    if (!force && this.textBudget <= 0) return;
    this.textBudget--;
    let f = this.texts.find((q) => !q.active);
    if (!f) {
      if (this.texts.length > 90) return;
      const b = new BitmapText({ text: txt, style: { fontFamily: 'Cinzel, Georgia, serif', fontSize: 22, fontWeight: '700', fill: 0xffffff, stroke: { color: 0x120a18, width: 4 } } });
      b.anchor.set(0.5); this.text.addChild(b);
      f = { b, t: 0, dur: 0.7, vy: -50, active: false, s0: 1, force: false }; this.texts.push(f);
    }
    f.active = true; f.force = force; f.t = 0; f.dur = force ? 1.2 : 0.65; f.vy = force ? -36 : -52; f.s0 = size;
    const b = f.b; b.text = txt; b.tint = tint; b.visible = true; b.position.set(x + rand(-8, 8), y); b.scale.set(0.6 * size); b.alpha = 1;
  }

  update(dt: number) {
    this.textBudget = 9;
    for (const f of this.anims) {
      if (!f.active) continue;
      const a = A.fx[f.key]; f.t += dt * f.speed;
      const i = Math.floor(f.t * a.fps);
      if (i >= a.tex.length) { f.active = false; f.s.visible = false; continue; }
      f.s.texture = a.tex[i];
      if (f.follow) f.s.position.set(f.follow.x + f.ox, f.follow.y + f.oy);
    }
    for (const p of this.puffs) {
      if (!p.active) continue;
      p.t += dt; const k = p.t / p.dur;
      if (k >= 1) { p.active = false; p.s.visible = false; continue; }
      const e = 1 - (1 - k) * (1 - k);
      p.s.scale.set(p.s0 + (p.s1 - p.s0) * e); p.s.alpha = p.a0 + (p.a1 - p.a0) * k;
      p.s.x += p.vx * dt; p.s.y += p.vy * dt; p.s.rotation += p.spin * dt;
    }
    for (const p of this.parts) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) { p.active = false; p.s.visible = false; continue; }
      const k = 1 - p.life / p.max;
      p.vy += p.g * dt; const d = Math.max(0, 1 - p.drag * dt); p.vx *= d; p.vy *= d;
      p.s.x += p.vx * dt; p.s.y += p.vy * dt;
      p.s.scale.set(p.s0 * (1 - k)); p.s.alpha = 1 - k * k;
    }
    for (const f of this.texts) {
      if (!f.active) continue;
      f.t += dt; const k = f.t / f.dur;
      if (k >= 1) { f.active = false; f.b.visible = false; continue; }
      f.b.y += f.vy * dt; f.vy *= 1 - 2.2 * dt;
      const pop = k < 0.15 ? 0.6 + (k / 0.15) * 0.7 : 1.3 - Math.min(0.3, (k - 0.15) * 0.6);
      f.b.scale.set(pop * f.s0 * 0.72); f.b.alpha = (f.force ? 1 : 0.9) * (k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4);
    }
  }

  clear() {
    for (const f of this.anims) { f.active = false; f.s.visible = false; }
    for (const p of this.puffs) { p.active = false; p.s.visible = false; }
    for (const p of this.parts) { p.active = false; p.s.visible = false; }
    for (const f of this.texts) { f.active = false; f.b.visible = false; }
  }
}
