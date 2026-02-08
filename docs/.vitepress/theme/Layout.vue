<script setup lang="ts">
import DefaultTheme from 'vitepress/theme';
import { useData } from 'vitepress';
import { watchEffect } from 'vue';

const { Layout } = DefaultTheme;
const { frontmatter } = useData();

watchEffect(() => {
  if (typeof document !== 'undefined') {
    if (frontmatter.value.layout === 'home') {
      document.body.classList.add('is-home-page');
    } else {
      document.body.classList.remove('is-home-page');
    }
  }
});
</script>

<template>
  <Layout />
</template>
