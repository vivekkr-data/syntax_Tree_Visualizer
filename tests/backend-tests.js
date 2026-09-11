'use strict';
const assert = require('node:assert/strict');
global.window = global;
require('../tokenizer.js');require('../parser.js');require('../compiler.js');require('../backend.js');
let count=0;
function test(name, run){run();count++;console.log(`PASS backend: ${name}`);}
const compile=source=>SyntaxCompiler.compile(new SyntaxParser.Parser(new SyntaxTokenizer.Tokenizer(source).tokenize()).parse());
// Only the test harness executes target instructions. No evaluation API is exposed by the app.
function execute(instructions){
  const labels=new Map(),functions=new Map(),globals=new Map(),output=[];let budget=40000;
  instructions.forEach((q,i)=>{if(q.op==='LABEL')labels.set(q.args[0],i);if(q.op==='FUNCTION')functions.set(q.args[0],i+1);});
  function run(start,memory,args=[]){
    const regs=new Map(),params=[];
    const read=name=>{assert.ok(memory.has(name)||globals.has(name),`Uninitialized memory read ${name}`);return memory.has(name)?memory.get(name):globals.get(name);};
    const write=(name,value)=>(name.endsWith('@0')?globals:memory).set(name,value);
    for(let pc=start;pc<instructions.length;pc++){
      assert.ok(--budget>0,'VM fixture must terminate');
      const {op,args:a}=instructions[pc];
      switch(op){
        case 'LABEL':break;
        case 'DECLARE':write(a[0],undefined);break;
        case 'CONST':regs.set(a[0],JSON.parse(a[1]));break;
        case 'LOAD':regs.set(a[0],read(a[1]));break;
        case 'STORE':write(a[0],regs.get(a[1]));break;
        case 'MOVE':regs.set(a[0],regs.get(a[1]));break;
        case 'ARG':regs.set(a[0],args[Number(a[1])]);break;
        case 'PARAM':params.push(regs.get(a[0]));break;
        case 'PRINT':output.push(regs.get(a[0]));break;
        case 'JMP':pc=labels.get(a[0]);break;
        case 'JZ':if(!regs.get(a[0]))pc=labels.get(a[1]);break;
        case 'JNZ':if(regs.get(a[0]))pc=labels.get(a[1]);break;
        case 'CALL':{
          assert.ok(functions.has(a[1]),'Fixture must have a function body');
          const values=params.splice(params.length-Number(a[2]),Number(a[2]));
          const value=run(functions.get(a[1]),new Map(),values);regs.clear();regs.set(a[0],value);break;
        }
        case 'RET':return a.length?regs.get(a[0]):undefined;
        case 'HALT':case 'END':return;
        case 'UNARY':{
          const v=regs.get(a[2]);const f={'+':()=>+v,'-':()=>-v,'!':()=>+!v,'~':()=>~v,bool:()=>+!!v};
          assert.ok(f[a[1]]);regs.set(a[0],f[a[1]]());break;
        }
        case 'BINARY':{
          const x=regs.get(a[2]),y=regs.get(a[3]);const f={'+':()=>x+y,'-':()=>x-y,'*':()=>x*y,'/':()=>x/y,'%':()=>x%y,
            '<':()=>+(x<y),'<=':()=>+(x<=y),'>':()=>+(x>y),'>=':()=>+(x>=y),'==':()=>+(x===y),'!=':()=>+(x!==y),
            '&':()=>x&y,'|':()=>x|y,'^':()=>x^y,'<<':()=>x<<y,'>>':()=>x>>y};assert.ok(f[a[1]]);regs.set(a[0],f[a[1]]());break;
        }
        default:throw new Error(`Unknown VM instruction ${op}`);
      }
    }
  }
  run(0,globals);return output;
}
const fixtures=[
  ['arithmetic register pressure','int a=3,b=4,c=5,d=6;int left=(a+b)*(c+d);int right=a*c+b*d;print(left+right);',[116]],
  ['shadowed declarations','int x=1;{int x=2;print(x);}print(x);',[2,1]],
  ['branch join','int x=0;if(true)x=3;else x=9;print(x);',[3]],
  ['for continue','int x=0;for(int i=0;i<5;i++){if(i==2)continue;x+=i;}print(x);',[8]],
  ['nested loops break','int x=0;for(int i=0;i<3;i++){while(true){x++;break;}}print(x);',[3]],
  ['do while continue','int x=0;do{x++;continue;}while(x<3);print(x);',[3]],
  ['short circuit side effect','int x=0;bool a=false&&++x;bool b=true||++x;print(x);print(a);print(b);',[0,0,1]],
  ['conditional branch value','int x=1;int y=false?x++:++x;print(x+y);',[4]],
  ['operand snapshots','int x=2;int y=x+x++;x+=x++;print(y);print(x);',[4,6]],
  ['function arguments','int sub(int a,int b){return a-b;}int x=2;print(sub(x,x++));print(x);',[0,3]],
  ['recursive function frames','int fact(int n){if(n<=1)return 1;return n*fact(n-1);}print(fact(6));',[720]],
  ['global changes invalidate call caches','int x=1;void inc(void){x+=3;return;}print(x);inc();print(x);',[1,4]],
  ['nested calls','int add(int a,int b){return a+b;}print(add(1,add(2,3)));',[6]],
  ['strings and booleans','string x="text@home";bool y=true;print(x);print(!y);',['text@home',0]],
  ['bitwise and unary','int x=(5<<2)|3;x^=1;print(~x);print(-x);',[-23,-22]],
  ['self assignment and updates','int x=1;x=x;print(x++);print(++x);',[1,3]]
];
fixtures.forEach(([name,source,expected])=>test(name,()=>{
  const r=compile(source);assert.ok(r.ir,JSON.stringify(r.diagnostics));
  for(const mode of ['ir','optimized'])for(const registers of [3,4,6]){
    const target=SyntaxBackend.generate(r[mode].code,registers);assert.deepEqual(execute(target.instructions),expected,`${name}/${mode}/${registers}`);
    assert.ok(target.allocation.length);assert.ok(target.instructions.every(q=>q.tac>=1&&q.tac<=r[mode].code.length));
  }
}));
test('liveness solves loop fixed point',()=>{
  const q=(op,arg1='',arg2='',result='')=>({op,arg1,arg2,result,section:'global'});
  const f=SyntaxBackend.dataFlow([q('copy','1','','x@1'),q('label','','','L1'),q('+','x@1','1','%t1'),q('copy','%t1','','x@1'),q('ifTrue','x@1','','L1'),q('print','x@1'),q('halt')]);
  assert.deepEqual(f.blocks[0].liveOut,['x@1']);assert.deepEqual(f.blocks[1].liveIn,['x@1']);assert.deepEqual(f.blocks[1].liveOut,['x@1']);assert.ok(f.iterations>=2);
  assert.equal(f.nextUse[0].after['x@1'],'exit');assert.equal(f.nextUse[2].after['%t1'],4);
});
test('globals conservatively live across calls',()=>{const r=compile('int x=1;void f(void){print(x);}f();');const f=SyntaxBackend.dataFlow(r.ir.code);const call=r.ir.code.findIndex(q=>q.op==='call');assert.ok(SyntaxBackend.operands(r.ir.code[call],f.globals).use.includes('x@0'));});
test('allocator really evicts registers under pressure',()=>{const r=compile(fixtures[0][1]);const t=SyntaxBackend.generate(r.ir.code,3);assert.ok(t.stats.evictions>0);assert.ok(t.stats.stores>0);assert.ok(t.allocation.some(x=>x.event.includes('evicts')));});
test('invalid register count rejected',()=>assert.throws(()=>SyntaxBackend.generate(compile('print(1);').ir.code,2)));
test('oversized IR rejected with limit',()=>assert.throws(()=>SyntaxBackend.dataFlow(Array(2001).fill({op:'halt'})),/2,000/));
console.log(`ALL ${count} BACKEND TESTS PASSED`);
