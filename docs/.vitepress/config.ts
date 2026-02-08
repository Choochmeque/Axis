import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Axis',
  description: 'A modern, cross-platform Git GUI built with Tauri',
  base: '/Axis/',

  head: [
    ['link', { rel: 'icon', type: 'image/png', href: '/Axis/favicon.png' }],
    ['meta', { name: 'theme-color', content: '#4f46e5' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'Axis - Modern Git GUI' }],
    [
      'meta',
      {
        property: 'og:description',
        content: 'A modern, cross-platform Git GUI built with Tauri',
      },
    ],
    ['meta', { property: 'og:url', content: 'https://choochmeque.github.io/Axis/' }],
  ],

  themeConfig: {
    logo: '/logo.png',

    nav: [
      { text: 'Guide', link: '/guide/' },
      { text: 'GitHub', link: 'https://github.com/Choochmeque/Axis' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Overview', link: '/guide/' },
            { text: 'Installation', link: '/guide/installation' },
            { text: 'First Repository', link: '/guide/first-repository' },
          ],
        },
        {
          text: 'Core Features',
          items: [
            { text: 'Staging & Commits', link: '/guide/staging-commits' },
            { text: 'Branches', link: '/guide/branches' },
            { text: 'Merging & Rebasing', link: '/guide/merging-rebasing' },
            { text: 'Stashing', link: '/guide/stashing' },
            { text: 'History & Blame', link: '/guide/history-blame' },
          ],
        },
        {
          text: 'Advanced Features',
          items: [
            { text: 'GitHub Integration', link: '/guide/github-integration' },
            { text: 'AI-Assisted Commits', link: '/guide/ai-commits' },
            { text: 'Worktrees', link: '/guide/worktrees' },
            { text: 'Submodules', link: '/guide/submodules' },
            { text: 'Git LFS', link: '/guide/git-lfs' },
            { text: 'GitFlow', link: '/guide/gitflow' },
          ],
        },
        {
          text: 'Customization',
          items: [
            { text: 'Keyboard Shortcuts', link: '/guide/keyboard-shortcuts' },
            { text: 'Settings', link: '/guide/settings' },
          ],
        },
      ],
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/Choochmeque/Axis' }],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 Vladimir Pankratov',
    },
  },
});
