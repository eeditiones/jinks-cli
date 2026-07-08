import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import AdmZip from 'adm-zip';
import { createWatchIgnorePredicate, resolvePackageIgnoreGlobs } from './sync-ignore.js';

/**
 * Read `abbrev` and `version` from an app's `expath-pkg.xml`. Mirrors the
 * regex-based parsing used for `repo.xml` in the watch command.
 * @returns {{ abbrev: string, version: string }}
 */
export function parseExpathPkg(dir) {
    const pkgPath = path.join(dir, 'expath-pkg.xml');
    if (!fs.existsSync(pkgPath)) {
        throw new Error(`No expath-pkg.xml found in ${dir}`);
    }
    const content = fs.readFileSync(pkgPath, 'utf8');
    const abbrev = content.match(/\babbrev\s*=\s*"([^"]+)"/)?.[1];
    const version = content.match(/\bversion\s*=\s*"([^"]+)"/)?.[1];
    if (!abbrev) {
        throw new Error('No abbrev attribute found in expath-pkg.xml');
    }
    if (!version) {
        throw new Error('No version attribute found in expath-pkg.xml');
    }
    return { abbrev, version };
}

/**
 * Recursively collect absolute file paths under `dir`, pruning any directory or
 * file for which `isIgnored(absPath)` returns true.
 * @returns {string[]}
 */
export function collectFiles(dir, isIgnored) {
    const files = [];
    const walk = (current) => {
        for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
            const abs = path.join(current, entry.name);
            if (isIgnored(abs)) continue;
            if (entry.isDirectory()) {
                walk(abs);
            } else if (entry.isFile()) {
                files.push(abs);
            }
        }
    };
    walk(dir);
    return files;
}

/**
 * Build a `.xar` (plain ZIP) of the app directory, reproducing the default Ant
 * `all` target: everything except the built-in and `.existdb.json`-configured
 * excludes, with entries relative to the app root (no wrapping folder).
 * @param {string} dir app directory
 * @param {{ output?: string }} [options]
 * @returns {{ output: string, fileCount: number, abbrev: string, version: string }}
 */
export function buildXar(dir, options = {}) {
    const root = path.resolve(dir);
    if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
        throw new Error(`Not a directory: ${root}`);
    }

    const { abbrev, version } = parseExpathPkg(root);
    const { globs } = resolvePackageIgnoreGlobs(root);
    const isIgnored = createWatchIgnorePredicate(root, globs);

    const output = options.output
        ? path.resolve(options.output)
        : path.join(root, 'build', `${abbrev}-${version}.xar`);
    fs.mkdirSync(path.dirname(output), { recursive: true });

    // The output file may live inside the tree; never package it into itself.
    const outputAbs = output;

    const files = collectFiles(root, isIgnored).filter((abs) => abs !== outputAbs);

    const zip = new AdmZip();
    for (const abs of files) {
        const relDir = path.relative(root, path.dirname(abs)).split(path.sep).join('/');
        zip.addLocalFile(abs, relDir);
    }
    zip.writeZip(output);

    return { output, fileCount: files.length, abbrev, version };
}

/**
 * True when the app ships a `build.cjs` and a `build` script in `package.json`,
 * i.e. it carries its own Node-based build we should prefer.
 */
function hasNodeBuildScript(root) {
    if (!fs.existsSync(path.join(root, 'build.cjs'))) {
        return false;
    }
    const pkgPath = path.join(root, 'package.json');
    if (!fs.existsSync(pkgPath)) {
        return false;
    }
    try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        return Boolean(pkg.scripts && typeof pkg.scripts.build === 'string');
    } catch {
        return false;
    }
}

/**
 * True when Apache Ant is on the PATH and can actually run (`ant -version`).
 */
function antAvailable() {
    try {
        execFileSync('ant', ['-version'], { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

/**
 * Report which build strategies are viable for an app directory. The built-in
 * `node` packager is always viable, so only the two conditional ones are
 * reported here.
 * @returns {{ npm: boolean, ant: boolean }}
 */
export function detectBuildStrategies(root) {
    return {
        npm: hasNodeBuildScript(path.resolve(root)),
        ant: antAvailable(),
    };
}

/**
 * Pick the build strategy for an app directory, in order of preference:
 *   1. `npm`  — the app's own `build` script (needs `build.cjs` + package.json `build`)
 *   2. `ant`  — Apache Ant, if installed and working
 *   3. `node` — the built-in {@link buildXar} packager (always available)
 * @returns {'npm' | 'ant' | 'node'}
 */
export function detectBuildStrategy(root) {
    const { npm, ant } = detectBuildStrategies(root);
    if (npm) {
        return 'npm';
    }
    if (ant) {
        return 'ant';
    }
    return 'node';
}

/**
 * Package an app into a `.xar`, delegating to the app's own build when possible
 * and falling back to the built-in packager. All strategies write
 * `build/<abbrev>-<version>.xar`; when `output` is given the archive is copied
 * there afterwards.
 * @param {string} dir app directory
 * @param {{ output?: string, strategy?: 'npm' | 'ant' | 'node' }} [options]
 * @returns {{ output: string, fileCount: number, abbrev: string, version: string, strategy: string }}
 */
export function packageApp(dir, options = {}) {
    const root = path.resolve(dir);
    if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
        throw new Error(`Not a directory: ${root}`);
    }

    const strategy = options.strategy ?? detectBuildStrategy(root);
    if (strategy === 'node') {
        return { ...buildXar(root, options), strategy };
    }

    const { abbrev, version } = parseExpathPkg(root);
    if (strategy === 'npm') {
        execFileSync('npm', ['install'], { cwd: root, stdio: 'inherit' });
        execFileSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit' });
    } else {
        execFileSync('ant', [], { cwd: root, stdio: 'inherit' });
    }

    const produced = path.join(root, 'build', `${abbrev}-${version}.xar`);
    if (!fs.existsSync(produced)) {
        throw new Error(
            `${strategy} build did not produce the expected archive: ${produced}`,
        );
    }

    let output = produced;
    if (options.output) {
        output = path.resolve(options.output);
        if (output !== produced) {
            fs.mkdirSync(path.dirname(output), { recursive: true });
            fs.copyFileSync(produced, output);
        }
    }

    const fileCount = new AdmZip(output)
        .getEntries()
        .filter((entry) => !entry.isDirectory)
        .length;

    return { output, fileCount, abbrev, version, strategy };
}
