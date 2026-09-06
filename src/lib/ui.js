import chalk from 'chalk';
import figlet from 'figlet';
import terminalLink from 'terminal-link';
import Table from 'cli-table3';

export function printBanner(options) {
    if (!options.quiet) {
        const banner = figlet.textSync('Jinks', { font: 'Standard' });
        console.log(chalk.blue(banner));
    }
}

export function showApplicationLink(config, serverUrl, action = 'created') {
    const baseUrl = serverUrl.replace('/jinks', '');
    const appUrl = `${baseUrl}/${config.pkg.abbrev}`;
    const link = terminalLink(config.pkg.abbrev, appUrl);
    console.log(chalk.blue(`\nApplication ${action} successfully!`));
    console.log(chalk.blue(`Access your application: ${link}`));
}

export function listInstalledApplications(allConfigurations, serverUrl, invalidConfigurations = []) {
    console.log(chalk.blue('Installed applications:\n'));
    const configs = allConfigurations.filter((item) => item.type === 'installed');

    if (configs.length === 0) {
        console.log(chalk.yellow('No applications found.'));
    } else {
        const baseUrl = serverUrl.replace('/jinks', '');
        configs.forEach((config) => {
            const abbrev = config.config.pkg.abbrev;
            const appUrl = `${baseUrl}/${abbrev}`;
            const link = terminalLink(abbrev, appUrl);
            console.log(`${link}`);
        });
    }

    if (invalidConfigurations.length > 0) {
        console.log(chalk.yellow('\nInstalled applications or bundled profiles that could not be loaded:\n'));
        for (const item of invalidConfigurations) {
            const slug = item.profile ?? '?';
            console.log(chalk.red(`  ${slug}`));
            if (item.title) console.log(chalk.dim(`    ${item.title}`));
            if (item.error?.message) console.log(chalk.dim(`    ${item.error.message}`));
            if (item.error?.path) console.log(chalk.dim(`    ${item.error.path}`));
        }
    }
}

export function listProfiles(allConfigurations) {
    const profiles = allConfigurations
        .filter((item) => item.type === 'profile' && item.config?.type !== 'disabled')
        .sort((a, b) => {
            const category = (a.config?.type || '').localeCompare(b.config?.type || '');
            return category !== 0 ? category : (a.profile || '').localeCompare(b.profile || '');
        });

    if (profiles.length === 0) {
        console.log(chalk.yellow('No profiles found.'));
        return;
    }

    console.log(chalk.blue('Available profiles:\n'));
    const table = new Table({
        head: [chalk.bold('Name'), chalk.bold('Category'), chalk.bold('Label'), chalk.bold('Description')],
        colWidths: [20, 12, 20, 48],
        wordWrap: true,
    });
    profiles.forEach((item) => {
        table.push([item.profile ?? '', item.config?.type ?? '', item.config?.label ?? '', item.description || '']);
    });
    console.log(table.toString());
}
