<script setup lang="ts">
import type { UniUser } from '@delta-comic/client'
import { computed } from 'vue'

import ResolvedImage from '@/components/ResolvedImage.vue'
import { useTranslate } from '@/i18n'
import { useJmcomic } from '@/runtime/injection'

const translate = useTranslate()

interface Props {
  user: UniUser
  isSmall?: boolean
}

const props = withDefaults(defineProps<Props>(), { isSmall: false })
const { items } = useJmcomic()
const jmUser = computed(() => (props.user instanceof items.JmUser ? props.user : undefined))
</script>

<template>
  <section
    v-if="jmUser"
    class="flex gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10"
  >
    <ResolvedImage
      v-if="user.avatar"
      class="shrink-0 rounded-full object-cover"
      :class="isSmall ? 'size-12' : 'size-20'"
      :image="user.avatar"
      :alt="user.name"
    />
    <div class="min-w-0 flex-1">
      <h2 class="truncate text-lg font-semibold">{{ user.name }}</h2>
      <p class="text-sm text-neutral-500">
        {{ translate('jmcomic.user.level', { level: Number(jmUser.customUser.user.level) }) }} ·
        {{ jmUser.customUser.user.level_name }}
      </p>
      <div v-if="!isSmall" class="mt-3 grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
        <span>{{ translate('jmcomic.user.coin') }}: {{ jmUser.customUser.user.coin }}</span>
        <span>{{ translate('jmcomic.user.charge') }}: {{ jmUser.customUser.user.charge }}</span>
        <span
          >{{ translate('jmcomic.user.favorites') }}:
          {{ jmUser.customUser.user.album_favorites }}</span
        >
        <span
          >{{ translate('jmcomic.user.invited') }}: {{ jmUser.customUser.user.invited_cnt }}</span
        >
      </div>
    </div>
  </section>
</template>