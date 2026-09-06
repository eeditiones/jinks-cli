# @teipublisher/jinks-cli

A command-line interface tool for managing TEI Publisher applications with [Jinks](https://github.com/eeditiones/jinks).

📖 **Full documentation: https://eeditiones.github.io/jinks-cli/**

## Installation

```bash
npm install -g @teipublisher/jinks-cli
```

After installation, the `jinks` command is available anywhere in your terminal.

## Commands at a glance

| Command                          | Description                                                       |
| -------------------------------- | ----------------------------------------------------------------- |
| `jinks list`                     | List installed applications on the server                         |
| `jinks profiles`                 | List available profiles (blueprints, features, themes)            |
| `jinks create [abbrev]`          | Create a new application                                          |
| `jinks edit [abbrev]`            | Change an existing application's configuration                    |
| `jinks update [abbrev]`          | Update an existing application by running the generator           |
| `jinks config [abbrev]`          | Print an application's configuration as JSON                      |
| `jinks run [abbrev] [action]`    | Run an action (e.g. `reindex`) on an installed application        |
| `jinks watch [dir]`              | Watch a directory and sync changes to the database               |
| `jinks create-profile [abbrev]`  | Create a new profile (blueprint, feature, or theme)              |
| `jinks edit-profile <dir>`       | Edit an existing profile configuration                            |

Run `jinks --help` or `jinks <command> --help` for usage, and see the
[documentation site](https://eeditiones.github.io/jinks-cli/) for the full reference,
connection settings, and examples.

## Requirements

- Node.js 20.0.0 or higher
- A running eXist-db instance with Jinks installed

## Documentation development

The documentation site is built with [VitePress](https://vitepress.dev/) from the `docs/`
directory and deployed to GitHub Pages on every push to `main`.

```bash
npm install
npm run docs:dev      # local dev server with hot reload
npm run docs:build    # production build (fails on broken links)
npm run docs:preview  # preview the production build
```

## License

GPL-3.0-or-later

## Repository

https://github.com/eeditiones/jinks-cli
