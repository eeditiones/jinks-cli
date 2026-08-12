import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { collectFilesFromActionOutput, syncActionFiles } from '../src/commands/run.js';

test('collectFilesFromActionOutput merges files from message array', () => {
    const files = collectFilesFromActionOutput([
        {
            type: 'action:fix-odds',
            message: 'recreated pm-config.xql',
            files: { 'modules/pm-config.xql': 'module ns;' },
        },
        {
            type: 'update',
            message: 'tei-web.xql',
        },
        { type: 'update', message: 'no files' },
    ]);
    assert.deepEqual(files, {
        'modules/pm-config.xql': 'module ns;',
    });
});

test('collectFilesFromActionOutput accepts a single message object', () => {
    const files = collectFilesFromActionOutput({
        type: 'action:fix-odds',
        message: 'recreated pm-config.xql',
        files: { 'modules/pm-config.xql': 'code' },
    });
    assert.deepEqual(files, { 'modules/pm-config.xql': 'code' });
});

test('collectFilesFromActionOutput ignores non-string entries', () => {
    const files = collectFilesFromActionOutput([
        {
            files: {
                'ok.xql': 'yes',
                nested: { nope: true },
                empty: null,
            },
        },
    ]);
    assert.deepEqual(files, { 'ok.xql': 'yes' });
});

test('syncActionFiles writes nested paths under targetDir', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jinks-run-sync-'));
    try {
        const { written, errors } = syncActionFiles(
            {
                'modules/pm-config.xql': 'pm',
            },
            dir,
        );
        assert.deepEqual(written, ['modules/pm-config.xql']);
        assert.equal(errors.length, 0);
        assert.equal(fs.readFileSync(path.join(dir, 'modules/pm-config.xql'), 'utf8'), 'pm');
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});
