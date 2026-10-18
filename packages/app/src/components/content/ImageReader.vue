<script setup lang="ts">
import type { UniContentPage, UniItem } from '@delta-comic/client'
import { NAlert, NButton, NSpin } from 'naive-ui'
import { onMounted } from 'vue'

import ResolvedImage from '@/components/ResolvedImage.vue'
import { useTranslate } from '@/i18n'
import { useJmcomic } from '@/runtime/injection'
import { useAsyncTask } from '@/runtime/useAsyncTask'

const props = defineProps<{ page: UniContentPage; union?: UniItem }>()
const translate = useTranslate()
const { pages } = useJmcomic()
const images = useAsyncTask(signal => {
  if (!(props.page instanceof pages.comic || props.page instanceof pages.book)) {
    throw new Error(translate('jmcomic.state.error'))
  }
  return props.page.fetchImages(signal)
})
onMounted(images.run)
</script>

<template>
  <NSpin v-if="images.loading.value" class="flex justify-center p-12" />
  <NAlert v-else-if="images.error.value" type="error" class="m-4">
    {{ images.error.value.message }}
    <NButton @click="images.run">{{ translate('jmcomic.action.retry') }}</NButton>
  </NAlert>
  <div v-else class="mx-auto flex max-w-5xl flex-col">
    <ResolvedImage
      v-for="(image, index) in images.data.value"
      :key="index"
      :image="image"
      :alt="translate('jmcomic.reader.page', { page: index + 1 })"
      class="h-auto w-full"
    />
  </div>
</template>