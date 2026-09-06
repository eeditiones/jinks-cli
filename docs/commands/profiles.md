# `jinks profiles`

List all profiles (blueprints, features, and themes) available on the server.

```bash
jinks profiles
```

Profiles are the reusable building blocks applications are composed from — see
[`jinks create-profile`](/commands/create-profile) for how they're created. The output is a
table of every profile's name, category, label, and description, sorted by category and then
by name.

## Options

- `-s, --server <address>` — Server address. Defaults to `http://localhost:8080/exist/apps/jinks` (or `$JINKS_SERVER`).

::: tip
Like `list`, `profiles` only needs the server address — it reads the public list of
configurations and does not require authentication.
:::

## Examples

Connect to a remote server:

```bash
jinks profiles --server http://my-server:8080/exist/apps/jinks
```
