// Izgara tabanlı uzamsal karma — yüzlerce düşmanla ucuz çarpışma/sorgu için.
export class SpatialHash {
  private head: Int32Array; private next: Int32Array; private mark: Int32Array;
  private qid = 1; private mask: number;
  constructor(private cell: number, size: number, cap: number) {
    this.head = new Int32Array(size).fill(-1); this.next = new Int32Array(cap); this.mark = new Int32Array(cap); this.mask = size - 1;
  }
  clear() { this.head.fill(-1); }
  private key(cx: number, cy: number) { return ((cx * 73856093) ^ (cy * 19349663)) & this.mask; }
  insert(i: number, x: number, y: number) {
    const k = this.key(Math.floor(x / this.cell), Math.floor(y / this.cell));
    this.next[i] = this.head[k]; this.head[k] = i;
  }
  /** (x,y) çevresinde r yarıçaplı bölgeyi tarar, aday indeksleri out'a yazar. Mesafe kontrolü çağırana aittir. */
  query(x: number, y: number, r: number, out: Int32Array): number {
    const c = this.cell; const q = ++this.qid; let n = 0;
    const x0 = Math.floor((x - r) / c), x1 = Math.floor((x + r) / c), y0 = Math.floor((y - r) / c), y1 = Math.floor((y + r) / c);
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
      let i = this.head[this.key(cx, cy)];
      while (i !== -1) {
        if (this.mark[i] !== q) { this.mark[i] = q; if (n < out.length) out[n++] = i; }
        i = this.next[i];
      }
    }
    return n;
  }
}
