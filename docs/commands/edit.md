# `jinks edit [abbrev]`

Change the configuration of an existing application. If no application is provided, you are
prompted to select from the installed applications. After editing, the application is
updated by running the generator.

```bash
jinks edit my-app
```

## Arguments

- `[abbrev]` — Application to edit. When omitted, you are prompted to select an installed
  application.

## Options

- `-s, --server <address>` — Server address. Defaults to `http://localhost:8080/exist/apps/jinks` (or `$JINKS_SERVER`).
- `-u, --user <username>` — Username. Defaults to `tei` (or `$JINKS_USER`).
- `-p, --password <password>` — Password. Defaults to `simple` (or `$JINKS_PASSWORD`).
- `-e, --edit` — Use a text editor rather than interactive prompts to modify the
  configuration.
- `-q, --quiet` — Do not print the banner.
- `-r, --reinstall` — Fully reinstall the application, overwriting existing files.
- `-a, --all` — Ignore the last-modified date and check every file for changes.
- `-y, --confirm-breaking` — Proceed with updates that include breaking profile version
  changes without prompting (sends `confirm=true` to the generator API).

## Examples

Edit with interactive application selection:

```bash
jinks edit
```

Edit a specific application:

```bash
jinks edit my-tei-app
```

Edit in your `$EDITOR` instead of the interactive prompts:

```bash
jinks edit my-tei-app --edit
```
