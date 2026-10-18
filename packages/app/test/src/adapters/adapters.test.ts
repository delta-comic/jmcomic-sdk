import { describe, expect, test, vi } from 'vitest'

import { parseRichText, richTextToPlainText } from '@/adapters/richText'
import { createArrayStream, createPagedStream } from '@/adapters/stream'

describe('rich text adapter', () => {
  test('keeps only structured safe blocks', () => {
    const blocks = parseRichText(`
      <script>globalThis.compromised = true</script>
      <h2>Heading</h2>
      <p>Hello <strong>world</strong></p>
      <a href="javascript:alert(1)">unsafe</a>
      <a href="https://example.com/article">safe</a>
      <img src="https://example.com/image.jpg" alt="cover">
    `)
    expect(blocks).toEqual([
      { type: 'heading', text: 'Heading', level: 2 },
      { type: 'text', text: 'Hello world' },
      { type: 'link', text: 'safe', href: 'https://example.com/article' },
      { type: 'image', src: 'https://example.com/image.jpg', alt: 'cover' },
    ])
    expect(richTextToPlainText('<p>one</p><blockquote>two</blockquote>')).toBe('one\ntwo')
  })

  test('has a non-DOM fallback without returning markup', () => {
    const parser = globalThis.DOMParser
    vi.stubGlobal('DOMParser', undefined)
    expect(parseRichText('<p>safe</p><script>unsafe()</script>')).toEqual([
      { type: 'text', text: 'safe' },
    ])
    vi.stubGlobal('DOMParser', parser)
  })
})

describe('stream adapters', () => {
  test('uses the first page size to stop a short final page', async () => {
    const fetchPage = vi.fn(async (_data: { query: string }, page: number) => ({
      total: 25,
      list: Array.from({ length: page === 3 ? 5 : 10 }, (_, index) => `${page}:${index}`),
    }))
    const stream = createPagedStream(fetchPage)
    const first = await stream.query({ query: 'x' }, 1)
    const second = await stream.query({ query: 'x' }, first.nextPage!)
    const third = await stream.query({ query: 'x' }, second.nextPage!)
    expect(first.nextPage).toBe(2)
    expect(second.nextPage).toBe(3)
    expect(third.nextPage).toBeUndefined()
    expect(fetchPage).toHaveBeenCalledTimes(3)
  })

  test('array streams emit once', async () => {
    const stream = createArrayStream(() => ['one', 'two'])
    await expect(stream.query({}, 1)).resolves.toEqual({ data: ['one', 'two'] })
    await expect(stream.query({}, 2)).resolves.toEqual({ data: [] })
  })
})