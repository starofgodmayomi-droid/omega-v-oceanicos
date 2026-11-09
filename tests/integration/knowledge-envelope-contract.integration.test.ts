import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateKnowledgeEnvelope } from '../../packages/mini/dist/index.js';

const valid = () => ({
  id:'notion:architecture:root', kind:'requirement',
  summary:'Preserve provenance and policy boundaries.', state:'SPECIFIED',
  source:{system:'notion',reference:'https://app.notion.com/example'},
  capturedAt:'2026-10-26T10:00:00.000Z', visibility:'public',
  policy:{reviewedForPublicRelease:true,containsRawSourceContent:false,sensitivity:'reviewed'},
  relations:[{type:'derived_from',targetId:'architecture-root'}],
  evidence:[{type:'source',status:'PRESENT'}],
});
const codes = (r:ReturnType<typeof validateKnowledgeEnvelope>) => r.validation==='INVALID' ? r.issues.map(x=>x.code) : [];

test('accepts reviewed sanitized envelope without claiming source truth',()=>{
  const r=validateKnowledgeEnvelope(valid());
  assert.equal(r.validation,'VALID');
  assert.equal(r.publicExportAllowed,true);
  assert.equal(r.evidence,'STRUCTURE_AND_DISCLOSURE_POLICY_ONLY');
  if(r.validation==='VALID'){assert.equal(Object.isFrozen(r.envelope),true);assert.equal(Object.isFrozen(r.envelope.policy),true);}
});
test('rejects nested raw content keys and unsupported fields',()=>{
  const r=validateKnowledgeEnvelope({...valid(),metadata:{RAW_CONTENT:'private'}});
  assert.ok(codes(r).includes('RAW_CONTENT_FIELD'));
  assert.ok(codes(r).includes('UNSUPPORTED_FIELD'));
});
test('denies public export when unreviewed or sensitivity is unknown',()=>{
  for(const policy of [
    {reviewedForPublicRelease:false,containsRawSourceContent:false,sensitivity:'reviewed'},
    {reviewedForPublicRelease:true,containsRawSourceContent:false,sensitivity:'unknown'},
  ]) {
    const r=validateKnowledgeEnvelope({...valid(),policy});
    assert.equal(r.validation,'VALID');
    if(r.validation==='VALID') assert.equal(r.publicExportAllowed,false);
  }
});
test('rejects authority-shaped fields and raw-source declaration',()=>{
  const r=validateKnowledgeEnvelope({...valid(),executionAuthority:true,policy:{reviewedForPublicRelease:true,containsRawSourceContent:true}});
  assert.ok(codes(r).includes('UNSUPPORTED_FIELD'));
  assert.ok(codes(r).includes('RAW_CONTENT_NOT_ALLOWED'));
});
test('fails closed if hostile object inspection throws',()=>{
  const hostile=new Proxy({}, {ownKeys:()=>{throw new Error('blocked')}});
  assert.ok(codes(validateKnowledgeEnvelope(hostile)).includes('INSPECTION_FAILED'));
});

test('copies and freezes optional arrays so caller mutation cannot alter validated output',()=>{
  const acceptance=['review source lineage'];
  const tags=['architecture'];
  const supersedes=['old-record'];
  const r=validateKnowledgeEnvelope({...valid(),acceptance,tags,supersedes});
  assert.equal(r.validation,'VALID');
  if(r.validation==='VALID') {
    assert.equal(Object.isFrozen(r.envelope.acceptance),true);
    assert.equal(Object.isFrozen(r.envelope.tags),true);
    assert.equal(Object.isFrozen(r.envelope.supersedes),true);
    acceptance.push('mutated');
    tags.push('mutated');
    supersedes.push('mutated');
    assert.deepEqual(r.envelope.acceptance,['review source lineage']);
    assert.deepEqual(r.envelope.tags,['architecture']);
    assert.deepEqual(r.envelope.supersedes,['old-record']);
  }
});

test('enforces date-time and tag limits aligned with the JSON Schema',()=>{
  const badTime=validateKnowledgeEnvelope({...valid(),capturedAt:'October 26, 2026'});
  assert.ok(codes(badTime).includes('INVALID_CAPTURE_TIME'));
  const badTags=validateKnowledgeEnvelope({...valid(),tags:['x'.repeat(101)]});
  assert.ok(codes(badTags).includes('INVALID_LIST'));
});
