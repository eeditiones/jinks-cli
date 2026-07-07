# `jinks watch [dir]`

Watch a local directory for file changes and automatically synchronize them to the
corresponding eXist-db collection. This gives you a live local → server loop while you edit
an application's sources.

```bash
jinks watch
jinks watch ./my-app
```

The target collection and credentials are read from `repo.xml` in the watched directory: the
collection is `/db/apps/<target>` (from the `<target>` element) and the user/password come
from the `<permissions>` element. The `-u` and `-p` options override those credentials when
needed. Press `Ctrl+C` to stop watching.

## Arguments

- `[dir]` — Directory to watch. Defaults to the current working directory.

## Synchronized events

| Event                    | Action                          |
| ------------------------ | ------------------------------- |
| File added or changed    | Upload to database              |
| File deleted             | Remove from database            |
| Directory added          | Create collection in database   |
| Directory deleted        | Remove collection from database |

## Ignored paths

When a `.existdb.json` file with a `sync.ignore` glob list is present in the watched
directory, those globs decide what is skipped (`.git/**` is always added). Otherwise a set of
built-in defaults applies, skipping paths such as `.git`, `build`, `node_modules`, `*.xar`,
and `.DS_Store`.

## Options

- `-s, --server <address>` — Server address. Defaults to `http://localhost:8080/exist/apps/jinks` (or `$JINKS_SERVER`).
- `-u, --user <username>` — Override the username from `repo.xml`.
- `-p, --password <password>` — Override the password from `repo.xml`.
- `--check-interval <seconds>` — Interval for the periodic server connection check, in
  seconds. Set to `0` to disable. Defaults to `60`. On a failed check the CLI keeps watching
  and reconnects automatically when the server returns.

## Examples

Watch the current directory:

```bash
jinks watch
```

Watch a specific application directory:

```bash
jinks watch ./my-tei-app
```

Watch with credentials that override `repo.xml` and a 30-second connection check:

```bash
jinks watch ./my-tei-app --user admin --password secret --check-interval 30
```
