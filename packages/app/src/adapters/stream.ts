import { StreamQuery, type PageKey } from '@delta-comic/client'
import type { PageResult } from 'jmcomic-sdk'

const getNextPage = (page: number, result: PageResult<unknown>, pageSize?: number) => {
  if (result.list.length === 0) return undefined
  const loaded = (page - 1) * (pageSize ?? result.list.length) + result.list.length
  if (loaded >= result.total) return undefined
  return page + 1
}

export const createPagedStream = <TResult, TData extends object = {}>(
  fetchPage: (data: TData, page: number, signal?: AbortSignal) => Promise<PageResult<TResult>>,
) => {
  let pageSize: number | undefined
  return new StreamQuery<TResult, TData>(async (data, page, signal) => {
    const currentPage = Number(page)
    const result = await fetchPage(data, currentPage, signal)
    if (currentPage === 1 && result.list.length > 0) pageSize = result.list.length
    return { data: result.list, nextPage: getNextPage(currentPage, result, pageSize) }
  }, 1)
}

export const createArrayStream = <TResult, TData extends object = {}>(
  fetchItems: (data: TData, signal?: AbortSignal) => Promise<TResult[]> | TResult[],
) =>
  new StreamQuery<TResult, TData>(
    async (data, page: PageKey, signal) => ({
      data: Number(page) === 1 ? await fetchItems(data, signal) : [],
    }),
    1,
  )

export const emptyStream = <TResult>() => createArrayStream<TResult>(() => [])