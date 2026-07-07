# Examples

Common workflows with `jinks-cli`. See the [command reference](/commands/list) for every
option.

## Create a new application interactively

```bash
jinks create
```

## Create a new application with a specific abbreviation

```bash
jinks create my-tei-app
```

## Update an application, checking every file

```bash
jinks update my-tei-app --all
```

## Update and sync changed files to the local directory

```bash
jinks update my-tei-app --sync
```

## Overwrite the app's config.json while updating

```bash
jinks update my-tei-app --config ./config.json
# or pipe the configuration in via stdin
cat config.json | jinks update my-tei-app --config
```

## Edit an existing application

```bash
# with interactive selection
jinks edit

# a specific application
jinks edit my-tei-app
```

## Run an action

```bash
# with interactive action selection
jinks run my-tei-app

# a specific action
jinks run my-tei-app reindex
```

## Watch a directory and sync changes to the database

```bash
# the current directory
jinks watch

# a specific application directory
jinks watch ./my-tei-app
```

## Work with profiles

```bash
# create a new feature profile
jinks create-profile my-feature --out ./my-feature

# edit an existing profile
jinks edit-profile ./my-feature
```

## Connect to a different server

```bash
jinks list --server http://my-server:8080/exist/apps/jinks
```
