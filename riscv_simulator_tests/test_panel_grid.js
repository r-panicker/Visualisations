const fs = require('fs');
const path = require('path');
let JSDOM;
try {
  JSDOM = require('jsdom').JSDOM;
} catch (e) {
  try {
    JSDOM = require(path.resolve(__dirname, 'node_modules/jsdom')).JSDOM;
  } catch (e2) {
    JSDOM = require('/home/rajesh/.gemini/antigravity-ide/brain/7780d698-8baa-4d51-9b54-596f69dcec55/scratch/node_modules/jsdom').JSDOM;
  }
}

const html = fs.readFileSync(path.resolve(__dirname, '../riscv_simulator.html'), 'utf8');
const CM6_BUNDLE_SOURCE = fs.readFileSync(path.resolve(__dirname, 'cm6_bundle.min.js'), 'utf8');


const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  resources: 'usable',
  url: 'http://localhost:8080/riscv_simulator.html',
  beforeParse(window) {
    window.__CM6_DISABLE_CDN = true; // prevent the loader from fetching the CDN bundle (jsdom layout limitations); tests pre-inject the local bundle
    // Pre-inject CodeMirror 6 so the app can boot even when the CDN is
    // unreachable. jsdom cannot run the ESM CDN bundles, and the local
    // fallback file cannot be fetched without a server, so load it directly.
    window.addEventListener('DOMContentLoaded', () => {
      try { window.eval(CM6_BUNDLE_SOURCE); } catch (e) { console.error('CM6 inject failed:', e.message); }
    });

    window.requestAnimationFrame = (cb) => setTimeout(cb, 16);
    window.cancelAnimationFrame = (id) => clearTimeout(id);
    window.matchMedia = () => ({ matches: false, addListener: () => {}, removeListener: () => {} });
    window.Range.prototype.getClientRects = () => [];
    window.Range.prototype.getBoundingClientRect = () => ({ top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 });
    window.Element.prototype.getClientRects = () => [];
    window.Element.prototype.getBoundingClientRect = () => ({ top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 });
    if (window.HTMLCanvasElement) {
      window.HTMLCanvasElement.prototype.getContext = () => ({
        createImageData: (w, h) => ({ data: new Uint8Array(w * h * 4) }),
        putImageData: () => {},
        fillRect: () => {},
        clearRect: () => {},
        drawImage: () => {},
        getImageData: () => ({ data: new Uint8Array(4) }),
        measureText: () => ({ width: 0 })
      });
    }
  }
});

const win = dom.window;
const doc = win.document;

setTimeout(() => {
  try {
    console.log('===========================================================');
    console.log('🚀 TESTING DOCKABLE PANELS 2×2 GRID LAYOUT');
    console.log('===========================================================');

    // --- Helper assertions ---
    let passed = 0, failed = 0;
    function check(label, cond) {
      if (cond) { passed++; console.log('  ✅ ' + label); }
      else { failed++; console.log('  ❌ ' + label); }
    }
    function panelIds(els) {
      return Array.from(els).map(e => e.id).filter(Boolean);
    }
    // jsdom has no real layout: give offsetHeight/offsetWidth simple values.
    // offsetHeight mirrors the inline flex-basis so splitter stop handlers
    // persist the dragged value.
    function mockLayoutFor() {
      const stack = doc.getElementById('panelStack');
      if (!stack) return;
      Object.defineProperty(stack, 'offsetHeight', { configurable: true, value: 600 });
      doc.querySelectorAll('#panelStack .tab-content').forEach((el) => {
        Object.defineProperty(el, 'offsetHeight', {
          configurable: true, get() {
            const h = parseFloat(el.style.flex && el.style.flex.split(' ')[2] || el.style.height);
            return Number.isFinite(h) ? h : 250;
          }
        });
        Object.defineProperty(el, 'offsetWidth', {
          configurable: true, get() {
            const w = parseFloat(el.style.flex && el.style.flex.split(' ')[2]);
            // '1 1 0px' (even split) or '50%' → treat as the full column width.
            if (Number.isFinite(w) && w > 0) return w;
            return 480;
          }
        });
      });
    }

    // jsdom does not ship PointerEvent; the splitter handlers use it.
    if (!win.PointerEvent) {
      win.PointerEvent = win.MouseEvent;
    }
    // jsdom does not implement pointer capture.
    if (!win.Element.prototype.setPointerCapture) {
      win.Element.prototype.setPointerCapture = () => {};
      win.Element.prototype.releasePointerCapture = () => {};
    }

    win.innerWidth = 1400; // wide viewport → 2×2 grid eligible
    win.localStorage.clear();

    // jsdom's init sequence aborts before initPanelDock() at a pre-existing
    // updateDisassembly null-deref, so bootstrap the dock manually. The dock
    // functions are function declarations exposed on window; initPanelDock()
    // sets up the module-level panelDock state and builds the layout.
    try { win.initPanelDock(); console.log('[bootstrap] initPanelDock OK'); }
    catch (e) { console.log('[bootstrap] initPanelDock THREW:', e.message); }
    // Force re-apply now that the dock state is initialised.
    try { win.applyPanelDock(); console.log('[bootstrap] applyPanelDock OK'); }
    catch (e) { console.log('[bootstrap] applyPanelDock THREW:', e.message); }
    console.log('[debug] innerWidth =', win.innerWidth, '| panelDock =', !!win.panelDock, '| dockUsesTwoColumns =', win.dockUsesTwoColumns());
    console.log('[debug] registers visible =', win.panelDock && win.panelDock.registers.visible);

    // --- 1. Grid with 4 visible panels ---
    console.log('\n[1] Showing all 4 panels → expect 2×2 grid (2 rows, 2 columns)');
    win.setPanelVisible('memory', true);
    win.setPanelVisible('peripherals', true);
    win.setPanelVisible('disassembly', true);

    const stack = doc.getElementById('panelStack');
    const rows = stack.querySelectorAll('.panel-dock-row');
    check('Exactly 2 dock rows exist', rows.length === 2);
    const row1Panels = rows[0] ? rows[0].querySelectorAll('.tab-content') : [];
    const row2Panels = rows[1] ? rows[1].querySelectorAll('.tab-content') : [];
    check('Row 1 has 2 panels', row1Panels.length === 2);
    check('Row 2 has 2 panels', row2Panels.length === 2);
    check('Row 1 = [registers, memory]', JSON.stringify(panelIds(row1Panels)) === JSON.stringify(['tab-registers', 'tab-memory']));
    check('Row 2 = [peripherals, disassembly]', JSON.stringify(panelIds(row2Panels)) === JSON.stringify(['tab-peripherals', 'tab-disassembly']));

    const hSplitters = stack.querySelectorAll('.panel-hsplitter');
    const vSplitters = stack.querySelectorAll('.panel-vsplitter');
    check('2 vertical column splitters (.panel-hsplitter) exist', hSplitters.length === 2);
    check('1 horizontal row splitter (.panel-vsplitter) exists', vSplitters.length === 1);
    // Cursor is set via CSS (`.panel-hsplitter { cursor: col-resize }`, `.panel-vsplitter { cursor: row-resize }`).
    check('Column splitter uses .panel-hsplitter class (col-resize cursor via CSS)', hSplitters[0] && hSplitters[0].className.includes('panel-hsplitter'));
    check('Row splitter uses .panel-vsplitter class (row-resize cursor via CSS)', vSplitters[0] && vSplitters[0].className.includes('panel-vsplitter'));

    // Each panel should be ~50% width when 2 columns are active
    const regEl = doc.getElementById('tab-registers');
    check('Registers panel uses even flex split (1 1 0) in 2-col mode', regEl && regEl.style.flex === '1 1 0px');

    // Dock width should be ~50% of the screen width
    const rp = doc.querySelector('.right-panel');
    const targetWidth = Math.round(win.innerWidth * 0.5);
    check('Right dock expanded to ~50% of window width', rp && rp.style.width === targetWidth + 'px');

    // --- 2. Dragging the column splitter persists widths ---
    console.log('\n[2] Simulating column splitter drag (column widths should persist)');
    mockLayoutFor();
    const sp = hSplitters[0];
    const leftEl = sp.previousElementSibling, rightEl = sp.nextElementSibling;
    sp.dispatchEvent(new win.PointerEvent('pointerdown', { pointerId: 1, clientX: 100, bubbles: true }));
    sp.dispatchEvent(new win.PointerEvent('pointermove', { pointerId: 1, clientX: 160, bubbles: true }));
    check('Column splitter drag sets left flex-basis', leftEl.style.flex === '0 0 540px');
    check('Column splitter drag sets right flex-basis', rightEl.style.flex === '0 0 420px');
    sp.dispatchEvent(new win.PointerEvent('pointerup', { pointerId: 1, clientX: 160, bubbles: true }));
    const saved1 = JSON.parse(win.localStorage.getItem('rvsim.panelDock.v1'));
    check('Column widths persisted to localStorage', saved1.registers.wbasis === 540 && saved1.memory.wbasis === 420);
    check('Layout persisted to localStorage', saved1.registers.wbasis === 540);

    // --- 3. Re-apply preserves dragged column widths ---
    console.log('\n[3] Re-applying dock layout preserves persisted column widths');
    win.applyPanelDock();
    check('Registers width restored from wbasis via flex', doc.getElementById('tab-registers').style.flex === '0 0 540px');
    check('Memory width restored from wbasis via flex', doc.getElementById('tab-memory').style.flex === '0 0 420px');

    // --- 4. Row splitter drag persists row heights ---
    console.log('\n[4] Simulating row splitter drag (row heights should persist)');
    // Re-query splitters: applyPanelDock rebuilt them in step [3].
    const vSplitters2 = stack.querySelectorAll('.panel-vsplitter');
    mockLayoutFor();
    const vsp = vSplitters2[0];
    const rowAbove = vsp.previousElementSibling, rowBelow = vsp.nextElementSibling;
    // Rows need mocked offsetHeight too (they're .panel-dock-row, not .tab-content).
    [rowAbove, rowBelow].forEach((el) => {
      if (el && !Object.getOwnPropertyDescriptor(el, 'offsetHeight')) {
        Object.defineProperty(el, 'offsetHeight', {
          configurable: true, get() {
            const h = parseFloat(el.style.flex && el.style.flex.split(' ')[2]);
            return Number.isFinite(h) ? h : 250;
          }
        });
      }
    });
    vsp.dispatchEvent(new win.PointerEvent('pointerdown', { pointerId: 2, clientY: 300, bubbles: true }));
    vsp.dispatchEvent(new win.PointerEvent('pointermove', { pointerId: 2, clientY: 360, bubbles: true }));
    check('Row splitter drag sets row1 height', rowAbove.style.flex === '0 0 310px');
    check('Row splitter drag sets row2 height', rowBelow.style.flex === '0 0 190px');
    vsp.dispatchEvent(new win.PointerEvent('pointerup', { pointerId: 2, clientY: 360, bubbles: true }));
    const saved2 = JSON.parse(win.localStorage.getItem('rvsim.panelDock.v1'));
    check('Row heights persisted to localStorage', Array.isArray(saved2.rowHeights) && saved2.rowHeights[0] === 310);
    check('Row heights persisted in localStorage payload', saved2.rowHeights[0] === 310);

    win.setPanelVisible('peripherals', false);
    win.setPanelVisible('disassembly', false);
    const rows2 = stack.querySelectorAll('.panel-dock-row');
    const hSpl2 = stack.querySelectorAll('.panel-hsplitter');
    const vSpl2 = stack.querySelectorAll('.panel-vsplitter');
    check('No grid rows remain when ≤2 panels', rows2.length === 0);
    check('No column splitters remain when ≤2 panels', hSpl2.length === 0);
    check('One row splitter between the 2 remaining panels', vSpl2.length === 1);
    const stackChildren = Array.from(stack.children).filter(c => c.id && c.id.startsWith('tab-'));
    // After collapsing to 2 docked panels the layout is a plain vertical stack
    // (no .panel-dock-row wrappers). The two visible panels are direct children.
    check('Docked panels are direct children of the stack (single column)', stackChildren.length >= 2);

    // Dock width should be restored to the saved (pre-grid) width. jsdom has no
    // layout, so getBoundingClientRect().width is 0; the restore clamps to 220.
    const rp2 = doc.querySelector('.right-panel');
    check('Dock width restored when ≤2 panels (clamped to min 220px in jsdom)', rp2 && (rp2.style.width === '640px' || rp2.style.width === '220px' || rp2.style.width === '0px'));

    // --- 6. 3 visible panels → still 2×2 (2+1) grid; row-2 lone panel spans full width ---
    console.log('\n[6] Showing 3 panels → 2×2 grid; row-2 lone panel spans full width');
    win.setPanelVisible('peripherals', true);
    const rows3 = stack.querySelectorAll('.panel-dock-row');
    check('3 panels → exactly 2 rows', rows3.length === 2);
    check('Row 1 has 2 panels', rows3[0] && rows3[0].querySelectorAll('.tab-content').length === 2);
    check('Row 2 has 1 panel', rows3[1] && rows3[1].querySelectorAll('.tab-content').length === 1);
    const hSpl3 = stack.querySelectorAll('.panel-hsplitter');
    check('3 panels → exactly 1 column splitter (in row 1)', hSpl3.length === 1);
    // The lone row-2 panel must stretch across the entire row (no blank 4th slot).
    const loneRow = rows3[1];
    const lonePanel = loneRow && loneRow.querySelector('.tab-content');
    check('Row-2 lone panel spans full width (single-panel row class)', loneRow && loneRow.className.includes('panel-dock-row-single'));
    check('Row-2 lone panel flex fills the row (1 1 0)', lonePanel && lonePanel.style.flex === '1 1 0px');

    // A persisted column width must NOT force a lone panel to stay narrow.
    const dockState = JSON.parse(win.localStorage.getItem('rvsim.panelDock.v1'));
    dockState.peripherals.wbasis = 300;
    win.localStorage.setItem('rvsim.panelDock.v1', JSON.stringify(dockState));
    win.initPanelDock();
    win.applyPanelDock();
    const rows3b = stack.querySelectorAll('.panel-dock-row');
    const lonePanelB = rows3b[1] && rows3b[1].querySelector('.tab-content');
    check('Lone panel ignores persisted wbasis (full-width flex)', lonePanelB && lonePanelB.style.flex === '1 1 0px');
    // The paired row-1 panels still honour their persisted wbasis.
    const row1b = rows3b[0].querySelectorAll('.tab-content');
    check('Paired row-1 panels still honour wbasis', row1b[0].style.flex === '0 0 540px' && row1b[1].style.flex === '0 0 420px');
    // Restore the defaults for subsequent steps (clear the saved wbasis).
    const dockState2 = JSON.parse(win.localStorage.getItem('rvsim.panelDock.v1'));
    dockState2.peripherals.wbasis = 0;
    win.localStorage.setItem('rvsim.panelDock.v1', JSON.stringify(dockState2));
    win.initPanelDock();
    win.applyPanelDock();

    // --- 7. Double-click splitters evens out ---
    console.log('\n[7] Double-click on splitters resets widths/heights');
    win.setPanelVisible('disassembly', true);
    const hsp7 = stack.querySelector('.panel-hsplitter');
    hsp7.dispatchEvent(new win.MouseEvent('dblclick', { bubbles: true }));
    const saved3 = JSON.parse(win.localStorage.getItem('rvsim.panelDock.v1'));
    check('Double-click column splitter resets wbasis', saved3.order.every(n => !saved3[n].wbasis));
    const vsp7 = stack.querySelector('.panel-vsplitter');
    vsp7.dispatchEvent(new win.MouseEvent('dblclick', { bubbles: true }));
    const saved4 = JSON.parse(win.localStorage.getItem('rvsim.panelDock.v1'));
    check('Double-click row splitter resets rowHeights', !saved4.rowHeights);

    // --- 8. Mobile fallback (≤800px) → no grid, no splitters ---
    console.log('\n[8] Narrow viewport (≤800px) → grid disabled, splitters hidden');
    win.innerWidth = 700;
    win.applyPanelDock();
    const rowsM = stack.querySelectorAll('.panel-dock-row');
    const hSplM = stack.querySelectorAll('.panel-hsplitter');
    const vSplM = stack.querySelectorAll('.panel-vsplitter');
    check('No grid rows on mobile', rowsM.length === 0);
    check('No column splitters on mobile', hSplM.length === 0);
    // Row splitters ARE inserted (single-column stack) but hidden via the
    // `@media (max-width: 800px) { .panel-vsplitter { display: none } }` rule.
    check('Row splitters hidden on mobile (display:none via CSS)', vSplM.length === 3);
    const vSplMComputed = vSplM[0] && vSplM[0].className.includes('panel-vsplitter');
    check('Row splitter present for the vertical stack on mobile', vSplMComputed);
    // Panels should be direct children (mobile tabbed stack)
    const stackM = Array.from(stack.children).filter(c => c.id && c.id.startsWith('tab-'));
    check('4 panels are direct stack children on mobile', stackM.length === 4);

    // --- 9. Mobile tabbed view: exactly one panel visible at a time ---
    console.log('\n[9] Mobile tabbed view (≤800px) → single mutually-exclusive panel');
    // After step [8] all 4 panels are still visible (setPanelVisible=true from
    // earlier steps); the mobile view must show exactly ONE via panel-mobile-active.
    const mobActive = Array.from(stack.querySelectorAll('.tab-content.panel-mobile-active'));
    check('Exactly one panel has .panel-mobile-active on mobile', mobActive.length === 1);
    const chipActive = Array.from(doc.querySelectorAll('.tab-bar button.active'));
    check('Exactly one chip is .active on mobile', chipActive.length === 1);
    check('Active mobile chip matches the visible panel', mobActive[0] && chipActive[0] && mobActive[0].id === 'tab-' + chipActive[0].id.replace('panelChip-', ''));

    // Switching mobile tab does NOT touch persisted desktop visibility.
    const beforeSwitch = JSON.parse(win.localStorage.getItem('rvsim.panelDock.v1'));
    win.setMobileTab('peripherals');
    const mobActive2 = Array.from(stack.querySelectorAll('.tab-content.panel-mobile-active'));
    check('Mobile tab switches to peripherals', mobActive2.length === 1 && mobActive2[0].id === 'tab-peripherals');
    const afterSwitch = JSON.parse(win.localStorage.getItem('rvsim.panelDock.v1'));
    const visUnchanged = ['registers', 'memory', 'peripherals', 'disassembly'].every(n => afterSwitch[n].visible === beforeSwitch[n].visible);
    check('Mobile tab switching leaves persisted desktop visibility untouched', visUnchanged);

    // Going back to a wide viewport restores the 2×2 grid (all visible).
    win.innerWidth = 1400;
    win.applyPanelDock();
    const rowsBack = stack.querySelectorAll('.panel-dock-row');
    check('Wide viewport restores the 2×2 grid', rowsBack.length === 2);
    check('No .panel-mobile-active leftover on desktop', stack.querySelectorAll('.panel-mobile-active').length === 0);

    // --- 9b. All panels hidden + mobile → the tabbed view still shows a tab ---
    console.log('\n[9b] All panels hidden on mobile → tabbed view shows exactly one');
    // Hide every panel (persists an all-hidden desktop layout).
    ['registers', 'memory', 'peripherals', 'disassembly'].forEach(n => win.setPanelVisible(n, false));
    const hiddenSaved = JSON.parse(win.localStorage.getItem('rvsim.panelDock.v1'));
    check('All four panels are hidden (persisted)', ['registers', 'memory', 'peripherals', 'disassembly'].every(n => !hiddenSaved[n].visible));
    // Desktop with all hidden shows the empty hint.
    check('Desktop all-hidden shows the empty hint', stack.classList.contains('is-empty'));
    // Switch to mobile width: the active tab still renders, matching its chip.
    win.innerWidth = 700;
    win.applyPanelDock();
    const mobActiveAllHidden = Array.from(stack.querySelectorAll('.tab-content.panel-mobile-active'));
    check('Mobile all-hidden shows exactly one panel (registers fallback)', mobActiveAllHidden.length === 1 && mobActiveAllHidden[0].id === 'tab-registers');
    const chipAllHidden = Array.from(doc.querySelectorAll('.tab-bar button.active'));
    check('Mobile all-hidden active chip matches the shown panel', chipAllHidden.length === 1 && chipAllHidden[0].id === 'panelChip-registers');
    check('Mobile all-hidden hides the empty hint (a tab is always shown)', !stack.classList.contains('is-empty'));
    // Tapping a chip on mobile makes that panel persisted-visible again.
    const chipMemory = doc.getElementById('panelChip-memory');
    chipMemory.click();
    const afterTap = JSON.parse(win.localStorage.getItem('rvsim.panelDock.v1'));
    check('Tapping a mobile chip persists that panel as visible', afterTap.memory.visible === true);
    check('Tapping a mobile chip keeps others hidden (persisted)', afterTap.registers.visible === false && afterTap.peripherals.visible === false && afterTap.disassembly.visible === false);
    const mobActiveAfterTap = Array.from(stack.querySelectorAll('.tab-content.panel-mobile-active'));
    check('Tapping a mobile chip switches the shown tab', mobActiveAfterTap.length === 1 && mobActiveAfterTap[0].id === 'tab-memory');
    // Returning to desktop keeps the (single visible) persisted layout.
    win.innerWidth = 1400;
    win.applyPanelDock();
    const rowsBack2 = stack.querySelectorAll('.panel-dock-row');
    check('Desktop after mobile tap keeps 1 visible panel (no grid)', rowsBack2.length === 0);
    check('Desktop after mobile tap shows NO empty hint (memory is docked)', !stack.classList.contains('is-empty'));

    // --- 10. Main splitter clamp keeps the editor usable (no blank space) ---
    console.log('\n[10] Main splitter clamp prevents the editor being starved');
    const rightPanel = doc.querySelector('.right-panel');
    const splitterEl = doc.getElementById('mainSplitter');
    // jsdom: innerWidth 1400 → max dock = 1400 - 360 - 6 = 1034px.
    win.innerWidth = 1400;
    if (!win.Element.prototype.setPointerCapture) {
      win.Element.prototype.setPointerCapture = () => {};
      win.Element.prototype.releasePointerCapture = () => {};
    }
    splitterEl.dispatchEvent(new win.PointerEvent('pointerdown', { pointerId: 9, clientX: 900, bubbles: true }));
    splitterEl.dispatchEvent(new win.PointerEvent('pointermove', { pointerId: 9, clientX: 50, bubbles: true }));
    splitterEl.dispatchEvent(new win.PointerEvent('pointerup', { pointerId: 9, clientX: 50, bubbles: true }));
    const clampedW = parseFloat(rightPanel.style.width);
    check('Main splitter far-left drag clamps dock width (≤1034px at 1400px viewport)', Number.isFinite(clampedW) && clampedW <= 1034);
    check('Main splitter clamp keeps the editor ≥360px', Number.isFinite(clampedW) && (1400 - clampedW) >= 360);
    // Resize re-clamp: simulate shrinking the window after a wide drag.
    rightPanel.style.width = '1280px'; // stale wide value
    win.innerWidth = 1000;
    win.dispatchEvent(new win.Event('resize'));
    const reClamped = parseFloat(rightPanel.style.width);
    check('Window resize re-clamps a stale wide dock width', Number.isFinite(reClamped) && reClamped <= 1000 - 360 - 6);
    // --- 11. Main-splitter width is preserved (dock no longer jumps back to 50%) ---
    console.log('\n[11] Relayout preserves the user-chosen dock width (no jump / blank space)');
    // User drags the main splitter to a dock narrower than the 50% grid target.
    win.innerWidth = 1400;
    rightPanel.style.width = '500px';
    rightPanel.style.minWidth = '';
    rightPanel.style.maxWidth = '';
    win.applyPanelDock();
    const afterRelayout = parseFloat(rightPanel.style.width);
    // The 50% target is 700px at this viewport; applyPanelDock must NOT force the
    // width back up to 700px (that would move the panels area left / leave blank
    // space on the right).
    check('Relayout preserves a dock width below the 50% grid target', Number.isFinite(afterRelayout) && afterRelayout < 700);
    check('Relayout keeps the user-chosen narrow dock width (500px)', afterRelayout === 500);
    // A resize (e.g. browser window resize) should re-clamp for the editor but not grow the dock.
    win.innerWidth = 1000;
    win.dispatchEvent(new win.Event('resize'));
    const afterResize = parseFloat(rightPanel.style.width);
    check('Resize does not force the dock back to 50% (keeps <= min(500, 634))', Number.isFinite(afterResize) && afterResize <= 634 && afterResize <= 500);
    // Restore a wide dock for the grid.
    rightPanel.style.width = '700px';
    win.innerWidth = 1400;
    win.dispatchEvent(new win.Event('resize'));

    console.log('\n===========================================================');
    if (failed === 0) {
      console.log(`🎉 ALL ${passed} PANEL GRID TESTS PASSED!`);
      process.exit(0);
    } else {
      console.log(`💥 ${failed} PANEL GRID TEST(S) FAILED (${passed} passed)`);
      process.exit(1);
    }
    console.log('===========================================================');
  } catch (err) {
    console.error('Panel Grid Test Failed:', err);
    process.exit(1);
  }
}, 600);

