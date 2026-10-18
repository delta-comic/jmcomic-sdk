import type { Content } from '@delta-comic/client'
import { SortType } from 'jmcomic-sdk'

import type { createSearch } from '@/adapters/search'
import ReaderLayout from '@/components/content/ReaderLayout.vue'
import JmCommentRow from '@/components/JmCommentRow.vue'
import JmItemCard from '@/components/JmItemCard.vue'
import PromoteTab from '@/components/search/PromoteTab.vue'
import WeekBestTab from '@/components/search/WeekBestTab.vue'
import { searchKeys } from '@/constants'
import type { createItems } from '@/models/items'
import type { createPages } from '@/models/pages'
import type { JmcomicRuntimeService } from '@/runtime/cordis'
import { bindComponent } from '@/runtime/injection'
import type { PluginRuntime } from '@/runtime/PluginRuntime'

export const createContent = (
  runtime: PluginRuntime,
  items: ReturnType<typeof createItems>,
  searchApi: ReturnType<typeof createSearch>,
  contentPages: ReturnType<typeof createPages>,
  service: JmcomicRuntimeService,
) => {
  const { fromCommonComic, translateItem } = items
  const { barcode, searchMethods } = searchApi
  const categories: Content.Category[] = []

  const search: Content.Search = {
    methods: Object.values(searchMethods),
    barcode: [barcode],
    async getHotSearch(signal) {
      return (await runtime.jm.promote.getHotTags(signal)).map(input => ({
        input,
        search: { method: searchKeys.keyword },
      }))
    },
  }

  const promotes: Content.Promotes = {
    categories,
    fetchRandomItems: async signal =>
      (await runtime.jm.promote.getRandomProvide(signal)).map(fromCommonComic),
    tabbar: [
      { comp: bindComponent(PromoteTab, service), id: 'promotes', title: 'jmcomic.search.comic' },
      {
        comp: bindComponent(WeekBestTab, service),
        id: 'week-best',
        title: 'jmcomic.search.weekly',
      },
    ],
    hotPageContent: {
      levelboard: [
        {
          id: 'most-viewed',
          name: 'jmcomic.sort.views',
          content: async signal =>
            (
              await runtime.jm.comic.searchByKeyword(
                { keyword: '', order: SortType.TotalViewBest, page: 1 },
                signal,
              )
            ).list.map(fromCommonComic),
        },
        {
          id: 'latest',
          name: 'jmcomic.search.comic',
          content: async signal =>
            (await runtime.jm.promote.getLatest({ page: 1 }, signal)).map(fromCommonComic),
        },
      ],
    },
  }

  const models: Content.Model[] = Object.entries(contentPages).map(([name, ContentPage]) => ({
    name,
    ItemCard: bindComponent(JmItemCard, service),
    CommentRow: bindComponent(JmCommentRow, service),
    get Layout() {
      return bindComponent(ReaderLayout, service)
    },
    ContentPage,
    ItemTranslator: translateItem,
  }))

  const content = { models, search, promotes }
  return content
}