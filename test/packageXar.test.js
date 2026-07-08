import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import AdmZip from 'adm-zip';
import {
    PACKAGE_DEFAULT_IGNORE_GLOBS,
    resolvePackageIgnoreGlobs,
} from '../src/lib/sync-ignore.js';
import { parseExpathPkg, buildXar, detectBuildStrategy, packageApp } from '../src/lib/xar.js';

function tmpDir() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'jinks-package-'));
}

function writeFile(dir, rel, content) {
    const abs = path.join(dir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content);
}

test('resolvePackageIgnoreGlobs returns built-in defaults without .existdb.json', () => {
    const tmp = tmpDir();
    const { fromConfig, globs } = resolvePackageIgnoreGlobs(tmp);
    assert.equal(fromConfig, false);
    assert.deepEqual(globs, PACKAGE_DEFAULT_IGNORE_GLOBS);
});

test('resolvePackageIgnoreGlobs unions sync.ignore onto defaults', () => {
    const tmp = tmpDir();
    fs.writeFileSync(
        path.join(tmp, '.existdb.json'),
        JSON.stringify({ sync: { ignore: ['custom/**', 'node_modules/**'] } }),
    );
    const { fromConfig, globs } = resolvePackageIgnoreGlobs(tmp);
    assert.equal(fromConfig, true);
    // defaults are preserved
    assert.ok(globs.includes('build/**'));
    assert.ok(globs.includes('.existdb.json'));
    // user extra is added
    assert.ok(globs.includes('custom/**'));
    // no duplication of a glob already in defaults
    assert.equal(globs.filter((g) => g === 'node_modules/**').length, 1);
});

test('parseExpathPkg extracts abbrev and version', () => {
    const tmp = tmpDir();
    writeFile(
        tmp,
        'expath-pkg.xml',
        '<package xmlns="http://expath.org/ns/pkg" name="http://x/foo" abbrev="foo" version="1.2.3" spec="1.0"/>',
    );
    assert.deepEqual(parseExpathPkg(tmp), { abbrev: 'foo', version: '1.2.3' });
});

test('parseExpathPkg throws when expath-pkg.xml is missing', () => {
    const tmp = tmpDir();
    assert.throws(() => parseExpathPkg(tmp), /No expath-pkg\.xml/);
});

test('buildXar zips included files and excludes dev/build files', () => {
    const tmp = tmpDir();
    writeFile(tmp, 'expath-pkg.xml', '<package abbrev="myapp" version="0.9.0"/>');
    writeFile(tmp, 'modules/config.xqm', 'xquery version "3.1";');
    writeFile(tmp, 'data/doc.xml', '<TEI/>');
    // excluded by defaults
    writeFile(tmp, 'node_modules/foo/index.js', 'x');
    writeFile(tmp, 'build/old.xar', 'x');
    writeFile(tmp, 'package.json', '{}');
    writeFile(tmp, 'README.md', '# x');
    writeFile(tmp, 'expath-pkg.xml.tmpl', '<meta/>');
    // excluded via .existdb.json sync.ignore
    writeFile(tmp, '.existdb.json', JSON.stringify({ sync: { ignore: ['secret/**'] } }));
    writeFile(tmp, 'secret/key.txt', 'shh');

    const { output, fileCount, abbrev, version } = buildXar(tmp);

    assert.equal(abbrev, 'myapp');
    assert.equal(version, '0.9.0');
    assert.equal(output, path.join(tmp, 'build', 'myapp-0.9.0.xar'));
    assert.ok(fs.existsSync(output));

    const entries = new AdmZip(output)
        .getEntries()
        .filter((e) => !e.isDirectory)
        .map((e) => e.entryName)
        .sort();

    assert.deepEqual(entries, ['data/doc.xml', 'expath-pkg.xml', 'modules/config.xqm']);
    assert.equal(fileCount, 3);
});

test('detectBuildStrategy prefers npm when build.cjs and a build script exist', () => {
    const tmp = tmpDir();
    writeFile(tmp, 'build.cjs', 'process.exit(0)');
    writeFile(tmp, 'package.json', JSON.stringify({ scripts: { build: 'node build.cjs' } }));
    assert.equal(detectBuildStrategy(tmp), 'npm');
});

test('detectBuildStrategy ignores build.cjs without a build script', () => {
    const tmp = tmpDir();
    writeFile(tmp, 'build.cjs', 'process.exit(0)');
    writeFile(tmp, 'package.json', JSON.stringify({ scripts: { test: 'x' } }));
    // No build script → falls through to ant/node, never npm.
    assert.notEqual(detectBuildStrategy(tmp), 'npm');
});

test('detectBuildStrategy ignores a build script without build.cjs', () => {
    const tmp = tmpDir();
    writeFile(tmp, 'package.json', JSON.stringify({ scripts: { build: 'node build.cjs' } }));
    assert.notEqual(detectBuildStrategy(tmp), 'npm');
});

test('packageApp with the node strategy matches buildXar', () => {
    const tmp = tmpDir();
    writeFile(tmp, 'expath-pkg.xml', '<package abbrev="myapp" version="0.9.0"/>');
    writeFile(tmp, 'modules/config.xqm', 'xquery version "3.1";');

    const { output, fileCount, strategy } = packageApp(tmp, { strategy: 'node' });
    assert.equal(strategy, 'node');
    assert.equal(fileCount, 2);
    assert.equal(output, path.join(tmp, 'build', 'myapp-0.9.0.xar'));
    assert.ok(fs.existsSync(output));
});

test('buildXar honours a custom --output path', () => {
    const tmp = tmpDir();
    writeFile(tmp, 'expath-pkg.xml', '<package abbrev="a" version="1.0.0"/>');
    writeFile(tmp, 'index.xql', 'x');
    const out = path.join(tmp, 'dist', 'custom.xar');

    const { output } = buildXar(tmp, { output: out });
    assert.equal(output, out);
    assert.ok(fs.existsSync(out));
});
