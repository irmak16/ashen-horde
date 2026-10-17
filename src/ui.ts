import './style.css';
import { A, Anim, BASE, weaponIconUrl } from './assets';
import { CHARACTERS, CharDef, MAPS, MapDef, META, MAX_PASSIVES, MAX_WEAPONS, PASSIVES, WEAPONS, mapById, metaCost } from './data';
import { charLockText, charUnlocked, mapUnlocked, registerClear } from './progress';
import type { ChestResult, Game, Option, RunResult } from './game';
import { persist, save } from './save';
import { fmtNum, fmtTime, rand } from './util';

export interface Ctl { game: Game; play(c: CharDef, m: MapDef): void; resume(): void; menu(): void; surrender(): void; replay(): void }

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

function sprite(a: Anim, scale: number, flip = false): string {
  const w = a.w, h = a.h, n = a.tex.length;
  return `<div style="width:${w * scale}px;height:${h * scale}px"><div class="sprite" style="--w:${w};--h:${h};--n:${n};--fps:${a.fps * 0.7};background-image:url(${BASE}${a.strip});background-size:${n * w}px ${h}px;transform:scale(${flip ? -scale : scale},${scale});transform-origin:${flip ? 'top right' : 'top left'};${flip ? `margin-left:${-w * scale}px;position:relative;left:${w * scale}px;` : ''}"></div></div>`;
}

export class UI {
  root = $('screens'); keyHandler: ((e: KeyboardEvent) => void) | null = null; slotSig = ''; embers = 0;
  constructor(private ctl: Ctl) {}

  private clear() { this.root.innerHTML = ''; if (this.keyHandler) { window.removeEventListener('keydown', this.keyHandler); this.keyHandler = null; } }
  private screen(cls: string, html: string): HTMLElement {
    const d = document.createElement('div'); d.className = 'screen ' + cls; d.innerHTML = html; this.root.appendChild(d); return d;
  }
  private onKey(fn: (e: KeyboardEvent) => void) { this.keyHandler = fn; window.addEventListener('keydown', fn); }
  hideAll() { this.clear(); }

  // ───────── Yükleme ─────────
  showLoading() {
    this.clear();
    this.screen('', `<div class="bg"><div class="moon"></div><div class="fog"></div></div><h1 class="title" style="font-size:clamp(40px,6vw,84px);position:relative">ASHEN HORDE</h1>
      <div class="loadbar" style="position:relative"><div id="lb"></div></div><div class="loadtxt" id="lt" style="position:relative">Karanlık yükleniyor…</div>`);
  }
  setLoading(p: number, label: string) { const b = document.getElementById('lb'); if (b) b.style.width = Math.round(p * 100) + '%'; const t = document.getElementById('lt'); if (t) t.textContent = label; }

  // ───────── Ana menü ─────────
  showMenu() {
    this.clear(); $('hud').classList.add('hidden');
    const hero = CHARACTERS.find((c) => c.id === save.lastChar) ?? CHARACTERS[0];
    const mon = (id: string, scale: number, left: string, flip: boolean, anim = 'idle') => {
      const a = A.enemies[id][anim]; return `<div class="cs" style="left:${left}">${sprite(a, scale, flip)}</div>`;
    };
    const ha = A.chars[hero.sprite].idle;
    const s = this.screen('', `
      <div class="bg"><div class="moon"></div><canvas id="embers"></canvas><div class="fog"></div><div class="fog f2"></div>
        <div class="parade">
          <div class="cs" style="left:7%">${sprite(ha, 2.5)}</div>
          ${mon('ogre', 1.9, '66%', true)}${mon('skeleton_warrior', 1.8, '75%', true)}${mon('goblin', 1.7, '60%', false)}${mon('skeleton_lord', 1.15, '84%', true)}${mon('hellhound', 1.6, '54%', false)}
        </div>
      </div>
      <div class="menu-gold"><small>ALTIN</small>¤ ${fmtNum(save.gold)}</div>
      <div style="position:relative;margin-top:-6vh;display:flex;flex-direction:column;align-items:center">
        <h1 class="title">ASHEN<br/>HORDE</h1>
        <div class="subtitle">Kül'den doğan sürüye karşı hayatta kal</div>
        <div class="menu">
          <div class="btn primary" id="b-play">Karanlığa Gir</div>
          <div class="btn" id="b-shop">Güçlendirmeler</div>
          <div class="btn" id="b-help">Nasıl Oynanır</div>
        </div>
      </div>
      <div class="menu-foot">En iyi süre ${fmtTime(save.best)} · Toplam ${fmtNum(save.kills)} öldürme · ${save.wins} zafer</div>`);
    s.querySelector('#b-play')!.addEventListener('click', () => this.showMaps());
    s.querySelector('#b-shop')!.addEventListener('click', () => this.showShop());
    s.querySelector('#b-help')!.addEventListener('click', () => this.showHelp());
    this.startEmbers(s.querySelector('#embers') as HTMLCanvasElement);
  }

  private startEmbers(c: HTMLCanvasElement) {
    const ctx = c.getContext('2d')!; const id = ++this.embers;
    const fit = () => { c.width = c.clientWidth; c.height = c.clientHeight; }; fit();
    const P = Array.from({ length: 90 }, () => ({ x: rand(c.width), y: rand(c.height), v: rand(10, 40), r: rand(0.8, 2.6), p: rand(6.28), a: rand(0.3, 1) }));
    let last = performance.now();
    const loop = (now: number) => {
      if (id !== this.embers || !c.isConnected) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (c.width !== c.clientWidth) fit();
      ctx.clearRect(0, 0, c.width, c.height);
      for (const p of P) {
        p.y -= p.v * dt; p.x += Math.sin(now / 900 + p.p) * 12 * dt; if (p.y < -10) { p.y = c.height + 10; p.x = rand(c.width); }
        const t = 0.5 + 0.5 * Math.sin(now / 400 + p.p);
        ctx.beginPath(); ctx.fillStyle = `rgba(255,${150 + Math.floor(t * 80)},70,${p.a * (0.35 + t * 0.5)})`; ctx.shadowColor = '#ff9a3a'; ctx.shadowBlur = 8;
        ctx.arc(p.x, p.y, p.r, 0, 6.28); ctx.fill();
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  // ───────── Harita seçimi ─────────
  showMaps() {
    this.clear();
    let idx = Math.max(0, MAPS.findIndex((m) => m.id === save.lastMap)); if (!mapUnlocked(idx)) idx = 0;
    const cards = MAPS.map((m, i) => {
      const open = mapUnlocked(i); const done = save.cleared[m.id];
      const stars = '☠'.repeat(i + 1) + `<span style="opacity:.25">${'☠'.repeat(MAPS.length - i - 1)}</span>`;
      const best = save.bestByMap[m.id] ? `En iyi ${fmtTime(save.bestByMap[m.id])}` : '';
      return `<div class="mapcard ${open ? '' : 'locked'} ${i === idx ? 'sel' : ''}" data-i="${i}" style="--c:rgb(${m.theme.accent === '40,70,48' ? '138,92,240' : m.theme.fog})">
        <div class="mp-art" style="background:radial-gradient(ellipse at 50% 120%, rgba(${m.theme.fog},0.55), transparent 75%), linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.45)), url(${A.groundUrls[m.theme.base]}) center/220px"><div class="mp-no">${i + 1}</div>${done ? '<div class="mp-done">✔ Tamamlandı</div>' : ''}${open ? '' : '<div class="mp-lock">🔒</div>'}</div>
        <div class="nm">${m.name}</div><div class="tt">${m.sub} · ${m.minutes} dk</div>
        <div class="mp-desc">${open ? m.desc : 'Önceki haritayı bitirerek aç.'}</div>
        <div class="mp-meta"><span>Zorluk ${stars}</span><span>Altın ×${m.gold}</span></div>
        <div class="mp-best">${best}</div></div>`;
    }).join('');
    const s = this.screen('dim', `<div class="bg" style="opacity:0.55"><div class="fog"></div></div>
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;max-width:98vw">
        <h2 class="h">Bir Diyar Seç</h2><div class="sub">Bir haritayı bitirmek sıradakini ve yeni kahramanları açar</div>
        <div class="maps">${cards}</div>
        <div class="row"><div class="btn small" id="back">Geri</div><div class="btn primary" id="go">Devam</div></div>
      </div>`);
    s.querySelectorAll('.mapcard').forEach((el) => el.addEventListener('click', () => {
      const i = +(el as HTMLElement).dataset.i!; if (!mapUnlocked(i)) return; idx = i;
      s.querySelectorAll('.mapcard').forEach((x) => x.classList.toggle('sel', x === el));
    }));
    s.querySelector('#back')!.addEventListener('click', () => this.showMenu());
    s.querySelector('#go')!.addEventListener('click', () => { save.lastMap = MAPS[idx].id; persist(); this.showSelect(MAPS[idx]); });
  }

  // ───────── Karakter seçimi ─────────
  showSelect(map: MapDef = mapById(save.lastMap)) {
    this.clear();
    let sel = CHARACTERS.find((c) => c.id === save.lastChar && charUnlocked(c.id)) ?? CHARACTERS[0];
    const cards = CHARACTERS.map((c) => {
      const w = WEAPONS[c.weapon]; const open = charUnlocked(c.id);
      return `<div class="card ${c.id === sel.id ? 'sel' : ''} ${open ? '' : 'locked'}" data-id="${c.id}">
        <div class="stage" ${open ? '' : 'style="filter:brightness(0) opacity(.55)"'}>${sprite(A.chars[c.sprite].idle, 1.35)}</div>
        <div class="nm">${open ? c.name : '???'}</div><div class="tt">${open ? c.title : 'Kilitli'}</div>
        ${open ? `<div class="wp"><img src="${weaponIconUrl(w.icon)}"/><span>${w.name}</span></div><div class="bn">${c.bonusText}</div>` : `<div class="bn" style="color:#c9a24a">🔒 ${charLockText(c.id)}</div>`}</div>`;
    }).join('');
    const s = this.screen('dim', `<div class="bg" style="opacity:0.55"><div class="fog"></div></div>
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;max-width:96vw">
        <h2 class="h">Kahramanını Seç</h2><div class="sub">${map.name} · her kahraman farklı bir silahla başlar</div>
        <div class="chars">${cards}</div>
        <div class="row"><div class="btn small" id="back">Geri</div><div class="btn primary" id="go">Savaşa Başla</div></div>
      </div>`);
    s.querySelectorAll('.card').forEach((el) => el.addEventListener('click', () => {
      const c = CHARACTERS.find((x) => x.id === (el as HTMLElement).dataset.id)!; if (!charUnlocked(c.id)) return;
      sel = c; save.lastChar = sel.id; persist();
      s.querySelectorAll('.card').forEach((x) => x.classList.toggle('sel', x === el));
    }));
    s.querySelector('#back')!.addEventListener('click', () => this.showMaps());
    s.querySelector('#go')!.addEventListener('click', () => { save.lastChar = sel.id; persist(); this.ctl.play(sel, map); });
  }

  // ───────── Mağaza ─────────
  showShop() {
    this.clear();
    const render = () => {
      this.clear();
      const items = META.map((m) => {
        const r = save.ranks[m.id] ?? 0; const maxed = r >= m.max; const cost = metaCost(m, r);
        const pips = Array.from({ length: m.max }, (_, i) => `<div class="pip ${i < r ? 'on' : ''}"></div>`).join('');
        return `<div class="up"><div class="gl">${m.glyph}</div><div class="in"><div class="nm">${m.name}</div><div class="ds">${m.desc}</div><div class="pips">${pips}</div></div>
          <div class="buy ${maxed || save.gold < cost ? 'off' : ''}" data-id="${m.id}">${maxed ? 'MAKS' : '¤ ' + fmtNum(cost)}</div></div>`;
      }).join('');
      const s = this.screen('dim', `<div class="bg" style="opacity:0.55"><div class="fog"></div></div>
        <div style="position:relative;display:flex;flex-direction:column;align-items:center">
          <h2 class="h">Kalıcı Güçlendirmeler</h2><div class="sub">Her savaşta kazandığın altınla kalıcı güç satın al · Altın: <b style="color:#ffd45a;font-family:var(--display)">¤ ${fmtNum(save.gold)}</b></div>
          <div class="shop">${items}</div><div style="height:18px"></div><div class="btn small" id="back">Geri</div></div>`);
      s.querySelectorAll('.buy').forEach((el) => el.addEventListener('click', () => {
        const m = META.find((x) => x.id === (el as HTMLElement).dataset.id)!; const r = save.ranks[m.id] ?? 0; const cost = metaCost(m, r);
        if (r >= m.max || save.gold < cost) return; save.gold -= cost; save.ranks[m.id] = r + 1; persist(); render();
      }));
      s.querySelector('#back')!.addEventListener('click', () => this.showMenu());
    };
    render();
  }

  showHelp() {
    this.clear();
    const s = this.screen('dim', `<div class="bg" style="opacity:0.55"><div class="fog"></div></div>
      <div class="panel help" style="position:relative"><h2 class="h">Nasıl Oynanır</h2><div class="divider"></div>
      <p><b>HAREKET</b> — <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> ya da yön tuşları. Silahların kendiliğinden saldırır; sen sadece kaç ve konumlan.</p>
      <p><b>DENEYİM</b> — Düşenlerden mavi kristalleri topla, seviye atla ve yeni silah ya da yetenek seç. Kart seçerken <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> kullanabilirsin.</p>
      <p><b>EVRİM</b> — Bir silahı son seviyeye çıkar ve doğru yeteneği al; sonra bir boss'un düşürdüğü sandığı aç, silahın evrimleşsin.</p>
      <p><b>HEDEF</b> — her haritada süre dolana kadar (12–20 dk) hayatta kal. Haritayı bitirmek yenisini ve yeni kahramanları açar. <kbd>Esc</kbd> ile duraklat.</p>
      <div style="height:10px"></div><div class="row"><div class="btn small" id="back">Geri</div></div></div>`);
    s.querySelector('#back')!.addEventListener('click', () => this.showMenu());
  }

  // ───────── Seviye atlama ─────────
  showLevelUp(opts: Option[], rerolls: number, banishes: number) {
    this.clear(); const g = this.ctl.game; let ban = false;
    const card = (o: Option, i: number) => {
      const w = o.kind === 'weapon' ? WEAPONS[o.id] : null; const max = w ? w.maxLevel : o.kind === 'passive' ? PASSIVES[o.id].maxLevel : 0;
      const pips = max ? Array.from({ length: max }, (_, k) => `<div class="pip ${k < o.level - 1 ? 'on' : k === o.level - 1 ? 'next' : ''}"></div>`).join('') : '';
      const ico = o.icon ? `<img src="${weaponIconUrl(o.icon)}"/>` : `<div class="g" style="color:${o.color}">${o.glyph}</div>`;
      return `<div class="opt" data-i="${i}"><div class="key">${i + 1}</div>${o.isNew ? '<div class="new">YENİ</div>' : ''}<div class="ico">${ico}</div>
        <div class="nm">${o.name}</div><div class="pips">${pips}</div><div class="ds">${o.desc}</div></div>`;
    };
    const s = this.screen('dim', `<div class="lvlhead"><div class="big">SEVİYE ${g.level}</div><div class="small">${g.pending > 1 ? `${g.pending} seçim bekliyor` : 'Bir güç seç'}</div></div>
      <div class="opts" id="opts">${opts.map(card).join('')}</div>
      <div class="optfoot"><div class="btn small ${rerolls ? '' : 'off'}" id="rr">Yenile (${rerolls})</div><div class="btn small ${banishes ? '' : 'off'}" id="bn">Yasakla (${banishes})</div></div>`);
    const pickIdx = (i: number) => {
      const o = opts[i]; if (!o) return;
      if (ban) { g.banish(o); return; }
      this.clear(); g.choose(o);
    };
    s.querySelectorAll('.opt').forEach((el) => el.addEventListener('click', () => pickIdx(Number((el as HTMLElement).dataset.i))));
    s.querySelector('#rr')!.addEventListener('click', () => g.reroll());
    s.querySelector('#bn')!.addEventListener('click', () => { ban = !ban; s.querySelector('#opts')!.classList.toggle('banmode', ban); (s.querySelector('#bn') as HTMLElement).style.color = ban ? '#ff8a96' : ''; });
    this.onKey((e) => { if (['Digit1', 'Digit2', 'Digit3', 'Numpad1', 'Numpad2', 'Numpad3'].includes(e.code)) pickIdx(Number(e.code.slice(-1)) - 1); });
  }

  // ───────── Sandık ─────────
  showChest(res: ChestResult) {
    this.clear();
    let body = '';
    if (res.evolved.length) {
      body = `<div class="evotitle">EVRİM!</div>` + res.evolved.map((e) => `<div class="evo"><div class="ic"><img src="${weaponIconUrl(e.from.icon)}"/></div><div class="arrow">➜</div><div class="ic to"><img src="${weaponIconUrl(e.to.icon)}"/></div></div>
        <div class="nm" style="font-family:var(--display);font-size:24px;color:#ffd0f6;letter-spacing:.1em">${e.to.name}</div><div class="sub" style="margin:4px 0 8px">${e.to.desc}</div>`).join('');
    } else {
      body = `<h2 class="h">Hazine Sandığı</h2><div class="sub">Sandıktan güç ve altın çıktı</div><div class="gain">${res.upgrades.map((o) => {
        const ico = o.icon ? `<img src="${weaponIconUrl(o.icon)}"/>` : `<div class="g" style="color:${o.color}">${o.glyph}</div>`;
        return `<div class="opt"><div class="ico">${ico}</div><div class="nm">${o.name}</div><div class="ds">${o.isNew ? 'Yeni' : 'Seviye ' + o.level} · ${o.desc}</div></div>`;
      }).join('')}</div>`;
    }
    const s = this.screen('dim', `<div class="rays"></div><div class="panel chest" style="position:relative">${body}<div style="height:14px"></div><div class="btn primary" id="ok">Devam</div></div>`);
    const go = () => { this.clear(); this.ctl.resume(); };
    s.querySelector('#ok')!.addEventListener('click', go);
    this.onKey((e) => { if (e.code === 'Enter' || e.code === 'Space') go(); });
  }

  // ───────── Duraklat ─────────
  showPause() {
    this.clear();
    const s = this.screen('dim', `<div class="panel" style="position:relative;min-width:340px;text-align:center"><h2 class="h">Duraklatıldı</h2><div class="divider"></div>
      <div class="menu"><div class="btn primary" id="rs">Devam Et</div><div class="btn" id="sr">Pes Et</div></div></div>`);
    s.querySelector('#rs')!.addEventListener('click', () => this.ctl.resume());
    s.querySelector('#sr')!.addEventListener('click', () => this.ctl.surrender());
  }

  // ───────── Sonuç ─────────
  showEnd(r: RunResult) {
    this.clear(); $('hud').classList.add('hidden');
    const earned = r.gold;
    save.gold += earned; save.kills += r.kills; save.runs++; if (r.won) save.wins++; if (r.time > save.best) save.best = r.time;
    if (r.time > (save.bestByMap[r.map.id] ?? 0)) save.bestByMap[r.map.id] = r.time;
    const unl = r.won ? registerClear(r.map, r.time) : {}; persist();
    const unlHtml = [unl.newChar ? `<div class="unlock">✦ Yeni kahraman açıldı: <b>${CHARACTERS.find((c) => c.id === unl.newChar)!.name}</b></div>` : '', unl.newMap ? `<div class="unlock">✦ Yeni diyar açıldı: <b>${unl.newMap.name}</b></div>` : ''].join('');
    const wp = r.weapons.map((w) => `<div class="slot ${w.def.isEvolved ? 'evo' : ''}"><img src="${weaponIconUrl(w.def.icon)}"/><span class="lv">${w.def.isEvolved ? '★' : w.level}</span></div>`).join('');
    const s = this.screen('dim', `<div class="panel" style="position:relative;min-width:420px;text-align:center">
      <div class="bigres ${r.won ? 'win' : 'lose'}">${r.won ? 'ZAFER' : 'YENİLDİN'}</div><div class="sub">${r.map.name} · ${r.won ? 'Şafak söktü, karanlık geri çekildi' : r.char.name + ' karanlığa yenik düştü'}</div>${unlHtml}
      ${!r.won && r.killer && r.killer !== ' · 0 hasar' ? `<div class="sub" style="color:#e07a7a">Son darbe: ${r.killer}</div>` : ''}<div class="wpicons">${wp}</div><div class="divider"></div>
      <div class="endstats"><span>Hayatta kalma</span><b>${fmtTime(r.time)}</b><span>Öldürme</span><b>${fmtNum(r.kills)}</b><span>Seviye</span><b>${r.level}</b><span>Kazanılan altın</span><b style="color:#ffd45a">¤ ${fmtNum(earned)}</b></div>
      <div class="divider"></div><div class="row"><div class="btn primary" id="again">Tekrar Dene</div><div class="btn" id="menu">Ana Menü</div></div></div>`);
    s.querySelector('#again')!.addEventListener('click', () => this.ctl.replay());
    s.querySelector('#menu')!.addEventListener('click', () => this.ctl.menu());
  }

  // ───────── HUD ─────────
  showHud() { $('hud').classList.remove('hidden'); this.slotSig = ''; }
  banner(title: string, sub = '', kind = 'info') {
    const el = $('banner'); el.innerHTML = `<div class="b ${kind}"><div class="t">${title}</div>${sub ? `<div class="s">${sub}</div>` : ''}</div>`;
    const b = el.firstElementChild as HTMLElement; setTimeout(() => { if (el.firstElementChild === b) el.innerHTML = ''; }, 2700);
  }
  hurtFlash() { const h = $('hurt'); h.classList.add('on'); requestAnimationFrame(() => requestAnimationFrame(() => h.classList.remove('on'))); }

  private last = { xp: -1, lvl: -1, t: -1, k: -1, g: -1, boss: -1 };
  updateHud(g: Game) {
    const xp = Math.round((g.xp / g.xpNeed) * 1000) / 10;
    if (xp !== this.last.xp) { $('xpfill').style.width = xp + '%'; this.last.xp = xp; }
    if (g.level !== this.last.lvl) { $('lvl').textContent = 'NV ' + g.level; this.last.lvl = g.level; }
    const t = Math.floor(g.t); if (t !== this.last.t) { $('timer').textContent = fmtTime(t); this.last.t = t; }
    if (g.kills !== this.last.k) { $('kills').textContent = '☠ ' + fmtNum(g.kills); this.last.k = g.kills; }
    if (g.gold !== this.last.g) { $('gold').textContent = '¤ ' + fmtNum(g.gold); this.last.g = g.gold; }
    const sig = g.weapons.map((w) => w.def.id + w.level).join() + '|' + [...g.passives].join() + '|' + g.evolvableCount();
    if (sig !== this.slotSig) {
      this.slotSig = sig;
      $('wslots').innerHTML = Array.from({ length: MAX_WEAPONS }, (_, i) => {
        const w = g.weapons[i]; if (!w) return '<div class="slot empty"></div>';
        const ready = w.def.evolvesTo && w.level >= w.def.maxLevel && w.def.evolveWith && g.passives.has(w.def.evolveWith);
        return `<div class="slot ${w.def.isEvolved || ready ? 'evo' : ''}"><img src="${weaponIconUrl(w.def.icon)}"/><span class="lv">${w.def.isEvolved ? '★' : w.level >= w.def.maxLevel ? 'MAX' : w.level}</span></div>`;
      }).join('');
      const ps = [...g.passives];
      $('pslots').innerHTML = Array.from({ length: MAX_PASSIVES }, (_, i) => {
        const p = ps[i]; if (!p) return '<div class="slot empty"></div>'; const d = PASSIVES[p[0]];
        return `<div class="slot"><span class="g" style="color:${d.color}">${d.glyph}</span><span class="lv">${p[1]}</span></div>`;
      }).join('');
      $('chesthint').classList.toggle('hidden', g.evolvableCount() === 0);
    }
    const b = g.boss; const bb = $('bossbar');
    if (b && b.active && !b.dying) {
      bb.classList.remove('hidden'); $('bossname').textContent = b.bossName;
      const pct = Math.max(0, Math.round((b.hp / b.maxHp) * 1000) / 10); if (pct !== this.last.boss) { $('bossfill').style.width = pct + '%'; this.last.boss = pct; }
    } else bb.classList.add('hidden');
  }
}
