import { Application } from 'pixi.js';
import { loadAll } from './assets';
import { CharDef, CHARACTERS, MapDef, mapById } from './data';
import { Game } from './game';
import { save } from './save';
import { Ctl, UI } from './ui';

async function boot() {
  const host = document.getElementById('game')!;
  const app = new Application();
  await app.init({ resizeTo: host, background: '#0a0810', antialias: false, resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true, powerPreference: 'high-performance' });
  host.appendChild(app.canvas);

  const ctl: Ctl = {
    game: null as unknown as Game,
    play: (c: CharDef, m: MapDef) => { ui.hideAll(); ui.showHud(); game.start(c, m); },
    resume: () => { ui.hideAll(); game.paused = false; if (game.state === 'chest') game.resume(); },
    menu: () => { game.state = 'idle'; ui.showMenu(); },
    surrender: () => { ui.hideAll(); game.paused = false; game.state = 'dead'; game.finish(false); },
    replay: () => { ui.hideAll(); ui.showHud(); game.start(game.char, game.map); },
  };
  const ui = new UI(ctl);
  ui.showLoading();
  await loadAll((p, l) => ui.setLoading(p, l));

  const game = new Game(app, {
    onLevelUp: (o, r, b) => ui.showLevelUp(o, r, b),
    onChest: (res) => ui.showChest(res),
    onEnd: (res) => ui.showEnd(res),
    banner: (t, s, k) => ui.banner(t, s, k),
    onHurt: () => ui.hurtFlash(),
  });
  ctl.game = game;

  app.ticker.add((t) => { game.frame(t.deltaMS / 1000); if (game.state !== 'idle') ui.updateHud(game); });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && (game.state === 'run')) {
      if (game.paused) ctl.resume(); else { game.paused = true; ui.showPause(); }
    }
  });
  window.addEventListener('blur', () => { if (game.state === 'run' && !game.paused) { game.paused = true; ui.showPause(); } });

  const q = new URLSearchParams(location.search);
  if (q.has('debug')) {
    (window as unknown as { __g: Game; __ui: UI }).__g = game; (window as unknown as { __ui: UI }).__ui = ui;
  }
  if (q.has('autostart')) {
    const c = CHARACTERS.find((x) => x.id === q.get('autostart')) ?? CHARACTERS.find((x) => x.id === save.lastChar) ?? CHARACTERS[0];
    ctl.play(c, mapById(q.get('map') ?? 'crypt'));
  } else ui.showMenu();
}
// Başlatıcı (serve.mjs) açık sekme/pencere olduğu sürece çalışır; pencere kapanınca sunucu kendini kapatır.
if (['127.0.0.1', 'localhost'].includes(location.hostname)) setInterval(() => { fetch('/__ping').catch(() => {}); }, 2000);
boot();
