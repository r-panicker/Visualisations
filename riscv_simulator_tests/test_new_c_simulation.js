const fs = require('fs');
const path = require('path');
const https = require('https');

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

async function compileGodbolt(sourceCode, compilerId = 'rv32-cgcc1420', optLevel = '-Os') {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      source: sourceCode,
      options: {
        userArguments: `${optLevel} -march=rv32im -mabi=ilp32 -fno-pic -fno-pie`,
        compilerOptions: { skipAsm: false, executorRequest: false },
        filters: { binary: false, commentOnly: true, demangle: true, directives: true, execute: false, intel: false, labels: true, libraryCode: false, trim: true }
      }
    });

    const req = https.request({
      hostname: 'godbolt.org',
      port: 443,
      path: `/api/compiler/${encodeURIComponent(compilerId)}/compile`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
      timeout: 20000
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function runNewCTest() {
  console.log('===========================================================');
  console.log('🚀 TESTING NEW C PROGRAMS (Circle & ImageDisplay Simulation)');
  console.log('===========================================================');

  const htmlPath = path.resolve(__dirname, '../riscv_simulator.html');
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');

  const dom = new JSDOM(htmlContent, {
    runScripts: 'dangerously',
    resources: 'usable',
    url: 'http://localhost:8080/riscv_simulator.html',
    beforeParse(window) {
      window.requestAnimationFrame = cb => setTimeout(cb, 16);
      window.cancelAnimationFrame = id => clearTimeout(id);
      window.matchMedia = () => ({ matches: false, addListener: () => {}, removeListener: () => {} });
      window.Range.prototype.getClientRects = () => [];
      window.Range.prototype.getBoundingClientRect = () => ({ top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 });
      window.Element.prototype.getClientRects = () => [];
      window.Element.prototype.getBoundingClientRect = () => ({ top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 });
      window.HTMLCanvasElement.prototype.getContext = () => ({
        fillRect: () => {},
        getImageData: () => ({ data: new Uint8ClampedArray(128 * 64 * 4) }),
        createImageData: (w, h) => ({ data: new Uint8ClampedArray((w || 128) * (h || 64) * 4) }),
        putImageData: () => {},
        clearRect: () => {},
        createPattern: () => {},
        drawImage: () => {}
      });
    }
  });
  const win = dom.window;

  await new Promise(r => setTimeout(r, 200));

  // --- Test 1: Circle_delay_accel.c Simulation ---
  console.log('\n[1] Testing Circle_delay_accel.c Simulation...');
  win.setLanguageMode('c');
  win.loadExample('circle_accel_c');

  // Verify compilation & assembly
  const circleMc = await win.assembleOnly();
  console.log(`  - Circle C compiled: ${circleMc.length} instructions.`);

  // Set MMIO Accel reading (temp=25, x=0x40 = +1g, y=0, z=0x40 = 1g gravity)
  const xSlider = win.document.getElementById('accelXSlider');
  if (xSlider) xSlider.value = 64;
  const tempSlider = win.document.getElementById('accelTempSlider');
  if (tempSlider) tempSlider.value = 25;
  win.updateAccelValues();

  // Execute 600 steps
  for (let s = 0; s < 600; s++) {
    win.executeOne();
  }

  const sevSegVal = win.readMem(0xFFFF0080, 4);
  console.log(`  - Seven-segment MMIO display value: 0x${(sevSegVal >>> 0).toString(16)}`);
  if ((sevSegVal >>> 0) !== 0x19400040) {
    throw new Error(`Expected 7-Segment MMIO 0x19400040, got 0x${(sevSegVal >>> 0).toString(16)}`);
  }

  // Check OLED buffer has circle pixels drawn
  let coloredPixels = 0;
  for (let i = 0; i < win.oledBuffer.length; i += 4) {
    if (win.oledBuffer[i] > 0 || win.oledBuffer[i+1] > 0 || win.oledBuffer[i+2] > 0) {
      coloredPixels++;
    }
  }
  console.log(`  - OLED Canvas colored pixels drawn: ${coloredPixels}`);
  if (coloredPixels === 0) {
    throw new Error('Circle drawing failed: 0 colored pixels in oledBuffer!');
  }
  console.log('✅ Circle_delay_accel.c simulation verified successfully!');

  // --- Test 2: ImageDisplay_autoadvance_accel.c Simulation ---
  console.log('\n[2] Testing ImageDisplay_autoadvance_accel.c Simulation...');
  const imgCSource = fs.readFileSync(path.resolve(__dirname, '../ImageDisplay_autoadvance_accel.c'), 'utf8');

  console.log('  - Compiling ImageDisplay C via Godbolt...');
  const compileRes = await compileGodbolt(imgCSource, 'rv32-cgcc1420', '-Os');
  if (compileRes.code !== 0 || !compileRes.asm) {
    throw new Error(`Failed to compile ImageDisplay C: ${JSON.stringify(compileRes)}`);
  }

  // Assemble the generated assembly
  const asmLines = compileRes.asm.map(a => a.text).join('\n');
  win.setLanguageMode('asm');
  win.cmEditor.dispatch({
    changes: { from: 0, to: win.cmEditor.state.doc.length, insert: asmLines }
  });
  const imgMc = await win.assembleOnly();
  console.log(`  - ImageDisplay assembled: ${imgMc.length} instructions.`);

  // Clear display
  win.clearOledDisplay();

  // Set accel data to tilt +X (+1g)
  if (xSlider) xSlider.value = 64;
  if (tempSlider) tempSlider.value = 25;
  win.updateAccelValues();

  // Run steps through 1 frame (6144 pixels)
  console.log('  - Executing simulation steps for ImageDisplay (Mode 5 Autoadvance)...');
  for (let s = 0; s < 10000; s++) {
    win.executeOne();
    if (win.oledCol === 0 && win.oledRow === 0 && s > 6144) {
      break;
    }
  }

  let imgColoredPixels = 0;
  for (let i = 0; i < win.oledBuffer.length; i += 4) {
    if (win.oledBuffer[i] > 0 || win.oledBuffer[i+1] > 0 || win.oledBuffer[i+2] > 0) {
      imgColoredPixels++;
    }
  }
  console.log(`  - ImageDisplay rendered pixels: ${imgColoredPixels} pixels.`);
  if (imgColoredPixels < 1000) {
    throw new Error(`Expected at least 1000 pixels drawn, got ${imgColoredPixels}`);
  }
  console.log('✅ ImageDisplay_autoadvance_accel.c simulation verified successfully!');

  console.log('\n===========================================================');
  console.log('🎉 ALL NEW C SIMULATION TESTS PASSED WITH 100% SUCCESS!');
  console.log('===========================================================');
}

runNewCTest().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
