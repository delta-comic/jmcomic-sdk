import { AES, ECB, MD5, Utf8 } from 'crypto-es'
import ky, { type KyInstance, type Options } from 'ky'
import type { z } from 'zod'

import type { JMComic } from '..'
import { isAbortError } from '../helpers'
import { JmApiError } from '../types'
import { parseResponse } from '../validation'

interface JmEnvelope {
  code?: number
  data?: unknown
  error?: string
  message?: string
}

const decryptTemplates = ['185Hcomic3PAPP7R', '18comicAPPContent'] as const
const responseWithJson = (value: unknown, response: Response) =>
  new Response(JSON.stringify(value), {
    status: response.status,
    statusText: response.statusText,
    headers: { ...Object.fromEntries(response.headers), 'content-type': 'application/json' },
  })

export class Requester {
  private static readonly innerHeaderKey = 'Jm-Key'

  public constructor(protected readonly sdk: JMComic) {}

  public create(overrideConfig: Options = {}): KyInstance {
    const baseUrl = this.sdk.config.requestUsingFork || undefined
    const client = ky.create({
      baseUrl,
      timeout: this.sdk.config.requestTimeout,
      retry: this.sdk.config.requestRetry,
      hooks: {
        beforeRequest: [
          ({ request }) => {
            const key = this.sdk.config.now().toString()
            request.headers.set(Requester.innerHeaderKey, key)
            request.headers.set('Token', MD5(`${key}185Hcomic3PAPP7R`).toString())
            request.headers.set('Tokenparam', `${key},1.7.9`)
            request.headers.set('Version', 'v1.2.9')
            const token = this.sdk.auth.session?.token
            if (token) request.headers.set('Authorization', `Bearer ${token}`)
          },
        ],
        afterResponse: [
          async ({ request, response }) => {
            const key = request.headers.get(Requester.innerHeaderKey)
            if (!key) return response
            const text = await response.clone().text()
            if (text.includes('Could not connect to mysql!'))
              throw new JmApiError('NETWORK_ERROR', '禁漫服务暂时无法连接数据库', request.url)

            let envelope: JmEnvelope
            try {
              envelope = JSON.parse(text) as JmEnvelope
            } catch {
              return response
            }

            if (!Object.prototype.hasOwnProperty.call(envelope, 'data')) return response
            if (typeof envelope.data !== 'string') return responseWithJson(envelope.data, response)

            for (const template of decryptTemplates)
              try {
                const dynamicKey = MD5(`${key}${template}`).toString()
                const decrypted = AES.decrypt(envelope.data, Utf8.parse(dynamicKey), { mode: ECB })
                  .toString(Utf8)
                  .trim()
                if (!decrypted) continue
                return responseWithJson(JSON.parse(decrypted) as unknown, response)
              } catch {
                continue
              }

            throw new JmApiError('DECRYPTION_FAILED', '禁漫响应解密失败', request.url)
          },
        ],
      },
    })
    return Object.keys(overrideConfig).length === 0 ? client : client.extend(overrideConfig)
  }

  public async request<T>(
    method: 'delete' | 'get' | 'patch' | 'post' | 'put',
    endpoint: string,
    schema: z.ZodType<T>,
    options: Options = {},
  ): Promise<T> {
    try {
      const value = await this.create()[method](endpoint, options).json<unknown>()
      return parseResponse(schema, value, endpoint)
    } catch (error) {
      if (isAbortError(error) || error instanceof JmApiError) throw error
      throw new JmApiError('NETWORK_ERROR', `请求 ${endpoint} 失败`, endpoint, { cause: error })
    }
  }
}