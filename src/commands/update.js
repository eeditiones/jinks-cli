import { printBanner } from '../lib/ui.js';
import { loadConfigFromApplication, selectInstalledApplication, loadConfigFromFile, loadConfigFromStdin } from '../lib/config.js';
import { update } from '../lib/generator.js';
import {
    confirmBreakingOption,
    serverOption,
    userOption,
    passwordOption,
    quietOption,
    reinstallOption,
    forceOption,
    syncOption,
    configOption,
} from '../options.js';

export function registerUpdate(program) {
    program.command('update')
        .argument('[abbrev]', 'Application to update')
        .description('Update an existing application. If no application is provided, you will be prompted to select an installed application.')
        .summary('Update an existing application')
        .addOption(serverOption())
        .addOption(userOption())
        .addOption(passwordOption())
        .addOption(quietOption())
        .addOption(reinstallOption())
        .addOption(forceOption())
        .addOption(syncOption())
        .addOption(configOption())
        .addOption(confirmBreakingOption())
        .action(async (abbrev, options, command) => {
            printBanner(options);
            try {
                let config;
                if (options.config !== undefined) {
                    config = options.config === true
                        ? await loadConfigFromStdin()
                        : loadConfigFromFile(options.config);
                } else if (abbrev) {
                    config = (await loadConfigFromApplication(abbrev, command.allConfigurations, command.invalidConfigurations ?? [])).config;
                } else {
                    config = (await selectInstalledApplication(command.allConfigurations)).config;
                }
                await update(config, options, command.client);
            } catch (error) {
                console.error(error);
            }
        });
}
