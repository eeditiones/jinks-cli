# `jinks run [abbrev] [action]`

Run an action (for example `reindex`) on an installed application. If no action is provided,
you can pick one from the actions the application defines. If no application is provided, you
are prompted to select one.

```bash
jinks run my-app reindex
```

If the action returns a file (for example a ZIP archive), it is saved to disk; otherwise any
messages returned by the action are printed as a table.

## Arguments

- `[abbrev]` — Application to perform the action on. When omitted, you are prompted to select
  an installed application.
- `[action]` — Name of the action to run, e.g. `reindex`. When omitted, you are prompted to
  select from the application's available actions.

## Options

- `-U, --update` — Perform an update of the application before running the action.
- `-o, --output <file>` — Save the action's output to the given directory. Defaults to the
  current working directory. Only applies when the action returns a downloadable file.
- `-s, --server <address>` — Server address. Defaults to `http://localhost:8080/exist/apps/jinks` (or `$JINKS_SERVER`).
- `-u, --user <username>` — Username. Defaults to `tei` (or `$JINKS_USER`).
- `-p, --password <password>` — Password. Defaults to `simple` (or `$JINKS_PASSWORD`).
- `-y, --confirm-breaking` — When combined with `--update`, proceed with updates that include
  breaking profile version changes without prompting.

## Examples

Run an action with interactive action selection:

```bash
jinks run my-tei-app
```

Run a specific action:

```bash
jinks run my-tei-app reindex
```

Update the application first, then run the action, saving any output to `./out`:

```bash
jinks run my-tei-app export --update --output ./out
```
