import { CHARACTERS, MAPS, MapDef } from './data';
import { save } from './save';

const FREE_CHARS = ['aldric', 'merlow'];

export function mapUnlocked(i: number) { return i === 0 || !!save.cleared[MAPS[i - 1].id]; }
export function charUnlocked(id: string) {
  if (FREE_CHARS.includes(id)) return true;
  const m = MAPS.find((x) => x.unlocksChar === id);
  return !m || !!save.cleared[m.id];
}
export function charLockText(id: string) {
  const m = MAPS.find((x) => x.unlocksChar === id);
  return m ? `${m.name} haritasını bitir` : '';
}
/** Zafer sonrası: yeni açılanlar */
export function registerClear(map: MapDef, time: number): { newChar?: string; newMap?: MapDef } {
  const first = !save.cleared[map.id];
  save.cleared[map.id] = (save.cleared[map.id] ?? 0) + 1;
  const out: { newChar?: string; newMap?: MapDef } = {};
  if (first) {
    if (map.unlocksChar) out.newChar = map.unlocksChar;
    const i = MAPS.indexOf(map); if (MAPS[i + 1]) out.newMap = MAPS[i + 1];
  }
  void CHARACTERS; void time;
  return out;
}
