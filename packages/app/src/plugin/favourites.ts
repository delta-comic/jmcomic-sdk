import { type UniItem, type UniItemRaw } from '@delta-comic/client'

import { contentKeys, pluginName } from '@/constants'
import type { createItems } from '@/models/items'
import type { PluginRuntime } from '@/runtime/PluginRuntime'

export const createFavourites = (runtime: PluginRuntime, items: ReturnType<typeof createItems>) => {
  const { fromCommonComic } = items
  const downloadFavorites = async (signal: AbortSignal) => {
    const items: UniItem[] = []
    for (let page = 1; ; page += 1) {
      const result = await runtime.jm.user.getFavoriteList({ page }, signal)
      items.push(...result.list.map(fromCommonComic))
      if (result.list.length === 0 || items.length >= result.total) return items
    }
  }

  const uploadFavorites = async (items: UniItemRaw[], signal: AbortSignal) => {
    await Promise.all(
      items
        .filter(item => {
          const type = item.contentType
          return Array.isArray(type) && type[0] === pluginName && type[1] === contentKeys.comic
        })
        .map(item => runtime.jm.comic.favorite({ id: item.id }, signal)),
    )
  }
  return { downloadFavorites, uploadFavorites }
}