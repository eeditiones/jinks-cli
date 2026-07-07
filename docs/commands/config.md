# `jinks config [abbrev]`

Print the configuration of an installed application as JSON. If no application is provided,
you are prompted to select one.

```bash
jinks config my-app
```

By default the stored configuration is printed. With `--expand`, the configuration is
expanded by the server (resolving inherited profiles and defaults) before it is printed.

## Arguments

- `[abbrev]` — Application to get the configuration for. When omitted, you are prompted to
  select an installed application.

## Options

- `-x, --expand` — Show the expanded configuration.
- `-s, --server <address>` — Server address. Defaults to `http://localhost:8080/exist/apps/jinks` (or `$JINKS_SERVER`).
- `-u, --user <username>` — Username. Defaults to `tei` (or `$JINKS_USER`).
- `-p, --password <password>` — Password. Defaults to `simple` (or `$JINKS_PASSWORD`).

## Examples

Print the stored configuration:

```bash
jinks config my-tei-app
```

Save the server's current configuration to a file (useful before running
[`jinks update --config`](/commands/update)):

```bash
jinks config my-tei-app > config.json
```

Show the fully expanded configuration:

```bash
jinks config my-tei-app --expand
```
