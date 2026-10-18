<script setup lang="ts">
import type { UniContentPage, UniItem } from '@delta-comic/client'
import { NAlert, NButton, NSpin } from 'naive-ui'
import { onMounted } from 'vue'

import JmItemCard from '@/components/JmItemCard.vue'
import ResolvedImage from '@/components/ResolvedImage.vue'
import { useTranslate } from '@/i18n'
import { image } from '@/models/items'
import { useJmcomic } from '@/runtime/injection'
import { useAsyncTask } from '@/runtime/useAsyncTask'

const translate = useTranslate()

interface Props {
  page: UniContentPage
  union?: UniItem
}

const props = defineProps<Props>()
const { items: itemModels, pages } = useJmcomic()
const creator = useAsyncTask(signal => {
  if (!(props.page instanceof pages['book-author']))
    throw new Error(translate('jmcomic.state.error'))
  return props.page.loadAuthor(signal)
})
onMounted(creator.run)
</script>

<template>
  <NSpin v-if="creator.loading.value" class="flex justify-center p-12" />
  <NAlert
    v-else-if="creator.error.value"
    type="error"
    class="m-4"
    :title="translate('jmcomic.state.error')"
  >
    <div class="flex flex-col gap-3">
      <span>{{ creator.error.value.message }}</span>
      <NButton class="self-start" @click="creator.run">{{
        translate('jmcomic.action.retry')
      }}</NButton>
    </div>
  </NAlert>
  <div v-else-if="creator.data.value" class="flex flex-col gap-6 p-4">
    <div class="relative overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-900">
      <ResolvedImage
        class="h-48 w-full object-cover opacity-60"
        :image="image(creator.data.value.background_image)"
        :alt="creator.data.value.author_name"
      />
      <div
        class="absolute inset-0 flex items-end gap-4 bg-gradient-to-t from-black/80 to-transparent p-5 text-white"
      >
        <ResolvedImage
          class="size-20 rounded-full object-cover"
          :image="image(creator.data.value.author_avatar)"
          :alt="creator.data.value.author_name"
        />
        <h1 class="text-2xl font-bold">{{ creator.data.value.author_name }}</h1>
      </div>
    </div>
    <div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      <JmItemCard
        v-for="work in creator.data.value.related_works"
        :key="String(work.id)"
        :item="itemModels.fromRelatedBook(work)"
      />
    </div>
  </div>
  <p v-else class="p-8 text-center text-neutral-500">{{ translate('jmcomic.state.empty') }}</p>
</template>