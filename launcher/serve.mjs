// Küçük yerel sunucu: dist/ klasörünü sunar. Oyun penceresi kapanınca kendini kapatır.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || 'dist');
const port = Number(process.argv[3] || 47821);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.map': 'application/json' };

let lastPing = 0; const started = Date.now();
const IDLE_MS = 120000; // son sinyalden bu kadar sonra kapan
setInterval(() => {
  const now = Date.now();
  if ((lastPing && now - lastPing > IDLE_MS) || (!lastPing && now - started > 90000)) process.exit(0);
}, 5000);

http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  if (url === '/__ping') { lastPing = Date.now(); res.writeHead(204); res.end(); return; }
  let file = path.join(root, url === '/' ? 'index.html' : url);
  if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
  fs.stat(file, (err, st) => {
    if (!err && st.isDirectory()) file = path.join(file, 'index.html');
    fs.readFile(file, (e, data) => {
      if (e) { res.writeHead(404); res.end('Bulunamadi'); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(data);
    });
  });
}).listen(port, '127.0.0.1', () => { lastPing = Date.now(); }).on('error', () => process.exit(0));
