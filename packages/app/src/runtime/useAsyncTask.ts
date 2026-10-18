import { onBeforeUnmount, shallowRef, type ShallowRef } from 'vue'

import { useJmcomic } from './injection'

export interface AsyncTask<T> {
  data: ShallowRef<T | undefined>
  error: ShallowRef<Error | undefined>
  loading: ShallowRef<boolean>
  run: () => Promise<T | undefined>
}

export const useAsyncTask = <T>(task: (signal: AbortSignal) => Promise<T>): AsyncTask<T> => {
  const { runtime } = useJmcomic()
  const data = shallowRef<T>()
  const error = shallowRef<Error>()
  const loading = shallowRef(false)
  let controller: AbortController | undefined

  const run = async () => {
    controller?.abort()
    const current = new AbortController()
    controller = current
    const signal = runtime.combineSignal(current.signal)
    loading.value = true
    error.value = undefined
    try {
      const result = await task(signal)
      if (signal.aborted) return undefined
      data.value = result
      return result
    } catch (cause) {
      if (!signal.aborted) error.value = cause instanceof Error ? cause : new Error(String(cause))
      return undefined
    } finally {
      if (!signal.aborted) loading.value = false
    }
  }

  onBeforeUnmount(() => controller?.abort())
  return { data, error, loading, run }
}