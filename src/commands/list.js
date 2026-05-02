import { listInstalledApplications } from '../lib/ui.js';
import { serverOption } from '../options.js';

export function registerList(program) {
    program.command('list')
        .summary('List installed applications')
        .description('List all (jinks-generated) applications installed on the server.')
        .addOption(serverOption())
        .action(async (options, command) => {
            try {
                listInstalledApplications(
                    command.allConfigurations,
                    options.server,
                    command.invalidConfigurations ?? [],
                );
            } catch (error) {
                console.error(error);
            }
        });
}
