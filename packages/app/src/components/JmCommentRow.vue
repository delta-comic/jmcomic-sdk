<script setup lang="ts">
import type { UniComment, UniItem } from '@delta-comic/client'
import { NButton, NInput } from 'naive-ui'
import { ref } from 'vue'

import ResolvedImage from '@/components/ResolvedImage.vue'
import { useTranslate } from '@/i18n'

const translate = useTranslate()

interface Props {
  comment: UniComment
  item: UniItem
  parentComment?: UniComment
}

const props = defineProps<Props>()
const replying = ref(false)
const reply = ref('')
const sending = ref(false)
const error = ref('')

async function sendReply() {
  const text = reply.value.trim()
  if (!text) return
  sending.value = true
  error.value = ''
  try {
    await props.comment.sendComment(text)
    reply.value = ''
    replying.value = false
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause)
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <article
    class="flex gap-3 border-b border-neutral-200 py-4 last:border-0 dark:border-neutral-800"
  >
    <ResolvedImage
      v-if="comment.sender.avatar"
      class="size-10 shrink-0 rounded-full object-cover"
      :image="comment.sender.avatar"
      :alt="comment.sender.name"
    />
    <div
      v-else
      class="flex size-10 shrink-0 items-center justify-center rounded-full bg-neutral-200 font-medium dark:bg-neutral-800"
    >
      {{ comment.sender.name.slice(0, 1) }}
    </div>
    <div class="min-w-0 flex-1">
      <div class="flex flex-wrap items-center gap-2">
        <strong>{{ comment.sender.name }}</strong>
        <time class="text-xs text-neutral-500">{{ new Date(comment.time).toLocaleString() }}</time>
      </div>
      <p class="mt-2 text-sm leading-6 break-words whitespace-pre-wrap">
        {{ comment.content.text }}
      </p>
      <NButton
        v-if="item.commentSendable"
        text
        size="small"
        class="mt-2"
        @click="replying = !replying"
      >
        {{ translate('jmcomic.action.reply') }}
      </NButton>
      <div v-if="replying" class="mt-3 flex flex-col gap-2">
        <NInput
          v-model:value="reply"
          type="textarea"
          :placeholder="translate('jmcomic.comment.placeholder')"
        />
        <p v-if="error" class="text-sm text-red-500">{{ error }}</p>
        <NButton :loading="sending" type="primary" class="self-end" @click="sendReply">
          {{ translate('jmcomic.action.send') }}
        </NButton>
      </div>
    </div>
  </article>
</template>