import { listProfiles } from '../lib/ui.js';
import { serverOption } from '../options.js';

export function registerProfiles(program) {
    program.command('profiles')
        .summary('List available profiles')
        .description('List all profiles (blueprints, features, themes) available on the server.')
        .addOption(serverOption())
        .action(async (options, command) => {
            try {
                listProfiles(command.allConfigurations);
            } catch (error) {
                console.error(error);
            }
        });
}
