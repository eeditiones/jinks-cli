import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { select } from '@inquirer/prompts';
import { collectConfigInteractively } from './config.js';

export async function createOrEditProfile(config, outDir, configurations) {
    const profileType = await select({
        message: 'Select profile type:',
        choices: [
            { name: 'Blueprint - Base configuration for an application', value: 'blueprint' },
            { name: 'Feature - Reusable functionality module', value: 'feature' },
            { name: 'Theme - Styling and appearance configuration', value: 'theme' },
        ],
        default: config?.type || 'blueprint',
    });

    try {
        const newConfig = await collectConfigInteractively(config, configurations, config?.depends, true);
        const depends = newConfig.extends;
        delete newConfig.extends;
        const profileConfig = {
            ...newConfig,
            type: profileType,
            version: newConfig.version || '1.0.0',
            depends,
            skipSource: ['repo.xml', 'expath-pkg.xml', 'build.xml'],
        };

        try {
            if (!outDir) {
                outDir = path.join(process.cwd(), profileConfig.pkg.abbrev);
            }
            fs.mkdirSync(outDir, { recursive: true });

            const configPath = path.join(outDir, 'config.json');
            fs.writeFileSync(configPath, JSON.stringify(profileConfig, null, 2));

            fs.writeFileSync(path.join(outDir, 'expath-pkg.xml'), `<?xml version="1.0" encoding="UTF-8" ?>
<package xmlns="http://expath.org/ns/pkg" name="https://e-editiones.org/tei-publisher/profiles/${profileConfig.pkg.abbrev}" abbrev="${profileConfig.pkg.abbrev}" version="${profileConfig.version}" spec="1.0">
    <title>${profileConfig.label}</title>
    <dependency processor="http://exist-db.org" semver-min="6.2.0" />
    <dependency package="http://e-editiones.org/roaster" semver="1"/>
</package>`);

            fs.writeFileSync(path.join(outDir, 'repo.xml'), `<?xml version="1.0" encoding="UTF-8" ?>
<meta xmlns="http://exist-db.org/xquery/repo">
    <description>${profileConfig.label}</description>
    <author>Wolfgang Meier</author>
    <website>https://github.com/eeditiones/tei-publisher-lib.git</website>
    <status>stable</status>
    <license>GPLv3</license>
    <copyright>true</copyright>
    <type>application</type>
    <target>${profileConfig.pkg.abbrev}</target>
    <permissions user="tei" group="tei" password="simple" mode="rw-rw-r--" />
</meta>`);

            fs.writeFileSync(path.join(outDir, 'build.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<project default="all" name="${profileConfig.label}">
    <xmlproperty file="expath-pkg.xml"/>
    <property name="project.version" value="\${package(version)}"/>
    <property name="project.app" value="\${package(abbrev)}"/>
    <property name="build.dir" value="build"/>
    <target name="all" depends="xar"/>
    <target name="rebuild" depends="clean,all"/>
    <target name="clean">
        <delete dir="\${build}"/>
    </target>
    <target name="xar">
        <mkdir dir="\${build.dir}"/>
        <zip basedir="." destfile="\${build.dir}/\${project.app}-\${project.version}.xar" excludes="\${build.dir}/*"/>
    </target>
</project>`);

            console.log(chalk.green(`Profile configuration saved to ${chalk.bold(configPath)}`));
        } catch (error) {
            console.error(chalk.red(`Failed to create profile directory: ${error.message}`));
            process.exit(1);
        }
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
