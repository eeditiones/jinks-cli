import path from 'path';
import chalk from 'chalk';
import { select } from '@inquirer/prompts';
import { printBanner } from '../lib/ui.js';
import { packageApp, detectBuildStrategies } from '../lib/xar.js';
import { quietOption } from '../options.js';

export function registerPackage(program) {
    program.command('package')
        .alias('xar')
        .argument('[dir]', 'App directory to package (defaults to the current working directory)')
        .summary('Build a .xar package from an app directory')
        .description(
            'Package a Jinks-generated application into an installable .xar (a ZIP). Uses the app\'s own build when available: the package.json "build" script (if the app ships a build.cjs), else Apache Ant (if installed and working), else a built-in Node packager that reproduces the default Ant build. The .xar is named <abbrev>-<version>.xar from expath-pkg.xml.',
        )
        .addOption(quietOption())
        .option('-o, --output <file>', 'Output .xar path (default: build/<abbrev>-<version>.xar)')
        .action(async (dir, options) => {
            printBanner(options);
            try {
                const appDir = path.resolve(dir ?? process.cwd());

                const strategyInfo = {
                    npm: {
                        via: 'npm run build',
                        reason: 'the app ships a build.cjs and a "build" script in package.json',
                    },
                    ant: {
                        via: 'ant',
                        reason: 'Apache Ant is available',
                    },
                    node: {
                        via: 'simple packager',
                        reason: 'Ant not available and no build.cjs found, falling back to default packaging',
                    },
                };

                const available = detectBuildStrategies(appDir);
                let strategy;
                if (available.npm && available.ant) {
                    if (options.quiet) {
                        // Non-interactive: keep the default preference (npm over ant).
                        strategy = 'npm';
                    } else {
                        strategy = await select({
                            message: 'Both an npm build and Apache Ant are available. Which should be used?',
                            choices: [
                                { name: 'npm run build (the app\'s own build script)', value: 'npm' },
                                { name: 'ant (Apache Ant build.xml)', value: 'ant' },
                            ],
                        });
                    }
                } else if (available.npm) {
                    strategy = 'npm';
                } else if (available.ant) {
                    strategy = 'ant';
                } else {
                    strategy = 'node';
                }

                const info = strategyInfo[strategy];
                console.log(
                    chalk.cyan('→') + ` Building with ${chalk.bold(info.via)} ` +
                    chalk.dim(`(${info.reason})`),
                );

                const { output, fileCount } = packageApp(appDir, { output: options.output, strategy });
                console.log(
                    chalk.green('✓') + ` Created ${chalk.bold(output)} ` +
                    chalk.dim(`(${fileCount} files, via ${info.via})`),
                );
            } catch (error) {
                console.error(chalk.red(error.message));
                process.exit(1);
            }
        });
}
