import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
    createWatchIgnorePredicate,
    DEFAULT_WATCH_IGNORE_GLOBS,
    resolveWatchIgnoreGlobs,
} from '../src/lib/sync-ignore.js';

test('defaults include .git and node_modules globs', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jinks-watch-'));
    const { fromConfig, globs } = resolveWatchIgnoreGlobs(tmp);
    assert.equal(fromConfig, false);
    assert.deepEqual(globs, DEFAULT_WATCH_IGNORE_GLOBS);
});

test('loads sync.ignore from .existdb.json and prepends .git/**', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jinks-watch-'));
    fs.writeFileSync(
        path.join(tmp, '.existdb.json'),
        JSON.stringify({
            sync: { ignore: ['.vscode/**', 'custom/**'] },
        }),
    );
    const { fromConfig, globs } = resolveWatchIgnoreGlobs(tmp);
    assert.equal(fromConfig, true);
    assert.equal(globs[0], '.git/**');
    assert.ok(globs.includes('.vscode/**'));
    assert.ok(globs.includes('custom/**'));
});

test('createWatchIgnorePredicate matches .git/** and configured files', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jinks-watch-'));
    fs.writeFileSync(
        path.join(tmp, '.existdb.json'),
        JSON.stringify({
            sync: { ignore: ['.env', 'components/**'] },
        }),
    );
    const { globs } = resolveWatchIgnoreGlobs(tmp);
    const pred = createWatchIgnorePredicate(tmp, globs);
    assert.equal(pred(path.join(tmp, '.git', 'HEAD')), true);
    assert.equal(pred(path.join(tmp, '.env')), true);
    assert.equal(pred(path.join(tmp, 'components', 'x', 'y')), true);
    assert.equal(pred(path.join(tmp, 'src', 'app.xml')), false);
});

test('missing sync.ignore uses defaults', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jinks-watch-'));
    fs.writeFileSync(path.join(tmp, '.existdb.json'), JSON.stringify({ servers: {} }));
    const { fromConfig, globs } = resolveWatchIgnoreGlobs(tmp);
    assert.equal(fromConfig, false);
    assert.deepEqual(globs, DEFAULT_WATCH_IGNORE_GLOBS);
});
