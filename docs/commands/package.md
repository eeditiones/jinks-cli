# `jinks package [dir]`

Package a Jinks-generated application into an installable `.xar`. Prefers the application's own build tooling if available, but will fall back to a simple packager if not.

```bash
jinks package
jinks package ./my-app
```

The archive is written to `build/<abbrev>-<version>.xar`, where `abbrev` and `version` are read
from `expath-pkg.xml`. `jinks xar` is an alias for the same command.

## Build strategy

The command picks the first strategy that applies, and reports which one it used:

1. **`npm run build`** — when the directory ships a `build.cjs` **and** a `build` script in its
   `package.json`. This runs the application's own build exactly as a release would.
2. **Apache Ant** — when `ant` is on the `PATH` and runs (`ant -version` succeeds). Runs the
   default `all` target from `build.xml`.
3. **Built-in packager** — a pure-Node fallback (no Java/Ant required) that reproduces the default build: it zips the application directory minus a set of development and build files (see below).

All three write the same `build/<abbrev>-<version>.xar`; the built-in packager is described under
*Ignored paths* below.

When **both** the npm build and Apache Ant are viable, the command asks which one to use. With
`--quiet` (non-interactive) it does not prompt and uses the npm build.

## Arguments

- `[dir]` — Application directory to package. Defaults to the current working directory.

## Ignored paths

The _built-in packager_ reads a list of path patterns to ignore from a `.existdb.json` file if present in the directory. The patterns are read from the `sync.ignore` array. A minimal `.existdb.json` that excludes a
couple of extra paths looks like this:

```json
{
  "sync": {
    "ignore": [
      "drafts/**",
      "**/*.bak",
      "notes.md"
    ]
  }
}
```

Each entry is a glob (matched against the path relative to the app root); non-string or empty
entries are ignored. Any other keys in `.existdb.json` (such as eXist connection settings) are
left untouched — only `sync.ignore` affects packaging.

Built-in defaults exclude, among others: `build/`, `node_modules/`, `.git/`, `.github/`,
`.vscode/`, `.idea/`, `.devcontainer/`, `*.tmpl`, `*.properties`, `build.xml`, `README.md`,
`package*.json`, `.existdb.json`, `gulpfile.js`, Cypress screenshots/videos, `*.xar`, and
`.DS_Store`.

## Options

- `-o, --output <file>` — Output `.xar` path. Defaults to `build/<abbrev>-<version>.xar`.
- `-q, --quiet` — Do not print the banner.

## Examples

Package the current directory:

```bash
jinks package
```

Package a specific application to a custom location:

```bash
jinks package ./my-tei-app --output ./dist/my-tei-app.xar
```

The resulting `.xar` can be installed through eXist-db's package manager, exactly like the
archive produced by the Ant `build.xml`.
