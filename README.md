# @teipublisher/jinks-cli

A command-line interface tool for managing TEI Publisher applications with (https://github.com/eeditiones/jinks)[Jinks].

## Installation

```bash
npm install -g @teipublisher/jinks-cli
```

## Usage

After installation, you can use the `jinks` command from anywhere in your terminal.

### Commands

#### `jinks list`
List all installed applications on the server.

```bash
jinks list
```

#### `jinks create [abbrev]`
Create a new application. If no abbreviation is provided, you'll be prompted to enter one.

```bash
jinks create my-app
```

Options:
- `-s, --server <address>` - Server address (default: http://localhost:8080/exist/apps/jinks)
- `-u, --user <username>` - Username (default: tei)
- `-p, --password <password>` - Password (default: simple)
- `-e, --edit` - Use text editor rather than interactive mode
- `-q, --quiet` - Do not print banner

#### `jinks edit [abbrev]`
Edit an existing application configuration. If no application is provided, you'll be prompted to select from installed applications.

```bash
jinks edit my-app
```

Options:
- `-s, --server <address>` - Server address
- `-u, --user <username>` - Username
- `-p, --password <password>` - Password
- `-e, --edit` - Use text editor rather than interactive mode
- `-q, --quiet` - Do not print banner
- `-r, --reinstall` - Fully reinstall application, overwriting existing files
- `-f, --force` - Ignore last modified date and check every file for changes

#### `jinks update [abbrev]`
Update an existing application. If no application is provided, you'll be prompted to select from installed applications.

```bash
jinks update my-app
```

Options:
- `-s, --server <address>` - Server address
- `-u, --user <username>` - Username
- `-p, --password <password>` - Password
- `-q, --quiet` - Do not print banner
- `-r, --reinstall` - Fully reinstall application, overwriting existing files
- `-f, --force` - Ignore last modified date and check every file for changes

#### `jinks config [abbrev]`
Get configuration for an application.

```bash
jinks config my-app
```

Options:
- `-x, --expand` - Show the expanded configuration
- `-s, --server <address>` - Server address
- `-u, --user <username>` - Username
- `-p, --password <password>` - Password

#### `jinks run [abbrev] [action]`
Run an action on an installed application. If no action is provided, you'll be prompted to select from available actions.

```bash
jinks run my-app reindex
```

Options:
- `-U, --update` - Perform an update of the application before running the action
- `-s, --server <address>` - Server address
- `-u, --user <username>` - Username
- `-p, --password <password>` - Password

#### `jinks create-profile [abbrev]`
Create a new profile (blueprint, feature, or theme) and save it to a directory. If the resulting package is built (with ant) and installed into the database, it will appear within jinks as a profile users can select to extend.

```bash
jinks create-profile my-feature
```

Options:
- `-s, --server <address>` - Server address
- `-u, --user <username>` - Username
- `-p, --password <password>` - Password
- `-o, --out <file>` - Directory to save the profile configuration to
- `-q, --quiet` - Do not print banner

#### `jinks edit-profile <dir>`
Edit an existing profile configuration.

```bash
jinks edit-profile ./my-feature
```

Options:
- `-s, --server <address>` - Server address
- `-u, --user <username>` - Username
- `-p, --password <password>` - Password
- `-q, --quiet` - Do not print banner

## Examples

### Create a new application interactively
```bash
jinks create
```

### Create a new application with specific abbreviation
```bash
jinks create my-tei-app
```

### Edit an existing application (with interactive selection)
```bash
jinks edit
```

### Edit a specific application
```bash
jinks edit my-tei-app
```

### Update an application with force flag
```bash
jinks update my-tei-app --force
```

### Run a reindex action (with interactive action selection)
```bash
jinks run my-tei-app
```

### Run a specific action
```bash
jinks run my-tei-app reindex
```

### Create a new feature profile
```bash
jinks create-profile my-feature --out ./my-feature
```

### Edit an existing profile
```bash
jinks edit-profile ./my-feature
```

### Connect to a different server
```bash
jinks list --server http://my-server:8080/exist/apps/jinks
```

## Interactive Features

The CLI provides rich interactive features:

- **Application Selection**: When no application abbreviation is provided, you'll be presented with a list of installed applications to choose from
- **Action Selection**: When running actions, you can select from available actions if none is specified
- **Profile Selection**: Interactive checkboxes for selecting features and dependencies
- **Conflict Resolution**: Automatic detection and resolution of file conflicts during updates
- **Dependency Management**: Automatic detection and addition of missing dependencies

## Configuration

The CLI connects to a Jinks server running on eXist-db. By default, it connects to:
- Server: `http://localhost:8080/exist/apps/jinks`
- Username: `tei`
- Password: `simple`

You can override these defaults using command-line options.

## Profile Types

When creating profiles, you can choose from three types:

- **Blueprint**: Base configuration for an application
- **Feature**: Reusable functionality module
- **Theme**: Styling and appearance configuration

## Requirements

- Node.js 18.0.0 or higher
- A running eXist-db instance with Jinks installed

## License

GPL-3.0-or-later

## Repository

https://github.com/eeditiones/jinks
