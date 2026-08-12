import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import { Option } from 'commander';
import { select } from '@inquirer/prompts';
import { loadConfigFromApplication, selectInstalledApplication } from '../lib/config.js';
import { loginUser } from '../lib/client.js';
import { update } from '../lib/generator.js';
import { confirmBreakingOption, serverOption, userOption, passwordOption } from '../options.js';
/**
 * Collect path → source maps from action messages that include a `files` object.
 * @param {unknown} output
 * @returns {Record<string, string>}
 */
export function collectFilesFromActionOutput(output) {
    const files = {};
    const messages = Array.isArray(output) ? output : output != null ? [output] : [];
    for (const message of messages) {
        if (message && typeof message === 'object' && message.files && typeof message.files === 'object' && !Array.isArray(message.files)) {
            for (const [relPath, source] of Object.entries(message.files)) {
                if (typeof relPath === 'string' && typeof source === 'string') {
                    files[relPath] = source;
                }
            }
        }
    }
    return files;
}

/**
 * Write path → source entries under `targetDir`.
 * @param {Record<string, string>} files
 * @param {string} targetDir
 * @returns {{ written: string[], errors: string[] }}
 */
export function syncActionFiles(files, targetDir) {
    const written = [];
    const errors = [];
    for (const [relPath, source] of Object.entries(files)) {
        try {
            const localPath = path.join(targetDir, relPath);
            fs.mkdirSync(path.dirname(localPath), { recursive: true });
            fs.writeFileSync(localPath, source, 'utf8');
            written.push(relPath);
        } catch {
            errors.push(relPath);
        }
    }
    return { written, errors };
}

export function registerRun(program) {
    program.command('run')
        .argument('[abbrev]', 'Application to perform action on')
        .argument('[action]', "Name of the action to run, e.g. 'reindex'")
        .summary('Run an action on an installed application')
        .option('-U, --update', 'Perform an update of the application before running the action')
        .option('-o, --output <file>', 'Save the output to the given directory')
        .addOption(new Option('--sync', 'Write modified files returned by the action to the local directory'))
        .addOption(serverOption())
        .addOption(userOption())
        .addOption(passwordOption())
        .addOption(confirmBreakingOption())
        .action(async (abbrev, action, options, command) => {
            try {
                let config;
                if (abbrev) {
                    config = await loadConfigFromApplication(abbrev, command.allConfigurations, command.invalidConfigurations ?? []);
                } else {
                    config = await selectInstalledApplication(command.allConfigurations);
                }
                if (!action) {
                    if (config.actions && config.actions.length > 0) {
                        const actionChoices = config.actions.map((actionItem) => ({
                            name: `${actionItem.name}: ${actionItem.description}`,
                            value: actionItem.name,
                        }));
                        action = await select({ message: 'Select action to perform:', choices: actionChoices });
                    } else {
                        console.log(chalk.yellow('No actions available for this application.'));
                        return;
                    }
                }
                if (options.update) {
                    await update(config.config, options, command.client);
                }
                const spinner = ora(`Executing action: ${action}...`).start();
                try {
                    await loginUser(command.client, options);

                    const actionConfig = config.actions.find((actionItem) => actionItem.name === action);
                    const appName = actionConfig.app || config.config.pkg.abbrev;
                    const params = new URLSearchParams();
                    params.append('root', `/db/apps/${config.config.pkg.abbrev}`);

                    const actionResponse = await command.client.post(`../${appName}/api/actions/${action}`, params, {
                        responseType: 'arraybuffer',
                    });

                    if (actionResponse.status !== 200) {
                        spinner.fail('Action failed with error: ' + actionResponse.status);
                        const errorData = actionResponse.data instanceof ArrayBuffer
                            ? Buffer.from(actionResponse.data).toString('utf-8')
                            : actionResponse.data;
                        console.error(errorData);
                        return;
                    }
                    spinner.stop();

                    const contentDisposition = actionResponse.headers['content-disposition'] || actionResponse.headers['Content-Disposition'];
                    const contentType = actionResponse.headers['content-type'] || actionResponse.headers['Content-Type'];

                    if (contentDisposition && contentType) {
                        const contentTypeMatch = contentType.includes('application/zip') || contentType.includes('media-type=application/zip');
                        if (contentTypeMatch) {
                            const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                            if (filenameMatch) {
                                const filename = filenameMatch[1].replace(/['"]/g, '');
                                const outputDir = options.output ? path.resolve(options.output) : process.cwd();
                                if (!fs.existsSync(outputDir)) {
                                    fs.mkdirSync(outputDir, { recursive: true });
                                }
                                const filePath = path.join(outputDir, filename);
                                fs.writeFileSync(filePath, actionResponse.data);
                                console.log(chalk.green(`File saved: ${filePath}`));
                                return;
                            }
                        }
                    }

                    let output;
                    if (actionResponse.data instanceof ArrayBuffer || actionResponse.data instanceof Uint8Array) {
                        try {
                            const buffer = Buffer.from(actionResponse.data);
                            output = JSON.parse(buffer.toString('utf-8'));
                        } catch (e) {
                            spinner.fail('Failed to parse response as JSON');
                            console.error('Response data:', Buffer.from(actionResponse.data).toString('utf-8'));
                            return;
                        }
                    } else {
                        output = actionResponse.data;
                    }

                    const messages = Array.isArray(output) ? output : output != null ? [output] : [];
                    if (messages.length > 0) {
                        console.log(chalk.blue('Action response:'));
                        const table = new Table({
                            head: [chalk.bold('Type'), chalk.bold('Message')],
                            colWidths: [15, 50],
                            wordWrap: true,
                        });
                        messages.forEach((message) => {
                            if (message && message.type && message.message) {
                                table.push([chalk.blue(message.type.padEnd(15)), message.message]);
                            }
                        });
                        console.log(table.toString());
                    }

                    const files = collectFilesFromActionOutput(output);
                    if (options.sync) {
                        const paths = Object.keys(files);
                        if (paths.length === 0) {
                            console.log(chalk.yellow('No modified files returned by the action to sync.'));
                        } else {
                            const syncSpinner = ora(`Syncing ${paths.length} file(s)...`).start();
                            const { written, errors } = syncActionFiles(files, process.cwd());
                            if (errors.length === 0) {
                                syncSpinner.succeed(`Synced ${written.length} file(s) to ${process.cwd()}`);
                            } else {
                                syncSpinner.fail(`Sync completed with ${errors.length} error(s)`);
                                errors.forEach((relPath) => console.error(chalk.red(`Failed to sync: ${relPath}`)));
                            }
                        }
                    }

                    console.log(chalk.green('Action completed successfully!'));
                } catch (error) {
                    spinner.fail('Action execution failed');
                    console.error(error);
                }
            } catch (error) {
                console.error(error);
            }
        });
}
