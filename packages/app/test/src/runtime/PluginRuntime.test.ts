import type { UserMe } from 'jmcomic-sdk'
import { afterEach, describe, expect, test, vi } from 'vite-plus/test'

import { pluginName } from '@/constants'

import { createTestService } from '../../context'

const user = {
  ad_free: false,
  ad_free_before: '',
  album_favorites: 0,
  album_favorites_max: 100,
  charge: '0',
  coin: 0,
  emailverified: '0',
  gender: null,
  invitation_qrcode: '',
  invitation_url: '',
  invited_cnt: 0,
  jar: '',
  message: '',
  level: 1,
  level_name: 'Tester',
  exp: 0,
  nextLevelExp: 100,
  expPercent: 0,
  badges: [],
  uid: 7,
  username: 'tester',
  fname: 'Tester',
  photo: 'nopic.gif',
  jwttoken: 'token',
  s: 'avs',
} satisfies UserMe
afterEach(() => vi.restoreAllMocks())

describe('PluginRuntime', () => {
  test('persists password-free sessions and clears expired tokens', async () => {
    const { runtime, values } = createTestService()
    vi.spyOn(runtime.jm.auth, 'login').mockImplementation(async data => {
      runtime.jm.auth.restoreSession({ username: data.username, token: 'token', user })
      return { username: data.username, user }
    })
    await runtime.login({ username: 'tester', password: 'secret' })
    expect(JSON.stringify(values.get(pluginName))).not.toContain('secret')
    vi.spyOn(runtime.jm.user, 'getUser').mockRejectedValue(new Error('expired'))
    await expect(runtime.validateSession()).resolves.toBeUndefined()
    expect(runtime.jm.auth.session).toBeUndefined()
    expect(values.get(pluginName)).not.toHaveProperty('session')
  })

  test('restores a persisted session including the token and AVS cookie', async () => {
    const { runtime, values } = createTestService()
    values.set(pluginName, { session: { username: 'tester', token: 'token', avs: 'avs', user } })
    await runtime.restoreSession()
    expect(runtime.jm.auth.session).toMatchObject({
      username: 'tester',
      token: 'token',
      avs: 'avs',
      user,
    })
  })

  test('clears invalid configuration sessions', async () => {
    const { runtime, values } = createTestService()
    for (const session of [
      'broken',
      { token: 'no-name' },
      { username: 'tester', token: 7 },
      { username: 'tester', token: 'token', user: {} },
    ]) {
      values.set(pluginName, { session, baseUrl: 'https://api.test' })
      await expect(runtime.restoreSession()).resolves.toBeUndefined()
      expect(values.get(pluginName)).toEqual({ baseUrl: 'https://api.test' })
    }
  })

  test('preloads all navigation and aborts independently on disposal', async () => {
    const first = createTestService()
    const second = createTestService()
    vi.spyOn(first.runtime.jm.promote, 'getCategories').mockResolvedValue({
      categories: [],
      blocks: [],
    })
    vi.spyOn(first.runtime.jm.promote, 'getPromotes').mockResolvedValue([])
    vi.spyOn(first.runtime.jm.promote, 'getWeekBestCate').mockResolvedValue({
      categories: [],
      type: [],
    })
    await first.runtime.preload()
    expect(first.runtime.categories).toEqual({ categories: [], blocks: [] })
    const combined = first.runtime.combineSignal(new AbortController().signal)
    await first.root.fiber.dispose()
    expect(combined.aborted).toBe(true)
    expect(second.runtime.signal.aborted).toBe(false)
    expect(first.runtime.categories).toBeUndefined()
    await second.root.fiber.dispose()
  })

  test('clears local and configured state even when logout fails', async () => {
    const { runtime, values } = createTestService()
    runtime.jm.auth.restoreSession({ username: 'tester', token: 'token', user })
    values.set(pluginName, { session: { username: 'tester' } })
    vi.spyOn(runtime.jm.auth, 'logout').mockRejectedValue(new Error('offline'))
    await expect(runtime.logout()).rejects.toThrow('offline')
    expect(runtime.jm.auth.session).toBeUndefined()
    expect(values.get(pluginName)).not.toHaveProperty('session')
  })
})