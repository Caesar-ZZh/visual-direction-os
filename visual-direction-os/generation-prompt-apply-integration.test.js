const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = file => fs.readFileSync(path.join(__dirname,file),'utf8');

test('Narrative Workspace exposes Prompt Compiler read-only integration APIs', () => {
  const source = read('narrative-workspace.js');
  assert.match(source,/generationPromptCompiler/);
  assert.match(source,/generationPromptInspector/);
  assert.match(source,/generationPromptContextProvider/);
  assert.match(source,/function getGenerationPromptSet\(/);
  assert.match(source,/function recordSequenceApplyEvidence\(/);
  assert.match(source,/function syncGenerationPromptInspector\(/);
  assert.match(source,/getGenerationPromptSet/);
  assert.match(source,/recordSequenceApplyEvidence/);
  assert.match(source,/syncGenerationPromptInspector/);
});

test('Apply UI records exact guarded proposal only after Sequence Director and current Scene Apply succeed', () => {
  const source = read('narrative-apply-ui.js');
  const chooseProposal = source.indexOf('const proposalForApply = guarded ? authorityPlan.resolvedProposal : proposal;');
  const setSequence = source.indexOf('sequenceController.setSequence(nextSequence, { playhead: currentPlayhead });');
  const applyScene = source.indexOf('applySceneAtCurrentPlayhead(nextSequence);');
  const record = source.indexOf('workspace.recordSequenceApplyEvidence?.({');
  assert.ok(chooseProposal >= 0, 'Apply must choose the exact guarded proposal');
  assert.ok(setSequence > chooseProposal, 'Sequence Director mutation must follow proposal resolution');
  assert.ok(applyScene > setSequence, 'current Scene Apply must follow Sequence Director mutation');
  assert.ok(record > applyScene, 'Apply Evidence must only be recorded after both existing Apply operations succeed');
  const receiptBlock = source.slice(record, source.indexOf('});', record) + 3);
  assert.match(receiptBlock,/proposal:\s*proposalForApply/);
  assert.match(receiptBlock,/sequence:\s*nextSequence/);
  assert.match(receiptBlock,/beatIds/);
});

test('selected Apply uses the exact current selection and guarded mode never records raw proposal', () => {
  const source = read('narrative-apply-ui.js');
  assert.match(source,/const beatIds = mode === 'all' \? beats\.map\(beat => beat\.id\) : beats\.map\(beat => beat\.id\)\.filter\(id => selected\.has\(id\)\);/);
  assert.match(source,/proposalForApply = guarded \? authorityPlan\.resolvedProposal : proposal/);
  assert.doesNotMatch(source,/recordSequenceApplyEvidence\?\.\(\{\s*proposal:\s*proposal,/s);
});

test('receipt failure is surfaced without inventing rollback or generation authority', () => {
  const source = read('narrative-apply-ui.js');
  assert.match(source,/PROMPT AUTHORITY · RECEIPT FAILED/);
  assert.match(source,/Prompt generation authority remains unavailable/);
  assert.doesNotMatch(source,/rollbackSequenceApply|rollbackSceneApply/);
});

test('Prompt Inspector re-evaluates readiness when current Scene State changes after Apply', () => {
  const source = read('generation-prompt-inspector.js');
  assert.match(source,/vdos:scene-state/);
  assert.match(source,/addEventListener/);
  assert.match(source,/removeEventListener/);
});

test('Prompt Inspector re-evaluates current M7 authority when Project Store changes', () => {
  const source = read('generation-prompt-inspector.js');
  assert.match(source,/VDOSProjectContext\?\.store\?\.subscribe/);
  assert.match(source,/unsubscribeProject/);
  assert.match(source,/unsubscribeProject\?\.\(\)/);
});
