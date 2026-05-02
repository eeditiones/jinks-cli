import fs from 'fs';
import chalk from 'chalk';
import ora from 'ora';
import { input, checkbox, confirm, editor, select, Separator } from '@inquirer/prompts';

export const DEFAULT_CONFIG = {
    pkg: { abbrev: 'my-app' },
    label: 'my-app',
    id: 'https://e-editiones.org/apps/my-app',
    extends: ['base10', 'theme-base10'],
};

export function loadConfigFromFile(filePath) {
    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(fileContent);
    } catch (error) {
        console.error('Error reading or parsing JSON file:', error.message);
        if (process.env.NODE_ENV !== 'test') {
            process.exit(1);
        }
        throw new Error(`Error reading or parsing JSON file: ${error.message}`);
    }
}

export async function expandConfig(config, client) {
    const spinner = ora('Expanding configuration...').start();
    try {
        const expandedConfig = await client.post('/api/expand', config);
        spinner.stop();
        return expandedConfig.data;
    } catch (error) {
        spinner.fail(`Could not expand configuration: ${error.message}\n`);
        return null;
    }
}

export async function loadConfigFromApplication(appOption, allConfigurations, invalidConfigurations = []) {
    if (!appOption) {
        try {
            return await selectInstalledApplication(allConfigurations);
        } catch (error) {
            if (error.name === 'ExitPromptError' || error.message.includes('SIGINT')) {
                console.log(chalk.yellow('\nOperation cancelled by user.'));
                process.exit(0);
            } else {
                console.error(chalk.red('Error during configuration collection:'), error.message);
                process.exit(1);
            }
        }
    } else {
        const broken = invalidConfigurations.find((item) => item.profile === appOption);
        if (broken) {
            console.error(chalk.red(`"${appOption}" is present on the server but its configuration could not be loaded.`));
            if (broken.title) console.error(chalk.dim(broken.title));
            if (broken.error?.message) console.error(chalk.dim(broken.error.message));
            if (broken.error?.path) console.error(chalk.dim(broken.error.path));
            process.exit(1);
        }

        const config = allConfigurations.find(
            (item) => (item.type === 'installed' || item.type === 'profile') && item.config?.pkg?.abbrev === appOption,
        );
        if (!config) {
            console.error(chalk.red(`Application ${appOption} not found.`));
            process.exit(1);
        }
        return config;
    }
}

export async function selectInstalledApplication(allConfigurations) {
    const installed = allConfigurations
        .filter((item) => item.type === 'installed')
        .sort((a, b) => a.config.label.localeCompare(b.config.label))
        .map((item) => ({
            name: chalk.bold(item.config.label) + (item.config.description ? ` – ${item.config.description}` : ''),
            value: item,
        }));
    return await select({
        message: 'Select installed application:',
        choices: installed,
    });
}

export async function createConfiguration(config, options, allConfigurations, client) {
    return await editOrCreateConfiguration(config, options, allConfigurations, client, true);
}

export async function editOrCreateConfiguration(config, options, allConfigurations, client, create = false) {
    if (options.edit) {
        const edited = await editor({
            message: 'Edit configuration:',
            default: JSON.stringify(config || DEFAULT_CONFIG, null, 2),
            waitForUseInput: false,
            postfix: '.json',
        });
        config = JSON.parse(edited);
    } else if (options.config) {
        config = loadConfigFromFile(options.config);
    } else {
        try {
            config = await collectConfigInteractively(config, allConfigurations, config?.extends, create);
        } catch (error) {
            if (error.name === 'ExitPromptError' || error.message.includes('SIGINT')) {
                console.log(chalk.yellow('\nOperation cancelled by user.'));
                process.exit(0);
            } else {
                console.error(error);
                console.error(chalk.red('Error during configuration collection:'), error.message);
                process.exit(1);
            }
        }
    }

    const existingConfigById = allConfigurations.find((item) => item.type === 'installed' && item.config.id === config.id);
    const existingConfigByAbbrev = allConfigurations.find((item) => item.type === 'installed' && item.config.pkg.abbrev === config.pkg.abbrev);

    if (create && (existingConfigById || existingConfigByAbbrev)) {
        console.error(chalk.red('A configuration with this id or abbreviated name already exists'));
        process.exit(1);
    }

    console.log('\n' + chalk.blue('Using configuration:'));
    console.log(JSON.stringify(config, null, 2));

    if (create && !options.config) {
        const shouldEdit = await confirm({
            message: 'Would you like to edit this configuration?',
            default: false,
        });

        if (shouldEdit) {
            const edited = await editor({
                message: 'Edit configuration:',
                default: JSON.stringify(config, null, 2),
                waitForUseInput: false,
                postfix: '.json',
            });
            config = JSON.parse(edited);
            console.log('\n' + chalk.blue('Updated configuration:'));
            console.log(JSON.stringify(config, null, 2));
        }
    }
    return config;
}

export async function collectConfigInteractively(initialConfig = {}, configurations, dependencies, create = false) {
    console.log(chalk.blue('Entering interactive mode...\n'));

    try {
        let abbrev;
        if (create) {
            let isAbbrevValid = false;
            while (!isAbbrevValid) {
                abbrev = await input({
                    message: 'Enter abbreviation:',
                    default: initialConfig?.pkg?.abbrev || 'my app',
                });
                const existingConfigByAbbrev = configurations.find(
                    (item) => item.type === 'installed' && item.config.pkg.abbrev === abbrev,
                );
                if (existingConfigByAbbrev) {
                    console.log(chalk.red(`❌ Abbreviation "${abbrev}" already exists in configuration "${existingConfigByAbbrev.config.label}"`));
                    console.log(chalk.yellow('Please enter a different abbreviation.\n'));
                } else {
                    isAbbrevValid = true;
                }
            }
        } else {
            abbrev = initialConfig?.pkg?.abbrev;
        }

        const label = await input({
            message: 'Enter descriptive label:',
            default: initialConfig?.label || abbrev,
        });

        let id;
        if (create) {
            let isIdValid = false;
            while (!isIdValid) {
                id = await input({
                    message: 'Enter unique identifier (URL):',
                    default: initialConfig?.id || `https://e-editiones.org/apps/${abbrev}`,
                });
                const existingConfigById = configurations.find(
                    (item) => item.type === 'installed' && item.config.id === id,
                );
                if (existingConfigById) {
                    console.log(chalk.red(`❌ ID "${id}" already exists in configuration "${existingConfigById.config.label}"`));
                    console.log(chalk.yellow('Please enter a different ID.\n'));
                } else {
                    isIdValid = true;
                }
            }
        } else {
            id = initialConfig?.id;
        }

        const blueprintOptions = configurations
            .filter((item) => item.type === 'profile' && item.config.type === 'blueprint')
            .sort((a, b) => a.config.label.localeCompare(b.config.label))
            .map((blueprint) => ({
                name: `${chalk.bold(blueprint.profile)} – ${blueprint.config.label}`,
                value: blueprint.profile,
                description: blueprint.description || '',
                checked: dependencies?.includes(blueprint.profile),
            }));

        const profileOptions = configurations
            .filter((item) => item.type === 'profile' && !['theme', 'base', 'blueprint', 'disabled'].includes(item.config.type))
            .sort((a, b) => a.config.label.localeCompare(b.config.label))
            .map((profile) => ({
                name: `${chalk.bold(profile.profile)} – ${profile.config.label}`,
                value: profile.profile,
                description: profile.description || '',
                checked: dependencies?.includes(profile.profile),
            }));

        const selectOptions = [new Separator('Blueprints'), ...blueprintOptions, new Separator('Features'), ...profileOptions];
        let selectedProfiles = [];
        if (profileOptions.length > 0) {
            selectedProfiles = await checkbox({
                message: 'Select features to include:',
                choices: selectOptions,
                pageSize: 10,
                loop: false,
                theme: { icon: { unchecked: '[ ]', checked: '[x]' } },
            });
        }

        const baseProfiles = ['base10', 'theme-base10'];
        const currentExtends = [...baseProfiles, ...selectedProfiles];
        const missingDependencies = [];
        const missingProfiles = [];

        const collectAllDependencies = (startProfiles) => {
            const allDeps = new Map();
            const toProcess = [...startProfiles];
            const processed = new Set();
            while (toProcess.length > 0) {
                const profileName = toProcess.shift();
                if (processed.has(profileName)) continue;
                processed.add(profileName);
                const profileConfig = configurations.find((config) => config.profile === profileName);
                if (!profileConfig?.config?.depends) continue;
                for (const dependency of profileConfig.config.depends) {
                    if (!allDeps.has(dependency)) {
                        allDeps.set(dependency, { profile: profileName, dependency });
                    }
                    if (!processed.has(dependency)) toProcess.push(dependency);
                }
            }
            return Array.from(allDeps.values());
        };

        const allDependencyInfo = collectAllDependencies(selectedProfiles);
        for (const depInfo of allDependencyInfo) {
            const dependency = depInfo.dependency;
            if (currentExtends.includes(dependency)) continue;
            const dependencyConfig = configurations.find((config) => config.profile === dependency);
            const profileConfig = configurations.find((config) => config.profile === depInfo.profile);
            if (dependencyConfig) {
                missingDependencies.push({
                    profile: depInfo.profile,
                    dependency,
                    label: profileConfig?.config?.label || depInfo.profile,
                    dependencyLabel: dependencyConfig.config.label,
                });
            } else {
                missingProfiles.push({
                    profile: depInfo.profile,
                    dependency,
                    label: profileConfig?.config?.label || depInfo.profile,
                });
            }
        }

        if (missingProfiles.length > 0) {
            console.log(chalk.red("\n❌ Some dependencies reference profiles that don't exist:"));
            for (const item of missingProfiles) {
                console.log(chalk.red(`   • ${item.label} (${item.profile}) depends on missing profile: ${item.dependency}`));
            }
            console.log(chalk.yellow('   These dependencies will be ignored.'));
        }

        if (missingDependencies.length > 0) {
            console.log(chalk.yellow('\n⚠️  Some selected profiles have dependencies that are not included yet:'));
            for (const item of missingDependencies) {
                console.log(chalk.yellow(`   • ${item.label} (${item.profile}) depends on: ${item.dependencyLabel} (${item.dependency})`));
            }
            const addDependencies = await confirm({
                message: 'Do you want to add these dependencies automatically?',
                default: true,
            });
            if (addDependencies) {
                for (const item of missingDependencies) {
                    if (!currentExtends.includes(item.dependency)) {
                        currentExtends.push(item.dependency);
                        console.log(chalk.green(`   ✓ Added dependency: ${item.dependencyLabel} (${item.dependency})`));
                    }
                }
            }
        }

        const profilesToSort = currentExtends.filter((profile) => profile !== 'base10' && profile !== 'theme-base10');
        profilesToSort.sort((a, b) => {
            const profileA = configurations.find((config) => config.profile === a);
            const profileB = configurations.find((config) => config.profile === b);
            const orderA = profileA?.config?.order ?? Number.MAX_SAFE_INTEGER;
            const orderB = profileB?.config?.order ?? Number.MAX_SAFE_INTEGER;
            return orderA - orderB;
        });

        currentExtends.splice(2);
        currentExtends.push(...profilesToSort);

        return {
            ...initialConfig,
            overwrite: 'default',
            pkg: { abbrev },
            label,
            id,
            extends: currentExtends,
        };
    } catch (error) {
        throw error;
    }
}
