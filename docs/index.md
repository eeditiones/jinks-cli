---
layout: home

hero:
  name: jinks-cli
  text: Manage TEI Publisher-based apps from the terminal
  tagline: Create, update, and deploy Jinks-generated TEI Publisher applications with a single command.
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: Commands
      link: /commands/list
    - theme: alt
      text: View on GitHub
      link: https://github.com/eeditiones/jinks-cli

features:
  - title: Create & update apps
    details: Scaffold a new application interactively or from a config file, then keep it in sync with the Jinks generator.
    link: commands/create
  - title: Local to database
    details: Watch a local directory and mirror every change straight into the eXist-db collection while you develop.
    link: commands/watch
  - title: Database to local
    details: Automatically download files modified by Jinks update
    link: commands/update#sync
  - title: Run actions
    details: Download app, fix ODDs, create sitemap …
    link: commands/run
---

## Installation

```bash
npm install -g @teipublisher/jinks-cli
```

Once installed, the `jinks` command is available anywhere in your terminal. See
[Getting started](/guide/getting-started) for configuration and the
[Commands](/commands/list) reference for every subcommand.
