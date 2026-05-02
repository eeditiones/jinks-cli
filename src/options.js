import { Option } from 'commander';

export const serverOption = () => new Option('-s, --server <address>', 'Server address').default(process.env.JINKS_SERVER || 'http://localhost:8080/exist/apps/jinks');
export const userOption = () => new Option('-u, --user <username>', 'Username').default(process.env.JINKS_USER || 'tei');
export const passwordOption = () => new Option('-p, --password <password>', 'Password').default(process.env.JINKS_PASSWORD || 'simple');
export const editOption = () => new Option('-e, --edit', 'Use text editor rather than interactive mode to modify configuration.');
export const reinstallOption = () => new Option('-r, --reinstall', 'Fully reinstall application, overwriting existing files.');
export const forceOption = () => new Option('-a, --all', 'Ignore last modified date and check every file for changes.');
export const quietOption = () => new Option('-q, --quiet', 'Do not print banner.');
export const syncOption = () => new Option('--sync', 'Sync updated files to the local directory.');
