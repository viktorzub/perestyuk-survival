// Runs the game script from index.html in Node with a stubbed DOM and canvas.
// Usage: const g = require('./headless')(); then call g.run(code) with game functions in scope.
const fs = require('fs'), path = require('path');
module.exports = function load(store = {}) {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const code = html.match(/<script>([\s\S]*)<\/script>/)[1];
  const noop = () => {};
  const ctx = new Proxy({}, { get: (t, k) => (k === 'createLinearGradient' || k === 'createRadialGradient') ? () => ({ addColorStop: noop }) : (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
  const el = () => ({ classList: { add: noop, remove: noop, toggle: noop }, style: { setProperty: noop }, addEventListener: noop, getContext: () => ctx, querySelector: () => el(), appendChild: noop, append: noop, set innerHTML(v) {}, firstChild: { nodeValue: '' }, textContent: '', focus: noop, setPointerCapture: noop, disabled: false, setAttribute: noop, dataset: {} });
  Object.assign(global, {
    window: { innerWidth: 390, innerHeight: 844, devicePixelRatio: 2, addEventListener: noop },
    location: { search: '', hash: '' },
    document: { querySelector: () => el(), querySelectorAll: () => [], createElement: () => el(), addEventListener: noop, hidden: false },
    performance: { now: () => Date.now() }, requestAnimationFrame: noop, matchMedia: () => ({ matches: false }),
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = v; } },
    setTimeout: () => 0, setInterval: () => 0, clearTimeout: noop,
    Image: class { set src(v) { this.naturalWidth = 90; this.naturalHeight = 150; this.onload && this.onload(); } }
  });
  return { code, store };
};
