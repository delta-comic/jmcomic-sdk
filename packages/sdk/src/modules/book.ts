import { z } from 'zod'

import type {
  BookAuthor,
  BookContents,
  BookRelates,
  JMComic,
  LessBook,
  Numeric,
  PageResult,
  PaginationQuery,
} from '..'
import { sBookAuthor, sBookContents, sBookRelates, sLessBook } from '../model/book'
import { sNumeric } from '../model/utils'

export interface BookSourceQuery {
  lang?: string
  source?: string
}

const sBookPage = z.object({
  data: z.object({ content: z.array(sLessBook), total: sNumeric.transform(Number) }),
})
const sBookRelatesResponse = z.object({ data: sBookRelates })
const sBookAuthorResponse = z.object({ status: z.string().optional(), data: sBookAuthor })

export class Book {
  public constructor(protected readonly sdk: JMComic) {}

  public async search(
    data: PaginationQuery<{ keyword?: string } & BookSourceQuery>,
    signal?: AbortSignal,
  ): Promise<PageResult<LessBook>> {
    const result = await this.sdk.requester.request(
      'get',
      this.sdk.config.apiPath.book.search,
      sBookPage,
      {
        searchParams: {
          page: data.page,
          search_query: data.keyword,
          lang: data.lang,
          source: data.source,
        },
        signal,
      },
    )
    return { total: result.data.total, list: result.data.content }
  }

  public async getAuthorDetail(
    data: { id: string } & BookSourceQuery,
    signal?: AbortSignal,
  ): Promise<BookAuthor> {
    const result = await this.sdk.requester.request(
      'get',
      this.sdk.config.apiPath.book.authorDetail,
      sBookAuthorResponse,
      { searchParams: { id: data.id, lang: data.lang, source: data.source }, signal },
    )
    return { ...result.data, author_id: data.id }
  }

  public async getBookDetail(data: { id: Numeric }, signal?: AbortSignal): Promise<BookRelates> {
    const result = await this.sdk.requester.request(
      'get',
      this.sdk.config.apiPath.book.detail,
      sBookRelatesResponse,
      { searchParams: { id: data.id }, signal },
    )
    return result.data
  }

  public getBookPages(data: { id: Numeric }, signal?: AbortSignal): Promise<BookContents> {
    return this.sdk.requester.request('get', this.sdk.config.apiPath.book.pages, sBookContents, {
      searchParams: { id: data.id },
      signal,
    })
  }
}