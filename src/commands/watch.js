import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { watch } from 'chokidar';
import { initClient, loginUser } from '../lib/client.js';
import { createWatchIgnorePredicate, resolveWatchIgnoreGlobs } from '../lib/sync-ignore.js';
import { serverOption } from '../options.js';

function parseRepoXml(dir) {
    const repoXmlPath = path.join(dir, 'repo.xml');
    if (!fs.existsSync(repoXmlPath)) {
        throw new Error(`No repo.xml found in ${dir}`);
    }
    const content = fs.readFileSync(repoXmlPath, 'utf8');
    const targetMatch = content.match(/<target>([^<]+)<\/target>/);
    if (!targetMatch) {
        throw new Error('No <target> element found in repo.xml');
    }
    const permMatch = content.match(/<permissions[^>]+\buser="([^"]+)"[^>]+\bpassword="([^"]+)"/);
    return {
        target: targetMatch[1].trim(),
        user: permMatch?.[1] ?? 'tei',
        password: permMatch?.[2] ?? 'simple',
    };
}

// Map a local path to its database counterpart
function dbPath(localPath, watchDir, targetCollection) {
    const relative = path.relative(watchDir, localPath);
    return `${targetCollection}/${relative.split(path.sep).join('/')}`;
}

// Upload a file to the database
async function uploadFile(client, localPath, watchDir, targetCollection) {
    const db = dbPath(localPath, watchDir, targetCollection);
    const collection = db.substring(0, db.lastIndexOf('/'));
    const filename = path.basename(localPath);
    const content = fs.readFileSync(localPath);
    const formData = new FormData();
    formData.append('file[]', new Blob([content]), filename);
    const response = await client.post('/api/upload', formData, {
        params: { collection },
    });
    return response;
}

// Delete a resource or collection from the database
async function deleteResource(client, localPath, watchDir, targetCollection) {
    const db = dbPath(localPath, watchDir, targetCollection);
    const collection = db.substring(0, db.lastIndexOf('/'));
    const name = db.substring(db.lastIndexOf('/') + 1);
    await client.delete(`/api/collections/${encodeURIComponent(collection)}`, {
        params: { remove: name },
    });
}

// Create a collection (directory) in the database
async function createCollection(client, localPath, watchDir, targetCollection) {
    const db = dbPath(localPath, watchDir, targetCollection);
    const parent = db.substring(0, db.lastIndexOf('/'));
    const name = db.substring(db.lastIndexOf('/') + 1);
    await client.post(`/api/collections/${encodeURIComponent(parent)}`, null, {
        params: { name },
    });
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientRequestError(error) {
    const status = error?.response?.status;
    if (typeof status === 'number' && status >= 500) {
        return true;
    }
    const code = error?.code;
    return code === 'ECONNRESET' ||
        code === 'ECONNABORTED' ||
        code === 'ETIMEDOUT' ||
        code === 'ENOTFOUND' ||
        code === 'EAI_AGAIN' ||
        code === 'EPIPE' ||
        code === 'ENETUNREACH' ||
        code === 'EHOSTUNREACH';
}

async function withReconnect(client, authOptions, operation) {
    try {
        return await operation();
    } catch (error) {
        if (error.response?.status === 401 || error.response?.status === 403) {
            await loginUser(client, authOptions);
            return await operation();
        }
        if (isTransientRequestError(error)) {
            await sleep(500);
            return await operation();
        }
        throw error;
    }
}

async function checkConnection(client, authOptions) {
    await withReconnect(client, authOptions, () => client.get('/api/configurations'));
}

function startConnectionChecks(client, authOptions, intervalSeconds) {
    const intervalMs = Number(intervalSeconds) * 1000;
    if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
        return () => {};
    }
    let running = false;
    let hadError = false;
    const timer = setInterval(async () => {
        if (running) return;
        running = true;
        try {
            await checkConnection(client, authOptions);
            if (hadError) {
                console.log(chalk.green('✓') + ' ' + chalk.dim('connection restored'));
                hadError = false;
            }
        } catch (error) {
            hadError = true;
            console.error(chalk.yellow('!') + ' ' + chalk.dim(`connection check failed — ${error.message}`));
        } finally {
            running = false;
        }
    }, intervalMs);
    timer.unref();
    return () => clearInterval(timer);
}

export function registerWatch(program) {
    program.command('watch')
        .argument('[dir]', 'Directory to watch (defaults to current working directory)')
        .summary('Watch a directory and sync changes to the database')
        .description(
            'Watch the working directory for file changes and synchronize them to the eXist-db target collection. Reads target collection and credentials from repo.xml. Uses sync.ignore globs from .existdb.json when present (always includes .git/**), otherwise built-in defaults.',
        )
        .addOption(serverOption())
        .option('-u, --user <username>', 'Override the username from repo.xml')
        .option('-p, --password <password>', 'Override the password from repo.xml')
        .option('--check-interval <seconds>', 'Periodic server connection check interval in seconds (0 disables)', (value) => {
            const parsed = Number(value);
            if (!Number.isFinite(parsed) || parsed < 0) {
                throw new Error('check interval must be a non-negative number');
            }
            return parsed;
        }, 60)
        .action(async (dir, options) => {
            const watchDir = path.resolve(dir ?? process.cwd());

            let repoInfo;
            try {
                repoInfo = parseRepoXml(watchDir);
            } catch (error) {
                console.error(chalk.red(error.message));
                process.exit(1);
            }

            const authOptions = {
                user: options.user ?? repoInfo.user,
                password: options.password ?? repoInfo.password,
            };
            const targetCollection = `/db/apps/${repoInfo.target}`;

            const { globs: ignoreGlobs } = resolveWatchIgnoreGlobs(watchDir);

            console.log(chalk.blue(`Syncing ${chalk.bold(watchDir)} → ${chalk.bold(targetCollection)}`));
            console.log(
                chalk.dim(
                    `Server: ${options.server}  User: ${authOptions.user}\n`,
                ),
            );

            const client = initClient({ server: options.server });
            try {
                await loginUser(client, authOptions);
            } catch (error) {
                console.error(chalk.red(`Login failed: ${error.message}`));
                process.exit(1);
            }
            const stopConnectionChecks = startConnectionChecks(client, authOptions, options.checkInterval);

            const isIgnored = createWatchIgnorePredicate(watchDir, ignoreGlobs);

            const watcher = watch(watchDir, {
                ignored: isIgnored,
                ignoreInitial: true,
                persistent: true,
                awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
            });

            const label = (event, p) => `${chalk.dim(event)} ${path.relative(watchDir, p)}`;

            watcher
                .on('add', async (localPath) => {
                    if (isIgnored(localPath)) return;
                    try {
                        await withReconnect(client, authOptions, () => uploadFile(client, localPath, watchDir, targetCollection));
                        console.log(chalk.green('↑') + ' ' + label('add', localPath));
                    } catch (error) {
                        console.error(chalk.red('✗') + ' ' + label('add', localPath) + chalk.red(` — ${error.message}`));
                    }
                })
                .on('change', async (localPath) => {
                    if (isIgnored(localPath)) return;
                    try {
                        await withReconnect(client, authOptions, () => uploadFile(client, localPath, watchDir, targetCollection));
                        console.log(chalk.green('↑') + ' ' + label('change', localPath));
                    } catch (error) {
                        console.error(chalk.red('✗') + ' ' + label('change', localPath) + chalk.red(` — ${error.message}`));
                    }
                })
                .on('unlink', async (localPath) => {
                    if (isIgnored(localPath)) return;
                    try {
                        await withReconnect(client, authOptions, () => deleteResource(client, localPath, watchDir, targetCollection));
                        console.log(chalk.red('✗') + ' ' + label('unlink', localPath));
                    } catch (error) {
                        console.error(chalk.red('✗') + ' ' + label('unlink', localPath) + chalk.red(` — ${error.message}`));
                    }
                })
                .on('addDir', async (localPath) => {
                    if (localPath === watchDir) return; // skip root
                    if (isIgnored(localPath)) return;
                    try {
                        await withReconnect(client, authOptions, () => createCollection(client, localPath, watchDir, targetCollection));
                        console.log(chalk.blue('+ dir') + ' ' + label('addDir', localPath));
                    } catch (error) {
                        console.error(chalk.red('✗') + ' ' + label('addDir', localPath) + chalk.red(` — ${error.message}`));
                    }
                })
                .on('unlinkDir', async (localPath) => {
                    if (isIgnored(localPath)) return;
                    try {
                        await withReconnect(client, authOptions, () => deleteResource(client, localPath, watchDir, targetCollection));
                        console.log(chalk.red('- dir') + ' ' + label('unlinkDir', localPath));
                    } catch (error) {
                        console.error(chalk.red('✗') + ' ' + label('unlinkDir', localPath) + chalk.red(` — ${error.message}`));
                    }
                })
                .on('error', (error) => {
                    console.error(chalk.red(`Watcher error: ${error.message}`));
                });
            watcher.on('close', stopConnectionChecks);

            console.log(chalk.blue('Watching for changes. Press Ctrl+C to stop.\n'));
        });
}
