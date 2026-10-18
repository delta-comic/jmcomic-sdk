import type { PluginLocaleMessages } from '@delta-comic/client'

import { useJmcomic } from '@/runtime/injection'

import zhCN from './locales/zh-CN'

export const jmcomicMessages = { 'zh-CN': zhCN } satisfies PluginLocaleMessages
export const useTranslate = () => {
  const { runtime } = useJmcomic()
  return runtime.translate.bind(runtime)
}