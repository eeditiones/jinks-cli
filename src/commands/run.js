import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import { select } from '@inquirer/prompts';
import { loadConfigFromApplication, selectInstalledApplication } from '../lib/config.js';
import { loginUser } from '../lib/client.js';
import { update } from '../lib/generator.js';
import { confirmBreakingOption, serverOption, userOption, passwordOption } from '../options.js';

export function registerRun(program) {
    program.command('run')
        .argument('[abbrev]', 'Application to perform action on')
        .argument('[action]', "Name of the action to run, e.g. 'reindex'")
        .summary('Run an action on an installed application')
        .option('-U, --update', 'Perform an update of the application before running the action')
        .option('-o, --output <file>', 'Save the output to the given directory')
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

                    if (Array.isArray(output) && output.length > 0) {
                        console.log(chalk.blue('Action response:'));
                        const table = new Table({
                            head: [chalk.bold('Type'), chalk.bold('Message')],
                            colWidths: [15, 50],
                            wordWrap: true,
                        });
                        output.forEach((message) => {
                            if (message && message.type && message.message) {
                                table.push([chalk.blue(message.type.padEnd(15)), message.message]);
                            }
                        });
                        console.log(table.toString());
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
