import { StreamQuery, type UniItem, type UniItemAuthor } from '@delta-comic/client'
import type { Content, Subscribe } from '@delta-comic/client'
import {
  SortType,
  type CommonBook,
  type CommonComic,
  type CommonNovel,
  type PromoteItem,
} from 'jmcomic-sdk'

import { createPagedStream } from '@/adapters/stream'
import { searchKeys, subscribeKeys } from '@/constants'
import type { createItems } from '@/models/items'
import type { PluginRuntime } from '@/runtime/PluginRuntime'

export const createSearch = (runtime: PluginRuntime, items: ReturnType<typeof createItems>) => {
  const {
    fromBlog,
    fromBookAuthor,
    fromCommonBook,
    fromCommonComic,
    fromCommonNovel,
    fromLessNovel,
  } = items
  const sorts = [
    { label: 'jmcomic.sort.relate', id: SortType.Relate },
    { label: 'jmcomic.sort.likes', id: SortType.Like },
    { label: 'jmcomic.sort.views', id: SortType.TotalViewBest },
  ] as const

  const comicSearch = createPagedStream<UniItem, { input: string; sort: string }>(
    async ({ input, sort }, page, signal) => {
      const result = input.startsWith('category:')
        ? await runtime.jm.comic.searchByCategory(
            {
              category: input.slice('category:'.length),
              order: Object.values(SortType).find(value => value === sort) ?? SortType.Relate,
              page,
            },
            signal,
          )
        : await runtime.jm.comic.searchByKeyword(
            {
              keyword: input,
              order: Object.values(SortType).find(value => value === sort) ?? SortType.Relate,
              page,
            },
            signal,
          )
      return { total: result.total, list: result.list.map(fromCommonComic) }
    },
  )

  const blogSearch = createPagedStream<UniItem, { input: string; sort: string }>(
    async ({ input, sort }, page, signal) => {
      const result = await runtime.jm.blog.search(
        {
          keyword: input,
          order: Object.values(SortType).find(value => value === sort) ?? SortType.Relate,
          page,
          type: 'all',
        },
        signal,
      )
      return { total: result.total, list: result.list.map(fromBlog) }
    },
  )

  const novelSearch = createPagedStream<UniItem, { input: string; sort: string }>(
    async ({ input }, page, signal) => {
      const result = await runtime.jm.novel.search({ keyword: input, page }, signal)
      return { total: result.total, list: result.list.map(fromCommonNovel) }
    },
  )

  const creatorSearch = createPagedStream<UniItem, { input: string; sort: string }>(
    async ({ input }, page, signal) => {
      const result = await runtime.jm.book.search({ keyword: input, page }, signal)
      return { total: result.total, list: result.list.map(fromBookAuthor) }
    },
  )

  const autocomplete = async (method: string, input: string, signal: AbortSignal) =>
    (await runtime.jm.promote.getHotTags(signal))
      .filter(tag => tag.toLocaleLowerCase().includes(input.toLocaleLowerCase()))
      .slice(0, 12)
      .map(tag => ({ input: tag, search: { method } }))

  const adaptSearchStream = (
    source: StreamQuery<UniItem, { input: string; sort: string }>,
    defaultSort: string,
  ) =>
    new StreamQuery<UniItem, { aim: Content.SearchAim }>(
      ({ aim }, page, signal) =>
        source.query({ input: aim.input, sort: aim.search.sort ?? defaultSort }, page, signal),
      source.initPage,
    )

  const searchMethods = {
    [searchKeys.keyword]: {
      id: searchKeys.keyword,
      name: 'jmcomic.search.comic',
      sorts: { options: [...sorts], default: SortType.Relate },
      fetchSearchResult: adaptSearchStream(comicSearch, SortType.Relate),
      getAutoComplete: (input, signal) => autocomplete(searchKeys.keyword, input, signal),
    },
    [searchKeys.blog]: {
      id: searchKeys.blog,
      name: 'jmcomic.search.blog',
      sorts: { options: [...sorts], default: SortType.Relate },
      fetchSearchResult: adaptSearchStream(blogSearch, SortType.Relate),
      getAutoComplete: (input, signal) => autocomplete(searchKeys.blog, input, signal),
    },
    [searchKeys.novel]: {
      id: searchKeys.novel,
      name: 'jmcomic.search.novel',
      sorts: {
        options: [{ label: 'jmcomic.sort.relate', id: SortType.Relate }],
        default: SortType.Relate,
      },
      fetchSearchResult: adaptSearchStream(novelSearch, SortType.Relate),
      getAutoComplete: (input, signal) => autocomplete(searchKeys.novel, input, signal),
    },
    [searchKeys.creator]: {
      id: searchKeys.creator,
      name: 'jmcomic.search.creator',
      sorts: {
        options: [{ label: 'jmcomic.sort.relate', id: SortType.Relate }],
        default: SortType.Relate,
      },
      fetchSearchResult: adaptSearchStream(creatorSearch, SortType.Relate),
      getAutoComplete: (input, signal) => autocomplete(searchKeys.creator, input, signal),
    },
  } satisfies Record<string, Content.SearchMethod>

  const mapPromoteContent = (promote: PromoteItem): UniItem[] =>
    promote.content.map(entry => {
      if ('category' in entry) return fromCommonComic(entry)
      if (promote.type.toLocaleLowerCase().includes('novel')) return fromLessNovel(entry)
      return fromCommonBook(entry)
    })

  const mapWeekContent = (entries: (CommonComic | CommonBook | CommonNovel)[], type: string) =>
    entries.map(entry => {
      if ('category' in entry) return fromCommonComic(entry)
      if (type.toLocaleLowerCase().includes('novel') && 'last_chapter_index' in entry)
        return fromCommonNovel(entry)
      return fromCommonBook(entry)
    })

  const authorStream = (
    source: StreamQuery<UniItem, { input: string; sort: string }>,
  ): Subscribe['fetchAuthorContent'] =>
    createPagedStream(async ({ author }: { author: UniItemAuthor }, page, signal) => {
      const result = await source.query(
        { input: author.label, sort: SortType.Relate },
        page,
        signal,
      )
      return {
        list: result.data,
        total: result.nextPage ? Number.MAX_SAFE_INTEGER : result.data.length,
      }
    })

  const createSubscribe = (
    source: StreamQuery<UniItem, { input: string; sort: string }>,
  ): Subscribe => {
    const fetchAuthorContent = authorStream(source)
    return {
      fetchAuthorContent,
      async getUpdateList(olds, signal) {
        const whichUpdated: UniItemAuthor[] = []
        for (const old of olds) {
          const latest = await fetchAuthorContent.query(
            { author: old.author },
            fetchAuthorContent.initPage,
            signal,
          )
          const known = new Set(old.list.map(item => item.id))
          if (latest.data.some(item => !known.has(item.id))) whichUpdated.push(old.author)
        }
        return { isUpdated: whichUpdated.length > 0, whichUpdated }
      },
    }
  }

  const subscribeSources = {
    [subscribeKeys.comicAuthor]: createSubscribe(comicSearch),
    [subscribeKeys.creator]: createSubscribe(creatorSearch),
    [subscribeKeys.novelAuthor]: createSubscribe(novelSearch),
  } as const

  const getSubscribe = (author: UniItemAuthor) => {
    switch (author.subscribe) {
      case subscribeKeys.creator:
        return subscribeSources[subscribeKeys.creator]
      case subscribeKeys.novelAuthor:
        return subscribeSources[subscribeKeys.novelAuthor]
      default:
        return subscribeSources[subscribeKeys.comicAuthor]
    }
  }

  const jmcomicSubscribe: Subscribe = {
    fetchAuthorContent: new StreamQuery(
      ({ author }, page, signal) =>
        getSubscribe(author).fetchAuthorContent.query({ author }, page, signal),
      1,
    ),
    async getUpdateList(olds, signal) {
      const whichUpdated: UniItemAuthor[] = []
      for (const old of olds) {
        const result = await getSubscribe(old.author).getUpdateList([old], signal)
        whichUpdated.push(...result.whichUpdated)
      }
      return { isUpdated: whichUpdated.length > 0, whichUpdated }
    },
  }

  const barcode: Content.Barcode = {
    id: 'jmcomic-id',
    name: 'jmcomic.search.barcode',
    isMatch: aim => /^(?:JM)?\s*\d+$/i.test(aim.input.trim()),
    getTipText: aim => `${runtime.translate('jmcomic.search.barcode')}: ${aim.input}`,
  }
  return {
    comicSearch,
    blogSearch,
    novelSearch,
    creatorSearch,
    searchMethods,
    mapPromoteContent,
    mapWeekContent,
    createSubscribe,
    jmcomicSubscribe,
    barcode,
  }
}