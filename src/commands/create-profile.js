import { printBanner } from '../lib/ui.js';
import { createOrEditProfile } from '../lib/profile.js';
import { serverOption, userOption, passwordOption } from '../options.js';

export function registerCreateProfile(program) {
    program.command('create-profile')
        .argument('[abbrev]', 'Name of the profile to create')
        .summary('Create a new profile')
        .addOption(serverOption())
        .addOption(userOption())
        .addOption(passwordOption())
        .option('-o, --out <file>', 'Directory to save the profile configuration to')
        .action(async (abbrev, options, command) => {
            printBanner(options);
            let baseConfig = null;
            if (abbrev) {
                baseConfig = { pkg: { abbrev } };
            }
            try {
                await createOrEditProfile(baseConfig, options.out, command.allConfigurations);
            } catch (error) {
                console.error(error);
            }
        });
}
