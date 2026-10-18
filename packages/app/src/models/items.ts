import {
  UniItem,
  UniUser,
  type UniImageRaw,
  type UniItemAuthor,
  type UniItemCategory,
  type UniItemRaw,
} from '@delta-comic/client'
import {
  JmApiError,
  SortType,
  type BookAuthor,
  type CommonBlog,
  type CommonBook,
  type CommonComic,
  type CommonNovel,
  type FullBlog,
  type FullComic,
  type FullNovel,
  type LessBook,
  type LessNovel,
  type LoginUser,
  type RecommendComic,
  type RelatedBook,
  type UserMe,
} from 'jmcomic-sdk'

import { contentKeys, pluginName, searchKeys, subscribeKeys } from '@/constants'
import type { PluginRuntime } from '@/runtime/PluginRuntime'

export type JmContentKind = (typeof contentKeys)[keyof typeof contentKeys]

export interface JmItemMeta {
  kind: JmContentKind
  raw: unknown
}

const normalizeTime = (value: number | string | undefined): number | undefined => {
  if (value === undefined || value === '') return undefined
  const numeric = Number(value)
  if (Number.isFinite(numeric)) return numeric < 1_000_000_000_000 ? numeric * 1000 : numeric
  const parsed = Date.parse(String(value))
  return Number.isNaN(parsed) ? undefined : parsed
}

export const image = (path: string, meta?: Record<string, unknown>): UniImageRaw => ({
  $$plugin: pluginName,
  $$meta: meta,
  forkNamespace: 'jmcomic.remotes.images',
  path,
})

const categories = (values: string[], group: string, method: string = searchKeys.keyword) =>
  values
    .flatMap(value => value.split(/[,，、]/))
    .map(value => value.trim())
    .filter(Boolean)
    .map((name): UniItemCategory => ({
      $$plugin: pluginName,
      name,
      group,
      search: { keyword: name, source: method, sort: SortType.Relate },
    }))

const splitAuthors = (value: string | string[]) =>
  (Array.isArray(value) ? value : value.split(/,|，|&|、|\sand\s|\s和\s/i))
    .map(author => author.trim())
    .filter(Boolean)

const authors = (
  value: string | string[],
  options: { icon?: string; subscribe?: string; description?: string } = {},
): UniItemAuthor[] =>
  splitAuthors(value).map(label => ({
    $$plugin: pluginName,
    label,
    icon: options.icon ?? 'draw',
    description: options.description ?? 'jmcomic.item.author',
    actions: ['search'],
    subscribe: options.subscribe ?? subscribeKeys.comicAuthor,
  }))

const baseItem = (
  kind: JmContentKind,
  id: string | number,
  title: string,
  cover: UniImageRaw,
  raw: unknown,
): UniItemRaw => ({
  $$plugin: pluginName,
  $$meta: { kind, raw } satisfies JmItemMeta,
  author: [],
  categories: [],
  commentSendable: kind !== contentKeys.book && kind !== contentKeys.bookAuthor,
  contentType: [pluginName, kind],
  cover,
  customIsAI: false,
  epLength: '1',
  id: String(id),
  length: '',
  thisEp: { $$plugin: pluginName, id: String(id), name: title },
  title,
})

export class JmUser extends UniUser {
  public override customUser: { user: UserMe }

  public constructor(user: UserMe) {
    super({
      $$plugin: pluginName,
      avatar: user.photo.includes('nopic')
        ? undefined
        : { $$plugin: pluginName, pathname: `/media/users/${user.uid}.jpg`, type: 'default' },
      id: String(user.uid),
      name: user.fname || user.username,
    })
    this.customUser = { user }
  }

  public static fromLogin(login: LoginUser) {
    return new JmUser(login.user)
  }
}

export interface ItemModels {
  fromCommonComic(comic: CommonComic): UniItem
  fromRecommendComic(comic: RecommendComic): UniItem
  fromFullComic(comic: FullComic): UniItem
  fromBlog(blog: CommonBlog | FullBlog): UniItem
  fromLessNovel(novel: LessNovel): UniItem
  fromCommonNovel(novel: CommonNovel): UniItem
  fromFullNovel(novel: FullNovel): UniItem
  fromBookAuthor(book: LessBook | BookAuthor): UniItem
  fromRelatedBook(book: RelatedBook): UniItem
  fromCommonBook(book: CommonBook): UniItem
  translateItem(raw: UniItemRaw): UniItem
  JmUser: typeof JmUser
}

export const createItems = (runtime: PluginRuntime): ItemModels => {
  class JmItem extends UniItem {
    public get meta(): JmItemMeta {
      const kind = this.$$meta?.kind
      if (!Object.values(contentKeys).some(value => value === kind))
        throw new JmApiError('INVALID_RESPONSE', '内容类型无效')
      switch (kind) {
        case 'comic':
        case 'blog':
        case 'novel':
        case 'book-author':
        case 'book':
          return { kind, raw: this.$$meta?.raw }
        default:
          throw new JmApiError('INVALID_RESPONSE', '内容类型无效')
      }
    }

    public override async like(signal?: AbortSignal): Promise<unknown> {
      switch (this.meta.kind) {
        case contentKeys.comic:
          return runtime.jm.comic.like({ id: this.id }, signal)
        case contentKeys.blog:
          return runtime.jm.blog.like({ id: this.id }, signal)
        case contentKeys.novel:
          return runtime.jm.novel.like({ id: this.id }, signal)
        default:
          throw new JmApiError('UNSUPPORTED_OPERATION', '画册服务不支持点赞')
      }
    }

    public override report(): Promise<never> {
      return Promise.reject(new JmApiError('UNSUPPORTED_OPERATION', '服务端不支持举报该内容'))
    }

    public override async sendComment(text: string, signal?: AbortSignal): Promise<unknown> {
      switch (this.meta.kind) {
        case contentKeys.comic:
          return runtime.jm.comic.sendComment(
            { comicId: this.id, content: text, isSpoiled: false },
            signal,
          )
        case contentKeys.blog:
          return runtime.jm.blog.sendComment({ id: this.id, content: text }, signal)
        case contentKeys.novel:
          return runtime.jm.novel.sendComment(
            { novelId: this.id, content: text, isSpoiled: false },
            signal,
          )
        default:
          throw new JmApiError('UNSUPPORTED_OPERATION', '画册服务不支持评论')
      }
    }
  }

  const fromCommonComic = (comic: CommonComic) =>
    new JmItem({
      ...baseItem(contentKeys.comic, comic.id, comic.name, image(comic.image), comic),
      author: authors(comic.author),
      categories: categories(
        [comic.category.title ?? '', comic.category_sub.title ?? ''],
        'jmcomic.item.category',
      ),
      description: comic.description ?? undefined,
      isLiked: comic.liked,
      updateTime: normalizeTime(comic.update_at),
    })

  const fromRecommendComic = (comic: RecommendComic) =>
    new JmItem({
      ...baseItem(contentKeys.comic, comic.id, comic.name, image(comic.image), comic),
      author: authors(comic.author),
    })

  const fromFullComic = (comic: FullComic) =>
    new JmItem({
      ...baseItem(
        contentKeys.comic,
        comic.id,
        comic.name,
        image(comic.images[0] ?? `/media/albums/${comic.id}_3x4.jpg`),
        comic,
      ),
      author: authors(comic.author),
      categories: [
        ...categories(comic.tags, 'jmcomic.item.tag'),
        ...categories(comic.works, 'jmcomic.item.work'),
        ...categories(comic.actors, 'jmcomic.item.actor'),
      ],
      commentNumber: Number(comic.comment_total),
      description: comic.description,
      epLength: String(comic.series.length),
      isLiked: comic.liked,
      length: String(comic.images.length),
      likeNumber: Number(comic.likes),
      thisEp: {
        $$plugin: pluginName,
        id: String(comic.series_id),
        name:
          comic.series.find(series => String(series.id) === String(comic.series_id))?.name ??
          comic.name,
      },
      updateTime: normalizeTime(comic.addtime),
      viewNumber: Number(comic.total_views),
    })

  const blogBase = (blog: CommonBlog | FullBlog) =>
    ({
      ...baseItem(contentKeys.blog, blog.id, blog.title, image(blog.photo), blog),
      author: [
        {
          $$plugin: pluginName,
          $$meta: { user: blog },
          label: blog.username,
          description: 'jmcomic.item.author',
          icon: blog.user_photo?.includes('nopic')
            ? 'coser'
            : image(`/media/users/${blog.uid}.jpg`),
        },
      ],
      categories: categories(blog.tags, 'jmcomic.item.tag', searchKeys.blog),
      commentNumber: Number(blog.total_comments),
      length: String(blog.content.length),
      likeNumber: Number(blog.total_likes),
      updateTime: normalizeTime(blog.date),
      viewNumber: Number(blog.total_views),
    }) satisfies UniItemRaw

  const fromBlog = (blog: CommonBlog | FullBlog) => new JmItem(blogBase(blog))

  const novelBase = (novel: LessNovel | CommonNovel | FullNovel): UniItemRaw => ({
    ...baseItem(
      contentKeys.novel,
      novel.id,
      novel.name,
      image('images' in novel ? novel.images : novel.image),
      novel,
    ),
    author: authors(novel.author, { icon: 'coser', subscribe: subscribeKeys.novelAuthor }),
  })

  const fromLessNovel = (novel: LessNovel) =>
    new JmItem({ ...novelBase(novel), updateTime: normalizeTime(novel.update_at) })

  const fromCommonNovel = (novel: CommonNovel) =>
    new JmItem({
      ...novelBase(novel),
      epLength: String(Number(novel.last_chapter_index) + 1),
      isLiked: novel.liked,
      likeNumber: Number(novel.likes),
      updateTime: normalizeTime(novel.update_at),
    })

  const fromFullNovel = (novel: FullNovel) =>
    new JmItem({
      ...novelBase(novel),
      categories: categories(novel.tags, 'jmcomic.item.tag', searchKeys.novel),
      commentNumber: novel.comment_total.length,
      description: novel.description,
      epLength: String(novel.series.length),
      isLiked: novel.liked,
      likeNumber: Number(novel.likes),
      thisEp: { $$plugin: pluginName, id: String(novel.series_id), name: novel.name },
      updateTime: normalizeTime(novel.addtime),
      viewNumber: Number(novel.total_views),
    })

  const fromBookAuthor = (book: LessBook | BookAuthor) => {
    const id = 'author_id' in book ? book.author_id : book.id
    const name = 'author_name' in book ? book.author_name : ''
    return new JmItem({
      ...baseItem(contentKeys.bookAuthor, id, name, image(book.author_avatar), book),
      author: authors(name, { icon: 'coser', subscribe: subscribeKeys.creator }),
      commentSendable: false,
      updateTime: 'update_date' in book ? normalizeTime(book.update_date) : undefined,
    })
  }

  const fromRelatedBook = (book: RelatedBook) =>
    new JmItem({
      ...baseItem(contentKeys.book, book.id, book.work_title, image(book.work_image), book),
      categories: categories([book.platform_name], 'jmcomic.item.source', searchKeys.creator),
      commentSendable: false,
      updateTime: normalizeTime(book.work_date),
    })

  const fromCommonBook = (book: CommonBook) =>
    new JmItem({
      ...baseItem(contentKeys.book, book.id, book.name, image(book.image), book),
      author: authors(book.author, { subscribe: subscribeKeys.creator }),
      commentSendable: false,
      updateTime: normalizeTime(book.update_at),
    })

  const translateItem = (raw: UniItemRaw) => new JmItem(raw)
  return {
    fromCommonComic,
    fromRecommendComic,
    fromFullComic,
    fromBlog,
    fromLessNovel,
    fromCommonNovel,
    fromFullNovel,
    fromBookAuthor,
    fromRelatedBook,
    fromCommonBook,
    JmUser,
    translateItem,
  }
}