<script setup lang="ts">
import type { UserEdit } from 'jmcomic-sdk'
import { NAlert, NButton, NForm, NFormItem, NInput, NSelect, NSpin } from 'naive-ui'
import { computed, onMounted, reactive, ref } from 'vue'

import { useTranslate } from '@/i18n'
import { useJmcomic } from '@/runtime/injection'
import { useAsyncTask } from '@/runtime/useAsyncTask'

const translate = useTranslate()

const { runtime } = useJmcomic()

const uid = computed(() => runtime.jm.auth.session?.user?.uid)
const form = reactive<Partial<UserEdit>>({})
const saved = ref(false)
const saving = ref(false)
const saveError = ref('')
const profile = useAsyncTask(async signal => {
  if (uid.value === undefined) throw new Error(translate('jmcomic.auth.required'))
  const value = await runtime.jm.user.getUser({ uid: uid.value }, signal)
  Object.assign(form, value)
  return value
})

const genderValue = computed<string>({
  get: () => form.gender ?? 'null',
  set: value => {
    form.gender = value === 'Male' || value === 'Female' ? value : null
  },
})
const genderOptions = [
  { label: translate('jmcomic.gender.male'), value: 'Male' },
  { label: translate('jmcomic.gender.female'), value: 'Female' },
  { label: translate('jmcomic.gender.unspecified'), value: 'null' },
]

async function save() {
  if (uid.value === undefined || !profile.data.value) return
  saving.value = true
  saved.value = false
  saveError.value = ''
  try {
    const updated = await runtime.jm.user.setUser(
      { uid: uid.value, user: { ...profile.data.value, ...form } },
      runtime.signal,
    )
    profile.data.value = updated
    saved.value = true
  } catch (cause) {
    saveError.value = cause instanceof Error ? cause.message : String(cause)
  } finally {
    saving.value = false
  }
}

onMounted(profile.run)
</script>

<template>
  <div class="p-4">
    <NSpin v-if="profile.loading.value" class="flex justify-center p-10" />
    <NAlert v-else-if="profile.error.value" type="error">{{ profile.error.value.message }}</NAlert>
    <NForm
      v-else-if="profile.data.value"
      label-placement="top"
      class="grid grid-cols-1 gap-x-4 md:grid-cols-2"
    >
      <NFormItem :label="translate('jmcomic.profile.nickname')">
        <NInput v-model:value="form.nickName" />
      </NFormItem>
      <NFormItem :label="translate('jmcomic.profile.email')">
        <NInput v-model:value="form.email" type="text" />
      </NFormItem>
      <NFormItem :label="translate('jmcomic.profile.gender')">
        <NSelect v-model:value="genderValue" :options="genderOptions" />
      </NFormItem>
      <NFormItem :label="translate('jmcomic.profile.website')">
        <NInput v-model:value="form.website" />
      </NFormItem>
      <NFormItem :label="translate('jmcomic.profile.about')" class="md:col-span-2">
        <NInput v-model:value="form.aboutMe" type="textarea" />
      </NFormItem>
      <div class="flex items-center justify-end gap-3 md:col-span-2">
        <span v-if="saved" class="text-sm text-green-600">{{
          translate('jmcomic.state.saved')
        }}</span>
        <span v-if="saveError" class="text-sm text-red-500">{{ saveError }}</span>
        <NButton type="primary" :loading="saving" @click="save">{{
          translate('jmcomic.action.save')
        }}</NButton>
      </div>
    </NForm>
  </div>
</template>