# `jinks create [abbrev]`

Create a new application. If no abbreviation is provided, you are prompted to enter one and
to choose the profiles (blueprint, features, theme) the application should be built from.

```bash
jinks create my-app
```

After the configuration is collected, the Jinks generator runs and the application is
installed on the server. A link to the new application is printed on success.

## Arguments

- `[abbrev]` — Abbreviated name of the application to create. When omitted, you are prompted
  for it interactively.

## Options

- `-s, --server <address>` — Server address. Defaults to `http://localhost:8080/exist/apps/jinks` (or `$JINKS_SERVER`).
- `-u, --user <username>` — Username. Defaults to `tei` (or `$JINKS_USER`).
- `-p, --password <password>` — Password. Defaults to `simple` (or `$JINKS_PASSWORD`).
- `-e, --edit` — Use a text editor rather than interactive prompts to modify the
  configuration.
- `-q, --quiet` — Do not print the banner.
- `-c, --config <file>` — Use the given configuration file rather than interactive mode to
  create the application. Implies `--quiet`.

## Examples

Create interactively, choosing the abbreviation and profiles through prompts:

```bash
jinks create
```

Create with a specific abbreviation:

```bash
jinks create my-tei-app
```

Create non-interactively from a configuration file:

```bash
jinks create --config ./config.json
```
