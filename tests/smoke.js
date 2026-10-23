// Smoke + migration tests. Run: node tests/smoke.js
const fs = require('fs'), path = require('path'), load = require('./headless');
let failed = 0;
const check = (ok, msg) => { console.log((ok ? 'PASS ' : 'FAIL ') + msg); if (!ok) failed++; };

// 1. Old save (no schema, old key) migrates without losing data
{
  const legacy = fs.readFileSync(path.join(__dirname, 'fixtures', 'legacy-save.json'), 'utf8');
  const { code, store } = load({ 'neondead-save': legacy });
  eval(code + `
    check(META.schema === SAVE_SCHEMA, 'migration: schema is ' + SAVE_SCHEMA);
    check(META.coins === 777 && META.up.hp === 2, 'migration: coins and upgrades kept');
    check(META.unl.tapes.includes('bob') && META.unl.tapes.includes('mullet'), 'migration: cards kept, mullet added');
    check(!!store['neondead-profile-v1'], 'migration: saved under the versioned key');
    const c = exportCode(); META.coins = 0; importCode(c);
    check(META.coins === 777, 'progress code: export and import round trip');
    let bad = false; try { importCode(c.slice(0, -2) + 'zz'); } catch (e) { bad = true; }
    check(bad, 'progress code: corrupted code is rejected');
  `);
}

// 2. Both modes run to the end without errors, bosses appear
for (const pace of [3, 1]) {
  const { code } = load();
  eval(code + `
    newGame(pace); let bosses = new Set(), err = null;
    try {
      for (let i = 0; i < 60 * (900 / pace + 5); i++) {
        if (S.mode === 'level') { applyOpt(buildOptions()[0]); S.pending--; if (S.pending <= 0) S.mode = 'play'; }
        if (S.mode === 'info') S.mode = 'play';
        if (S.mode === 'win') break;
        const a = i / 60; keys.KeyD = Math.sin(a * .7) > 0; keys.KeyA = !keys.KeyD; keys.KeyW = Math.sin(a * .43) > 0; keys.KeyS = !keys.KeyW;
        if (S.mode === 'play') { update(1 / 60); updateFx(1 / 60); }
        if (i % 30 === 0) render();
        P.hp = Math.max(P.hp, P.maxHp * .5);
        for (const e of E) if (e.name) bosses.add(e.name);
      }
    } catch (e) { err = e; }
    check(!err, (pace > 1 ? 'quick' : 'full') + ' session: no runtime errors' + (err ? ' (' + err.message + ')' : ''));
    check(S.mode === 'win', (pace > 1 ? 'quick' : 'full') + ' session: reaches the final credits');
    check(bosses.has('Олег Томінатор'), (pace > 1 ? 'quick' : 'full') + ' session: Oleg Tominator appears');
  `);
}
console.log(failed ? `\n${failed} test(s) failed` : '\nAll tests passed');
process.exit(failed ? 1 : 0);
