#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { Command } from 'commander';
import dotenv from 'dotenv';

import { initClient, fetchAvailableConfigurations } from './src/lib/client.js';
import { registerList } from './src/commands/list.js';
import { registerCreate } from './src/commands/create.js';
import { registerEdit } from './src/commands/edit.js';
import { registerUpdate } from './src/commands/update.js';
import { registerConfig } from './src/commands/config.js';
import { registerRun } from './src/commands/run.js';
import { registerCreateProfile } from './src/commands/create-profile.js';
import { registerEditProfile } from './src/commands/edit-profile.js';
import { registerWatch } from './src/commands/watch.js';

export { loadConfigFromFile } from './src/lib/config.js';
export { showApplicationLink, listInstalledApplications, printBanner } from './src/lib/ui.js';
export { splitConfigurationsResponse } from './src/lib/client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
const VERSION = packageJson.version;

const originalConsoleLog = console.log;
console.log = () => {};
dotenv.config({ silent: true, debug: false, override: false, path: '.env' });
console.log = originalConsoleLog;

process.on('SIGINT', () => {
    console.log(chalk.yellow('\nOperation cancelled by user.'));
    process.exit(0);
});

const program = new Command();
program.version(VERSION, '-v, --version', 'Display the version number');

program.hook('preAction', async (thisCommand, actionCommand) => {
    if (actionCommand.name() === 'watch') return;
    const options = actionCommand.opts();
    if (options.server) {
        actionCommand.client = initClient(options);
        const { configurations, invalidConfigurations } = await fetchAvailableConfigurations(
            actionCommand.client,
            actionCommand.name(),
        );
        actionCommand.allConfigurations = configurations;
        actionCommand.invalidConfigurations = invalidConfigurations;
    }
});

registerList(program);
registerCreate(program);
registerEdit(program);
registerUpdate(program);
registerConfig(program);
registerRun(program);
registerCreateProfile(program);
registerEditProfile(program);
registerWatch(program);

const isMainModule = import.meta.url === `file://${process.argv[1]}` ||
    process.argv[1]?.endsWith('index.js') ||
    process.argv[1]?.endsWith('jinks');

if (isMainModule) {
    program.parse();
}
