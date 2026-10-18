import { afterAll, describe, expect, test } from 'vitest'

import { SortType } from '../src'

import { closeFallback, getTestAccount, getTestSdk } from './support/live'

describe.sequential('production API contract', () => {
  afterAll(closeFallback)

  test('discovers content navigation and recommendation data', { timeout: 60_000 }, async () => {
    const { sdk } = await getTestSdk()
    const [categories, promotes, week, tags, random, latest] = await Promise.all([
      sdk.promote.getCategories(),
      sdk.promote.getPromotes(),
      sdk.promote.getWeekBestCate(),
      sdk.promote.getHotTags(),
      sdk.promote.getRandomProvide(),
      sdk.promote.getLatest({ page: 1 }),
    ])
    expect(categories.categories.length).toBeGreaterThan(0)
    expect(promotes.length).toBeGreaterThan(0)
    expect(week.categories.length).toBeGreaterThan(0)
    expect(tags.every(tag => typeof tag === 'string')).toBe(true)
    expect(random.length).toBeGreaterThan(0)
    expect(latest.length).toBeGreaterThan(0)

    const promote = await sdk.promote.getPromoteItem({ id: Number(promotes[0]!.id), page: 1 })
    const weekList = await sdk.promote.getWeekBestList({
      id: Number(week.categories[0]!.id),
      type: week.type.at(-1)!.id,
    })
    expect(promote.total).toBeGreaterThanOrEqual(promote.list.length)
    expect(weekList.total).toBeGreaterThanOrEqual(weekList.list.length)
  })

  test(
    'searches comics and loads chapter, comment and category contracts',
    { timeout: 30_000 },
    async () => {
      const { sdk } = await getTestSdk()
      const result = await sdk.comic.searchByKeyword({
        keyword: '你',
        order: SortType.Relate,
        page: 1,
      })
      // Keep the chapter contract tied to a long-lived public fixture. The live search index can
      // temporarily return removed entries, for which the service intentionally says "illegal".
      const comicId = 350_234
      const detail = await sdk.comic.getInfo({ id: comicId })
      const categories = await sdk.promote.getCategories()
      const category = categories.categories[0]
      expect(category).toBeDefined()
      const [pages, comments, categoryResult] = await Promise.all([
        sdk.comic.getPages({ id: comicId }),
        sdk.comic.getComments({ id: comicId, page: 1 }),
        sdk.comic.searchByCategory({ category: category!.slug, order: SortType.Relate, page: 1 }),
      ])
      expect(result.total).toBeGreaterThanOrEqual(result.list.length)
      expect(String(detail.id)).toBe(String(comicId))
      expect(pages.every(path => path.startsWith('/media/photos/'))).toBe(true)
      expect(comments.total).toBeGreaterThanOrEqual(comments.list.length)
      expect(categoryResult.total).toBeGreaterThanOrEqual(categoryResult.list.length)
    },
  )

  test('parses posts and novels from real responses', { timeout: 30_000 }, async () => {
    const { sdk } = await getTestSdk()
    const blogs = await sdk.blog.search({
      page: 1,
      type: 'all',
      keyword: '',
      order: SortType.Relate,
    })
    const blog = await sdk.blog.getInfo({ id: blogs.list[0]!.id })
    const blogComments = await sdk.blog.getComments({ id: blogs.list[0]!.id, page: 1 })
    expect(blog.info.content).toEqual(expect.any(String))
    expect(blogComments.total).toBeGreaterThanOrEqual(blogComments.list.length)

    const novels = await sdk.novel.getPromoteList({ page: 1 })
    const searched = await sdk.novel.search({ keyword: novels.list[0]!.author, page: 1 })
    const novel = await sdk.novel.getInfo({ id: String(novels.list[0]!.id) })
    const content = await sdk.novel.getContent({ chapterId: novel.series[0]!.NCID, lang: 'cn' })
    expect(searched.total).toBeGreaterThanOrEqual(searched.list.length)
    expect(content.content).toEqual(expect.any(String))
  })

  test('follows a creator into gallery metadata and pages', { timeout: 30_000 }, async () => {
    const { sdk } = await getTestSdk()
    const creators = await sdk.book.search({ page: 1, keyword: '' })
    const creator = await sdk.book.getAuthorDetail({ id: String(creators.list[0]!.id) })
    const work = creator.related_works[0]!
    const [detail, pages] = await Promise.all([
      sdk.book.getBookDetail({ id: work.id }),
      sdk.book.getBookPages({ id: work.id }),
    ])
    expect(creator.author_id).toBe(String(creators.list[0]!.id))
    expect(detail.related_works).toEqual(expect.any(Array))
    expect(Number(pages.total_page)).toBeGreaterThanOrEqual(pages.images.length)
  })

  test.skipIf(!getTestAccount())(
    'uses the prepared account for authenticated read operations',
    { timeout: 30_000 },
    async () => {
      const { sdk } = await getTestSdk()
      const login = await sdk.auth.login(getTestAccount()!)
      const [profile, badges, titles, favorites, history] = await Promise.all([
        sdk.user.getUser({ uid: login.user.uid }),
        sdk.user.getAllBadges(),
        sdk.user.getAllTitles(),
        sdk.user.getFavoriteList({ page: 1 }),
        sdk.user.getHistory({ page: 1 }),
      ])
      expect(profile).toHaveProperty('nickName')
      expect(badges).toEqual(expect.any(Array))
      expect(titles).toEqual(expect.any(Array))
      expect(favorites.total).toBeGreaterThanOrEqual(favorites.list.length)
      expect(history.total).toBeGreaterThanOrEqual(history.list.length)
      expect(sdk.auth.session?.token).toBeTruthy()
    },
  )
})