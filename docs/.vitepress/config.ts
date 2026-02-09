import { defineConfig } from 'vitepress';
import { tabsMarkdownPlugin } from 'vitepress-plugin-tabs';

const guideSidebar = [
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
      { text: 'Cherry Pick', link: '/guide/cherry-pick' },
      { text: 'Stashing', link: '/guide/stashing' },
      { text: 'History & Blame', link: '/guide/history-blame' },
    ],
  },
  {
    text: 'Advanced Features',
    items: [
      { text: 'GitHub Integration', link: '/guide/github-integration' },
      { text: 'AI-Assisted Commits', link: '/guide/ai-commits' },
      { text: 'Git Hooks', link: '/guide/git-hooks' },
      { text: 'Reflog', link: '/guide/reflog' },
      { text: 'Bisect', link: '/guide/bisect' },
      { text: 'Worktrees', link: '/guide/worktrees' },
      { text: 'Submodules', link: '/guide/submodules' },
      { text: 'Git LFS', link: '/guide/git-lfs' },
      { text: 'GitFlow', link: '/guide/gitflow' },
    ],
  },
  {
    text: 'Customization',
    items: [
      { text: 'Custom Actions', link: '/guide/custom-actions' },
      { text: 'Keyboard Shortcuts', link: '/guide/keyboard-shortcuts' },
      { text: 'SSH Keys', link: '/guide/ssh-keys' },
      { text: 'Commit Signing', link: '/guide/commit-signing' },
      { text: 'Settings', link: '/guide/settings' },
    ],
  },
];

export default defineConfig({
  title: 'Axis',
  titleTemplate: ':title | Modern Git GUI',
  description: 'A modern, cross-platform Git GUI built with Tauri',
  base: '/',

  sitemap: {
    hostname: 'https://axis-git.app',
  },

  markdown: {
    config(md) {
      md.use(tabsMarkdownPlugin);
    },
  },

  head: [
    ['link', { rel: 'icon', type: 'image/png', href: '/favicon.png' }],
    ['meta', { name: 'theme-color', content: '#0078d4' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'Axis - Modern Git GUI' }],
    [
      'meta',
      {
        property: 'og:description',
        content: 'A modern, cross-platform Git GUI built with Tauri',
      },
    ],
    ['meta', { property: 'og:url', content: 'https://axis-git.app/' }],
    // Simple Analytics - privacy-friendly analytics (respects Do Not Track)
    [
      'script',
      {
        'data-collect-dnt': 'true',
        async: '',
        src: 'https://scripts.simpleanalyticscdn.com/latest.js',
      },
    ],
    [
      'noscript',
      {},
      '<img src="https://queue.simpleanalyticscdn.com/noscript.gif?collect-dnt=true" alt="" referrerpolicy="no-referrer-when-downgrade" />',
    ],
  ],

  locales: {
    root: {
      label: 'English',
      lang: 'en',
    },
    // Future translations:
  },

  themeConfig: {
    logo: '/logo.png',

    search: {
      provider: 'local',
    },

    nav: [{ text: 'Guide', link: '/guide/' }],

    sidebar: {
      '/guide/': guideSidebar,
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/Choochmeque/Axis' }],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 Vladimir Pankratov',
    },
  },
});
