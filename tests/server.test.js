// Server tests: registration, login, progress. Run: node tests/server.test.js
const fs = require('fs'), os = require('os'), path = require('path');
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'neondead-'));
const { server, flush } = require('../server.js');
let failed = 0;
const check = (ok, msg) => { console.log((ok ? 'PASS ' : 'FAIL ') + msg); if (!ok) failed++; };
server.listen(0, async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (p, method = 'GET', body, token) => {
    const r = await fetch(base + p, { method, headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}), body: body ? JSON.stringify(body) : undefined });
    return { status: r.status, json: await r.json().catch(() => ({})) };
  };
  try {
    check((await call('/api/ping')).json.ok === true, 'ping');
    const reg = await call('/api/register', 'POST', { username: 'Микола', password: 'neon85' });
    check(reg.status === 200 && reg.json.token, 'register');
    check((await call('/api/register', 'POST', { username: 'микола', password: 'other' })).status === 409, 'duplicate name rejected (case-insensitive)');
    check((await call('/api/register', 'POST', { username: 'ab', password: 'xxxx' })).status === 400, 'too short name rejected');
    check((await call('/api/progress', 'PUT', { profile: { schema: 3, coins: 500 } }, reg.json.token)).status === 200, 'save progress');
    check((await call('/api/login', 'POST', { username: 'МИКОЛА', password: 'wrong' })).status === 401, 'wrong password rejected');
    const login = await call('/api/login', 'POST', { username: 'МИКОЛА', password: 'neon85' });
    check(login.status === 200 && login.json.profile && login.json.profile.coins === 500, 'login returns saved progress');
    check((await call('/api/progress', 'GET', null, 'deadbeef')).status === 401, 'bad token rejected');
    await call('/api/logout', 'POST', null, login.json.token);
    check((await call('/api/progress', 'GET', null, login.json.token)).status === 401, 'logout ends the session');
    const page = await fetch(base + '/');
    check(page.status === 200 && (await page.text()).includes('NEON DEAD'), 'game page is served');
    check((await fetch(base + '/server.js')).status === 404, 'server files are not exposed');
    flush();
    const saved = JSON.parse(fs.readFileSync(path.join(process.env.DATA_DIR, 'db.json'), 'utf8'));
    check(saved.users['микола'] && !JSON.stringify(saved).includes('neon85'), 'database on disk, password stored only as a hash');
  } catch (e) { check(false, 'unexpected error: ' + e.message); }
  console.log(failed ? `\n${failed} test(s) failed` : '\nAll server tests passed');
  server.close(); process.exit(failed ? 1 : 0);
});
