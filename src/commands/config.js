import { loadConfigFromApplication, expandConfig } from '../lib/config.js';
import { serverOption, userOption, passwordOption } from '../options.js';

export function registerConfig(program) {
    program.command('config')
        .argument('[abbrev]', 'Application to get configuration for')
        .summary('Get configuration for an application')
        .option('-x, --expand', 'Show the expanded configuration')
        .addOption(serverOption())
        .addOption(userOption())
        .addOption(passwordOption())
        .action(async (abbrev, options, command) => {
            try {
                let config = await loadConfigFromApplication(abbrev, command.allConfigurations, command.invalidConfigurations ?? []);
                if (options.expand) {
                    config = await expandConfig(config.config, command.client);
                } else {
                    config = config.config;
                }
                console.log(JSON.stringify(config, null, 2));
            } catch (error) {
                console.error(error);
            }
        });
}
