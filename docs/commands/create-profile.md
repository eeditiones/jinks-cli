# `jinks create-profile [abbrev]`

Create a new profile and save it to a directory. A profile is a reusable building block —
a blueprint, feature, or theme. Once the resulting package is built (with `ant`) and
installed into the database, it appears within Jinks as a profile that users can select to
extend their applications.

```bash
jinks create-profile my-feature
```

## Profile types

When creating a profile you choose one of three types:

- **Blueprint** — base configuration for an application.
- **Feature** — a reusable functionality module.
- **Theme** — styling and appearance configuration.

## Arguments

- `[abbrev]` — Name of the profile to create. When omitted, you are prompted for it.

## Options

- `-s, --server <address>` — Server address. Defaults to `http://localhost:8080/exist/apps/jinks` (or `$JINKS_SERVER`).
- `-u, --user <username>` — Username. Defaults to `tei` (or `$JINKS_USER`).
- `-p, --password <password>` — Password. Defaults to `simple` (or `$JINKS_PASSWORD`).
- `-o, --out <file>` — Directory to save the profile configuration to.

## Examples

Create a feature profile and write it to `./my-feature`:

```bash
jinks create-profile my-feature --out ./my-feature
```
