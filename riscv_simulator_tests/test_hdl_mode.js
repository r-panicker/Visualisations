/*
 * HDL simulation mode - end-to-end regression.
 *
 * Loads riscv_simulator_hdl.html in jsdom, assembles programs through the
 * normal assembler, asks the page for the artefacts it would hand to Icarus
 * (the generic testbench, the memory images, the stimulus files), and then
 * runs the REAL Icarus/WASM pipeline over the unmodified RV/*.v sources.
 *
 * The central property under test is that the generated testbench is
 * program-independent: it is compiled ONCE here and then driven through
 * several different scenarios purely by plusargs and by files written into
 * the simulation's working directory, exactly as the page does it.
 *
 * jsdom cannot dynamic-import the Emscripten modules, so the engine is
 * driven directly from Node - but every artefact fed to it is the one the
 * page produced.
 */
const fs = require('fs');
const path = require('path');
let JSDOM;
try { JSDOM = require('jsdom').JSDOM; }
catch (e) { JSDOM = require(path.resolve(__dirname, 'node_modules/jsdom')).JSDOM; }

const ROOT = path.resolve(__dirname, '..');
const RV = path.join(ROOT, 'RV');
const ENGINE = process.env.HDL_ENGINE_DIR ||
  '/tmp/claude-1000/-home-rajesh-GitHub-Visualisations/dd03718e-6ed5-4869-8832-495d819635e9/scratchpad/engine';

const html = fs.readFileSync(path.join(ROOT, 'riscv_simulator_hdl.html'), 'utf8');
const CM6 = fs.readFileSync(path.join(__dirname, 'cm6_bundle.min.js'), 'utf8');

const DESIGN = ['ALU.v', 'Decoder.v', 'Extend.v', 'PC_Logic.v', 'ProgramCounter.v',
                'RegFile.v', 'Shifter.v', 'RV.v', 'Wrapper.v'];

let passed = 0, failed = 0;
function check(label, cond) {
  if (cond) { passed++; console.log('  ✅ ' + label); }
  else { failed++; console.log('  ❌ ' + label); }
}

const dom = new JSDOM(html, {
  runScripts: 'dangerously', resources: 'usable',
  url: 'http://localhost:8080/riscv_simulator_hdl.html',
  beforeParse(window) {
    window.__CM6_DISABLE_CDN = true;
    window.addEventListener('DOMContentLoaded', () => {
      try { window.eval(CM6); } catch (e) { console.error('CM6 inject failed:', e.message); }
    });
    window.requestAnimationFrame = cb => setTimeout(cb, 16);
    window.cancelAnimationFrame = id => clearTimeout(id);
    window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
    window.Range.prototype.getClientRects = () => [];
    window.Range.prototype.getBoundingClientRect = () => ({ top:0,bottom:0,left:0,right:0,width:0,height:0 });
    window.Element.prototype.getClientRects = () => [];
    window.Element.prototype.getBoundingClientRect = () => ({ top:0,bottom:0,left:0,right:0,width:0,height:0 });
    if (window.HTMLCanvasElement) {
      window.HTMLCanvasElement.prototype.getContext = () => ({
        createImageData: (w,h) => ({ data: new Uint8Array(w*h*4), width:w, height:h }),
        putImageData(){}, fillRect(){}, clearRect(){}, drawImage(){},
        getImageData: () => ({ data: new Uint8Array(4) }), measureText: () => ({ width: 0 })
      });
    }
  }
});

const win = dom.window, doc = win.document;

// --------------------------------------------------------------------
// A minimal Icarus driver, mirroring what the page does: preprocess and
// compile once, then run the SAME binary many times with different
// plusargs and different files in the working directory.
// --------------------------------------------------------------------
async function makeIcarus(testbench) {
  const initIvlpp = (await import('file://' + path.join(ENGINE, 'ivlpp.js'))).default;
  const initIvl   = (await import('file://' + path.join(ENGINE, 'ivl.js'))).default;
  const initVvp   = (await import('file://' + path.join(ENGINE, 'vvp.js'))).default;

  const files = DESIGN.map(n => ({ name: n, src: fs.readFileSync(path.join(RV, n), 'utf8') }));
  files.push({ name: 'cg3207_hdl_tb.v', src: testbench });

  const ppOut = [];
  const pp = await initIvlpp({ print: s => ppOut.push(s), printErr: () => {} });
  const args = ['-L'];
  for (const f of files) { pp.FS.writeFile('/' + f.name, f.src + '\n'); args.push('/' + f.name); }
  pp.callMain(args);

  const errs = [];
  const ivl = await initIvl({ print: () => {}, printErr: s => errs.push(s) });
  ivl.FS.writeFile('/ivl.conf',
    'basedir:/\nmodule:system.vpi\ngeneration:2005\ngeneration:no-specify\nout:/out.vvp\n' +
    'iwidth:32\nwidthcap:65536\nfunctor:cprop\nfunctor:nodangle\nflag:DLL=vvp.tgt\n');
  ivl.FS.writeFile('/src.v', ppOut.join('\n') + '\n');
  ivl.callMain(['-C/ivl.conf', '--', '/src.v']);

  let vvpBytes = null;
  try { vvpBytes = ivl.FS.readFile('/out.vvp'); } catch (e) {}
  const realErr = errs.filter(l => !/system\.vpi|dynamic linking not enabled/.test(l)).join('\n');
  if (!vvpBytes && realErr) console.log('    compile diagnostics:\n' + realErr);

  return {
    ok: !!vvpBytes,
    async run(plusargs, memFiles) {
      const out = [];
      const vvp = await initVvp({ print: s => out.push(s), printErr: s => out.push(s) });
      vvp.FS.writeFile('/sim.vvp', vvpBytes);
      for (const name of Object.keys(memFiles)) vvp.FS.writeFile('/' + name, memFiles[name]);
      vvp.callMain(['/sim.vvp'].concat(plusargs || []));
      return out.join('\n');
    }
  };
}

const lastLed = out => {
  const ev = out.split('\n').filter(l => /^@@L /.test(l));
  return ev.length ? parseInt(ev[ev.length - 1].trim().split(/\s+/)[2], 16) : -1;
};

setTimeout(async () => {
  try {
    console.log('===========================================================');
    console.log('🔌 TESTING HDL SIMULATION MODE (Icarus Verilog → WASM)');
    console.log('===========================================================');

    // --- 1. UI surface -------------------------------------------------
    console.log('\n[1] HDL panel, engine toggle and stepping controls');
    check('HDL panel exists', !!doc.getElementById('tab-hdl'));
    check('HDL chip button exists', !!doc.getElementById('panelChip-hdl'));
    check('Engine toggle has JS and HDL buttons',
      !!doc.getElementById('engBtnJs') && !!doc.getElementById('engBtnHdl'));
    check('File drop zone and file input exist',
      !!doc.getElementById('hdlDropZone') && !!doc.getElementById('hdlFileInput'));
    check('Run button starts disabled (no sources loaded)',
      doc.getElementById('hdlRunBtn').disabled === true);
    check('Trace toggle exists and is on by default',
      !!doc.getElementById('hdlTrace') && doc.getElementById('hdlTrace').checked === true);
    check('Cross-check toggle exists and is off by default',
      !!doc.getElementById('hdlCompare') && doc.getElementById('hdlCompare').checked === false);
    check('Register-file path field and its hint exist',
      !!doc.getElementById('hdlRegPath') && !!doc.getElementById('hdlRegPathHint'));
    check('Peripherals panel is untouched (still present)', !!doc.getElementById('tab-peripherals'));

    // --- 2. Engine mode switching --------------------------------------
    console.log('\n[2] Engine mode toggle');
    win.setSimEngineMode('hdl');
    check('HDL mode marks the body', doc.body.classList.contains('hdl-mode'));
    check('HDL button becomes active', doc.getElementById('engBtnHdl').classList.contains('active'));
    win.setSimEngineMode('js');
    check('Switching back to JS clears the body class', !doc.body.classList.contains('hdl-mode'));
    win.setSimEngineMode('hdl');

    // --- 3. Register-file discovery ------------------------------------
    // The Wrapper is fixed, but the core behind it is student code, so the
    // path to the register array has to be found rather than assumed.
    console.log('\n[3] Register-file discovery from the uploaded sources');
    check('Discovery returns nothing before any source is loaded',
      win.hdlDiscoverRegBank() === null);

    win.hdlSetSources(DESIGN.map(n => ({ name: n, src: fs.readFileSync(path.join(RV, n), 'utf8') })));
    check('All 9 RV sources are loaded', win.getHdlFiles().length === 9);
    const regPath = win.hdlDiscoverRegBank();
    check('Register bank discovered: ' + regPath, regPath === 'dut.RV1.RegFile1.RegBank');
    check('The hint line reports the discovered path',
      /dut\.RV1\.RegFile1\.RegBank/.test(doc.getElementById('hdlRegPathHint').textContent));

    // Renaming the array and its module must still be found, since only the
    // shape "32 x 32-bit reg array" is relied on.
    const renamed = DESIGN.map(n => {
      let src = fs.readFileSync(path.join(RV, n), 'utf8');
      src = src.replace(/\bRegFile1\b/g, 'rf_inst')
               .replace(/\bRegFile\b/g, 'MyRF')
               .replace(/\bRegBank\b/g, 'xregs');
      return { name: n, src };
    });
    win.hdlSetSources(renamed);
    check('Discovery survives renaming the module, instance and array: ' +
      win.hdlDiscoverRegBank(), win.hdlDiscoverRegBank() === 'dut.RV1.rf_inst.xregs');
    win.hdlSetSources(DESIGN.map(n => ({ name: n, src: fs.readFileSync(path.join(RV, n), 'utf8') })));

    // --- 4. The testbench is program-independent -----------------------
    console.log('\n[4] Generated testbench carries no program-specific data');
    win.loadExample('dip_led');
    win.setDipSwitches(0xBEAD);
    const tb = win.hdlBuildTestbench({});

    check('Instantiates Wrapper with the fixed port order',
      /Wrapper dut\(DIP, PB, LED_OUT, LED_PC, SEVENSEGHEX, UART_TX, UART_TX_ready,/.test(tb));
    check('Does not redefine or modify the Wrapper module', !/module\s+Wrapper\b/.test(tb));
    check('Reads the cycle budget at run time', /\$value\$plusargs\("CYCLES=%d"/.test(tb));
    check('Reads the trace level at run time', /\$value\$plusargs\("TRACE=%d"/.test(tb));
    check('Reads DIP, PB and the accelerometer at run time',
      /\$value\$plusargs\("DIP=%h"/.test(tb) && /\$value\$plusargs\("PB=%h"/.test(tb) &&
      /\$value\$plusargs\("ACCEL=%h"/.test(tb));
    check('Reads the input timeline from a file at run time',
      /\$readmemh\("stim\.mem"/.test(tb));
    check('Reads UART input from a file at run time',
      /\$readmemh\("uart_rx\.mem"/.test(tb));
    check('VCD dumping is a run-time choice, not a compile-time one',
      /\$test\$plusargs\("VCD"\)/.test(tb));
    check('The live DIP value is NOT baked into the Verilog',
      !/bead/i.test(tb) && /reg\s+\[15:0\]\s+DIP\s+=\s+16'h0000/.test(tb));
    check('Reaches the register file by the discovered path',
      tb.indexOf('dut.RV1.RegFile1.RegBank[j]') > 0);
    check('Detects register writes without naming any write-port signal',
      /rf_shadow/.test(tb) && !/RegWrite/.test(tb));
    check('Emits the architectural trace records', /@@I %0d %0h %0h/.test(tb) &&
      /@@W %0d %0d %0h/.test(tb) && /@@M %0d %0h %0h %0h/.test(tb));
    check('Emits tagged peripheral events', /@@L %0d %0h/.test(tb) && /@@O %0d %0d %0d %0h/.test(tb));

    // The decisive check: change every input and load a different program,
    // and the Verilog must come out byte-identical.
    win.setDipSwitches(0x0001);
    win.loadExample('hello_world');
    const tbOther = win.hdlBuildTestbench({});
    check('Identical Verilog for a different program and different inputs',
      tbOther === tb);
    win.loadExample('dip_led');

    check('Testbench without a register path still compiles-shaped output',
      !/rf_shadow/.test(win.hdlBuildTestbench({ regBankPath: null })));

    // --- 5. Memory images ----------------------------------------------
    console.log('\n[5] Memory images are generated from the assembled program');
    const mc = win.getMachineCode();
    check('DIP_to_LED assembled', Array.isArray(mc) && mc.length > 0);
    const wrapperSrc = fs.readFileSync(path.join(RV, 'Wrapper.v'), 'utf8');
    const mem = win.hdlMemFiles(wrapperSrc);
    check('IROM depth read from the uploaded Wrapper (9)', mem.iromBits === 9);
    check('DMEM depth read from the uploaded Wrapper (14)', mem.dmemBits === 14);
    const iromLines = mem.files['AA_IROM.mem'].trim().split('\n');
    check('IROM image is 8-hex-digit words, one per line',
      iromLines.every(l => /^[0-9a-f]{8}$/.test(l)));
    check('IROM image fits the Wrapper\'s IROM', iromLines.length <= mem.iromCapacity);
    // Compare against the reference RARS dump. The word COUNT must match;
    // individual words may legitimately differ where this assembler picks a
    // different but equivalent expansion of a pseudo-instruction (absolute
    // lui+lw vs PC-relative auipc+lw for the same address). Section 7 proves
    // functional equivalence by actually running it.
    const refIrom = fs.readFileSync(path.join(RV, 'AA_IROM_DIP_to_LED.mem'), 'utf8')
      .trim().split('\n').map(l => l.trim().toLowerCase()).filter(Boolean);
    const gotIrom = iromLines.map(l => l.toLowerCase());
    check('Generated IROM has the same word count as the reference RARS dump',
      refIrom.length === gotIrom.length);
    const sameWords = refIrom.filter((w, i) => w === gotIrom[i]).length;
    check('At least 80% of words are byte-identical to the reference dump (' +
      sameWords + '/' + refIrom.length + ')', sameWords >= refIrom.length * 0.8);

    // --- 6. Stimulus file format ---------------------------------------
    console.log('\n[6] Run-time stimulus files');
    win.hdlSetStim([{ cycle: 30, code: 1, value: 0x00ff }, { cycle: 5, code: 2, value: 3 }]);
    const stimTxt = win.hdlStimFile();
    check('stim.mem is one 32-bit hex word per line',
      stimTxt.trim().split('\n').every(l => /^[0-9a-f]{8}$/.test(l)));
    check('stim.mem holds three words per event, in cycle order',
      stimTxt.trim().split('\n').length === 6 &&
      stimTxt.trim().split('\n')[0] === '00000005');
    win.hdlSetRx([{ cycle: 12, byte: 0x41 }]);
    check('uart_rx.mem holds <cycle> <byte> pairs',
      win.hdlRxFile().trim().split('\n').join(',') === '0000000c,00000041');
    win.hdlSetStim([]); win.hdlSetRx([]);

    if (!fs.existsSync(path.join(ENGINE, 'ivl.js'))) {
      check('Engine present at ' + ENGINE + ' (set HDL_ENGINE_DIR to override)', false);
    } else {
      // --- 7. ONE compile, many runs -----------------------------------
      console.log('\n[7] Compiled once, then driven entirely at run time');
      const icarus = await makeIcarus(tb);
      check('Design + generic testbench compile cleanly', icarus.ok);

      if (icarus.ok) {
        const base = {
          'AA_IROM.mem': mem.files['AA_IROM.mem'],
          'AA_DMEM.mem': mem.files['AA_DMEM.mem'],
          'stim.mem': '', 'uart_rx.mem': ''
        };

        // (a) no plusargs at all - the downloaded testbench must stand alone
        const standalone = await icarus.run([], base);
        check('Runs standalone with no plusargs (as saved for Vivado/iverilog)',
          /\$finish called/.test(standalone));

        // (b) DIP supplied purely at run time
        const runA = await icarus.run(['+CYCLES=400', '+DIP=bead'], base);
        check('DIP passed as a plusarg reaches the hardware: LED=0x' +
          lastLed(runA).toString(16), lastLed(runA) === 0xad);

        // (c) the SAME binary, a different DIP - no recompilation
        const runB = await icarus.run(['+CYCLES=400', '+DIP=0072'], base);
        check('The same compiled binary yields a different result for a ' +
          'different run-time DIP: LED=0x' + lastLed(runB).toString(16),
          lastLed(runB) === 0x72);

        // --- 8. Architectural trace ------------------------------------
        console.log('\n[8] Architectural trace and its replay');
        const t = win.hdlParseTrace(runA);
        check('Trace contains instruction records', t.steps.length > 10);
        check('Execution starts at the reset vector 0x00400000',
          t.steps[0].pc === 0x00400000);
        check('Every record carries a PC and an instruction word',
          t.steps.every(s => Number.isFinite(s.pc) && Number.isFinite(s.instr)));
        check('Cycle numbers increase monotonically',
          t.steps.every((s, i) => i === 0 || s.cyc > t.steps[i - 1].cyc));
        const allWrites = t.steps.reduce((a, s) => a.concat(s.regw), []);
        check('Register writes were captured (' + allWrites.length + ')', allWrites.length > 5);
        check('x0 is never reported as written', allWrites.every(w => w[0] !== 0));
        check('The DIP value read by the program lands in a register: 0xbead',
          allWrites.some(w => w[1] === 0xbead));
        const allMem = t.steps.reduce((a, s) => a.concat(s.memw), []);
        check('The store to the LED MMIO register was captured',
          allMem.some(w => w[0] === 0xFFFF0060 && w[2] === 0xbead));
        check('A final snapshot closes the trace', !!t.final && !!t.next);

        // --- 8b. Seeking = stepping ------------------------------------
        // vvp cannot be paused, so stepping is navigation through the
        // recording. That also makes stepping backwards possible.
        console.log('\n[8b] Stepping and back-stepping through the recording');
        win.hdlLoadTrace(runA, 400);
        win.hdlSeek(0);
        check('Seek(0) puts the PC at the reset vector', win.getPc() === 0x00400000);
        check('At the start no register has been written by the hardware',
          win.getRegs().every((v, i) => i === 0 || v === 0));

        // Instruction 8 of DIP_to_LED is the load from the DIP MMIO register;
        // find the record that writes 0xbead and check the state either side.
        const kBead = t.steps.findIndex(s => s.regw.some(w => w[1] === 0xbead));
        check('Found the instruction that reads the DIP switches', kBead > 0);
        const rBead = t.steps[kBead].regw.find(w => w[1] === 0xbead)[0];

        win.hdlSeek(kBead);
        check('Just before it, the destination register is not yet 0xbead',
          (win.getRegs()[rBead] >>> 0) !== 0xbead);
        win.hdlSeek(kBead + 1);
        check('Just after it, x' + rBead + ' holds the DIP value 0xbead',
          (win.getRegs()[rBead] >>> 0) === 0xbead);
        check('The PC advanced by one instruction',
          win.getPc() === t.steps[kBead + 1].pc);

        win.hdlSeek(kBead);
        check('Stepping BACK undoes the register write',
          (win.getRegs()[rBead] >>> 0) !== 0xbead &&
          win.getPc() === t.steps[kBead].pc);

        win.hdlSeek(t.steps.length);
        check('Seeking to the end reproduces the hardware LED value: 0x' +
          win.getLedState().toString(16), win.getLedState() === 0xad);
        check('Seeking to the end lands on the @@N next-instruction PC',
          win.getPc() === t.next);
      }

      // --- 9. Live input changes replay deterministically --------------
      console.log('\n[9] Changing an input mid-run replays the same history');
      const icarus2 = await makeIcarus(tb);
      if (icarus2.ok) {
        const base = {
          'AA_IROM.mem': mem.files['AA_IROM.mem'],
          'AA_DMEM.mem': mem.files['AA_DMEM.mem'],
          'stim.mem': '', 'uart_rx.mem': ''
        };
        const plain = await icarus2.run(['+CYCLES=60', '+DIP=bead', '+TRACE=2'], base);

        // The page's own stimulus file: DIP becomes 0x00ff at cycle 30.
        win.hdlSetStim([{ cycle: 30, code: 1, value: 0x00ff }]);
        const withChange = await icarus2.run(
          ['+CYCLES=60', '+DIP=bead', '+TRACE=2', '+NSTIM=1'],
          Object.assign({}, base, { 'stim.mem': win.hdlStimFile() }));
        win.hdlSetStim([]);

        check('The input change takes effect: LED ends at 0x' +
          lastLed(withChange).toString(16) + ' instead of 0x' + lastLed(plain).toString(16),
          lastLed(plain) === 0xad && lastLed(withChange) === 0xff);

        // Determinism is what makes stepping-then-changing-an-input safe:
        // everything before the change must replay identically.
        const before = s => win.hdlParseTrace(s).steps.filter(x => x.cyc < 30)
          .map(x => x.cyc + ':' + x.pc.toString(16) + ':' + x.instr.toString(16)).join('|');
        check('History before the change is bit-identical in both runs',
          before(plain) === before(withChange) && before(plain).length > 50);
      }

      // --- 10. Bidirectional UART, fed at run time --------------------
      // HelloWorld.asm blocks in a UART_RX_VALID poll until it receives 'A'
      // then CR, echoes each byte, and only then prints its greeting.
      console.log('\n[10] Bidirectional UART, supplied through uart_rx.mem');
      win.loadExample('hello_world');
      const mem2 = win.hdlMemFiles(wrapperSrc);
      const icarus3 = await makeIcarus(tb);
      check('The same testbench serves a completely different program', icarus3.ok);
      if (icarus3.ok) {
        win.hdlSetRx([{ cycle: 0, byte: 0x41 }, { cycle: 0, byte: 0x0D }]);
        const rxFile = win.hdlRxFile();
        win.hdlSetRx([]);
        const out = await icarus3.run(['+CYCLES=40000', '+NRX=2'], {
          'AA_IROM.mem': mem2.files['AA_IROM.mem'],
          'AA_DMEM.mem': mem2.files['AA_DMEM.mem'],
          'stim.mem': '', 'uart_rx.mem': rxFile
        });
        const tx = out.split('\n').filter(l => /^@@T /.test(l))
          .map(l => String.fromCharCode(parseInt(l.trim().split(/\s+/)[2], 16))).join('');
        check('Hardware transmitted UART bytes (' + tx.length + ')', tx.length > 0);
        check('The received bytes were echoed back', tx.indexOf('A') === 0);
        check('The greeting the program stores in DMEM was printed: ' +
          JSON.stringify(tx.slice(0, 40)), /Welcome to CG3207/.test(tx));
      }
    }

    console.log('\n===========================================================');
    if (failed === 0) { console.log(`🎉 ALL ${passed} HDL MODE TESTS PASSED!`); process.exit(0); }
    else { console.log(`💥 ${failed} HDL MODE TEST(S) FAILED (${passed} passed)`); process.exit(1); }
  } catch (err) {
    console.error('HDL Mode Test Failed:', err);
    process.exit(1);
  }
}, 900);
