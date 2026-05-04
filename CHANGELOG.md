## [2.2.1](https://github.com/eeditiones/jinks-cli/compare/v2.2.0...v2.2.1) (2026-05-04)


### Bug Fixes

* ignore paths should be globs; respect .existdb.json for sync ([62a1894](https://github.com/eeditiones/jinks-cli/commit/62a189492f4314d1cbb8206c5d6073a6e6abd5e4))

# [2.2.0](https://github.com/eeditiones/jinks-cli/compare/v2.1.0...v2.2.0) (2026-05-03)


### Bug Fixes

* if -q|--quite is passed, do not ask if conflicts should be resolved ([b2f910c](https://github.com/eeditiones/jinks-cli/commit/b2f910c781261834e03ee76fcde456497ef67ec4))


### Features

* add a watch command ([457e71a](https://github.com/eeditiones/jinks-cli/commit/457e71a4b9f02c7f8f67e48990a76efb4f7e0b37))

# [2.1.0](https://github.com/eeditiones/jinks-cli/compare/v2.0.2...v2.1.0) (2026-04-28)


### Features

* add sync option to update command: synchronizes updated files to local dir ([605bda5](https://github.com/eeditiones/jinks-cli/commit/605bda5413a01319d2f64be1e0497d5b7302e7f6))
* report invalid config.json, either in an app itself or one of its dependencies ([be2ac8b](https://github.com/eeditiones/jinks-cli/commit/be2ac8bfce8057f630b325c1409acd90a3b034cf))

## [2.0.2](https://github.com/eeditiones/jinks-cli/compare/v2.0.1...v2.0.2) (2026-01-10)


### Bug Fixes

* create-profile generates invalid expath-pkg.xml ([db8b924](https://github.com/eeditiones/jinks-cli/commit/db8b9248e95f4ede0e53bfcf22b6c37f1fae4eaf))
* handle transitive dependencies: docs -> playground -> upload ([89a82b1](https://github.com/eeditiones/jinks-cli/commit/89a82b17f590b80b3e03d6a1afacc47704ea7836))

## [2.0.1](https://github.com/eeditiones/jinks-cli/compare/v2.0.0...v2.0.1) (2026-01-07)


### Bug Fixes

* some actions (reindex, download) now run on jinks itself; if response is application/zip, save it to directory ([cac7219](https://github.com/eeditiones/jinks-cli/commit/cac721917417f8cd5077eddc9816576b25dbd545))

# [2.0.0](https://github.com/eeditiones/jinks-cli/compare/v1.2.0...v2.0.0) (2026-01-07)


* chore!: upgrade dependencies requiring Node.js 20+ ([a04682f](https://github.com/eeditiones/jinks-cli/commit/a04682fd91e25a04804e743cb9b2806f0ff72a8e))


### BREAKING CHANGES

* Minimum Node.js version is now 20.0.0

Upgraded @inquirer/prompts (8.1.0), ora (9.0.0), and
terminal-link (5.0.0). All require Node.js 20+.

# [1.2.0](https://github.com/eeditiones/jinks-cli/compare/v1.1.0...v1.2.0) (2026-01-07)


### Features

* add tests ([053840e](https://github.com/eeditiones/jinks-cli/commit/053840e4e5a6dfdb4f633165de7542100ffc4d93))
* add version reporting ([a0ecc66](https://github.com/eeditiones/jinks-cli/commit/a0ecc6635e4a4a39618185b5feeb5f293c8070fe)), closes [#2](https://github.com/eeditiones/jinks-cli/issues/2)

# 1.0.0 (2026-01-07)


### Features

* add parameter -c to read config from file when creating app ([2856f86](https://github.com/eeditiones/jinks-cli/commit/2856f8636c4a3bafbe55585818f3c78c7f943a9b))
* add tests ([053840e](https://github.com/eeditiones/jinks-cli/commit/053840e4e5a6dfdb4f633165de7542100ffc4d93))
* add version reporting ([a0ecc66](https://github.com/eeditiones/jinks-cli/commit/a0ecc6635e4a4a39618185b5feeb5f293c8070fe)), closes [#2](https://github.com/eeditiones/jinks-cli/issues/2)
