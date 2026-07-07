# `jinks list`

List all Jinks-generated applications installed on the server.

```bash
jinks list
```

## Options

- `-s, --server <address>` — Server address. Defaults to `http://localhost:8080/exist/apps/jinks` (or `$JINKS_SERVER`).

::: tip
`list` only needs the server address — it reads the public list of configurations and does
not require authentication.
:::

## Examples

Connect to a remote server:

```bash
jinks list --server http://my-server:8080/exist/apps/jinks
```
