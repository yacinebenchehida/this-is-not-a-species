const {test}=require('node:test');
const assert=require('node:assert/strict');
const {offspring}=require('../simulations/population-genetics/genetic-drift/family-model.js');

test('all four equally likely copy choices inherit exactly one copy from each parent',()=>{
  const first=[1,0],second=[0,1], combinations=[];
  for(const a of [0,1])for(const b of [0,1]){
    const draws=[a?.75:.25,b?.75:.25];
    const child=offspring(first,second,()=>draws.shift());
    assert.deepEqual(child.sourceCopies,[a,b]);
    assert.deepEqual(child.alleles,[first[a],second[b]]);
    combinations.push(child.alleles.join(''));
  }
  assert.deepEqual(combinations.sort(),['00','01','10','11']);
  assert.deepEqual(first,[1,0]);assert.deepEqual(second,[0,1]);
});

test('homozygous parents pass the appropriate copy for every possible draw',()=>{
  for(const draws of [[0,0],[0,.999],[.999,0],[.999,.999]]){
    const queue=[...draws];assert.deepEqual(offspring([1,1],[0,0],()=>queue.shift()).alleles,[1,0]);
  }
});

test('inheritance rejects missing, non-diploid or unknown allele inputs',()=>{
  for(const p of [[],[0],[0,0,1],[2,0],null])assert.throws(()=>offspring(p,[1,0]),TypeError);
});
