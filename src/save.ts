export interface SaveData { gold: number; ranks: Record<string, number>; best: number; kills: number; runs: number; wins: number; lastChar: string; lastMap: string; cleared: Record<string, number>; bestByMap: Record<string, number> }
const KEY = 'ashen-horde-save-v1';
function load(): SaveData {
  const def: SaveData = { gold: 0, ranks: {}, best: 0, kills: 0, runs: 0, wins: 0, lastChar: 'aldric', lastMap: 'crypt', cleared: {}, bestByMap: {} };
  try { const r = localStorage.getItem(KEY); if (r) return { ...def, ...JSON.parse(r) }; } catch { /* yok say */ }
  return def;
}
export const save: SaveData = load();
export function persist() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch { /* yok say */ } }
