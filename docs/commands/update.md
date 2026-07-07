# `jinks update [abbrev]`

Update an existing application by re-running the Jinks generator. If no application is
provided, you are prompted to select from the installed applications.

```bash
jinks update my-app
```

The generator regenerates the application from its stored configuration and reports which
files were updated, added, or are in conflict. Conflicts can be resolved interactively.

## Arguments

- `[abbrev]` — Application to update. When omitted, you are prompted to select an installed
  application. Ignored when `--config` is used, since the configuration then comes from the
  file or stdin.

## Options

- `-s, --server <address>` — Server address. Defaults to `http://localhost:8080/exist/apps/jinks` (or `$JINKS_SERVER`).
- `-u, --user <username>` — Username. Defaults to `tei` (or `$JINKS_USER`).
- `-p, --password <password>` — Password. Defaults to `simple` (or `$JINKS_PASSWORD`).
- `-q, --quiet` — Do not print the banner.
- `-r, --reinstall` — Fully reinstall the application, overwriting existing files.
- `-a, --all` — Ignore the last-modified date and check every file for changes.
- `--sync` — Sync updated files back to the local directory (see below). Implies `--all`.
- `-c, --config [path]` — Overwrite the app's `config.json` with the given file before
  updating. If no path is given, `config.json` is read from stdin.
- `-y, --confirm-breaking` — Proceed with updates that include breaking profile version
  changes without prompting (sends `confirm=true` to the generator API).

## `--sync`

With `--sync`, the files the generator reports as changed in this run are downloaded into
the current working directory, so your local copy matches the server. In addition to those
changed files, `.jinks.json` and `context.json` are **always** synced.

`--sync` implies `--all`, so every file is checked for changes rather than only those newer
than the last-modified date. This ensures the local copy is complete instead of reflecting
just an incremental diff.

::: warning `--sync` does not pull `config.json`
`config.json` is the *input* to the generator, not one of its generated outputs, so it is
not downloaded by `--sync` — even if it changed on the server. Only files the generator
reports as updated (plus the two files above) are synced. To fetch the server's current
configuration, use [`jinks config`](/commands/config) and redirect it to a file.
:::

## `-c, --config`

Use `--config` to push a new `config.json` to the application as part of the update. This is
useful in scripts and CI where the configuration is generated or version-controlled outside
the CLI.

- Give a path to read the configuration from a file.
- Omit the path to read the configuration from **stdin**.

## Examples

Update, ignoring last-modified dates so every file is checked:

```bash
jinks update my-tei-app --all
```

Update and sync the changed files back to the local directory:

```bash
jinks update my-tei-app --sync
```

Overwrite the app's `config.json` while updating:

```bash
jinks update my-tei-app --config ./config.json
```

Pipe the configuration in via stdin:

```bash
cat config.json | jinks update my-tei-app --config
```
