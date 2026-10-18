<script setup lang="ts">
import { NAlert, NButton, NRadio, NRadioGroup, NSpin } from 'naive-ui'
import { onMounted, ref } from 'vue'

import { useTranslate } from '@/i18n'
import { useJmcomic } from '@/runtime/injection'
import { useAsyncTask } from '@/runtime/useAsyncTask'

const translate = useTranslate()

const { runtime } = useJmcomic()

const selected = ref('')
const saving = ref(false)
const error = ref('')
const titles = useAsyncTask(signal => runtime.jm.user.getAllTitles(signal))

async function save() {
  if (!selected.value) return
  saving.value = true
  error.value = ''
  try {
    await runtime.jm.user.setTitles({ id: selected.value })
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause)
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  const result = await titles.run()
  selected.value = result?.find(title => title.done)?.id ?? ''
})
</script>

<template>
  <div class="flex flex-col gap-4 p-4">
    <NSpin v-if="titles.loading.value" class="flex justify-center p-8" />
    <NAlert v-else-if="titles.error.value" type="error">{{ titles.error.value.message }}</NAlert>
    <NRadioGroup v-else v-model:value="selected" class="grid grid-cols-1 gap-3 md:grid-cols-2">
      <NRadio
        v-for="title in titles.data.value"
        :key="title.id"
        :value="title.id"
        class="rounded-xl bg-neutral-100 p-3 dark:bg-neutral-900"
      >
        {{ title.name }}
      </NRadio>
    </NRadioGroup>
    <NAlert v-if="error" type="error">{{ error }}</NAlert>
    <NButton type="primary" :loading="saving" class="self-end" @click="save">{{
      translate('jmcomic.action.save')
    }}</NButton>
  </div>
</template>