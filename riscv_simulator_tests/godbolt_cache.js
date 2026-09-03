// Godbolt output for the built-in C examples, captured once so the suites do
// not need the network.
//
// This used to live inside riscv_simulator.html as `cPrecompiled` — 379 KB of
// JSON, a third of the whole file. In a browser it was almost never read: the
// live Godbolt API is tried first and the cache was only the offline fallback.
// Under jsdom it was read every time, because jsdom provides no `fetch`, so
// the live path is skipped and C mode has nothing else to go on. Removing it
// from the page therefore meant moving it here rather than throwing it away.
//
// Install it before compiling C in a jsdom window:
//
//   const { installGodboltCache } = require('./godbolt_cache');
//   installGodboltCache(win);
//
// It hooks `window.__mockGodboltResponse`, which the page consults when the
// live API is unreachable, and matches on the exact source text — so an edited
// program misses, exactly as the embedded cache did.
//
// To refresh an entry after changing a C example, POST the example source to
//   https://godbolt.org/api/compiler/rv32-cclang2010/compile
// and store the response JSON under the example's key in godbolt_cache.json.

const CACHE = require('./godbolt_cache.json');

function installGodboltCache(win) {
  win.__mockGodboltResponse = (source) => {
    const examples = win.cExamples || {};
    const wanted = String(source == null ? '' : source).trim();
    const key = Object.keys(examples).find(k => String(examples[k]).trim() === wanted);
    return (key && CACHE[key]) ? CACHE[key] : null;
  };
  return win;
}

module.exports = { CACHE, installGodboltCache };
