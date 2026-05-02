import { Option } from 'commander';
import { printBanner, showApplicationLink } from '../lib/ui.js';
import { createConfiguration } from '../lib/config.js';
import { update } from '../lib/generator.js';
import { serverOption, userOption, passwordOption, editOption, quietOption } from '../options.js';

export function registerCreate(program) {
    program.command('create')
        .argument('[abbrev]', 'Abbreviated name of the application to create')
        .summary('Create a new application')
        .addOption(serverOption())
        .addOption(userOption())
        .addOption(passwordOption())
        .addOption(editOption())
        .addOption(quietOption())
        .addOption(new Option('-c, --config <file>', 'Use the given configuration file rather than interactive mode to create the application.').implies({ quiet: true }))
        .action(async (abbrev, options, command) => {
            printBanner(options);
            try {
                let baseConfig = null;
                if (abbrev) {
                    baseConfig = { pkg: { abbrev } };
                }
                const config = await createConfiguration(baseConfig, options, command.allConfigurations, command.client);
                await update(config, options, command.client);
                showApplicationLink(config, options.server, 'created');
            } catch (error) {
                console.error(error);
            }
        });
}
