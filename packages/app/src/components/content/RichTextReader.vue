<script setup lang="ts">
import type { UniContentPage, UniItem } from '@delta-comic/client'
import { NAlert, NButton, NSpin } from 'naive-ui'
import { onMounted } from 'vue'

import { useTranslate } from '@/i18n'
import { useJmcomic } from '@/runtime/injection'
import { useAsyncTask } from '@/runtime/useAsyncTask'

import SafeRichText from './SafeRichText.vue'

const translate = useTranslate()

interface Props {
  page: UniContentPage
  union?: UniItem
}

const props = defineProps<Props>()
const { pages } = useJmcomic()
const content = useAsyncTask(signal => {
  if (!(props.page instanceof pages.blog || props.page instanceof pages.novel))
    throw new Error(translate('jmcomic.state.error'))
  return props.page.loadRichText(signal)
})
onMounted(content.run)
</script>

<template>
  <NSpin v-if="content.loading.value" class="flex justify-center p-12" />
  <NAlert
    v-else-if="content.error.value"
    type="error"
    class="m-4"
    :title="translate('jmcomic.state.error')"
  >
    <div class="flex flex-col gap-3">
      <span>{{ content.error.value.message }}</span>
      <NButton class="self-start" @click="content.run">{{
        translate('jmcomic.action.retry')
      }}</NButton>
    </div>
  </NAlert>
  <SafeRichText v-else-if="content.data.value" :html="content.data.value" />
  <p v-else class="p-8 text-center text-neutral-500">{{ translate('jmcomic.state.empty') }}</p>
</template>