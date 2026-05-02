import path from 'path';
import { printBanner } from '../lib/ui.js';
import { createOrEditProfile } from '../lib/profile.js';
import { loadConfigFromFile } from '../lib/config.js';
import { serverOption, userOption, passwordOption } from '../options.js';

export function registerEditProfile(program) {
    program.command('edit-profile')
        .argument('<dir>', 'Directory containing the profile configuration')
        .summary('Edit an existing profile')
        .addOption(serverOption())
        .addOption(userOption())
        .addOption(passwordOption())
        .action(async (dir, options, command) => {
            printBanner(options);
            const config = loadConfigFromFile(path.join(dir, 'config.json'));
            try {
                await createOrEditProfile(config, dir, command.allConfigurations);
            } catch (error) {
                console.error(error);
            }
        });
}
