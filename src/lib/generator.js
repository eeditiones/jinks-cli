import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import { checkbox, confirm } from '@inquirer/prompts';
import { loginUser } from './client.js';

export async function update(config, options, client, resolve = []) {
    const requestBody = { config, resolve };

    try {
        await loginUser(client, options);
    } catch (error) {
        console.error(error.message);
        return;
    }

    let spinner = ora('Starting generator ...').start();

    const generatorResponse = await client.post(
        `/api/generator?overwrite=${options.reinstall ? 'reinstall' : options.all ? 'all' : 'quick'}`,
        requestBody,
    );

    if (generatorResponse.status !== 200) {
        spinner.fail('Generator failed with error: ' + generatorResponse.status);
        console.error(generatorResponse.data);
        return;
    }
    spinner.stop();

    const output = generatorResponse.data;

    if (output.messages.length > 0) {
        console.log(chalk.blue('Generator response:'));
        const table = new Table({
            head: [chalk.bold('Type'), chalk.bold('Path'), chalk.bold('Source')],
            colWidths: [12, 40, 40],
            wordWrap: true,
        });

        output.messages.forEach((message) => {
            let typeColored;
            switch (message.type) {
                case 'update':
                    typeColored = chalk.green(message.type.padEnd(10));
                    break;
                case 'warning':
                    typeColored = chalk.yellow(message.type.padEnd(10));
                    break;
                case 'conflict':
                    typeColored = chalk.red(message.type.padEnd(10));
                    break;
                default:
                    typeColored = message.type.padEnd(10);
            }
            const source = (message.source || '').replace('/db/apps/jinks/profiles/', '');
            table.push([typeColored, message.path || '', source]);
        });
        console.log(table.toString());
    }

    if (options.sync) {
        const toSync = output.messages.filter((m) => m.type === 'update');
        for (const fixedPath of ['.jinks.json', 'context.json']) {
            if (!toSync.some((m) => m.path === fixedPath)) {
                toSync.push({ path: fixedPath });
            }
        }
        if (toSync.length > 0) {
            const syncSpinner = ora(`Syncing ${toSync.length} file(s)...`).start();
            let syncErrors = 0;
            for (const message of toSync) {
                const dbPath = `/db/apps/${config.pkg.abbrev}/${message.path}`;
                try {
                    const sourceResponse = await client.get('/api/source', {
                        params: { path: dbPath },
                        responseType: 'arraybuffer',
                    });
                    const localPath = path.join(process.cwd(), message.path);
                    fs.mkdirSync(path.dirname(localPath), { recursive: true });
                    fs.writeFileSync(localPath, sourceResponse.data);
                } catch (err) {
                    syncErrors++;
                    syncSpinner.warn(`Failed to sync: ${message.path}`);
                    syncSpinner.start();
                }
            }
            if (syncErrors === 0) {
                syncSpinner.succeed(`Synced ${toSync.length} file(s) to ${process.cwd()}`);
            } else {
                syncSpinner.fail(`Sync completed with ${syncErrors} error(s)`);
            }
        }
    }

    if (options.reinstall || (output.nextStep && output.nextStep.action === 'DEPLOY')) {
        spinner = ora('Deploying ...').start();
        const deployResponse = await client.post(`/api/generator/${config.pkg.abbrev}/deploy`);
        if (deployResponse.status !== 200) {
            spinner.fail('Deploy failed with code ' + deployResponse.status + ': ' + deployResponse.data);
            console.error('Deploy failed:', deployResponse.status, deployResponse.data);
            return;
        }
        spinner.stop();
        console.log(chalk.green('Done!'));
    } else if (output.messages.length === 0) {
        console.log(chalk.green('No changes detected.'));
    }

    const conflicts = output.messages.filter((message) => message.type === 'conflict');
    resolveConflicts(conflicts, config, options, client);
}

async function resolveConflicts(conflicts, config, options, client) {
    if (conflicts.length === 0) return;

    const resolve = await confirm({ message: 'Conflicts detected. Resolve conflicts?' });
    if (!resolve) return;

    const choices = conflicts.map((conflict) => ({ name: conflict.path, value: conflict.path }));
    const resolved = await checkbox({ message: 'Select conflicts to resolve:', choices });

    console.log(chalk.blue('Re-running ...'));
    update(config, options, client, resolved);
}
