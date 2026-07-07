# `jinks edit-profile <dir>`

Edit an existing profile configuration stored in a directory. The profile's `config.json` is
read from the given directory, edited, and written back.

```bash
jinks edit-profile ./my-feature
```

## Arguments

- `<dir>` — Directory containing the profile configuration (its `config.json`). Required.

## Options

- `-s, --server <address>` — Server address. Defaults to `http://localhost:8080/exist/apps/jinks` (or `$JINKS_SERVER`).
- `-u, --user <username>` — Username. Defaults to `tei` (or `$JINKS_USER`).
- `-p, --password <password>` — Password. Defaults to `simple` (or `$JINKS_PASSWORD`).

## Examples

Edit a profile stored in `./my-feature`:

```bash
jinks edit-profile ./my-feature
```

See [`create-profile`](/commands/create-profile) for creating a new profile.
