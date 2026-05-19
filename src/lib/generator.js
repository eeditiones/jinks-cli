import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import { checkbox, confirm } from '@inquirer/prompts';
import { loginUser } from './client.js';

export function isGeneratorBlockedByBreakingChanges(output) {
    return (
        output?.nextStep?.action === 'CONFIRM' &&
        output?.['version-check']?.['has-breaking-changes'] === true
    );
}

function buildGeneratorQuery(options, { confirm = false } = {}) {
    const params = new URLSearchParams();
    params.set('overwrite', options.reinstall ? 'reinstall' : options.all ? 'all' : 'quick');
    if (confirm) {
        params.set('confirm', 'true');
    }
    return params.toString();
}

async function postGenerator(client, options, requestBody, confirm) {
    const qs = buildGeneratorQuery(options, { confirm });
    return client.post(`/api/generator?${qs}`, requestBody);
}

function printBreakingChangeDetails(output) {
    const vc = output?.['version-check'];
    const breaking = vc?.['breaking-profiles'];
    if (output?.nextStep?.message) {
        console.log(chalk.yellow(output.nextStep.message));
    }
    if (breaking && typeof breaking === 'object' && Object.keys(breaking).length > 0) {
        console.log(chalk.yellow('\nProfiles with major version updates (possible breaking changes):\n'));
        const table = new Table({
            head: [chalk.bold('Profile'), chalk.bold('Installed'), chalk.bold('New'), chalk.bold('Notes')],
            colWidths: [22, 14, 14, 40],
            wordWrap: true,
        });
        for (const [profile, info] of Object.entries(breaking)) {
            const notes = info?.changes != null && String(info.changes).trim() !== '' ? String(info.changes) : '—';
            table.push([profile, String(info?.installed ?? '—'), String(info?.new ?? '—'), notes]);
        }
        console.log(table.toString());
        console.log('');
    }
}

export async function update(config, options, client, resolve = []) {
    const requestBody = { config, resolve };

    try {
        await loginUser(client, options);
    } catch (error) {
        console.error(error.message);
        process.exit(1);
    }

    let spinner = ora('Starting generator ...').start();

    const confirmBreaking = Boolean(options.confirmBreaking);
    let generatorResponse = await postGenerator(client, options, requestBody, confirmBreaking);

    if (generatorResponse.status !== 200) {
        spinner.fail('Generator failed with error: ' + generatorResponse.status);
        console.error(generatorResponse.data);
        process.exit(1);
    }
    spinner.stop();

    let output = generatorResponse.data;

    if (isGeneratorBlockedByBreakingChanges(output)) {
        if (confirmBreaking) {
            console.error(
                chalk.red('Update was blocked due to breaking changes, even with --confirm-breaking. Check server logs or response:'),
            );
            console.error(output);
            process.exit(1);
        }
        if (options.quiet) {
            console.error(
                chalk.red(
                    'Breaking profile changes were detected. Re-run with --confirm-breaking to proceed non-interactively, or omit --quiet to confirm interactively.',
                ),
            );
            process.exit(1);
        }
        printBreakingChangeDetails(output);
        const proceed = await confirm({
            message: 'Proceed with this update despite breaking profile version changes?',
            default: false,
        });
        if (!proceed) {
            console.log(chalk.yellow('Update cancelled.'));
            return;
        }
        spinner = ora('Applying update (breaking changes confirmed) ...').start();
        generatorResponse = await postGenerator(client, options, requestBody, true);
        spinner.stop();
        if (generatorResponse.status !== 200) {
            console.error(chalk.red('Generator failed with error: ' + generatorResponse.status));
            console.error(generatorResponse.data);
            process.exit(1);

        }
        output = generatorResponse.data;
        if (isGeneratorBlockedByBreakingChanges(output)) {
            console.error(chalk.red('Update is still blocked after confirmation. Server response:'));
            console.error(output);
            process.exit(1);

        }
    }

    if (!Array.isArray(output.messages)) {
        output.messages = [];
    }

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
            process.exit(1);
        }
        spinner.stop();
        console.log(chalk.green('Done!'));
    } else if (output.messages.length === 0) {
        console.log(chalk.green('No changes detected.'));
    }

    const conflicts = output.messages.filter((message) => message.type === 'conflict');
    if (!options.quiet) {
        resolveConflicts(conflicts, config, options, client);
    }
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
