<script setup lang="ts">
import type { UniItem } from '@delta-comic/client'
import { computed } from 'vue'

import ResolvedImage from '@/components/ResolvedImage.vue'

interface Props {
  item: UniItem
  freeHeight?: boolean
  disabled?: boolean
  type?: 'default' | 'big' | 'small'
}

interface Emits {
  click: []
}

const props = withDefaults(defineProps<Props>(), {
  freeHeight: false,
  disabled: false,
  type: 'default',
})
const emit = defineEmits<Emits>()

const compact = computed(() => props.type === 'small')
const open = () => {
  if (!props.disabled) emit('click')
}
</script>

<template>
  <article
    class="group relative flex cursor-pointer flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md dark:bg-neutral-900 dark:ring-white/10"
    :class="{ 'cursor-default opacity-60': disabled, 'flex-row': compact }"
    role="button"
    :tabindex="disabled ? -1 : 0"
    @click="open"
    @keydown.enter="open"
  >
    <div
      :class="compact ? 'aspect-square w-24 shrink-0' : freeHeight ? 'min-h-36' : 'aspect-[3/4]'"
      class="overflow-hidden bg-neutral-100 dark:bg-neutral-800"
    >
      <slot name="cover">
        <ResolvedImage
          class="size-full object-cover transition duration-300 group-hover:scale-105"
          :image="item.$cover"
          :alt="item.title"
        />
      </slot>
    </div>
    <div class="flex min-w-0 flex-1 flex-col gap-1 p-3">
      <slot name="smallTopInfo" />
      <h3 class="line-clamp-2 font-medium text-neutral-900 dark:text-neutral-100">
        {{ item.title }}
      </h3>
      <p v-if="item.author.length" class="truncate text-xs text-neutral-500">
        {{ item.author.map(author => author.label).join(' · ') }}
      </p>
      <div class="mt-auto flex gap-3 pt-2 text-xs text-neutral-500">
        <span v-if="item.viewNumber !== undefined">👁 {{ item.viewNumber }}</span>
        <span v-if="item.likeNumber !== undefined">♥ {{ item.likeNumber }}</span>
        <span v-if="item.epLength">{{ item.epLength }}</span>
      </div>
      <slot />
    </div>
  </article>
</template>