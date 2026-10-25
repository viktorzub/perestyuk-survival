// NEON DEAD game server: serves the game and stores accounts + progress in a small JSON database.
// Made for a local/private deployment: no dependencies, data lives in ./data/db.json.
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');

const PORT = +process.env.PORT || 3000;
const ROOT = __dirname;
const DATA = process.env.DATA_DIR || path.join(ROOT, 'data');
const DB_FILE = path.join(DATA, 'db.json');

fs.mkdirSync(DATA, { recursive: true });
let db = { users: {}, sessions: {} };
try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch (e) { /* first start: empty database */ }
db.users = db.users || {}; db.sessions = db.sessions || {};

let saveTimer = null;
function flush() { const tmp = DB_FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(db)); fs.renameSync(tmp, DB_FILE); }
function save() { clearTimeout(saveTimer); saveTimer = setTimeout(() => { saveTimer = null; flush(); }, 200); }

const hashPw = (pw, salt) => crypto.pbkdf2Sync(String(pw), salt, 100000, 32, 'sha256').toString('hex');
const keyOf = name => String(name || '').trim().toLowerCase();
const newToken = () => crypto.randomBytes(24).toString('hex');

const STATIC = { '/index.html': 'text/html; charset=utf-8', '/manifest.json': 'application/manifest+json', '/icon-180.png': 'image/png', '/icon-512.png': 'image/png' };

function send(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}
function readBody(req) {
  return new Promise((ok, bad) => {
    let s = '';
    req.on('data', c => { s += c; if (s.length > 1e6) { bad(new Error('too big')); req.destroy(); } });
    req.on('end', () => { try { ok(s ? JSON.parse(s) : {}); } catch (e) { bad(e); } });
    req.on('error', bad);
  });
}
function userOf(req) {
  const m = String(req.headers.authorization || '').match(/^Bearer ([0-9a-f]+)$/);
  const name = m && db.sessions[m[1]];
  return name && db.users[name] ? name : null;
}

const server = http.createServer(async (req, res) => {
  const p = new URL(req.url, 'http://local').pathname;
  try {
    if (p === '/api/ping') return send(res, 200, { ok: true });

    if (p === '/api/register' && req.method === 'POST') {
      const { username, password } = await readBody(req);
      const display = String(username || '').trim(), key = keyOf(display);
      if (!/^[\p{L}\p{N}_.-]{3,20}$/u.test(display)) return send(res, 400, { error: 'Ім’я: від 3 до 20 літер, цифр, _ . -' });
      if (String(password || '').length < 4) return send(res, 400, { error: 'Пароль має бути щонайменше 4 символи' });
      if (db.users[key]) return send(res, 409, { error: 'Таке ім’я вже зайняте' });
      const salt = crypto.randomBytes(16).toString('hex');
      db.users[key] = { display, salt, hash: hashPw(password, salt), profile: null, created: Date.now(), updated: 0 };
      const token = newToken(); db.sessions[token] = key; save();
      return send(res, 200, { token, username: display, profile: null });
    }

    if (p === '/api/login' && req.method === 'POST') {
      const { username, password } = await readBody(req);
      const u = db.users[keyOf(username)];
      if (!u) return send(res, 401, { error: 'Невірне ім’я або пароль' });
      const a = Buffer.from(hashPw(password, u.salt), 'hex'), b = Buffer.from(u.hash, 'hex');
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return send(res, 401, { error: 'Невірне ім’я або пароль' });
      const token = newToken(); db.sessions[token] = keyOf(username); save();
      return send(res, 200, { token, username: u.display, profile: u.profile });
    }

    if (p === '/api/logout' && req.method === 'POST') {
      const m = String(req.headers.authorization || '').match(/^Bearer ([0-9a-f]+)$/);
      if (m) { delete db.sessions[m[1]]; save(); }
      return send(res, 200, { ok: true });
    }

    if (p === '/api/progress') {
      const name = userOf(req);
      if (!name) return send(res, 401, { error: 'Сесія закінчилася, увійди знову' });
      const u = db.users[name];
      if (req.method === 'GET') return send(res, 200, { profile: u.profile, updated: u.updated });
      if (req.method === 'PUT') {
        const { profile } = await readBody(req);
        if (!profile || typeof profile !== 'object' || Array.isArray(profile)) return send(res, 400, { error: 'Немає прогресу для збереження' });
        u.profile = profile; u.updated = Date.now(); save();
        return send(res, 200, { ok: true, updated: u.updated });
      }
    }

    if (p.startsWith('/api/')) return send(res, 404, { error: 'Не знайдено' });

    const file = p === '/' ? '/index.html' : p;
    if (!STATIC[file]) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
    const data = fs.readFileSync(path.join(ROOT, file));
    res.writeHead(200, { 'Content-Type': STATIC[file], 'Cache-Control': file === '/index.html' ? 'no-cache' : 'public, max-age=3600' });
    res.end(data);
  } catch (e) {
    send(res, 400, { error: 'Не вдалося обробити запит' });
  }
});

function shutdown() { if (saveTimer) { clearTimeout(saveTimer); flush(); } process.exit(0); }
process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);

if (require.main === module) server.listen(PORT, () => console.log(`NEON DEAD: http://localhost:${PORT}`));
module.exports = { server, flush };
