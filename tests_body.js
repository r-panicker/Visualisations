function assembleok(label, src) {
  const out = assemble(src);
  const errs = out.filter(i => i.error);
  if (errs.length) {
    console.log('[' + label + '] ERRORS:');
    errs.forEach(e => console.log('   line ' + e.line + ': ' + e.error + '  (' + e.asmLine + ')'));
  }
  return out;
}
function hex32(v){ return '0x' + ((v>>>0).toString(16).padStart(8,'0')); }

console.log('=== li 0x20000 (reported bug) ===');
let out = assembleok('li', 'main:\n  li x28, 0x20000\n  j done\ndone:\n  j done\n');
out.forEach(i=>console.log(' 0x'+i.address.toString(16)+': '+(i.bytes?i.bytes.map(b=>b.toString(16).padStart(2,'0')).join(' '):'ERR')+' | '+i.text));
resetAll();
const prog = assemble('main:\n  li x28, 0x20000\n  j done\ndone:\n  j done\n');
loadProgram(prog);
pc = 0x10000;
pc = decodeAndExecute(fetchInstruction(0x10000), 0x10000);
console.log('  x28 after li =', hex32(regs[28]), regs[28] === 0x20000 ? 'PASS' : 'FAIL');

console.log('=== li 0x1FFFFF (rounding carry) ===');
resetAll();
loadProgram(assemble('main:\n  li x1, 0x1FFFFF\n'));
pc = 0x10000;
pc = decodeAndExecute(fetchInstruction(pc), pc);   // lui
pc = decodeAndExecute(fetchInstruction(pc), pc);   // addi
console.log('  x1 =', hex32(regs[1]), regs[1]===0x1FFFFF ? 'PASS':'FAIL');

console.log('=== lui x5, 0x10000 ===');
resetAll();
loadProgram(assemble('main:\n  lui x5, 0x10000\n'));
pc=0x10000;
pc = decodeAndExecute(fetchInstruction(pc), pc);
console.log('  x5 =', hex32(regs[5]), regs[5]===0x10000000?'PASS':'FAIL');

console.log('=== .data / la / .word / .equ ===');
const dataCode = [
'.equ  N, 5',
'.text',
'main:',
'  la  x28, data0',
'  lw  x1, 0(x28)',
'  lw  x2, 4(x28)',
'  addi x3, x3, N',
'  j done',
'.data',
'data0: .word 40, 50',
'data1: .half 7, 8',
'.byte 1, 2',
'mybuf: .space 4',
'msg: .asciiz "Hi"',
'.align 2',
'dw: .dword 0x1122334455667788',
'.text',
'done:',
'  j done'
].join('\n');
out = assembleok('data', dataCode);
out.forEach(i=>console.log(' 0x'+i.address.toString(16)+': '+(i.bytes?i.bytes.length+'B':'ERR')+' | '+(i.text||'')));
console.log('  data0 label =', hex32(labels['data0']), labels['data0']===0x20000?'PASS(0x20000)':'addr-not-0x20000');
console.log('  msg label =', labels['msg']!==undefined?hex32(labels['msg']):'MISSING');
resetAll();
loadProgram(assemble(dataCode));
console.log('  mem[.word 40] =', readMem(0x20000,4), readMem(0x20000,4)===40?'PASS (little-endian)':'wrong');
console.log('  msg first char =', JSON.stringify(labels['msg']!==undefined?String.fromCharCode(readMem(labels['msg']||0,1)):''));

console.log('=== branch pseudo + call/tail/la expansion ===');
out = assembleok('pseudo', 'main:\n  beqz x1, there\n  bnez x2, there\n  j there\n  jal there\nthere:\n  call func\nfunc:\n  ret\n');
out.forEach(i=>console.log(' 0x'+i.address.toString(16)+': '+(i.bytes?i.bytes.map(b=>b.toString(16).padStart(2,'0')).join(''):'ERR')+' | '+i.text));

console.log('=== lw rd, label (direct, out-of-12-bit-range) ===');
const lwLabelCode = [
'.text',
'main:',
'  lw s3, delay_val',
'  j done',
'.data',
'delay_val: .word 0x12345678',
'.text',
'done:',
'  j done'
].join('\n');
out = assembleok('lwlabel', lwLabelCode);
const lwHasErr = out.some(i=>i.error);
out.forEach(i=>console.log(' 0x'+i.address.toString(16)+': '+(i.bytes?i.bytes.map(b=>b.toString(16).padStart(2,'0')).join(' '):'ERR')+' | '+i.text));
console.log('  lw-label no assembler error:', lwHasErr ? 'FAIL' : 'PASS');
// Verify expansion: lui x5, hi(delay_val); lw s3, lo(x5) loads the stored word.
if (!lwHasErr) {
  const toHexBytes = arr => arr.map(b => b.toString(16).padStart(2, '0')).join('');
  const deadAddr = labels['delay_val'];
  const upper = deadAddr >>> 12;
  const lower = deadAddr & 0xFFF;
  // lui x5, upper ; lw s3, lower(x5)
  const luiEnc = (upper << 12) | (5 << 7) | 0b0110111;
  const lwEnc = (lower << 20) | (5 << 15) | (0b010 << 12) | (19 << 7) | 0b0000011;
  const expLui = toHexBytes([luiEnc & 0xFF, (luiEnc>>8)&0xFF, (luiEnc>>16)&0xFF, (luiEnc>>24)&0xFF]);
  const expLw = toHexBytes([lwEnc & 0xFF, (lwEnc>>8)&0xFF, (lwEnc>>16)&0xFF, (lwEnc>>24)&0xFF]);
  const gotLui = toHexBytes(out[0].bytes);
  const gotLw = toHexBytes(out[1].bytes);
  console.log('  lui+load expansion correct:', (gotLui === expLui && gotLw === expLw) ? 'PASS' : `FAIL (got ${gotLui},${gotLw} want ${expLui},${expLw})`);
}

console.log('=== li x6, -1 ===');
resetAll();
loadProgram(assemble('main:\n  li x6, -1\n'));
pc=0x10000;
pc = decodeAndExecute(fetchInstruction(pc), pc);
console.log('  x6 =', hex32(regs[6]), regs[6]===-1?'PASS':'FAIL');

console.log('=== mv / ret / jr / nop / neg ===');
out = assembleok('misc', 'main:\n  mv x10, x11\n  nop\n  ret\n  jr x4\n  neg x5, x6\n');
out.forEach(i=>console.log(' 0x'+i.address.toString(16)+': '+(i.bytes?i.bytes.map(b=>b.toString(16).padStart(2,'0')).join(' '):'ERR')+' | '+i.text));

console.log('=== jump & branch offset calculation tests ===');
const jumpBranchCode = [
  '.text',
  'main:',
  '  addi x1, x0, 5',
  '  addi x2, x0, 5',
  '  beq  x1, x2, target',  // +12 byte offset (PC 0x10008 to target 0x10014)
  '  addi x3, x0, 99',
  '  j    end',             // +16 byte offset (PC 0x10010 to end 0x10020)
  'target:',
  '  addi x3, x0, 42',
  '  j    loop',            // -4 byte offset (PC 0x10018 to loop 0x1001c)
  'loop:',
  '  jal  x0, 0',           // 0 byte offset (PC 0x1001c to 0x1001c)
  'end:',
  '  jalr x1'
].join('\n');

const jbOut = assembleok('jump_branch', jumpBranchCode);
// beq x1, x2, target at 0x10008: offset is 12 (0xC), expect 63 86 20 00
const beqEnc = jbOut[2].bytes.map(b=>b.toString(16).padStart(2,'0')).join(' ');
console.log('  beq offset 12 byte encoding:', beqEnc === '63 86 20 00' ? 'PASS' : `FAIL (${beqEnc})`);

// j end at 0x10010: target is end (0x10020), offset is 16 (0x10), expect 6f 00 00 01
const jEndEnc = jbOut[4].bytes.map(b=>b.toString(16).padStart(2,'0')).join(' ');
console.log('  j end offset 16 byte encoding:', jEndEnc === '6f 00 00 01' ? 'PASS' : `FAIL (${jEndEnc})`);

// jal x0, 0 (self jump) at 0x1001c (jbOut[7]): offset is 0, expect 6f 00 00 00
const selfJEnc = jbOut[7].bytes.map(b=>b.toString(16).padStart(2,'0')).join(' ');
console.log('  self jump (0 offset) encoding:', selfJEnc === '6f 00 00 00' ? 'PASS' : `FAIL (${selfJEnc})`);

// Verify runtime execution of beq branch
resetAll();
loadProgram(jbOut);
pc = 0x10000;
// Step 1: addi x1, x0, 5 -> pc=0x10004
// Step 2: addi x2, x0, 5 -> pc=0x10008
// Step 3: beq x1, x2, target -> pc=0x10014 (target)
// Step 4: addi x3, x0, 42 -> pc=0x10018, regs[3]=42
for (let step = 0; step < 4; step++) {
  pc = decodeAndExecute(fetchInstruction(pc), pc);
}
console.log('  beq target execution pc =', hex32(pc), pc === 0x10018 ? 'PASS' : `FAIL (pc=${hex32(pc)})`);
console.log('  x3 after branch execution =', regs[3], regs[3] === 42 ? 'PASS' : `FAIL (x3=${regs[3]})`);

console.log('=== bare label load offset test (DIP_to_LED pattern) ===');
const dipCode = [
  '.text',
  'main:',
  '  lw s1, LED_ADDR',
  '  sw s4, (s1)',
  'wait:',
  '  addi s3, s3, -1',
  '  beq s3, zero, loop',
  '  jal zero, wait',
  'loop:',
  '  j main',
  '.data',
  'LED_ADDR: .word 0xFFFF0060'
].join('\n');
const dipOut = assembleok('dip_pattern', dipCode);
// jal zero, wait is at 0x10014; wait: is at 0x1000c (addi s3, s3, -1); offset -8 -> expect 6f f0 9f ff
const jalWaitEnc = dipOut[5].bytes.map(b=>b.toString(16).padStart(2,'0')).join(' ');
console.log('  jal zero, wait target (0x1000c addi) encoding:', jalWaitEnc === '6f f0 9f ff' ? 'PASS' : `FAIL (${jalWaitEnc})`);

console.log('=== Circle_delay_accel.asm Execution & Accelerometer Visualisation ===');
const circleAsm = fs.readFileSync('Circle_delay_accel.asm', 'utf8');
const circleProg = assembleok('circle_accel', circleAsm);
loadProgram(circleProg);

const circlePresets = [
  { name: 'Flat (Z=+1g) [Blue]',  x: 0,  y: 0,  z: 64, exp: [0, 0, 128] },
  { name: 'Tilt X (+1g) [Red]',   x: 64, y: 0,  z: 0,  exp: [128, 0, 0] },
  { name: 'Tilt Y (+1g) [Green]', x: 0,  y: 64, z: 0,  exp: [0, 128, 0] },
  { name: 'Tilt X+Y [Yellow]',    x: 64, y: 64, z: 0,  exp: [128, 128, 0] },
];

for (const cp of circlePresets) {
  accelX = cp.x; accelY = cp.y; accelZ = cp.z; accelTemp = 25; accelDready = 1;
  let pxCount = 0; let cColor = null;
  const oldWrite = writeOledPixel;
  writeOledPixel = function(val) {
    pxCount++; oldWrite(val);
    const idx = (oledRow * 96 + oledCol) * 4;
    cColor = [oledBuffer[idx], oledBuffer[idx+1], oledBuffer[idx+2]];
  };
  while (pc !== labels['.LBB0_10']) { executeOne(); }
  writeOledPixel = oldWrite;
  const colPass = cColor && cColor[0] === cp.exp[0] && cColor[1] === cp.exp[1] && cColor[2] === cp.exp[2];
  console.log(`  ${cp.name}: pixels=${pxCount} (${pxCount===2533?'PASS':'FAIL'}), color=RGB(${cColor}) (${colPass?'PASS':'FAIL'})`);
  totalCycles = regs[11];
  while (pc !== labels['.LBB0_1']) { executeOne(); }
}

console.log('=== Breakpoint Resume & Step-Then-Run Verification ===');
const bpCode = [
  'main:',
  '  addi x1, x0, 0',
  '  addi x2, x0, 5',
  'loop:',
  '  addi x1, x1, 1',
  '  bne x1, x2, loop',
  '  j done',
  'done:',
  '  nop'
].join('\n');

editor.value = bpCode;
resetAll();
breakpoints.clear();
breakpoints.add(5); // Breakpoint on line 5 ("addi x1, x1, 1")

// 1. Initial Run -> stops at line 5 before execution
runProgram();
const bpPass1 = (pc === 0x10008 && regs[1] === 0 && currentExecLine === 5);
console.log('  Initial Run (stops at BP line 5):', bpPass1 ? 'PASS' : `FAIL (pc=0x${pc.toString(16)}, x1=${regs[1]}, line=${currentExecLine})`);

// 2. Resume Run directly from BP -> advances x1 to 1 and loops back to line 5 BP
runProgram();
const bpPass2 = (pc === 0x10008 && regs[1] === 1 && currentExecLine === 5);
console.log('  Resume Run directly from BP (iter 1):', bpPass2 ? 'PASS' : `FAIL (pc=0x${pc.toString(16)}, x1=${regs[1]}, line=${currentExecLine})`);

// 3. Step Once -> executes line 5, advances to line 6
stepOnce();
const bpPass3 = (pc === 0x1000c && regs[1] === 2 && currentExecLine === 6);
console.log('  Step Once after BP (advances to line 6, x1=2):', bpPass3 ? 'PASS' : `FAIL (pc=0x${pc.toString(16)}, x1=${regs[1]}, line=${currentExecLine})`);

// 4. Run from after step -> continues loop without resetting and hits line 5 BP on next iteration
runProgram();
const bpPass4 = (pc === 0x10008 && regs[1] === 2 && currentExecLine === 5);
console.log('  Run from after step (continues to next iter BP):', bpPass4 ? 'PASS' : `FAIL (pc=0x${pc.toString(16)}, x1=${regs[1]}, line=${currentExecLine})`);

// 5. Clear BP and run to completion
breakpoints.clear();
runProgram();
const bpPass5 = (regs[1] === 5 && programFinished === true);
console.log('  Clear BP and Run to completion (x1=5, finished=true):', bpPass5 ? 'PASS' : `FAIL (x1=${regs[1]}, finished=${programFinished})`);

// 6. Run after program finished -> restarts fresh from beginning
runProgram();
const bpPass6 = (regs[1] === 5 && programFinished === true);
console.log('  Run after finished (re-assembles and runs from start):', bpPass6 ? 'PASS' : `FAIL (x1=${regs[1]}, finished=${programFinished})`);

console.log('=== UART Send, MMIO Peek, and Program Switch Verification ===');
// 1. Send UART character 'A' (0x41)
document.getElementById('uartInputMode').value = 'ascii';
document.getElementById('uartInputText').value = 'A';
document.getElementById('uartAutoSendCheck').checked = false;
sendUartInput();

const uartPass1 = (uartRxQueue.length === 1 && uartRxQueue[0] === 0x41);
console.log('  UART send \'A\' into RX FIFO:', uartPass1 ? 'PASS' : `FAIL (queue=${JSON.stringify(uartRxQueue)})`);

const rxValidVal = readMem(0xFFFF0000, 1, true);
const rxDataVal = readMem(0xFFFF0004, 1, true);
const badgeRxValid = document.getElementById('badgeRxValid').innerText;
const uartPass2 = (rxValidVal === 1 && rxDataVal === 0x41 && badgeRxValid === '1' && uartRxQueue.length === 1);
console.log('  RX_VALID=1 and RX=0x41 before CPU read (peek non-destructive):', uartPass2 ? 'PASS' : `FAIL (rxVal=${rxValidVal}, rxData=0x${rxDataVal.toString(16)}, badge=${badgeRxValid}, qLen=${uartRxQueue.length})`);

// 2. CPU instruction reads 0xFFFF0004 -> consumes 'A'
const cpuRead = readMem(0xFFFF0004, 1, false);
const rxValidAfter = readMem(0xFFFF0000, 1, true);
const badgeRxValidAfter = document.getElementById('badgeRxValid').innerText;
const uartPass3 = (cpuRead === 0x41 && uartRxQueue.length === 0 && rxValidAfter === 0 && badgeRxValidAfter === '0');
console.log('  CPU readMem consumes byte and clears RX_VALID to 0:', uartPass3 ? 'PASS' : `FAIL (cpuRead=0x${cpuRead.toString(16)}, qLen=${uartRxQueue.length}, rxVal=${rxValidAfter})`);

// 3. Write to UART_TX (0xFFFF000C)
writeMem(0xFFFF000C, 0x48, 1); // 'H'
writeMem(0xFFFF000C, 0x69, 1); // 'i'
const uartPass4 = (uartTxBuffer === 'Hi');
console.log('  UART TX write outputs to terminal buffer (\'Hi\'):', uartPass4 ? 'PASS' : `FAIL (uartTxBuffer=${uartTxBuffer})`);

// 4. Switching assembly program clears serial console and resets peripherals
loadExample('basic');
const uartPass5 = (uartTxBuffer === '' && uartRxQueue.length === 0 && document.getElementById('badgeRxValid').innerText === '0');
console.log('  Switching example clears serial console & resets UART state:', uartPass5 ? 'PASS' : `FAIL (tx=${uartTxBuffer}, qLen=${uartRxQueue.length})`);

// 5. Verify Stack Pointer (x2 / sp) is 0 on reset
resetAll();
const spResetPass = (regs[2] === 0);
console.log('  Stack Pointer (x2 / sp) is 0 on reset (hardware spec):', spResetPass ? 'PASS' : `FAIL (sp=0x${regs[2].toString(16)})`);

// 6. Segment address change triggers re-assembly
const segTestCode = [
  '.text',
  'main:',
  '  la x1, mydata',
  '  lw x2, 0(x1)',
  '.data',
  'mydata: .word 0x12345678'
].join('\n');

editor.value = segTestCode;
assembleOnly();

// Change segment addresses to Code=0x40000, Data=0x80000
document.getElementById('ms-code').value = '0x40000';
document.getElementById('ms-data').value = '0x80000';
document.getElementById('ms-stack').value = '0x90000';
document.getElementById('ms-mmio').value = '0xFFFF0000';
applyMemSegments();

const segPass1 = (baseAddress === 0x40000 && dataBase === 0x80000 && labels['mydata'] === 0x80000 && readMem(0x80000, 4) === 0x12345678 && machineCode[0].address === 0x40000 && assembled === true);
console.log('  applyMemSegments() re-assembles code & data to new addresses:', segPass1 ? 'PASS' : `FAIL (base=0x${baseAddress.toString(16)}, data=0x${dataBase.toString(16)}, lbl=0x${labels['mydata']?.toString(16)})`);

// Restore default segment addresses
resetMemSegments();
const segPass2 = (baseAddress === 0x10000 && dataBase === 0x20000 && labels['mydata'] === 0x20000 && readMem(0x20000, 4) === 0x12345678 && machineCode[0].address === 0x10000 && assembled === true);
console.log('  resetMemSegments() re-assembles back to default addresses:', segPass2 ? 'PASS' : `FAIL (base=0x${baseAddress.toString(16)}, data=0x${dataBase.toString(16)}, lbl=0x${labels['mydata']?.toString(16)})`);

// 7. Save filename suggestions and memory dump names
loadExample('circle_accel');
const namePass1 = (currentFileName === 'Circle_delay_accel.asm');
loadExample('basic');
const namePass2 = (currentFileName === 'basic.asm');
console.log('  Default save filename derived from loaded example/file:', (namePass1 && namePass2) ? 'PASS' : `FAIL (circle=${currentFileName})`);

const memDumpText = buildMemFileText(machineCode.filter(i => !i.error && i.bytes));
const memCommentPass = memDumpText.includes('// @') && !memDumpText.match(/^@[0-9a-fA-F]+/m);
console.log('  Memory dump @ address line is commented with //:', memCommentPass ? 'PASS' : 'FAIL');

// 8. Find match highlighting & navigation
editor.value = 'addi x1, x0, 10\naddi x2, x1, 20\naddi x3, x2, 30';
updateEditor();
openFindReplace(false);
document.getElementById('findInput').value = 'addi';
updateFindMatches();
const hlLayer = document.getElementById('highlightLayer');
const hasActiveMark = hlLayer.innerHTML.includes('hl-find-active') && hlLayer.innerHTML.includes('addi');
const hasMatchMark = hlLayer.innerHTML.includes('hl-find-match');
findNext();
const navigatedActive = (activeFindIndex === 1);
closeFindReplace();
const clearedHighlights = !hlLayer.innerHTML.includes('hl-find-active') && !hlLayer.innerHTML.includes('hl-find-match');
const findHighlightPass = hasActiveMark && hasMatchMark && navigatedActive && clearedHighlights;
console.log('  In-editor live Find match highlighting & navigation:', findHighlightPass ? 'PASS' : 'FAIL');

// 9. ACCEL_DATA packing {temperature, X, Y, Z} MSB down to LSB
accelTemp = 25; // 0x19
accelX = 64;    // 0x40
accelY = -64;   // 0xC0 (-64 in 8-bit = 0xC0)
accelZ = 127;   // 0x7F
const packedAccel = readMem(0xFFFF0040, 4);
const expPacked = (((25 & 0xFF) << 24) | ((64 & 0xFF) << 16) | ((-64 & 0xFF) << 8) | (127 & 0xFF)) >>> 0;
const accelZByte = readMem(0xFFFF0040, 1);
const accelYByte = readMem(0xFFFF0041, 1);
const accelXByte = readMem(0xFFFF0042, 1);
const accelTByte = readMem(0xFFFF0043, 1);
const accelPackingPass = (packedAccel === expPacked) && (accelZByte === 127) && (accelYByte === 0xC0) && (accelXByte === 64) && (accelTByte === 25);
console.log('  ACCEL_DATA packing {temp, X, Y, Z} & byte offsets:', accelPackingPass ? 'PASS' : 'FAIL');

// 10. Tilt preset toggle (+1g / -1g)
setAccelPreset('flat');
const flatZ = accelZ === 64 && accelX === 0 && accelY === 0;
setAccelPreset('tiltX'); // 1st click -> +64 (+1g)
const tiltX1 = accelX === 64;
setAccelPreset('tiltX'); // 2nd click -> -64 (-1g)
const tiltX2 = accelX === -64;
setAccelPreset('tiltY'); // 1st click -> +64 (+1g)
const tiltY1 = accelY === 64;
setAccelPreset('tiltY'); // 2nd click -> -64 (-1g)
const tiltY2 = accelY === -64;
const tiltTogglePass = flatZ && tiltX1 && tiltX2 && tiltY1 && tiltY2;
console.log('  Accelerometer Tilt X/Y toggle between +1g and -1g:', tiltTogglePass ? 'PASS' : 'FAIL');

// 11. RARS Syscall Execution (print_int, print_string, print_hex, print_char, exit)
resetAll();
const rarsAsm = [
  '.text',
  'main:',
  '  la a0, msg',
  '  li a7, 4',     // print_string
  '  ecall',
  '  li a0, 42',
  '  li a7, 1',     // print_int
  '  ecall',
  '  li a0, 0x1234',
  '  li a7, 34',    // print_hex
  '  ecall',
  '  li a0, 65',    // 'A'
  '  li a7, 11',    // print_char
  '  ecall',
  '  li a7, 10',    // exit
  '  ecall',
  '.data',
  'msg: .asciz "SyscallTest:"'
].join('\n');
editor.value = rarsAsm;
assembleOnly();
running = true;
const logCountBefore = consoleEl.childNodes.length;
let steps = 0;
while (running && steps < 30) {
  executeOne();
  steps++;
}
const logsAfter = consoleEl.childNodes.slice(logCountBefore).map(n => n.textContent);
const hasStr = logsAfter.includes('SyscallTest:');
const hasInt = logsAfter.includes('42');
const hasHex = logsAfter.some(l => l.toLowerCase() === '0x00001234');
const hasChar = logsAfter.includes('A');
const rarsPass = hasStr && hasInt && hasHex && hasChar;
console.log('  RARS ecall syscalls (print_string, int, hex, char, exit):', rarsPass ? 'PASS' : 'FAIL');

console.log('=== Comprehensive Instruction Set Verification (RV32I, RV32M, RV32F, RV32D, RV32A, Pseudo) ===');
require('./test_all_instructions.js');

console.log('DONE');