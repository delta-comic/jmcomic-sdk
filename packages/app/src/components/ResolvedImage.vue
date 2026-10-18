<script setup lang="ts">
import { UniImage, type UniImageRaw } from '@delta-comic/client'
import { onBeforeUnmount, shallowRef, watch } from 'vue'

interface Props {
  image: string | UniImage | UniImageRaw
  alt?: string
}

interface Emits {
  loaded: [url: string]
  error: [error: Error]
}

const props = withDefaults(defineProps<Props>(), { alt: '' })
const emit = defineEmits<Emits>()
const url = shallowRef('')
let revision = 0

watch(
  () => props.image,
  async image => {
    const current = ++revision
    try {
      const resolved =
        typeof image === 'string'
          ? image
          : await (UniImage.is(image) ? image : UniImage.create(image)).getUrl()
      if (current !== revision) return
      url.value = resolved
      emit('loaded', resolved)
    } catch (cause) {
      if (current !== revision) return
      emit('error', cause instanceof Error ? cause : new Error(String(cause)))
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => revision++)
</script>

<template>
  <img v-if="url" :src="url" :alt="alt" loading="lazy" decoding="async" />
  <div v-else class="animate-pulse bg-neutral-200 dark:bg-neutral-800" aria-hidden="true" />
</template>