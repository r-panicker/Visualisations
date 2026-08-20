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

console.log('DONE');