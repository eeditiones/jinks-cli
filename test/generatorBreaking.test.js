import { test } from 'node:test';
import assert from 'node:assert';
import { isGeneratorBlockedByBreakingChanges } from '../src/lib/generator.js';

test('isGeneratorBlockedByBreakingChanges is true when server requests CONFIRM', () => {
    assert.equal(
        isGeneratorBlockedByBreakingChanges({
            nextStep: { action: 'CONFIRM', message: 'blocked' },
            'version-check': { 'has-breaking-changes': true, 'breaking-profiles': { p: { installed: '1.0.0', new: '2.0.0' } } },
        }),
        true,
    );
});

test('isGeneratorBlockedByBreakingChanges is false without breaking flag', () => {
    assert.equal(
        isGeneratorBlockedByBreakingChanges({
            nextStep: { action: 'DEPLOY' },
            'version-check': { 'has-breaking-changes': false },
        }),
        false,
    );
});

test('isGeneratorBlockedByBreakingChanges is false when has-breaking-changes but action not CONFIRM', () => {
    assert.equal(
        isGeneratorBlockedByBreakingChanges({
            nextStep: { action: 'NONE' },
            'version-check': { 'has-breaking-changes': true },
        }),
        false,
    );
});
