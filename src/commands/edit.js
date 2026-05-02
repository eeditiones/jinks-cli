import { printBanner, showApplicationLink } from '../lib/ui.js';
import { loadConfigFromApplication, selectInstalledApplication, editOrCreateConfiguration } from '../lib/config.js';
import { update } from '../lib/generator.js';
import { serverOption, userOption, passwordOption, editOption, quietOption, reinstallOption, forceOption } from '../options.js';

export function registerEdit(program) {
    program.command('edit')
        .argument('[abbrev]', 'Application to edit')
        .description('Change an existing application. If no application is provided, you will be prompted to select an installed application.')
        .summary('Change an existing application')
        .addOption(serverOption())
        .addOption(userOption())
        .addOption(passwordOption())
        .addOption(editOption())
        .addOption(quietOption())
        .addOption(reinstallOption())
        .addOption(forceOption())
        .action(async (abbrev, options, command) => {
            printBanner(options);
            try {
                let config;
                if (abbrev) {
                    config = await loadConfigFromApplication(abbrev, command.allConfigurations, command.invalidConfigurations ?? []);
                } else {
                    config = await selectInstalledApplication(command.allConfigurations);
                }
                config = await editOrCreateConfiguration(config.config, options, command.allConfigurations, command.client);
                await update(config, options, command.client);
                showApplicationLink(config, options.server, 'updated');
            } catch (error) {
                console.error(error);
            }
        });
}
