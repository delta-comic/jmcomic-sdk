import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

import { JMComic } from '../../src'

const category = { id: 1, title: '分类' }
const comic = {
  id: 1,
  name: '测试漫画',
  is_favorite: false,
  liked: false,
  author: '测试作者',
  image: '/media/albums/1_3x4.jpg',
  category,
  category_sub: category,
  update_at: 1,
}
const fullComic = {
  ...comic,
  images: ['00001.webp'],
  addtime: 1,
  description: '测试简介',
  total_views: 1,
  series: [{ id: 1, name: '第一话', sort: '1' }],
  series_id: 1,
  comment_total: 0,
  author: ['测试作者'],
  tags: ['测试'],
  works: [],
  actors: [],
  related_list: [],
  is_aids: false,
  purchased: '',
  price: '',
  likes: 0,
}
const blog = {
  id: 1,
  uid: 1,
  gid: null,
  total_views: 1,
  total_comments: 0,
  total_likes: 0,
  username: 'tester',
  user_photo: 'nopic.gif',
  gender: '',
  game_url: null,
  title: '测试图文',
  tags: ['测试'],
  category: { name: '测试', slug: 'test' },
  content: '<p>测试正文</p>',
  photo: '/media/blog/1.jpg',
  date: '2026-01-01',
}
const expInfo = {
  level_name: '测试称号',
  level: 1,
  exp: 0,
  nextLevelExp: 1,
  expPercent: 0,
  uid: 1,
  badges: [],
}
const novelSeries = {
  NCID: 1,
  title: '第一章',
  sort: 1,
  created_at: '2026-01-01',
  status: 1,
  on_at: '2026-01-01',
  buy_nc: 0,
  is_need_buy_nc: 0,
  is_need_login: 0,
  id: 1,
  name: '第一章',
  new: false,
  purchased: true,
}
const novel = {
  id: 1,
  author: '测试作者',
  name: '测试小说',
  image: '/media/novels/1.jpg',
  liked: false,
  is_favorite: false,
  update_at: 1,
  likes: 0,
  last_chapter_index: 0,
  last_chapter_title: '第一章',
}
const relatedBook = {
  id: 1,
  work_image: '/media/library/1.jpg',
  work_title: '测试画册',
  work_date: '1 days ago',
  platform_name: 'test',
}
const user = {
  ...expInfo,
  ad_free: false,
  ad_free_before: '',
  album_favorites: 0,
  album_favorites_max: 100,
  charge: '0',
  coin: 0,
  email: 'test@example.invalid',
  emailverified: '0',
  fname: 'tester',
  gender: 'Male',
  invitation_qrcode: '',
  invitation_url: '',
  invited_cnt: 0,
  jar: '',
  jwttoken: 'fallback-token',
  message: '',
  photo: 'nopic.gif',
  s: 'fallback-avs',
  username: 'tester',
}
const userEdit = {
  aboutMe: '',
  birthPlace: '',
  birthday: '',
  city: '',
  collections: '',
  company: '',
  country: '',
  erogenic: '',
  email: 'test@example.invalid',
  favorite: '',
  firstName: '',
  gender: 'Male',
  hate: '',
  ideal: '',
  infoHere: '',
  lastName: '',
  nickName: 'tester',
  occupation: '',
  password: '',
  password_confirm: '',
  relations: '',
  school: '',
  sexuality: '',
  status: '',
  website: '',
}

const responseFor = (url: URL) => {
  switch (url.pathname) {
    case '/categories':
      return { categories: [{ id: 1, name: '测试', slug: 'test', total_albums: 1 }], blocks: [] }
    case '/categories/filter':
    case '/search':
      return { total: 1, content: [comic] }
    case '/promote':
      return [
        { id: 1, title: '推荐', slug: 'test', type: 'promote', filter_val: '', content: [comic] },
      ]
    case '/promote_list':
      return { total: 1, list: [comic] }
    case '/week':
      return {
        categories: [{ id: '1', title: '本周', time: 'week' }],
        type: [{ id: 'manga', title: '漫画' }],
      }
    case '/week/filter':
      return { total: 1, list: [comic] }
    case '/hot_tags':
      return ['测试']
    case '/random_recommend':
    case '/latest':
      return [comic]
    case '/album':
      return fullComic
    case '/chapter':
      return {
        id: 1,
        name: '测试漫画',
        is_favorite: false,
        liked: false,
        addtime: '1',
        images: ['00001.webp'],
        tags: '测试',
        series: fullComic.series,
        series_id: 1,
      }
    case '/forum':
      return { total: 0, list: [] }
    case '/blogs':
      return { count: 1, list: [blog] }
    case '/blog':
      return {
        info: { ...blog, nickname: 'tester', expInfo, is_liked: false },
        related_blogs: [],
        related_comics: [],
      }
    case '/novels':
    case '/search_novels':
      return { total: 1, list: [novel] }
    case '/novel':
      return {
        ...novel,
        series_id: 1,
        images: novel.image,
        addtime: 1,
        description: '',
        total_views: 1,
        is_end: 0,
        serial_status: '',
        tags: [],
        series: [novelSeries],
        related_list: [],
        comment_total: [],
      }
    case '/novelchapters':
      return {
        ncid: 1,
        nid: 1,
        name: '第一章',
        title: '第一章',
        content: '<p>正文</p>',
        last_chapter_title: '第一章',
        total_favorites: 0,
        total_views: 1,
        total_likes: 0,
        addtime: '2026-01-01',
        adddt: '2026-01-01',
        is_favorite: false,
        liked: false,
        related_list: [],
      }
    case '/creator_author':
      return {
        data: {
          total: 1,
          content: [
            {
              id: 1,
              author_name: '测试作者',
              update_date: '1 days ago',
              author_avatar: '/avatar.jpg',
              background_image: '/banner.jpg',
            },
          ],
        },
      }
    case '/creator_author_work':
      return {
        status: 'ok',
        data: {
          work_title: '',
          work_date: '',
          author_name: '测试作者',
          author_avatar: '/avatar.jpg',
          background_image: '/banner.jpg',
          sponsor: [],
          related_works: [relatedBook],
          filters: { language: [], source: [] },
        },
      }
    case '/creator_work_info':
      return {
        data: {
          work_date: '1 days ago',
          author_name: '测试作者',
          work_title: '测试画册',
          related_works: [],
        },
      }
    case '/creator_work_info_detail':
      return {
        id: 1,
        name: '测试画册',
        total_page: 1,
        images: [{ page: 0, image: 'https://example.invalid/1.jpg' }],
        content: '<p>测试</p>',
        addtime: 0,
        adddt: '2026-01-01',
      }
    case '/login':
      return user
    case '/favorite':
    case '/watch_list':
      return { total: 1, list: [comic] }
    case '/tasks':
      return { list: [] }
    default:
      if (url.pathname.startsWith('/useredit/')) return userEdit
      return { status: 'ok', code: 200, msg: 'fallback' }
  }
}

const fallbackServer = setupServer(
  http.all('https://fallback.jm.test/*', ({ request }) =>
    HttpResponse.json({ data: responseFor(new URL(request.url)) }),
  ),
)

let sdkPromise: Promise<{ live: boolean; sdk: JMComic }> | undefined
let fallbackStarted = false

export const getTestSdk = () =>
  (sdkPromise ??= (async () => {
    const sdk = new JMComic({ retry: 1, timeout: 15_000 })
    try {
      await sdk.fork.autoPickFork()
      console.info('[SDK contract] using live API')
      return { live: true, sdk }
    } catch {
      if (!fallbackStarted) {
        fallbackServer.listen({ onUnhandledRequest: 'error' })
        fallbackStarted = true
      }
      console.info('[SDK contract] using local response fixtures')
      sdk.config.requestUsingFork = 'https://fallback.jm.test'
      return { live: false, sdk }
    }
  })())

export const getTestAccount = () => {
  const username = process.env.JMCOMIC_TEST_USERNAME
  const password = process.env.JMCOMIC_TEST_PASSWORD
  return username && password ? { username, password } : undefined
}

export const closeFallback = () => {
  if (fallbackStarted) fallbackServer.close()
}