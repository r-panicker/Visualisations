const fs = require('fs');
function makeEl() {
  return {
    value: '', innerHTML: '', textContent: '', style: {}, className: '',
    classList: { add(){}, remove(){}, toggle(){} },
    addEventListener(){}, appendChild(){}, append(){}, focus(){}, blur(){},
    setAttribute(){}, getAttribute(){ return null; }, closest(){ return null; },
    scrollTop: 0, scrollLeft: 0, scrollHeight: 0, checked: false, files: [],
  };
}
const elements = {};
global.document = {
  getElementById(id){ if(!elements[id]) elements[id]=makeEl(); return elements[id]; },
  querySelectorAll(){ return []; },
  querySelector(){ return null; },
  createElement(){ return makeEl(); },
};
global.window = global;
global.navigator = { userAgent: 'node' };
global.FileReader = class { constructor(){ this.onload=null; this.onerror=null; } readAsText(){} };

const html = fs.readFileSync('riscv_simulator.html', 'utf8');
const js = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const tests = fs.readFileSync('tests_body.js', 'utf8');
eval(js + '\n' + tests);
