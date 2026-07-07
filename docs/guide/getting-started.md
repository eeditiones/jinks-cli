# Getting started

`jinks-cli` is a command-line tool for managing [TEI Publisher-based](https://teipublisher.com)
applications built with the [Jinks](https://github.com/eeditiones/jinks) application generator. It talks to the generator running on eXist-db and lets you create, update, run, and synchronize applications
without leaving the terminal. 

`jinks-cli` complements the Jinks web interface. It is in particular useful to set up a robust development workflow and also helps AI agents to interact with Jinks.

## Requirements

- Node.js 20.0.0 or higher
- A running eXist-db instance with Jinks installed

### Installing Node.js

`jinks-cli` runs on [Node.js](https://nodejs.org), a program that lets your computer run
JavaScript-based tools. You need version 20 or higher. If you have never used Node.js
before, don't worry — you only have to install it once, and you won't have to write any
JavaScript yourself.

The easiest way is to download the installer from the
[Node.js website](https://nodejs.org/en/download). Choose the **LTS** ("Long Term
Support") version — as long as its number is 20 or higher, you are fine — and pick the
installer for your operating system (Windows or macOS). Run the downloaded file and click
through the installation like you would for any other program, accepting the default
options.

On macOS you can alternatively use [Homebrew](https://brew.sh) if you already have it:

```bash
brew install node@20
```

To check that everything worked, open a terminal (on Windows: the "Command Prompt" or
"PowerShell"; on macOS: the "Terminal" app) and type:

```bash
node --version
```

If it prints a version number starting with `v20` (or higher), Node.js is ready and you
can continue with the installation below.

## Installation

```bash
npm install -g @teipublisher/jinks-cli
```

After installation the `jinks` command is available anywhere in your terminal.

## General options

### Help

Display help for the CLI as a whole or for an individual command:

```bash
jinks -h
jinks --help
jinks create --help
```

### Version

```bash
jinks -v
jinks --version
```

## Connecting to a server

The CLI connects to a Jinks server on eXist-db. Unless overridden, it uses these defaults:

| Setting  | Default                                          |
| -------- | ------------------------------------------------ |
| Server   | `http://localhost:8080/exist/apps/jinks`         |
| Username | `tei`                                            |
| Password | `simple`                                         |

Every command that talks to the server accepts the same connection options:

- `-s, --server <address>` — server address
- `-u, --user <username>` — username
- `-p, --password <password>` — password

```bash
jinks list --server http://my-server:8080/exist/apps/jinks
```

### Environment variables

Instead of passing the connection options on every call, you can set them once via
environment variables. The CLI reads them as defaults:

| Variable         | Overrides    |
| ---------------- | ------------ |
| `JINKS_SERVER`   | `--server`   |
| `JINKS_USER`     | `--user`     |
| `JINKS_PASSWORD` | `--password` |

A `.env` file in the current working directory is loaded automatically, so you can keep
per-project credentials next to your application:

```bash
# .env
JINKS_SERVER=http://my-server:8080/exist/apps/jinks
JINKS_USER=admin
JINKS_PASSWORD=secret
```

Explicit command-line options always take precedence over environment variables.

## Interactive features

Most commands are interactive when information is missing:

- **Application selection** — when no application abbreviation is given, you are shown a
  list of installed applications to choose from.
- **Action selection** — when running actions, you can pick from the available actions if
  none is specified.
- **Profile selection** — features and dependencies are chosen through interactive
  checkboxes.
- **Conflict resolution** — file conflicts detected during an update can be resolved
  interactively.
- **Dependency management** — missing dependencies are detected and can be added
  automatically.

## Next steps

- Browse the [command reference](/commands/list).
- See common workflows on the [Examples](/examples) page.
