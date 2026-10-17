// ─────────────────────────────────────────────────────────────
//  Oyun verisi: silahlar, pasifler, evrimler, düşmanlar, karakterler
//  Yeni içerik eklemek = buraya bir satır eklemek.
// ─────────────────────────────────────────────────────────────


export interface PlayerStats {
  maxHp: number;
  speed: number; // px/sn
  might: number; // hasar çarpanı
  area: number; // alan çarpanı
  cooldown: number; // bekleme çarpanı (düşük = hızlı)
  projSpeed: number;
  amount: number; // +mermi
  armor: number;
  regen: number; // can/sn
  magnet: number; // toplama yarıçapı
  growth: number; // xp çarpanı
  greed: number; // altın çarpanı
  revives: number;
  rerolls: number; banishes: number;
}

export const baseStats = (): PlayerStats => ({
  maxHp: 120, speed: 120, might: 1, area: 1, cooldown: 1, projSpeed: 1, amount: 0,
  armor: 0, regen: 0.25, magnet: 40, growth: 1, greed: 1, revives: 0, rerolls: 2, banishes: 2,
});

// ───────────── Silahlar ─────────────
export type WeaponKind = 'proj' | 'orbit' | 'aura' | 'strike' | 'nova' | 'slash';

export interface WS {
  dmg: number; cd: number; amount: number;
  speed: number; pierce: number; area: number; tick: number;
  [k: string]: number;
}

export interface WeaponDef {
  id: string; name: string; desc: string; icon: string; kind: WeaponKind;
  stats: (l: number) => WS;
  notes: string[]; // seviye 2..8 için kısa açıklamalar
  maxLevel: number;
  evolvesTo?: string; evolveWith?: string; // pasif id
  isEvolved?: boolean;
  tint?: number; // efekt rengi
}

const S = (o: Partial<WS>): WS => ({ dmg: 10, cd: 1, amount: 1, speed: 400, pierce: 1, area: 1, tick: 0.5, ...o });
const at = <T,>(arr: T[], l: number) => arr[Math.min(l, arr.length) - 1];

export const WEAPONS: Record<string, WeaponDef> = {
  arcane_bolt: {
    id: 'arcane_bolt', name: 'Gizemli Ok', icon: 'staff_15', kind: 'proj', maxLevel: 8, tint: 0xb48cff,
    desc: 'En yakın düşmana kendiliğinden giden büyü okları fırlatır.',
    stats: (l) => S({ dmg: 10 + 3 * l, cd: 1.35 - 0.05 * l, amount: at([1, 1, 2, 2, 3, 3, 4, 4], l), speed: 420, pierce: l >= 8 ? 3 : l >= 5 ? 2 : 1 }),
    notes: ['Daha hızlı ateş', '+1 ok', 'Daha fazla hasar', '+1 ok, deler', 'Daha hızlı ateş', '+1 ok', 'Üç düşmanı deler'],
    evolvesTo: 'astral_barrage', evolveWith: 'haste',
  },
  astral_barrage: {
    id: 'astral_barrage', name: 'Yıldız Yağmuru', icon: 'legend_staff_12', kind: 'proj', maxLevel: 1, isEvolved: true, tint: 0xffe08a,
    desc: 'Her yöne yıldız okları yağdırır, düşmanları takip eder.',
    stats: () => S({ dmg: 38, cd: 0.8, amount: 4, speed: 520, pierce: 4, radial: 8, homing: 1 }), notes: [],
  },
  throwing_daggers: {
    id: 'throwing_daggers', name: 'Fırlatma Bıçakları', icon: 'dagger_12', kind: 'proj', maxLevel: 8, tint: 0xd8e6ff,
    desc: 'Baktığın yöne bıçak demeti fırlatır.',
    stats: (l) => S({ dmg: 8 + 2.2 * l, cd: 1.1 - 0.04 * l, amount: at([1, 2, 2, 3, 3, 4, 4, 5], l), speed: 560, pierce: l >= 7 ? 3 : l >= 4 ? 2 : 1, fan: 1 }),
    notes: ['+1 bıçak', 'Daha fazla hasar', '+1 bıçak, deler', 'Daha hızlı ateş', '+1 bıçak', 'Daha fazla hasar', '+1 bıçak'],
    evolvesTo: 'phantom_daggers', evolveWith: 'speed',
  },
  phantom_daggers: {
    id: 'phantom_daggers', name: 'Hayalet Bıçaklar', icon: 'legend_dagger_12', kind: 'proj', maxLevel: 1, isEvolved: true, tint: 0x9ff0ff,
    desc: 'Önünü ve arkanı bıçak fırtınasına çevirir, her şeyi deler.',
    stats: () => S({ dmg: 26, cd: 0.55, amount: 4, speed: 720, pierce: 99, fan: 1, both: 1 }), notes: [],
  },
  hunter_bow: {
    id: 'hunter_bow', name: 'Avcı Yayı', icon: 'bow_9', kind: 'proj', maxLevel: 8, tint: 0xe8eef8,
    desc: 'Uzak menzilden hızlı oklar atar. Ekranın öbür ucundaki düşmanı bile vurur.',
    stats: (l) => S({ dmg: 12 + 3 * l, cd: 1.25 - 0.06 * l, amount: at([1, 1, 2, 2, 3, 3, 4, 4], l), speed: 780, pierce: 1 + (l >= 4 ? 1 : 0) + (l >= 7 ? 1 : 0), arrow: 1 }),
    notes: ['Daha hızlı ateş', '+1 ok', 'Daha fazla hasar, deler', 'Daha hızlı ateş', '+1 ok', 'Daha fazla hasar, deler', '+1 ok'],
    evolvesTo: 'storm_bow', evolveWith: 'swift',
  },
  storm_bow: {
    id: 'storm_bow', name: 'Fırtına Yayı', icon: 'legend_bow_6', kind: 'proj', maxLevel: 1, isEvolved: true, tint: 0xa8e0ff,
    desc: 'Oklar yağmur gibi yağar ve her şeyi deler.',
    stats: () => S({ dmg: 36, cd: 0.6, amount: 6, speed: 900, pierce: 99, arrow: 1 }), notes: [],
  },
  fire_orb: {
    id: 'fire_orb', name: 'Ateş Topu', icon: 'wand_12', kind: 'proj', maxLevel: 8, tint: 0xff8a3a,
    desc: 'Yavaş bir ateş topu fırlatır. Çarptığı yerde patlayıp çevresine hasar verir.',
    stats: (l) => S({ dmg: 14 + 4 * l, cd: 1.9 - 0.1 * l, amount: at([1, 1, 2, 2, 2, 3, 3, 3], l), speed: 270, pierce: 1, boom: 58 + 5 * l }),
    notes: ['Daha hızlı ateş', '+1 top', 'Daha geniş patlama', 'Daha fazla hasar', '+1 top', 'Daha geniş patlama', 'Daha hızlı ateş'],
    evolvesTo: 'inferno_orb', evolveWith: 'area',
  },
  inferno_orb: {
    id: 'inferno_orb', name: 'Cehennem Küresi', icon: 'legend_wand_12', kind: 'proj', maxLevel: 1, isEvolved: true, tint: 0xff4a1a,
    desc: 'Üç dev ateş küresi, devasa patlamalarla her şeyi yok eder.',
    stats: () => S({ dmg: 70, cd: 1.1, amount: 3, speed: 330, pierce: 1, boom: 125 }), notes: [],
  },
  fate_spear: {
    id: 'fate_spear', name: 'Kader Mızrağı', icon: 'spear_9', kind: 'proj', maxLevel: 8, tint: 0xffe08a,
    desc: 'Önüne uzun bir mızrak fırlatır. Her şeyi deler, sonra sana geri döner.',
    stats: (l) => S({ dmg: 18 + 4 * l, cd: 1.8 - 0.08 * l, amount: at([1, 1, 1, 2, 2, 2, 3, 3], l), speed: 440, pierce: 99, ret: 1, area: 1 + 0.04 * l }),
    notes: ['Daha hızlı', 'Daha fazla hasar', '+1 mızrak', 'Daha geniş alan', 'Daha hızlı', '+1 mızrak', 'Daha fazla hasar'],
    evolvesTo: 'sky_spear', evolveWith: 'might',
  },
  sky_spear: {
    id: 'sky_spear', name: 'Gök Mızrağı', icon: 'legend_spear_9', kind: 'proj', maxLevel: 1, isEvolved: true, tint: 0xfff0a0,
    desc: 'Önüne ve arkana dev mızraklar fırlatır, hepsi geri döner.',
    stats: () => S({ dmg: 60, cd: 1.0, amount: 3, speed: 560, pierce: 99, ret: 1, both: 1, area: 1.5 }), notes: [],
  },
  spectral_blades: {
    id: 'spectral_blades', name: 'Hayalet Kılıçlar', icon: 'sword_15', kind: 'orbit', maxLevel: 8, tint: 0xbfe3ff,
    desc: 'Etrafında dönen kılıçlar yakındaki düşmanları doğrar.',
    stats: (l) => S({ dmg: 9 + 3 * l, cd: 0, amount: at([1, 2, 3, 3, 4, 4, 5, 6], l), speed: 3.0 + 0.12 * l, area: 1 + 0.03 * l, tick: 0.55 - 0.02 * l, radius: 78 }),
    notes: ['+1 kılıç', '+1 kılıç', 'Daha fazla hasar', '+1 kılıç', 'Daha hızlı döner', '+1 kılıç', '+1 kılıç, daha geniş alan'],
    evolvesTo: 'blade_tempest', evolveWith: 'hp',
  },
  blade_tempest: {
    id: 'blade_tempest', name: 'Kılıç Kasırgası', icon: 'legend_sword_12', kind: 'orbit', maxLevel: 1, isEvolved: true, tint: 0xff9ff3,
    desc: 'Sekiz dev kılıç etrafında kasırga gibi döner.',
    stats: () => S({ dmg: 36, cd: 0, amount: 8, speed: 4.2, area: 1.35, tick: 0.3, radius: 120, big: 1 }), notes: [],
  },
  holy_aura: {
    id: 'holy_aura', name: 'Kutsal Hale', icon: 'legend_staff_14', kind: 'aura', maxLevel: 8, tint: 0xffd978,
    desc: 'Etrafındaki düşmanları sürekli yakan kutsal bir ışık halkası.',
    stats: (l) => S({ dmg: 4 + 1.6 * l, cd: 0, amount: 1, area: 1 + 0.09 * l, tick: 0.5 - 0.02 * l, radius: 84, knock: 0.6 }),
    notes: ['Daha geniş alan', 'Daha fazla hasar', 'Daha hızlı yakar', 'Daha geniş alan', 'Daha fazla hasar', 'Daha hızlı yakar', 'Daha geniş alan'],
    evolvesTo: 'radiant_sanctum', evolveWith: 'armor',
  },
  radiant_sanctum: {
    id: 'radiant_sanctum', name: 'Kutsal Sığınak', icon: 'legend_mace_13', kind: 'aura', maxLevel: 1, isEvolved: true, tint: 0xfff2b0,
    desc: 'Devasa bir ışık alanı: düşmanları yakar, seni iyileştirir.',
    stats: () => S({ dmg: 15, cd: 0, amount: 1, area: 2.2, tick: 0.3, radius: 84, knock: 1.2, heal: 1 }), notes: [],
  },
  chain_lightning: {
    id: 'chain_lightning', name: 'Şimşek Çağrısı', icon: 'wand_16', kind: 'strike', maxLevel: 8, tint: 0x9fd4ff,
    desc: 'Ekrandaki rastgele düşmanlara şimşek indirir.',
    stats: (l) => S({ dmg: 18 + 6 * l, cd: 2.0 - 0.1 * l, amount: at([1, 1, 2, 2, 3, 3, 4, 4], l), area: 1 + 0.045 * l, mode: 0 }),
    notes: ['Daha hızlı', '+1 şimşek', 'Daha fazla hasar', '+1 şimşek', 'Daha hızlı', '+1 şimşek', 'Daha fazla hasar'],
    evolvesTo: 'thunder_god', evolveWith: 'amount',
  },
  thunder_god: {
    id: 'thunder_god', name: 'Gök Gürültüsü', icon: 'legend_bow_14', kind: 'strike', maxLevel: 1, isEvolved: true, tint: 0xfff59e,
    desc: 'Gökyüzü yarılır: onlarca şimşek ve zincirleme patlamalar.',
    stats: () => S({ dmg: 70, cd: 1.1, amount: 7, area: 1.6, mode: 0, chain: 1 }), notes: [],
  },
  meteor_shower: {
    id: 'meteor_shower', name: 'Göktaşı Yağmuru', icon: 'legend_staff_17', kind: 'strike', maxLevel: 8, tint: 0xff9a4a,
    desc: 'Düşman kalabalıklarının üstüne göktaşı düşürür.',
    stats: (l) => S({ dmg: 32 + 10 * l, cd: 3.4 - 0.15 * l, amount: at([1, 1, 2, 2, 3, 3, 4, 4], l), area: 1 + 0.06 * l, mode: 1, radius: 78 }),
    notes: ['Daha hızlı', '+1 göktaşı', 'Daha geniş alan', '+1 göktaşı', 'Daha fazla hasar', '+1 göktaşı', 'Daha geniş alan'],
    evolvesTo: 'apocalypse', evolveWith: 'area',
  },
  apocalypse: {
    id: 'apocalypse', name: 'Kıyamet', icon: 'legend_greatsword_12', kind: 'strike', maxLevel: 1, isEvolved: true, tint: 0xff5a3a,
    desc: 'Ekran alev alır: devasa göktaşları sürekli yağar.',
    stats: () => S({ dmg: 120, cd: 1.7, amount: 6, area: 1.9, mode: 1, radius: 78 }), notes: [],
  },
  frost_nova: {
    id: 'frost_nova', name: 'Buz Dalgası', icon: 'legend_mace_14', kind: 'nova', maxLevel: 8, tint: 0x8fdcff,
    desc: 'Etrafına buz dalgası yayar: hasar verir, düşmanları yavaşlatır.',
    stats: (l) => S({ dmg: 14 + 5 * l, cd: 4.2 - 0.2 * l, amount: 1, area: 1 + 0.07 * l, radius: 135, slow: 0.45 + 0.03 * l }),
    notes: ['Daha hızlı', 'Daha fazla hasar', 'Daha geniş alan', 'Daha hızlı', 'Daha fazla hasar', 'Daha geniş alan', 'Daha güçlü yavaşlatma'],
  },
  crescent_slash: {
    id: 'crescent_slash', name: 'Hilal Kesik', icon: 'greatsword_13', kind: 'slash', maxLevel: 8, tint: 0xffffff,
    desc: 'Önündeki düşmanları geniş bir yayla biçer.',
    stats: (l) => S({ dmg: 16 + 5 * l, cd: 1.6 - 0.07 * l, amount: l >= 4 ? 2 : 1, area: 1 + 0.07 * l, radius: 120, knock: 1 }),
    notes: ['Daha hızlı', 'Daha fazla hasar', 'İki yöne vurur', 'Daha geniş alan', 'Daha hızlı', 'Daha fazla hasar', 'Daha geniş alan'],
    evolvesTo: 'executioner', evolveWith: 'might',
  },
  executioner: {
    id: 'executioner', name: 'Cellat', icon: 'legend_spear_11', kind: 'slash', maxLevel: 1, isEvolved: true, tint: 0xff6b6b,
    desc: 'Devasa bir pala: her iki yöne de ölümcül darbeler.',
    stats: () => S({ dmg: 70, cd: 0.85, amount: 2, area: 1.8, radius: 120, knock: 2, big: 1 }), notes: [],
  },
};

// ───────────── Pasifler ─────────────
export interface PassiveDef {
  id: string; name: string; desc: string; glyph: string; color: string; maxLevel: number;
  apply: (st: PlayerStats, l: number) => void; // her seviye için toplam etki
  perLevel: string;
}

export const PASSIVES: Record<string, PassiveDef> = {
  might: { id: 'might', name: 'Güç Tılsımı', glyph: '⚔', color: '#e0583c', maxLevel: 5, perLevel: '+%10 hasar', desc: 'Tüm silahların hasarını artırır.', apply: (s, l) => { s.might += 0.1 * l; } },
  haste: { id: 'haste', name: 'Büyü Kitabı', glyph: '✦', color: '#9d7bff', maxLevel: 5, perLevel: '-%8 bekleme', desc: 'Silahlar daha sık ateş eder.', apply: (s, l) => { s.cooldown *= Math.pow(0.92, l); } },
  speed: { id: 'speed', name: 'Rüzgâr Çizmeleri', glyph: '≫', color: '#58d6c0', maxLevel: 5, perLevel: '+%10 hız', desc: 'Daha hızlı koşarsın.', apply: (s, l) => { s.speed *= 1 + 0.1 * l; } },
  hp: { id: 'hp', name: 'Yaşam Kalbi', glyph: '♥', color: '#e0405a', maxLevel: 5, perLevel: '+%20 can', desc: 'Azami canını artırır.', apply: (s, l) => { s.maxHp *= 1 + 0.2 * l; } },
  armor: { id: 'armor', name: 'Demir Zırh', glyph: '⛨', color: '#aab4c8', maxLevel: 5, perLevel: '-1 hasar', desc: 'Aldığın her darbeyi azaltır.', apply: (s, l) => { s.armor += l; } },
  area: { id: 'area', name: 'Kadim Mum', glyph: '☼', color: '#ffb84a', maxLevel: 5, perLevel: '+%10 alan', desc: 'Silahların etki alanını büyütür.', apply: (s, l) => { s.area += 0.1 * l; } },
  amount: { id: 'amount', name: 'İkiz Mühür', glyph: '❖', color: '#6fb6ff', maxLevel: 2, perLevel: '+1 mermi', desc: 'Silahlar fazladan bir mermi atar.', apply: (s, l) => { s.amount += l; } },
  magnet: { id: 'magnet', name: 'Mıknatıs Taşı', glyph: '◉', color: '#69c2ff', maxLevel: 5, perLevel: '+%90 toplama', desc: 'Deneyim kristallerini çok uzaktan çeker.', apply: (s, l) => { s.magnet *= 1 + 0.9 * l; } },
  regen: { id: 'regen', name: 'Şifa Çiçeği', glyph: '✚', color: '#7ee07a', maxLevel: 5, perLevel: '+0.3 can/sn', desc: 'Zamanla can yenilersin.', apply: (s, l) => { s.regen += 0.3 * l; } },
  swift: { id: 'swift', name: 'Hızlı Mühür', glyph: '➤', color: '#ff9a5a', maxLevel: 5, perLevel: '+%12 mermi hızı', desc: 'Mermiler ve kılıçlar daha hızlı hareket eder.', apply: (s, l) => { s.projSpeed *= 1 + 0.12 * l; } },
  greed: { id: 'greed', name: 'Altın Tılsımı', glyph: '¤', color: '#ffd45a', maxLevel: 5, perLevel: '+%15 altın', desc: 'Savaşta daha çok altın düşer.', apply: (s, l) => { s.greed += 0.15 * l; } },
  growth: { id: 'growth', name: 'Bilgelik Gözü', glyph: '◈', color: '#f0e06a', maxLevel: 5, perLevel: '+%8 deneyim', desc: 'Daha hızlı seviye atlarsın.', apply: (s, l) => { s.growth += 0.08 * l; } },
};

export const MAX_WEAPONS = 6;
export const MAX_PASSIVES = 6;

// ───────────── Düşmanlar ─────────────
export interface EnemyDef {
  id: string; hp: number; speed: number; dmg: number; r: number; scale: number;
  xp: number; faceRight: boolean; fly?: boolean; anim?: 'walk' | 'run';
  boss?: boolean; weight?: number; soft?: boolean;
}

export const ENEMIES: Record<string, EnemyDef> = {
  bat:              { id: 'bat', hp: 3, speed: 88, dmg: 4, r: 11, scale: 0.62, xp: 1, faceRight: false, fly: true, anim: 'run' },
  rat:              { id: 'rat', hp: 4, speed: 72, dmg: 4, r: 11, scale: 0.7, xp: 1, faceRight: true },
  slime:            { id: 'slime', hp: 9, speed: 40, dmg: 6, r: 17, scale: 0.5, xp: 1, faceRight: true },
  goblin:           { id: 'goblin', hp: 10, speed: 74, dmg: 6, r: 14, scale: 0.55, xp: 1, faceRight: true, anim: 'run' },
  spider:           { id: 'spider', hp: 12, speed: 98, dmg: 6, r: 12, scale: 0.6, xp: 1, faceRight: false, anim: 'run' },
  skeleton_warrior: { id: 'skeleton_warrior', hp: 18, speed: 56, dmg: 9, r: 15, scale: 0.55, xp: 2, faceRight: false },
  skel_archer:      { id: 'skel_archer', hp: 14, speed: 66, dmg: 7, r: 14, scale: 0.55, xp: 2, faceRight: true },
  scorpion:         { id: 'scorpion', hp: 22, speed: 70, dmg: 10, r: 14, scale: 0.65, xp: 2, faceRight: true },
  ghoul:            { id: 'ghoul', hp: 28, speed: 64, dmg: 10, r: 16, scale: 0.55, xp: 3, faceRight: true },
  zombie:           { id: 'zombie', hp: 36, speed: 36, dmg: 11, r: 16, scale: 0.55, xp: 3, faceRight: false },
  spore:            { id: 'spore', hp: 30, speed: 32, dmg: 8, r: 16, scale: 0.55, xp: 3, faceRight: true },
  wraith:           { id: 'wraith', hp: 24, speed: 84, dmg: 10, r: 14, scale: 0.55, xp: 3, faceRight: true, fly: true },
  hellhound:        { id: 'hellhound', hp: 30, speed: 112, dmg: 12, r: 16, scale: 0.65, xp: 3, faceRight: true, anim: 'run' },
  lizardman:        { id: 'lizardman', hp: 52, speed: 62, dmg: 14, r: 16, scale: 0.55, xp: 4, faceRight: true },
  gargoyle:         { id: 'gargoyle', hp: 64, speed: 74, dmg: 14, r: 17, scale: 0.55, xp: 5, faceRight: false, fly: true },
  treant:           { id: 'treant', hp: 170, speed: 38, dmg: 18, r: 24, scale: 0.6, xp: 10, faceRight: true },
  ogre:             { id: 'ogre', hp: 240, speed: 52, dmg: 20, r: 24, scale: 0.6, xp: 12, faceRight: false },
  // bosslar
  skeleton_lord:    { id: 'skeleton_lord', hp: 900, speed: 50, dmg: 22, r: 34, scale: 0.62, xp: 120, faceRight: true, boss: true },
  stone_golem:      { id: 'stone_golem', hp: 2600, speed: 44, dmg: 26, r: 40, scale: 0.62, xp: 160, faceRight: false, boss: true },
  lava_colossus:    { id: 'lava_colossus', hp: 6200, speed: 48, dmg: 32, r: 42, scale: 0.58, xp: 200, faceRight: false, boss: true },
  frost_dragon:     { id: 'frost_dragon', hp: 9500, speed: 60, dmg: 34, r: 46, scale: 0.6, xp: 260, faceRight: true, boss: true },
  thunder_titan:    { id: 'thunder_titan', hp: 14000, speed: 56, dmg: 38, r: 44, scale: 0.58, xp: 320, faceRight: true, boss: true },
  plague_broodmother:{ id: 'plague_broodmother', hp: 20000, speed: 50, dmg: 40, r: 46, scale: 0.58, xp: 400, faceRight: true, boss: true },
  seraph:           { id: 'seraph', hp: 28000, speed: 66, dmg: 44, r: 40, scale: 0.55, xp: 500, faceRight: true, boss: true, fly: true },
  void_devourer:    { id: 'void_devourer', hp: 42000, speed: 58, dmg: 60, r: 48, scale: 0.5, xp: 800, faceRight: true, boss: true },
};

// ───────────── Haritalar ─────────────
// Dalga: t0/t1 saniye, rate = saniyede doğan düşman
export interface Wave { t0: number; t1: number; id: string; rate: number; pack?: number }
export interface GroundTheme { base: string; tile: [number, number, number]; blotDark: string; blotLight: string; accent: string; accentA: number; crack: number; bg: string; fog: string }
export interface MapDef {
  id: string; name: string; sub: string; desc: string; minutes: number;
  pace: number; spawn?: number; hpMul: number; dmgMul: number; gold: number; // zorluk
  theme: GroundTheme; waves: Wave[]; elites: { t: number; id: string }[]; bosses: { t: number; id: string; name: string; hp: number }[];
  swarms: string[][]; // zamana göre sürü havuzları (eşit aralıklı dilimler)
  unlocksChar?: string; // bu haritayı bitirince açılan karakter
}
/** [id, başlangıç%, bitiş%, rate, pack] → Wave */
const mkWaves = (dur: number, rows: [string, number, number, number, number?][]): Wave[] =>
  rows.map(([id, a, b, rate, pack]) => ({ id, t0: Math.round(a * dur), t1: Math.round(b * dur), rate, pack }));

export const MAPS: MapDef[] = [
  {
    id: 'crypt', name: 'Küllü Mezarlık', sub: 'Başlangıç', minutes: 12, pace: 1.15, spawn: 0.8, hpMul: 1, dmgMul: 0.75, gold: 1,
    desc: 'Unutulmuş bir kabristan. Karanlığın ilk kıpırtıları burada başlar.',
    theme: { base: '#17141d', tile: [27, 24, 34], blotDark: '8,6,14', blotLight: '36,30,52', accent: '40,70,48', accentA: 0.16, crack: 0.5, bg: '#0a0810', fog: '120,90,200' },
    waves: mkWaves(720, [['bat', 0, 0.2, 0.9], ['slime', 0, 0.28, 0.35], ['rat', 0.05, 0.38, 0.7, 2], ['goblin', 0.12, 0.6, 0.7], ['spider', 0.2, 0.75, 0.55],
      ['skeleton_warrior', 0.28, 0.95, 0.6], ['skel_archer', 0.4, 1.2, 0.5], ['ghoul', 0.52, 1.3, 0.5], ['zombie', 0.64, 1.3, 0.55], ['bat', 0.78, 1.3, 1.3, 3]]),
    elites: [{ t: 130, id: 'ogre' }, { t: 290, id: 'ogre' }, { t: 430, id: 'treant' }, { t: 560, id: 'ogre' }, { t: 650, id: 'treant' }],
    bosses: [{ t: 210, id: 'skeleton_lord', name: 'İskelet Lordu', hp: 1100 }, { t: 420, id: 'stone_golem', name: 'Taş Golem', hp: 2600 }, { t: 640, id: 'lava_colossus', name: 'Lav Devi', hp: 4500 }],
    swarms: [['bat'], ['bat', 'spider', 'rat'], ['bat', 'skeleton_warrior', 'goblin']],
    unlocksChar: 'sylva',
  },
  {
    id: 'marsh', name: 'Çürük Bataklık', sub: 'Harita 2', minutes: 15, pace: 1.1, hpMul: 1.2, dmgMul: 1.1, gold: 1.4,
    desc: 'Sisli, zehirli sular. Yavaş ama sayısız yaratık sürünür.',
    theme: { base: '#10170f', tile: [20, 30, 20], blotDark: '4,10,4', blotLight: '34,56,30', accent: '90,120,30', accentA: 0.2, crack: 0.35, bg: '#060b06', fog: '100,200,110' },
    waves: mkWaves(900, [['slime', 0, 0.3, 0.7], ['spider', 0, 0.3, 0.6], ['rat', 0.04, 0.3, 0.8, 2], ['zombie', 0.12, 0.7, 0.7], ['scorpion', 0.2, 0.8, 0.5],
      ['spore', 0.28, 1.2, 0.45], ['ghoul', 0.36, 1.2, 0.6], ['lizardman', 0.5, 1.3, 0.55], ['wraith', 0.6, 1.3, 0.45], ['spider', 0.72, 1.3, 1.1, 3]]),
    elites: [{ t: 120, id: 'treant' }, { t: 270, id: 'treant' }, { t: 400, id: 'ogre' }, { t: 540, id: 'treant' }, { t: 680, id: 'ogre' }, { t: 800, id: 'treant' }],
    bosses: [{ t: 240, id: 'plague_broodmother', name: 'Veba Ana Örümceği', hp: 2000 }, { t: 500, id: 'skeleton_lord', name: 'Bataklık Lordu', hp: 2600 }, { t: 780, id: 'stone_golem', name: 'Çamur Golemi', hp: 4800 }],
    swarms: [['spider', 'rat'], ['spider', 'wraith', 'rat'], ['spider', 'wraith', 'scorpion']],
    unlocksChar: 'seraphine',
  },
  {
    id: 'ember', name: 'Kızıl Kül Çölü', sub: 'Harita 3', minutes: 15, pace: 1.2, hpMul: 1.5, dmgMul: 1.2, gold: 1.8,
    desc: 'Yanan kumlar ve lav çatlakları. Hızlı, saldırgan düşmanlar.',
    theme: { base: '#1e130e', tile: [38, 24, 18], blotDark: '12,4,2', blotLight: '70,34,18', accent: '210,80,20', accentA: 0.12, crack: 0.65, bg: '#0e0604', fog: '230,110,50' },
    waves: mkWaves(900, [['goblin', 0, 0.3, 0.9], ['scorpion', 0, 0.5, 0.6], ['hellhound', 0.08, 0.9, 0.6, 2], ['skeleton_warrior', 0.14, 0.7, 0.6], ['skel_archer', 0.24, 0.9, 0.5],
      ['wraith', 0.32, 1.2, 0.5], ['lizardman', 0.42, 1.3, 0.6], ['gargoyle', 0.55, 1.3, 0.5], ['hellhound', 0.7, 1.3, 1.0, 3]]),
    elites: [{ t: 110, id: 'ogre' }, { t: 250, id: 'ogre' }, { t: 390, id: 'treant' }, { t: 520, id: 'ogre' }, { t: 660, id: 'ogre' }, { t: 790, id: 'treant' }],
    bosses: [{ t: 240, id: 'lava_colossus', name: 'Lav Devi', hp: 3200 }, { t: 520, id: 'stone_golem', name: 'Kor Golem', hp: 4800 }, { t: 800, id: 'thunder_titan', name: 'Fırtına Titanı', hp: 7500 }],
    swarms: [['hellhound', 'goblin'], ['hellhound', 'wraith'], ['hellhound', 'gargoyle', 'wraith']],
    unlocksChar: 'noctis',
  },
  {
    id: 'frost', name: 'Donmuş Zirve', sub: 'Harita 4', minutes: 18, pace: 1.1, hpMul: 1.9, dmgMul: 1.35, gold: 2.3,
    desc: 'Dondurucu rüzgâr, keskin ruhlar. Hata affetmez.',
    theme: { base: '#121a24', tile: [26, 38, 52], blotDark: '4,8,16', blotLight: '60,90,130', accent: '140,200,255', accentA: 0.1, crack: 0.45, bg: '#060a12', fog: '140,200,255' },
    waves: mkWaves(1080, [['skeleton_warrior', 0, 0.4, 0.8], ['wraith', 0, 0.6, 0.6], ['ghoul', 0.06, 0.7, 0.6], ['skel_archer', 0.12, 0.8, 0.6], ['spider', 0.18, 0.6, 0.7],
      ['lizardman', 0.3, 1.2, 0.6], ['gargoyle', 0.4, 1.3, 0.6], ['hellhound', 0.5, 1.3, 0.5, 2], ['wraith', 0.65, 1.3, 1.1, 3]]),
    elites: [{ t: 120, id: 'ogre' }, { t: 300, id: 'treant' }, { t: 460, id: 'ogre' }, { t: 620, id: 'treant' }, { t: 780, id: 'ogre' }, { t: 920, id: 'treant' }],
    bosses: [{ t: 270, id: 'frost_dragon', name: 'Buz Ejderi', hp: 4800 }, { t: 560, id: 'stone_golem', name: 'Buz Golemi', hp: 6500 }, { t: 900, id: 'thunder_titan', name: 'Fırtına Titanı', hp: 9500 }],
    swarms: [['wraith', 'bat'], ['wraith', 'gargoyle'], ['wraith', 'gargoyle', 'hellhound']],
    unlocksChar: 'vesper',
  },
  {
    id: 'void', name: 'Hiçlik Sarayı', sub: 'Son Harita', minutes: 20, pace: 1.15, hpMul: 2.4, dmgMul: 1.5, gold: 3,
    desc: 'Gerçekliğin bittiği yer. Her şey burada seni bekliyor.',
    theme: { base: '#130d1c', tile: [26, 18, 40], blotDark: '6,2,12', blotLight: '70,34,110', accent: '200,80,240', accentA: 0.14, crack: 0.6, bg: '#07040c', fog: '180,90,255' },
    waves: mkWaves(1200, [['ghoul', 0, 0.4, 0.8], ['wraith', 0, 0.6, 0.7], ['skeleton_warrior', 0, 0.3, 0.8], ['hellhound', 0.06, 0.7, 0.6, 2], ['lizardman', 0.14, 1.2, 0.6],
      ['spore', 0.2, 0.8, 0.5], ['gargoyle', 0.3, 1.3, 0.7], ['zombie', 0.4, 1.0, 0.7], ['scorpion', 0.5, 1.3, 0.6], ['wraith', 0.62, 1.3, 1.3, 3], ['bat', 0.75, 1.3, 1.5, 3]]),
    elites: [{ t: 100, id: 'ogre' }, { t: 260, id: 'treant' }, { t: 420, id: 'ogre' }, { t: 560, id: 'treant' }, { t: 700, id: 'ogre' }, { t: 840, id: 'treant' }, { t: 980, id: 'ogre' }, { t: 1100, id: 'treant' }],
    bosses: [{ t: 300, id: 'seraph', name: 'Düşmüş Seraf', hp: 7000 }, { t: 600, id: 'thunder_titan', name: 'Fırtına Titanı', hp: 9000 }, { t: 900, id: 'plague_broodmother', name: 'Veba Ana Örümceği', hp: 12000 }, { t: 1140, id: 'void_devourer', name: 'Hiçlik Yutucu', hp: 18000 }],
    swarms: [['bat', 'wraith'], ['hellhound', 'wraith', 'gargoyle'], ['hellhound', 'gargoyle', 'wraith', 'bat']],
  },
];
export const mapById = (id: string) => MAPS.find((m) => m.id === id) ?? MAPS[0];

// ───────────── Karakterler ─────────────
export interface CharDef {
  id: string; sprite: string; name: string; title: string; weapon: string; blurb: string;
  mods: Partial<PlayerStats> & { hpAdd?: number };
  bonusText: string;
}

export const CHARACTERS: CharDef[] = [
  { id: 'aldric', sprite: 'char_04', name: 'Aldric', title: 'Demir Şövalye', weapon: 'spectral_blades', blurb: 'Zırhı ağır, iradesi daha ağır.', mods: { hpAdd: 40, armor: 1 }, bonusText: '+40 can, +1 zırh' },
  { id: 'merlow', sprite: 'char_02', name: 'Merlow', title: 'Mavi Büyücü', weapon: 'arcane_bolt', blurb: 'Eski kitaplar ona yol gösterir.', mods: { might: 1.15 }, bonusText: '+%15 hasar' },
  { id: 'sylva', sprite: 'char_01', name: 'Sylva', title: 'Orman Okçusu', weapon: 'throwing_daggers', blurb: 'Gölgeler arasında iz bırakmaz.', mods: { speed: 1.12 }, bonusText: '+%12 hız' },
  { id: 'seraphine', sprite: 'char_05', name: 'Seraphine', title: 'Işık Rahibesi', weapon: 'holy_aura', blurb: 'Karanlık ona yaklaşamaz.', mods: { regen: 0.5 }, bonusText: '+0.5 can/sn' },
  { id: 'noctis', sprite: 'char_06', name: 'Noctis', title: 'Gölge Suikastçı', weapon: 'crescent_slash', blurb: 'Sessiz gelir, sessiz keser.', mods: { speed: 1.1, cooldown: 0.92 }, bonusText: '+%10 hız, -%8 bekleme' },
  { id: 'vesper', sprite: 'char_13', name: 'Vesper', title: 'Kızıl Cadı', weapon: 'chain_lightning', blurb: 'Fırtına onun emrinde.', mods: { area: 1.15 }, bonusText: '+%15 alan' },
];

// ───────────── Kalıcı güçlendirmeler (altınla) ─────────────
export interface MetaDef { id: string; name: string; desc: string; max: number; cost: number; glyph: string; apply: (s: PlayerStats, rank: number) => void }
export const META: MetaDef[] = [
  { id: 'might', name: 'Savaş Ruhu', glyph: '⚔', desc: '+%5 hasar', max: 5, cost: 200, apply: (s, r) => { s.might += 0.05 * r; } },
  { id: 'hp', name: 'Dayanıklılık', glyph: '♥', desc: '+%10 can', max: 5, cost: 180, apply: (s, r) => { s.maxHp *= 1 + 0.1 * r; } },
  { id: 'armor', name: 'Çelik Deri', glyph: '⛨', desc: '+1 zırh', max: 3, cost: 600, apply: (s, r) => { s.armor += r; } },
  { id: 'regen', name: 'Yaşam Pınarı', glyph: '✚', desc: '+0.15 can/sn', max: 5, cost: 260, apply: (s, r) => { s.regen += 0.15 * r; } },
  { id: 'speed', name: 'Çeviklik', glyph: '≫', desc: '+%5 hız', max: 3, cost: 250, apply: (s, r) => { s.speed *= 1 + 0.05 * r; } },
  { id: 'cooldown', name: 'Odak', glyph: '✦', desc: '-%3 bekleme', max: 5, cost: 320, apply: (s, r) => { s.cooldown *= Math.pow(0.97, r); } },
  { id: 'area', name: 'Genişlik', glyph: '☼', desc: '+%5 alan', max: 5, cost: 300, apply: (s, r) => { s.area += 0.05 * r; } },
  { id: 'projspeed', name: 'Çabukluk', glyph: '➤', desc: '+%6 mermi hızı', max: 3, cost: 220, apply: (s, r) => { s.projSpeed *= 1 + 0.06 * r; } },
  { id: 'amount', name: 'Çoğalma', glyph: '❖', desc: '+1 mermi (tüm silahlar)', max: 1, cost: 2500, apply: (s, r) => { s.amount += r; } },
  { id: 'magnet', name: 'Çekim', glyph: '◉', desc: '+%35 toplama alanı', max: 3, cost: 220, apply: (s, r) => { s.magnet *= 1 + 0.35 * r; } },
  { id: 'growth', name: 'Öğrenme', glyph: '◈', desc: '+%5 deneyim', max: 5, cost: 300, apply: (s, r) => { s.growth += 0.05 * r; } },
  { id: 'greed', name: 'Açgözlülük', glyph: '¤', desc: '+%10 altın', max: 5, cost: 250, apply: (s, r) => { s.greed += 0.1 * r; } },
  { id: 'reroll', name: 'Şans Çarkı', glyph: '⟳', desc: '+1 yeniden çekiliş', max: 3, cost: 350, apply: (s, r) => { s.rerolls += r; } },
  { id: 'banish', name: 'Sürgün', glyph: '⌀', desc: '+1 sürgün hakkı', max: 3, cost: 350, apply: (s, r) => { s.banishes += r; } },
  { id: 'revive', name: 'İkinci Şans', glyph: '✝', desc: '+1 yeniden doğuş', max: 2, cost: 1500, apply: (s, r) => { s.revives += r; } },
];
export const metaCost = (m: MetaDef, rank: number) => Math.round(m.cost * (1 + rank * 0.6));

export const ENEMY_NAMES: Record<string, string> = {
  bat: 'Yarasa', rat: 'Fare', slime: 'Balçık', goblin: 'Goblin', spider: 'Örümcek', skeleton_warrior: 'İskelet Savaşçı', skel_archer: 'İskelet Okçu',
  scorpion: 'Akrep', ghoul: 'Gulyabani', zombie: 'Zombi', spore: 'Spor', wraith: 'Hayalet', hellhound: 'Cehennem Köpeği', lizardman: 'Kertenkele Adam',
  gargoyle: 'Gargoyl', treant: 'Ent', ogre: 'Dev Trol', skeleton_lord: 'İskelet Lordu', stone_golem: 'Taş Golem', lava_colossus: 'Lav Devi',
  frost_dragon: 'Buz Ejderi', thunder_titan: 'Fırtına Titanı', plague_broodmother: 'Veba Ana Örümceği', seraph: 'Düşmüş Seraf', void_devourer: 'Hiçlik Yutucu',
};
