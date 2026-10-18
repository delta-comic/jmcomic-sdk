<script setup lang="ts">
import {
  routeToContent,
  type UniContentPage,
  type UniItem,
  type UniComment,
} from '@delta-comic/client'
import { NAlert, NButton, NTabPane, NTabs } from 'naive-ui'
import { onMounted, shallowRef } from 'vue'

import JmCommentRow from '@/components/JmCommentRow.vue'
import JmItemCard from '@/components/JmItemCard.vue'
import { useTranslate } from '@/i18n'
import { useAsyncTask } from '@/runtime/useAsyncTask'

const props = defineProps<{ page: UniContentPage }>()
const translate = useTranslate()
const detail = useAsyncTask(signal => props.page.fetchDetail(signal))
const chapters = useAsyncTask(signal =>
  props.page.fetchEps.query({}, props.page.fetchEps.initPage, signal),
)
const recommends = useAsyncTask(signal =>
  props.page.fetchRecommends.query({}, props.page.fetchRecommends.initPage, signal),
)
const comments = shallowRef<UniComment[]>([])
let nextPage = props.page.fetchComments.initPage
const commentTask = useAsyncTask(async signal => {
  const result = await props.page.fetchComments.query({}, nextPage, signal)
  comments.value = [...comments.value, ...result.data]
  nextPage = result.nextPage ?? nextPage
  return result
})
const open = (item: UniItem) => routeToContent(item.contentType, item.id, item.$thisEp.id, item)
onMounted(() => Promise.all([detail.run(), chapters.run(), recommends.run(), commentTask.run()]))
</script>

<template>
  <section class="flex min-h-0 flex-col">
    <h1 class="p-4 text-2xl font-bold">{{ detail.data.value?.title ?? page.preload?.title }}</h1>
    <NAlert v-if="detail.error.value" type="error" class="m-4"
      >{{ detail.error.value.message
      }}<NButton @click="detail.run">{{ translate('jmcomic.action.retry') }}</NButton></NAlert
    >
    <NTabs type="line" class="px-4">
      <NTabPane name="read" :tab="translate('jmcomic.tab.read')"
        ><slot name="view" :item="detail.data.value"
      /></NTabPane>
      <NTabPane name="detail" :tab="translate('jmcomic.tab.detail')"
        ><p class="py-4 whitespace-pre-wrap">{{ detail.data.value?.description }}</p></NTabPane
      >
      <NTabPane name="chapters" :tab="translate('jmcomic.tab.chapters')"
        ><div class="flex flex-wrap gap-3 py-4">
          <NButton
            v-for="ep in chapters.data.value?.data"
            :key="ep.id"
            @click="routeToContent(page.contentType, page.id, ep.id, detail.data.value)"
            >{{ ep.name }}</NButton
          >
        </div></NTabPane
      >
      <NTabPane name="recommends" :tab="translate('jmcomic.tab.recommends')"
        ><div class="grid grid-cols-2 gap-4 py-4 md:grid-cols-4">
          <JmItemCard
            v-for="item in recommends.data.value?.data"
            :key="item.id"
            :item="item"
            @click="open(item)"
          /></div
      ></NTabPane>
      <NTabPane name="comments" :tab="translate('jmcomic.tab.comments')"
        ><template v-if="detail.data.value"
          ><JmCommentRow
            v-for="comment in comments"
            :key="comment.id"
            :comment="comment"
            :item="detail.data.value" /></template
        ><NButton
          v-if="commentTask.data.value?.nextPage"
          :loading="commentTask.loading.value"
          @click="commentTask.run"
          >{{ translate('jmcomic.action.more') }}</NButton
        ></NTabPane
      >
    </NTabs>
  </section>
</template>