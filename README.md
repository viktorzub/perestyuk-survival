# NEON DEAD

Мобільний автошутер про зомбі-апокаліпсис 1985 року у стилі VHS.

- `index.html` — уся гра (один файл, Canvas 2D)
- `manifest.json`, `icon-*.png` — повний екран з іконки на головному екрані
- `sim/balance_sim.js` — симулятор балансу: `node sim/balance_sim.js full 3` або `quick`
- `tests/smoke.js` — смоук-тести й перевірка міграції сейвів: `node tests/smoke.js`
- `backups/` — попередні версії гри
- `docs/decisions.md` — журнал рішень

Запуск: `docker compose up -d --build`, гра на порту 8098.
