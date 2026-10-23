// Balance simulator: plays sessions with a bot and reports boss fight length and level by minute.
// It runs the real game code with the real CFG, so the numbers never drift apart.
// Run: node sim/balance_sim.js [full|quick] [runs]
const load = require('../tests/headless');
const mode = process.argv[2] === 'quick' ? 3 : 1, runs = +process.argv[3] || 3;
for (let r = 0; r < runs; r++) {
  const { code } = load();
  eval(code + `
    newGame(mode); const seen = new Map(), lv = {};
    for (let i = 0; i < 60 * (900 / mode + 5); i++) {
      if (S.mode === 'level') { applyOpt(buildOptions()[0]); S.pending--; if (S.pending <= 0) S.mode = 'play'; }
      if (S.mode === 'info') S.mode = 'play';
      if (S.mode === 'dead') revive();
      if (S.mode === 'win') break;
      const a = i / 60; keys.KeyD = Math.sin(a * .7) > 0; keys.KeyA = !keys.KeyD; keys.KeyW = Math.sin(a * .43) > 0; keys.KeyS = !keys.KeyW;
      if (Math.sin(a * .31) > .2) keys.KeyA = keys.KeyD = keys.KeyW = keys.KeyS = false;
      update(1 / 60); updateFx(1 / 60);
      for (const e of E) if (e.name && !seen.has(e)) seen.set(e, { name: e.name, at: S.dir, hp: Math.round(e.maxHp) });
      for (const [e, s] of seen) if (e.dead && s.end === undefined) s.end = S.dir;
      const m = Math.floor(S.dir / 60); if (!lv[m]) lv[m] = P.level;
      P.hp = Math.max(P.hp, P.maxHp * .5);
    }
    console.log('Run ' + (r + 1) + ': level ' + P.level + ', kills ' + S.kills + ', weapons ' + P.weapons.map(w => w.id + w.lvl + (w.evo ? '*' : '')).join(' '));
    for (const s of seen.values()) console.log('  ' + s.name.padEnd(22) + ' at ' + (s.at / 60).toFixed(1) + ' min, hp ' + String(s.hp).padStart(5) + ', fight ' + (s.end === undefined ? 'survived to credits' : Math.round((s.end - s.at) / mode) + ' s'));
    console.log('  level by minute: ' + Object.entries(lv).map(([m, l]) => m + ':' + l).join(' '));
  `);
}
console.log('\nModel limits: the bot moves on a fixed pattern and always takes the first upgrade offered; real players kite and pick builds, so fights are usually shorter.');
