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
    logo: '/logo.svg',

    nav: [{ text: 'GitHub', link: 'https://github.com/choochmeque/Axis' }],

    socialLinks: [{ icon: 'github', link: 'https://github.com/choochmeque/Axis' }],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 Vladimir Pankratov',
    },
  },
});
