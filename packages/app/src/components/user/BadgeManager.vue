<script setup lang="ts">
import type { BadgeItem } from 'jmcomic-sdk'
import { NAlert, NButton, NSpin, NTabPane, NTabs } from 'naive-ui'
import { onMounted, ref } from 'vue'

import { useTranslate } from '@/i18n'
import { image } from '@/models/items'
import { useJmcomic } from '@/runtime/injection'
import { useAsyncTask } from '@/runtime/useAsyncTask'

import ResolvedImage from '../ResolvedImage.vue'

const translate = useTranslate()

const { runtime } = useJmcomic()

const operationError = ref('')
const operationLoading = ref(false)
const all = useAsyncTask(signal => runtime.jm.user.getAllBadges(signal))
const mine = useAsyncTask(signal => runtime.jm.user.getMyBadges(signal))

function move(index: number, offset: number) {
  const list = mine.data.value
  if (!list) return
  const target = index + offset
  if (target < 0 || target >= list.length) return
  ;[list[index], list[target]] = [list[target], list[index]]
  mine.data.value = [...list]
}

async function run(operation: () => Promise<unknown>) {
  operationLoading.value = true
  operationError.value = ''
  try {
    await operation()
    await Promise.all([all.run(), mine.run()])
  } catch (cause) {
    operationError.value = cause instanceof Error ? cause.message : String(cause)
  } finally {
    operationLoading.value = false
  }
}

const buy = (badge: BadgeItem) => run(() => runtime.jm.user.buyBadge({ badgeId: badge.id }))
const saveOrder = () =>
  run(() =>
    runtime.jm.user.changeBadgesOrder({
      idList: (mine.data.value ?? []).map(badge => String(badge.id)),
    }),
  )

onMounted(() => void Promise.all([all.run(), mine.run()]))
</script>

<template>
  <div class="p-4">
    <NAlert v-if="operationError" type="error" class="mb-3">{{ operationError }}</NAlert>
    <NTabs type="segment">
      <NTabPane name="mine" :tab="translate('jmcomic.badge.mine')">
        <NSpin v-if="mine.loading.value" class="flex justify-center p-8" />
        <div v-else class="flex flex-col gap-3 pt-3">
          <div
            v-for="(badge, index) in mine.data.value"
            :key="String(badge.id)"
            class="flex items-center gap-3 rounded-xl bg-neutral-100 p-3 dark:bg-neutral-900"
          >
            <ResolvedImage
              class="size-12 rounded-lg object-cover"
              :image="image(badge.content)"
              :alt="badge.name"
            />
            <strong class="min-w-0 flex-1 truncate">{{ badge.name }}</strong>
            <NButton size="small" :disabled="index === 0" @click="move(index, -1)">↑</NButton>
            <NButton
              size="small"
              :disabled="index === (mine.data.value?.length ?? 0) - 1"
              @click="move(index, 1)"
              >↓</NButton
            >
          </div>
          <NButton type="primary" :loading="operationLoading" class="self-end" @click="saveOrder">
            {{ translate('jmcomic.action.saveOrder') }}
          </NButton>
        </div>
      </NTabPane>
      <NTabPane name="all" :tab="translate('jmcomic.badge.all')">
        <NSpin v-if="all.loading.value" class="flex justify-center p-8" />
        <div v-else class="grid grid-cols-1 gap-3 pt-3 md:grid-cols-2">
          <div
            v-for="badge in all.data.value"
            :key="String(badge.id)"
            class="flex items-center gap-3 rounded-xl bg-neutral-100 p-3 dark:bg-neutral-900"
          >
            <ResolvedImage
              class="size-12 rounded-lg object-cover"
              :image="image(badge.content)"
              :alt="badge.name"
            />
            <div class="min-w-0 flex-1">
              <strong class="block truncate">{{ badge.name }}</strong>
              <span class="text-xs text-neutral-500">{{ badge.coin }} coin</span>
            </div>
            <NButton
              size="small"
              :disabled="badge.done"
              :loading="operationLoading"
              @click="buy(badge)"
            >
              {{ badge.done ? translate('jmcomic.badge.owned') : translate('jmcomic.badge.buy') }}
            </NButton>
          </div>
        </div>
      </NTabPane>
    </NTabs>
  </div>
</template>