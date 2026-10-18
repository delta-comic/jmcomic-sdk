<script setup lang="ts">
import type { UniItem } from '@delta-comic/client'
import type { Content } from '@delta-comic/client'
import { routeToContent } from '@delta-comic/client'
import { computed } from 'vue'

import JmItemCard from '@/components/JmItemCard.vue'
import { useJmcomic } from '@/runtime/injection'

const { runtime, search: searchApi } = useJmcomic()

interface Props {
  isActive: boolean
  tabbar: Content.Tabbar
}

const props = defineProps<Props>()
const items = computed(() => runtime.promotes.flatMap(searchApi.mapPromoteContent))

const openItem = (item: UniItem) => routeToContent(item.contentType, item.id, item.$thisEp.id, item)
</script>

<template>
  <div v-show="isActive" class="grid grid-cols-2 gap-4 p-4 md:grid-cols-3 lg:grid-cols-5">
    <JmItemCard
      v-for="item in items"
      :key="`${String(item.contentType)}:${item.id}`"
      :item="item"
      @click="openItem(item)"
    />
  </div>
</template>