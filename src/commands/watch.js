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

async function withReauth(client, authOptions, operation) {
    try {
        return await operation();
    } catch (error) {
        if (error.response?.status === 401 || error.response?.status === 403) {
            await loginUser(client, authOptions);
            return await operation();
        }
        throw error;
    }
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

            const { fromConfig, globs: ignoreGlobs } = resolveWatchIgnoreGlobs(watchDir);

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
                        await withReauth(client, authOptions, () => uploadFile(client, localPath, watchDir, targetCollection));
                        console.log(chalk.green('↑') + ' ' + label('add', localPath));
                    } catch (error) {
                        console.error(chalk.red('✗') + ' ' + label('add', localPath) + chalk.red(` — ${error.message}`));
                    }
                })
                .on('change', async (localPath) => {
                    if (isIgnored(localPath)) return;
                    try {
                        await withReauth(client, authOptions, () => uploadFile(client, localPath, watchDir, targetCollection));
                        console.log(chalk.green('↑') + ' ' + label('change', localPath));
                    } catch (error) {
                        console.error(chalk.red('✗') + ' ' + label('change', localPath) + chalk.red(` — ${error.message}`));
                    }
                })
                .on('unlink', async (localPath) => {
                    if (isIgnored(localPath)) return;
                    try {
                        await withReauth(client, authOptions, () => deleteResource(client, localPath, watchDir, targetCollection));
                        console.log(chalk.red('✗') + ' ' + label('unlink', localPath));
                    } catch (error) {
                        console.error(chalk.red('✗') + ' ' + label('unlink', localPath) + chalk.red(` — ${error.message}`));
                    }
                })
                .on('addDir', async (localPath) => {
                    if (localPath === watchDir) return; // skip root
                    if (isIgnored(localPath)) return;
                    try {
                        await withReauth(client, authOptions, () => createCollection(client, localPath, watchDir, targetCollection));
                        console.log(chalk.blue('+ dir') + ' ' + label('addDir', localPath));
                    } catch (error) {
                        console.error(chalk.red('✗') + ' ' + label('addDir', localPath) + chalk.red(` — ${error.message}`));
                    }
                })
                .on('unlinkDir', async (localPath) => {
                    if (isIgnored(localPath)) return;
                    try {
                        await withReauth(client, authOptions, () => deleteResource(client, localPath, watchDir, targetCollection));
                        console.log(chalk.red('- dir') + ' ' + label('unlinkDir', localPath));
                    } catch (error) {
                        console.error(chalk.red('✗') + ' ' + label('unlinkDir', localPath) + chalk.red(` — ${error.message}`));
                    }
                })
                .on('error', (error) => {
                    console.error(chalk.red(`Watcher error: ${error.message}`));
                });

            console.log(chalk.blue('Watching for changes. Press Ctrl+C to stop.\n'));
        });
}
