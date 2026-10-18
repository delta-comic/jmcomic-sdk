<script setup lang="ts">
import type { UniItem } from '@delta-comic/client'
import type { Content } from '@delta-comic/client'
import { routeToContent } from '@delta-comic/client'
import { NAlert, NButton, NSelect, NSpin } from 'naive-ui'
import { computed, onMounted, ref, watch } from 'vue'

import JmItemCard from '@/components/JmItemCard.vue'
import { useTranslate } from '@/i18n'
import { useJmcomic } from '@/runtime/injection'
import { useAsyncTask } from '@/runtime/useAsyncTask'

const { runtime, search: searchApi } = useJmcomic()

const translate = useTranslate()

interface Props {
  isActive: boolean
  tabbar: Content.Tabbar
}

const props = defineProps<Props>()
const category = ref(runtime.weekBest?.categories[0]?.id ?? '')
const type = ref(runtime.weekBest?.type.at(-1)?.id ?? '')
const categoryOptions = computed(() =>
  (runtime.weekBest?.categories ?? []).map(entry => ({
    label: entry.title || entry.time,
    value: entry.id,
  })),
)
const typeOptions = computed(() =>
  (runtime.weekBest?.type ?? []).map(entry => ({ label: entry.title, value: entry.id })),
)
const list = useAsyncTask(async signal => {
  if (!category.value || !type.value) return []
  const result = await runtime.jm.promote.getWeekBestList(
    { id: Number(category.value), type: type.value },
    signal,
  )
  return searchApi.mapWeekContent(result.list, type.value)
})

const openItem = (item: UniItem) => routeToContent(item.contentType, item.id, item.$thisEp.id, item)

watch([category, type], () => void list.run())
watch(
  () => props.isActive,
  active => active && !list.data.value && void list.run(),
)
onMounted(() => props.isActive && void list.run())
</script>

<template>
  <div v-show="isActive" class="flex flex-col">
    <div class="sticky top-0 z-10 flex gap-3 bg-white/90 p-3 backdrop-blur dark:bg-neutral-950/90">
      <NSelect
        v-model:value="category"
        :options="categoryOptions"
        :placeholder="translate('jmcomic.week.category')"
      />
      <NSelect
        v-model:value="type"
        :options="typeOptions"
        :placeholder="translate('jmcomic.week.type')"
      />
    </div>
    <NSpin v-if="list.loading.value" class="flex justify-center p-12" />
    <NAlert v-else-if="list.error.value" type="error" class="m-4">
      <div class="flex flex-col gap-3">
        <span>{{ list.error.value.message }}</span>
        <NButton class="self-start" @click="list.run">{{
          translate('jmcomic.action.retry')
        }}</NButton>
      </div>
    </NAlert>
    <div v-else class="grid grid-cols-2 gap-4 p-4 md:grid-cols-3 lg:grid-cols-5">
      <JmItemCard
        v-for="item in list.data.value"
        :key="`${String(item.contentType)}:${item.id}`"
        :item="item"
        @click="openItem(item)"
      />
    </div>
  </div>
</template>