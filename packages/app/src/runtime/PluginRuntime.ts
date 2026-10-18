import type { ClientConfig, ClientI18n, ClientNetwork } from '@delta-comic/client'
import {
  JMComic,
  sUserMe,
  type CategoriesResult,
  type JmSession,
  type LoginData,
  type LoginUser,
  type PromoteItem,
  type WeekBest,
} from 'jmcomic-sdk'
import { BrowserImageDecoder } from 'jmcomic-sdk/browser'

import { pluginName } from '@/constants'

const parseSession = (value: unknown): JmSession | undefined => {
  if (
    !value ||
    typeof value !== 'object' ||
    !('username' in value) ||
    typeof value.username !== 'string'
  )
    return
  if (!('token' in value) || typeof value.token !== 'string') return
  const user = 'user' in value ? sUserMe.safeParse(value.user) : undefined
  if (!user?.success) return
  return { username: value.username, token: value.token, user: user.data }
}

export class PluginRuntime {
  public readonly jm = new JMComic({ imageDecoder: new BrowserImageDecoder() })
  public categories?: CategoriesResult
  public promotes: PromoteItem[] = []
  public weekBest?: WeekBest
  private readonly controller = new AbortController()

  public constructor(
    private readonly config: ClientConfig,
    private readonly i18n: ClientI18n,
    network: ClientNetwork,
  ) {
    const saved = config.get(pluginName)
    if (typeof saved.baseUrl === 'string') this.jm.config.requestUsingFork = saved.baseUrl
    const create = this.jm.requester.create.bind(this.jm.requester)
    this.jm.requester.create = options =>
      create({
        ...options,
        fetch: (request, init) =>
          network.request({
            url: request,
            init: {
              ...init,
              signal: this.combineSignal(
                init?.signal ?? (request instanceof Request ? request.signal : undefined),
              ),
            },
          }),
      })
  }

  public get signal() {
    return this.controller.signal
  }

  public combineSignal(signal?: AbortSignal): AbortSignal {
    return signal ? AbortSignal.any([this.signal, signal]) : this.signal
  }

  public translate(key: string, params?: Record<string, number | string>): string {
    return this.i18n.translate(key, params)
  }

  public async restoreSession(): Promise<JmSession | undefined> {
    const value = this.config.get(pluginName).session
    const session = parseSession(value)
    if (session) this.jm.auth.restoreSession(session)
    else if (value !== undefined) await this.clearSession()
    return session
  }

  public async validateSession(signal = this.signal): Promise<LoginUser | undefined> {
    const session = this.jm.auth.session
    if (!session?.token || !session.user) return
    try {
      await this.jm.user.getUser({ uid: session.user.uid }, this.combineSignal(signal))
      return { username: session.username, user: session.user }
    } catch (error) {
      if (this.combineSignal(signal).aborted) throw error
      await this.clearSession()
      return undefined
    }
  }

  public async login(data: LoginData, signal = this.signal): Promise<LoginUser> {
    const result = await this.jm.auth.login(data, this.combineSignal(signal))
    this.signal.throwIfAborted()
    await this.persistSession()
    return result
  }

  public async persistSession(): Promise<void> {
    this.signal.throwIfAborted()
    const session = this.jm.auth.session
    if (!session) return
    await this.config.set(pluginName, {
      ...this.config.get(pluginName),
      session: {
        username: session.username,
        token: session.token,
        avs: session.avs,
        user: session.user,
      },
    })
  }

  public async clearSession(): Promise<void> {
    this.jm.auth.clearSession()
    const { session: _session, ...config } = this.config.get(pluginName)
    await this.config.set(pluginName, config)
  }

  public async logout(): Promise<void> {
    try {
      await this.jm.auth.logout(this.signal)
    } finally {
      await this.clearSession()
    }
  }

  public async preload(signal = this.signal): Promise<void> {
    const combined = this.combineSignal(signal)
    const [categories, promotes, weekBest] = await Promise.all([
      this.jm.promote.getCategories(combined),
      this.jm.promote.getPromotes(combined),
      this.jm.promote.getWeekBestCate(combined),
    ])
    combined.throwIfAborted()
    this.categories = categories
    this.promotes = promotes
    this.weekBest = weekBest
  }

  public shutdown(): void {
    this.controller.abort()
    this.jm.auth.clearSession()
    this.categories = undefined
    this.promotes = []
    this.weekBest = undefined
  }
}