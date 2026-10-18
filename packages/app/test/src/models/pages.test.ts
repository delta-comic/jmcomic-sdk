import type {
  BlogDetail,
  BookAuthor,
  BookContents,
  BookRelates,
  FullComic,
  FullNovel,
} from 'jmcomic-sdk'
import { describe, expect, test, vi } from 'vitest'

import { createTestService } from '../../context'
const { service, runtime } = createTestService()

const {
  blog: BlogPage,
  'book-author': BookAuthorPage,
  book: BookPage,
  comic: ComicPage,
  novel: NovelPage,
} = service.pages

const expInfo = {
  level_name: 'Level',
  level: 1,
  exp: 0,
  nextLevelExp: 1,
  expPercent: 0,
  uid: 1,
  badges: [],
}
const comic: FullComic = {
  id: 42,
  name: 'Comic',
  is_favorite: false,
  liked: false,
  images: ['cover.jpg'],
  addtime: 1,
  description: 'Description',
  total_views: 10,
  series: [{ id: 7, name: 'Chapter', sort: '1' }],
  series_id: 7,
  comment_total: 0,
  author: ['Author'],
  tags: ['Tag'],
  works: [],
  actors: [],
  related_list: [{ id: 43, author: 'Related', name: 'Related', image: '/related.jpg' }],
  is_aids: false,
  purchased: '',
  price: '',
  likes: 3,
}
const blog: BlogDetail = {
  info: {
    id: 2,
    uid: 1,
    total_views: 1,
    total_comments: 0,
    total_likes: 0,
    username: 'tester',
    title: 'Post',
    tags: ['tag'],
    category: { name: 'type', slug: 'type' },
    content: '<p>Post</p>',
    photo: '/post.jpg',
    nickname: 'Tester',
    expInfo,
    is_liked: false,
  },
  related_blogs: [],
  related_comics: comic.related_list,
}
const novel: FullNovel = {
  id: 3,
  series_id: 9,
  name: 'Novel',
  images: '/novel.jpg',
  addtime: 1,
  description: 'Novel',
  total_views: 1,
  likes: 1,
  is_end: 0,
  serial_status: '',
  author: 'Writer',
  tags: ['tag'],
  liked: false,
  is_favorite: false,
  series: [
    {
      NCID: 9,
      title: 'Chapter',
      sort: 1,
      created_at: '',
      status: 1,
      on_at: '',
      buy_nc: 0,
      is_need_buy_nc: 0,
      is_need_login: 0,
      id: 9,
      name: 'Chapter',
      new: false,
      purchased: true,
    },
  ],
  related_list: [],
  comment_total: [],
}
const author: BookAuthor = {
  work_title: '',
  work_date: '',
  author_id: '4',
  author_name: 'Creator',
  author_avatar: '/avatar.jpg',
  background_image: '/banner.jpg',
  sponsor: [],
  related_works: [
    { id: 5, work_image: '/work.jpg', work_title: 'Work', work_date: '', platform_name: '' },
  ],
  filters: { language: [], source: [] },
}
const bookContents: BookContents = {
  id: 5,
  name: 'Work',
  total_page: 1,
  images: [{ page: 0, image: 'https://example.com/work.jpg' }],
  content: '<p>Work</p>',
  addtime: 0,
  adddt: '',
}
const bookDetail: BookRelates = {
  work_date: '',
  author_name: 'Creator',
  work_title: 'Work',
  related_works: author.related_works,
}

describe('content page adapters', () => {
  test('loads the complete comic surface', async () => {
    vi.spyOn(runtime.jm.comic, 'getInfo').mockResolvedValue(comic)
    vi.spyOn(runtime.jm.comic, 'getPages').mockResolvedValue(['/page.webp'])
    vi.spyOn(runtime.jm.comic, 'getComments').mockResolvedValue({ total: 0, list: [] })
    const page = new ComicPage(undefined, '42', '7')
    await expect(page.fetchShortId()).resolves.toBe('JM42')
    await expect(page.fetchDetail()).resolves.toMatchObject({ id: '42', title: 'Comic' })
    await expect(page.fetchRecommends.query({}, 1)).resolves.toMatchObject({ data: [{ id: '43' }] })
    await expect(page.fetchComments.query({}, 1)).resolves.toEqual({
      data: [],
      nextPage: undefined,
    })
    await expect(page.fetchEps.query({}, 1)).resolves.toMatchObject({ data: [{ id: '7' }] })
    const images = await page.fetchImages()
    expect(images[0]?.processSteps).toEqual([{ referenceName: 'comicDecode', ignoreExit: false }])
  })

  test('loads post rich text, related content, and comments', async () => {
    vi.spyOn(runtime.jm.blog, 'getInfo').mockResolvedValue(blog)
    vi.spyOn(runtime.jm.blog, 'getComments').mockResolvedValue({ total: 0, list: [] })
    const page = new BlogPage(undefined, '2', '')
    await expect(page.fetchShortId()).resolves.toBe('BLOG-2')
    await expect(page.fetchDetail()).resolves.toMatchObject({ id: '2', title: 'Post' })
    await expect(page.loadRichText()).resolves.toBe('<p>Post</p>')
    await expect(page.fetchRecommends.query({}, 1)).resolves.toMatchObject({ data: [{ id: '43' }] })
    await expect(page.fetchComments.query({}, 1)).resolves.toEqual({
      data: [],
      nextPage: undefined,
    })
    await expect(page.fetchEps.query({}, 1)).resolves.toMatchObject({ data: [{ id: '2' }] })
  })

  test('loads novel chapters and structured content', async () => {
    vi.spyOn(runtime.jm.novel, 'getInfo').mockResolvedValue(novel)
    vi.spyOn(runtime.jm.novel, 'getContent').mockResolvedValue({
      content: '<p>Novel chapter</p>',
    } as never)
    const page = new NovelPage(undefined, '3', '9')
    await expect(page.fetchShortId()).resolves.toBe('NOVEL-3')
    await expect(page.fetchDetail()).resolves.toMatchObject({ id: '3', title: 'Novel' })
    await expect(page.loadRichText()).resolves.toBe('<p>Novel chapter</p>')
    await expect(page.fetchEps.query({}, 1)).resolves.toMatchObject({ data: [{ id: '9' }] })
    await expect(page.fetchComments.query({}, 1)).resolves.toEqual({ data: [] })
  })

  test('separates creator and gallery routes', async () => {
    vi.spyOn(runtime.jm.book, 'getAuthorDetail').mockResolvedValue(author)
    vi.spyOn(runtime.jm.book, 'getBookDetail').mockResolvedValue(bookDetail)
    vi.spyOn(runtime.jm.book, 'getBookPages').mockResolvedValue(bookContents)
    const creatorPage = new BookAuthorPage(undefined, '4', '')
    const bookPage = new BookPage(undefined, '5', '')
    await expect(creatorPage.fetchShortId()).resolves.toBe('CREATOR-4')
    await expect(creatorPage.fetchDetail()).resolves.toMatchObject({ id: '4', title: 'Creator' })
    await expect(creatorPage.fetchRecommends.query({}, 1)).resolves.toMatchObject({
      data: [{ id: '5' }],
    })
    await expect(creatorPage.fetchComments.query({}, 1)).resolves.toEqual({ data: [] })
    await expect(creatorPage.fetchEps.query({}, 1)).resolves.toMatchObject({ data: [{ id: '5' }] })
    await expect(bookPage.fetchShortId()).resolves.toBe('BOOK-5')
    await expect(bookPage.fetchDetail()).resolves.toMatchObject({ id: '5', title: 'Work' })
    await expect(bookPage.loadPages()).resolves.toBe(bookContents)
    await expect(bookPage.fetchRecommends.query({}, 1)).resolves.toMatchObject({
      data: [{ id: '5' }],
    })
    await expect(bookPage.fetchComments.query({}, 1)).resolves.toEqual({ data: [] })
    await expect(bookPage.fetchEps.query({}, 1)).resolves.toMatchObject({ data: [{ id: '5' }] })
  })
})