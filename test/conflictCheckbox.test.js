import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import { fetchCurrentContent, formatConflictDiff } from '../src/lib/conflictCheckbox.js';

describe('formatConflictDiff', () => {
    test('marks added and removed lines', () => {
        const diff = formatConflictDiff('one\ntwo\nthree\n', 'one\ntwo changed\nthree\n');
        assert.ok(diff.includes('two'));
        assert.ok(diff.includes('two changed'));
        assert.ok(diff.includes('one'));
        assert.ok(diff.includes('three'));
    });

    test('handles empty current content (new file)', () => {
        const diff = formatConflictDiff(null, 'brand new content\n');
        assert.ok(diff.includes('brand new content'));
    });

    test('handles identical content with no changes', () => {
        const diff = formatConflictDiff('same\n', 'same\n');
        assert.ok(diff.includes('same'));
    });

    function block(prefix, count) {
        return Array.from({ length: count }, (_, i) => `${prefix}${i + 1}`).join('\n') + '\n';
    }

    test('elides a large unchanged block between two changes, keeping 10 lines on each side', () => {
        const before = block('ctx', 30);
        const current = before + 'old\n' + block('tail', 30);
        const incoming = before + 'new\n' + block('tail', 30);
        const diff = formatConflictDiff(current, incoming, 10);

        assert.ok(diff.includes('ctx21'), 'keeps the 10 lines right before the change');
        assert.ok(diff.includes('ctx30'));
        assert.ok(!diff.includes('ctx20'), 'drops context beyond 10 lines');
        assert.ok(diff.includes('tail1'), 'keeps the 10 lines right after the change');
        assert.ok(diff.includes('tail10'));
        assert.ok(!diff.includes('tail11'), 'drops context beyond 10 lines');
        assert.match(diff, /\d+ unchanged lines/);
    });

    test('elides a large leading unchanged block, keeping only the trailing context', () => {
        const current = block('ctx', 30) + 'old\n';
        const incoming = block('ctx', 30) + 'new\n';
        const diff = formatConflictDiff(current, incoming, 10);

        assert.ok(diff.includes('ctx21'));
        assert.ok(!diff.includes('ctx20'));
        assert.match(diff, /\d+ unchanged lines/);
    });

    test('elides a large trailing unchanged block, keeping only the leading context', () => {
        const current = 'old\n' + block('ctx', 30);
        const incoming = 'new\n' + block('ctx', 30);
        const diff = formatConflictDiff(current, incoming, 10);

        assert.ok(diff.includes('ctx10'));
        assert.ok(!diff.includes('ctx11'));
        assert.match(diff, /\d+ unchanged lines/);
    });

    test('does not elide small unchanged blocks', () => {
        const current = block('ctx', 5) + 'old\n' + block('tail', 5);
        const incoming = block('ctx', 5) + 'new\n' + block('tail', 5);
        const diff = formatConflictDiff(current, incoming, 10);

        assert.ok(diff.includes('ctx1'));
        assert.ok(diff.includes('tail5'));
        assert.ok(!diff.includes('unchanged line'));
    });
});

describe('fetchCurrentContent', () => {
    test('returns decoded text on success', async () => {
        const client = {
            get: async (url, opts) => {
                assert.equal(url, '/api/source');
                assert.equal(opts.params.path, '/db/apps/demo/pages/index.html');
                return { status: 200, data: Buffer.from('hello world', 'utf-8') };
            },
        };
        const content = await fetchCurrentContent(client, { source: '/db/apps/demo/pages/index.html' });
        assert.equal(content, 'hello world');
    });

    test('returns null on non-200 response', async () => {
        const client = { get: async () => ({ status: 404, data: Buffer.from('') }) };
        const content = await fetchCurrentContent(client, { source: '/db/apps/demo/missing.html' });
        assert.equal(content, null);
    });

    test('returns null when the request throws', async () => {
        const client = { get: async () => { throw new Error('network error'); } };
        const content = await fetchCurrentContent(client, { source: '/db/apps/demo/broken.html' });
        assert.equal(content, null);
    });
});
