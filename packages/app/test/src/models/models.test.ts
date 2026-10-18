import type { BlogComment, ComicComment, FullComic, NovelComment, RelatedBook } from 'jmcomic-sdk'
import { describe, expect, test, vi } from 'vitest'

import { pluginName } from '@/constants'

import { createTestService } from '../../context'
const { service, runtime } = createTestService()

const { fromBlogComment, fromComicComment, fromNovelComment } = service.comments
const { fromFullComic, fromRelatedBook } = service.items

const fullComic: FullComic = {
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
  comment_total: 1,
  author: ['Author A', 'Author B'],
  tags: ['Tag'],
  works: ['Work'],
  actors: ['Actor'],
  related_list: [],
  is_aids: false,
  purchased: '',
  price: '',
  likes: 3,
}

const expinfo = {
  level_name: 'Level',
  level: 1,
  exp: 0,
  nextLevelExp: 1,
  expPercent: 0,
  uid: 1,
  badges: [],
}
const rawComment: ComicComment = {
  AID: 42,
  CID: 1,
  UID: 1,
  username: 'tester',
  nickname: 'Tester',
  likes: 0,
  gender: null,
  update_at: 1,
  addtime: '1',
  parent_CID: 0,
  expinfo,
  name: 'JM42',
  content: '<div>Hello <strong>world</strong></div>',
  photo: 'nopic.gif',
  spoiler: 1,
  replys: [
    {
      CID: 2,
      UID: 2,
      username: 'reply',
      nickname: 'Reply',
      likes: 0,
      gender: null,
      update_at: 1,
      addtime: '1',
      parent_CID: 1,
      expinfo: { ...expinfo, uid: 2 },
      content: '<div>Reply</div>',
      photo: 'nopic.gif',
      spoiler: 1,
    },
  ],
}

describe('content models', () => {
  test('maps full comics into one stable host item', () => {
    const item = fromFullComic(fullComic)
    expect(item.id).toBe('42')
    expect(item.contentType).toEqual([pluginName, 'comic'])
    expect(item.author.map(author => author.label)).toEqual(['Author A', 'Author B'])
    expect(item.categories.map(category => category.name)).toEqual(['Tag', 'Work', 'Actor'])
    expect(item.$thisEp.id).toBe('7')
    expect(item.updateTime).toBe(1000)
  })

  test('does not fake unsupported gallery mutations', async () => {
    const raw: RelatedBook = {
      id: 5,
      work_image: '/cover.jpg',
      work_title: 'Gallery',
      work_date: '2026-01-01',
      platform_name: 'source',
    }
    const item = fromRelatedBook(raw)
    await expect(item.like()).rejects.toMatchObject({ code: 'UNSUPPORTED_OPERATION' })
    await expect(item.sendComment('text')).rejects.toMatchObject({ code: 'UNSUPPORTED_OPERATION' })
    await expect(item.report()).rejects.toMatchObject({ code: 'UNSUPPORTED_OPERATION' })
  })

  test('sanitizes comments, inherits thread ids, and routes replies', async () => {
    const send = vi.spyOn(runtime.jm.comic, 'sendComment').mockResolvedValue({ status: 'ok' })
    const comment = fromComicComment(rawComment)
    expect(comment.content).toEqual({ type: 'string', text: 'Hello world' })
    const children = await comment.fetchChildren.query({}, 1)
    expect(children.data[0]?.content.text).toBe('Reply')
    await children.data[0]!.sendComment('answer')
    expect(send).toHaveBeenCalledWith(
      { comicId: 42, content: 'answer', isSpoiled: false, parentCommentId: 1 },
      undefined,
    )
    await expect(comment.like()).rejects.toMatchObject({ code: 'UNSUPPORTED_OPERATION' })
    await expect(comment.report()).rejects.toMatchObject({ code: 'UNSUPPORTED_OPERATION' })
  })

  test('routes blog and novel comments and handles invalid responses', async () => {
    const blogSend = vi.spyOn(runtime.jm.blog, 'sendComment').mockResolvedValue({ status: 'ok' })
    const blog = {
      ...rawComment,
      BID: 8,
      CID: 3,
      comment: 'Blog comment',
      photo: 'avatar.jpg',
      replys: [],
    } as BlogComment
    await fromComicComment(rawComment).sendComment('comic')
    const blogComment = fromBlogComment(blog)
    expect(blogComment.content).toEqual({ type: 'string', text: 'Blog comment' })
    await blogComment.sendComment('blog')
    expect(blogSend).toHaveBeenCalledWith({ id: 8, content: 'blog', parentCommentId: 3 }, undefined)

    const novelSend = vi.spyOn(runtime.jm.novel, 'sendComment').mockResolvedValue({ status: 'ok' })
    const novel = {
      ...rawComment,
      NID: 9,
      NCID: 10,
      CID: 4,
      parent_CID: 0,
      comment: 'Novel comment',
    } as NovelComment
    await fromNovelComment(novel).sendComment('novel')
    expect(novelSend).toHaveBeenCalledWith(
      { novelId: 9, chapterId: 10, content: 'novel', isSpoiled: false, parentCommentId: 4 },
      undefined,
    )

    expect(() =>
      fromComicComment({ ...rawComment, AID: undefined } as never).sendComment('bad'),
    ).toThrow(expect.objectContaining({ code: 'INVALID_RESPONSE' }))
    expect(() =>
      fromNovelComment({ ...novel, NID: undefined } as never).sendComment('bad'),
    ).toThrow(expect.objectContaining({ code: 'INVALID_RESPONSE' }))
  })
})