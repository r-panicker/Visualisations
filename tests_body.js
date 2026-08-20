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

console.log('DONE');