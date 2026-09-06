import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
    title: 'jinks-cli',
    description: 'Command-line interface for managing TEI Publisher applications with Jinks',
    // Project pages are served from https://eeditiones.github.io/jinks-cli/
    base: '/jinks-cli/',
    lastUpdated: true,
    cleanUrls: true,
    head: [
        ['link', { rel: 'icon', href: '/jinks-cli/jinks-icon.png' }],
    ],
    themeConfig: {
        logo: '/jinks-icon.png',
        nav: [
            { text: 'Guide', link: '/guide/getting-started' },
            { text: 'Commands', link: '/commands/list' },
            { text: 'Examples', link: '/examples' },
        ],
        sidebar: [
            {
                text: 'Guide',
                items: [
                    { text: 'Getting started', link: '/guide/getting-started' },
                    { text: 'Examples', link: '/examples' },
                ],
            },
            {
                text: 'Commands',
                items: [
                    { text: 'list', link: '/commands/list' },
                    { text: 'profiles', link: '/commands/profiles' },
                    { text: 'create', link: '/commands/create' },
                    { text: 'edit', link: '/commands/edit' },
                    { text: 'update', link: '/commands/update' },
                    { text: 'config', link: '/commands/config' },
                    { text: 'run', link: '/commands/run' },
                    { text: 'watch', link: '/commands/watch' },
                    { text: 'package', link: '/commands/package' },
                    { text: 'create-profile', link: '/commands/create-profile' },
                    { text: 'edit-profile', link: '/commands/edit-profile' },
                ],
            },
        ],
        socialLinks: [
            { icon: 'github', link: 'https://github.com/eeditiones/jinks-cli' },
        ],
        editLink: {
            pattern: 'https://github.com/eeditiones/jinks-cli/edit/main/docs/:path',
        },
        search: {
            provider: 'local',
        },
    },
})
