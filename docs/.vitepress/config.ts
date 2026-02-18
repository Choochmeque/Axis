import { defineConfig } from 'vitepress';
import { tabsMarkdownPlugin } from 'vitepress-plugin-tabs';

const SITE_URL = 'https://axis-git.app';

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
  titleTemplate: ':title | Modern Git Client for Windows, macOS & Linux',
  description:
    'Axis is a modern Git GUI for Windows, macOS, and Linux. Features GitHub integration, AI-assisted commits, visual history, and native Rust performance.',
  base: '/',
  cleanUrls: true,

  sitemap: {
    hostname: SITE_URL,
  },

  transformHead({ pageData }) {
    // Build canonical URL with consistent trailing slash handling
    let canonicalUrl = `${SITE_URL}/${pageData.relativePath}`
      .replace(/index\.md$/, '')
      .replace(/\.md$/, '');

    // Remove trailing slash except for root URL (cleanUrls: true = no trailing slashes)
    if (canonicalUrl !== `${SITE_URL}/`) {
      canonicalUrl = canonicalUrl.replace(/\/$/, '');
    }

    const title = pageData.title || 'Axis';
    const description =
      pageData.description ||
      'Axis is a modern Git GUI for Windows, macOS, and Linux. Features GitHub integration, AI-assisted commits, visual history, and native Rust performance.';

    return [
      ['link', { rel: 'canonical', href: canonicalUrl }],
      ['meta', { property: 'og:url', content: canonicalUrl }],
      ['meta', { property: 'og:title', content: title }],
      ['meta', { property: 'og:description', content: description }],
      ['meta', { name: 'twitter:card', content: 'summary' }],
      ['meta', { name: 'twitter:url', content: canonicalUrl }],
      ['meta', { name: 'twitter:title', content: title }],
      ['meta', { name: 'twitter:description', content: description }],
    ];
  },

  markdown: {
    config(md) {
      md.use(tabsMarkdownPlugin);
    },
  },

  head: [
    ['link', { rel: 'icon', type: 'image/png', href: '/favicon.png' }],
    ['link', { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }],
    ['meta', { name: 'theme-color', content: '#0078d4' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'Axis' }],
    ['meta', { property: 'og:locale', content: 'en_US' }],
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
      '<img src="https://queue.simpleanalyticscdn.com/noscript.gif?collect-dnt=true" alt="Analytics" referrerpolicy="no-referrer-when-downgrade" />',
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
    logo: { src: '/logo.png', alt: 'Axis' },

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
