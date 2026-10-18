import { SortType } from 'jmcomic-sdk'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { contentKeys, pluginName, searchKeys, subscribeKeys } from '@/constants'

import { createTestService } from '../../context'
const { service, runtime } = createTestService()

const {
  barcode,
  blogSearch,
  comicSearch,
  createSubscribe,
  creatorSearch,
  jmcomicSubscribe,
  mapPromoteContent,
  mapWeekContent,
  novelSearch,
  searchMethods,
} = service.search

const comic = {
  id: 1,
  name: 'Comic',
  author: 'Author',
  image: '/comic.jpg',
  category: { id: '1', title: 'Main' },
  category_sub: { id: '2', title: 'Sub' },
  is_favorite: false,
  liked: false,
} as never
const blog = {
  id: 2,
  uid: 1,
  username: 'Writer',
  title: 'Blog',
  tags: ['tag'],
  category: { name: 'news', slug: 'news' },
  content: 'body',
  photo: '/blog.jpg',
  total_views: 1,
  total_comments: 0,
  total_likes: 0,
} as never
const novel = {
  id: 3,
  author: 'Novelist',
  name: 'Novel',
  image: '/novel.jpg',
  liked: false,
  is_favorite: false,
  update_at: 1,
  likes: 0,
  last_chapter_index: 0,
  last_chapter_title: 'Chapter',
} as never
const creator = {
  id: 4,
  author_name: 'Creator',
  author_avatar: '/creator.jpg',
  background_image: '/banner.jpg',
  update_date: '2026-01-01',
} as never
const book = { id: 5, author: 'Creator', name: 'Book', image: '/book.jpg', update_at: 1 } as never

afterEach(() => vi.restoreAllMocks())

describe('search adapters', () => {
  test('routes comic keyword and category searches and maps all content domains', async () => {
    const keyword = vi
      .spyOn(runtime.jm.comic, 'searchByKeyword')
      .mockResolvedValue({ total: 1, list: [comic] })
    const category = vi
      .spyOn(runtime.jm.comic, 'searchByCategory')
      .mockResolvedValue({ total: 1, list: [comic] })
    vi.spyOn(runtime.jm.blog, 'search').mockResolvedValue({ total: 1, list: [blog] })
    vi.spyOn(runtime.jm.novel, 'search').mockResolvedValue({ total: 1, list: [novel] })
    vi.spyOn(runtime.jm.book, 'search').mockResolvedValue({ total: 1, list: [creator] })

    await expect(
      comicSearch.query({ input: 'word', sort: SortType.Relate }, 1),
    ).resolves.toMatchObject({ data: [{ id: '1' }] })
    await comicSearch.query({ input: 'category:main', sort: SortType.Like }, 1)
    await expect(
      blogSearch.query({ input: 'post', sort: SortType.Relate }, 1),
    ).resolves.toMatchObject({ data: [{ id: '2' }] })
    await expect(
      novelSearch.query({ input: 'novel', sort: SortType.Relate }, 1),
    ).resolves.toMatchObject({ data: [{ id: '3' }] })
    await expect(
      creatorSearch.query({ input: 'creator', sort: SortType.Relate }, 1),
    ).resolves.toMatchObject({ data: [{ id: '4' }] })
    expect(keyword).toHaveBeenCalledOnce()
    expect(category).toHaveBeenCalledWith(
      { category: 'main', order: SortType.Like, page: 1 },
      undefined,
    )
  })

  test('supports autocomplete, promote/week discriminators and JM barcode navigation', async () => {
    vi.spyOn(runtime.jm.promote, 'getHotTags').mockResolvedValue([
      'Alpha',
      'alphabet',
      'beta',
      ...Array.from({ length: 20 }, (_, index) => `alpha-${index}`),
    ])
    await expect(
      searchMethods[searchKeys.keyword].getAutoComplete!('ALP', new AbortController().signal),
    ).resolves.toHaveLength(12)

    expect(
      mapPromoteContent({
        id: 1,
        title: '',
        slug: '',
        filter_val: '',
        type: 'comic',
        content: [comic],
      }),
    ).toMatchObject([{ contentType: [pluginName, contentKeys.comic] }])
    expect(
      mapPromoteContent({
        id: 2,
        title: '',
        slug: '',
        filter_val: '',
        type: 'novel',
        content: [novel],
      }),
    ).toMatchObject([{ contentType: [pluginName, contentKeys.novel] }])
    expect(
      mapPromoteContent({
        id: 3,
        title: '',
        slug: '',
        filter_val: '',
        type: 'book',
        content: [book],
      }),
    ).toMatchObject([{ contentType: [pluginName, contentKeys.book] }])
    expect(mapWeekContent([comic], 'comic')[0]?.contentType).toEqual([
      pluginName,
      contentKeys.comic,
    ])
    expect(mapWeekContent([novel], 'novel')[0]?.contentType).toEqual([
      pluginName,
      contentKeys.novel,
    ])
    expect(mapWeekContent([book], 'book')[0]?.contentType).toEqual([pluginName, contentKeys.book])
    expect(barcode.isMatch({ input: ' JM 350234 ', search: { method: searchKeys.keyword } })).toBe(
      true,
    )
    expect(barcode.isMatch({ input: 'not-an-id', search: { method: searchKeys.keyword } })).toBe(
      false,
    )
  })

  test('detects author updates and exposes stable subscription streams', async () => {
    const source = {
      initPage: 1,
      query: vi.fn().mockResolvedValue({ data: [{ id: 'new' }], nextPage: 2 }),
    } as never
    const subscription = createSubscribe(source)
    const author = { $$plugin: pluginName, label: 'Author', icon: 'draw' } as never
    await expect(
      subscription.getUpdateList(
        [{ author, list: [{ id: 'old' }] as never }],
        new AbortController().signal,
      ),
    ).resolves.toEqual({ isUpdated: true, whichUpdated: [author] })
    await expect(subscription.fetchAuthorContent.query({ author }, 1)).resolves.toMatchObject({
      data: [{ id: 'new' }],
    })
  })

  test('keeps unchanged authors and routes subscription kinds', async () => {
    const source = {
      initPage: 1,
      query: vi.fn().mockResolvedValue({ data: [{ id: 'known' }], nextPage: undefined }),
    } as never
    const subscription = createSubscribe(source)
    const author = { $$plugin: pluginName, label: 'Author', icon: 'draw' } as never
    await expect(
      subscription.getUpdateList(
        [{ author, list: [{ id: 'known' }] as never }],
        new AbortController().signal,
      ),
    ).resolves.toEqual({ isUpdated: false, whichUpdated: [] })

    vi.spyOn(runtime.jm.comic, 'searchByKeyword').mockResolvedValue({ total: 0, list: [] })
    vi.spyOn(runtime.jm.novel, 'search').mockResolvedValue({ total: 0, list: [] })
    vi.spyOn(runtime.jm.book, 'search').mockResolvedValue({ total: 0, list: [] })
    for (const subscribe of [subscribeKeys.creator, subscribeKeys.novelAuthor, 'unknown']) {
      const subscribedAuthor = Object.assign({}, author, { subscribe }) as never
      await expect(
        jmcomicSubscribe.fetchAuthorContent.query({ author: subscribedAuthor }, 1),
      ).resolves.toBeDefined()
    }
    await expect(jmcomicSubscribe.getUpdateList([], new AbortController().signal)).resolves.toEqual(
      { isUpdated: false, whichUpdated: [] },
    )
  })
})