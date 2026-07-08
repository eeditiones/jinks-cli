import fs from 'fs';
import path from 'path';
import picomatch from 'picomatch';

/** Used when `.existdb.json` is missing or has no `sync.ignore` array. */
export const DEFAULT_WATCH_IGNORE_GLOBS = [
    '.git/**',
    'node_modules/**',
    'build/**',
    '**/.DS_Store',
    '**/*.xar',
];

/**
 * Built-in excludes for `jinks package`, mirroring the `prepare` target of the
 * Ant `build.tpl.xml` so the Node-built `.xar` matches `ant all`. Any
 * `.existdb.json` `sync.ignore` globs are added on top of these (see
 * {@link resolvePackageIgnoreGlobs}).
 */
export const PACKAGE_DEFAULT_IGNORE_GLOBS = [
    'build/**',
    '*.code-workspace',
    '.devcontainer/**',
    '**/.git/**',
    // Ant's default fileset excludes strip these too; match for parity.
    '**/.gitignore',
    '**/.gitattributes',
    '.github/**',
    '**/.idea/**',
    '.vscode/**',
    '*.tmpl',
    '*.properties',
    'build.xml',
    'README.md',
    'node_modules/**',
    'package*.json',
    '.existdb.json',
    'gulpfile.js',
    'test/cypress/screenshots/**',
    'test/cypress/videos/**',
    '**/*.xar',
    '**/.DS_Store',
];

/**
 * Read `sync.ignore` glob list from `.existdb.json` in watchDir.
 * @returns {string[] | null} `null` if the file or `sync.ignore` is absent; otherwise filtered patterns.
 */
export function readExistDbSyncIgnore(watchDir) {
    const configPath = path.join(watchDir, '.existdb.json');
    if (!fs.existsSync(configPath)) {
        return null;
    }
    try {
        const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (data == null || typeof data.sync !== 'object' || data.sync === null) {
            return null;
        }
        if (!Array.isArray(data.sync.ignore)) {
            return null;
        }
        return data.sync.ignore.filter((entry) => typeof entry === 'string' && entry.length > 0);
    } catch {
        return null;
    }
}

/**
 * Resolve ignore globs: `.existdb.json` `sync.ignore` when present (plus mandatory `.git/**`),
 * otherwise {@link DEFAULT_WATCH_IGNORE_GLOBS}.
 * @returns {{ fromConfig: boolean, globs: string[] }}
 */
export function resolveWatchIgnoreGlobs(watchDir) {
    const user = readExistDbSyncIgnore(watchDir);
    if (user === null) {
        return { fromConfig: false, globs: [...DEFAULT_WATCH_IGNORE_GLOBS] };
    }
    return { fromConfig: true, globs: ['.git/**', ...user] };
}

/**
 * Resolve ignore globs for packaging: {@link PACKAGE_DEFAULT_IGNORE_GLOBS} plus
 * any `.existdb.json` `sync.ignore` entries (union, not replace, so essential
 * excludes are never dropped).
 * @returns {{ fromConfig: boolean, globs: string[] }}
 */
export function resolvePackageIgnoreGlobs(dir) {
    const user = readExistDbSyncIgnore(dir);
    if (user === null) {
        return { fromConfig: false, globs: [...PACKAGE_DEFAULT_IGNORE_GLOBS] };
    }
    const extra = user.filter((glob) => !PACKAGE_DEFAULT_IGNORE_GLOBS.includes(glob));
    return { fromConfig: true, globs: [...PACKAGE_DEFAULT_IGNORE_GLOBS, ...extra] };
}

/**
 * Predicate for chokidar `ignored`: paths are absolute; matching is done on posix relative path from watchDir.
 * @param {string[]} [globs] resolved globs; if omitted, reads `.existdb.json` again.
 */
export function createWatchIgnorePredicate(watchDir, globs) {
    const list = globs ?? resolveWatchIgnoreGlobs(watchDir).globs;
    const matcher = picomatch(list, { dot: true, bash: true });
    return (absPath) => {
        let rel = path.relative(watchDir, absPath);
        if (rel === '') {
            return false;
        }
        rel = rel.split(path.sep).join('/');
        return matcher(rel);
    };
}
