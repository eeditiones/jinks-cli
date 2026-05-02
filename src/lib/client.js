import axios from 'axios';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';
import chalk from 'chalk';
import ora from 'ora';

export function initClient(options) {
    const cookieJar = new CookieJar();
    return wrapper(
        axios.create({
            baseURL: options.server,
            jar: cookieJar,
            withCredentials: true,
        })
    );
}

export async function loginUser(client, options) {
    const params = new URLSearchParams();
    params.append('user', options.user);
    params.append('password', options.password);

    const loginResponse = await client.post('/api/login', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (loginResponse.status !== 200) {
        throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.data}`);
    }
}

export function splitConfigurationsResponse(data) {
    if (!Array.isArray(data)) {
        const kind = data === null || data === undefined ? String(data) : typeof data;
        return {
            valid: [],
            invalid: [],
            parseError: `Expected a JSON array from /api/configurations, received ${kind}.`,
        };
    }
    const valid = [];
    const invalid = [];
    for (const item of data) {
        if (item && item.type === 'invalid-config') {
            invalid.push(item);
        } else {
            valid.push(item);
        }
    }
    return { valid, invalid, parseError: null };
}

function reportInvalidConfigurations(entries) {
    if (!entries.length) return;
    console.error(chalk.yellow('\nSome applications or profiles on the server could not be loaded (invalid JSON or dependency error):\n'));
    for (const item of entries) {
        const slug = item.profile ?? '?';
        console.error(chalk.red(`  ${slug}`) + chalk.dim(` — ${item.title ?? 'invalid configuration'}`));
        if (item.description) console.error(chalk.dim(`    ${item.description}`));
        if (item.error?.message) console.error(chalk.dim(`    ${item.error.message}`));
        if (item.error?.path) console.error(chalk.dim(`    ${item.error.path}`));
    }
    console.error('');
}

export async function fetchAvailableConfigurations(client, commandName = '') {
    const spinner = ora('Fetching available configurations...').start();
    try {
        const configResponse = await client.get('/api/configurations');
        spinner.stop();

        if (configResponse.status !== 200) {
            console.error(chalk.red(`Could not fetch configurations: HTTP ${configResponse.status}`));
            process.exit(1);
        }

        const { valid, invalid, parseError } = splitConfigurationsResponse(configResponse.data);
        if (parseError) {
            console.error(chalk.red(parseError));
            process.exit(1);
        }

        if (commandName !== 'list') {
            reportInvalidConfigurations(invalid);
        }

        return { configurations: valid, invalidConfigurations: invalid };
    } catch (error) {
        spinner.fail(`Could not fetch configurations: ${error.message}\n`);
        process.exit(1);
    }
}
