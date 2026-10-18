import {
  Service,
  UniUser,
  type Context,
  type ClientCollection,
  type ContentModel,
  type UserModel,
  type SocialModel,
  type RemoteModel,
} from '@delta-comic/client'
import { afterEach, describe, expect, test, vi } from 'vite-plus/test'

import { pluginName } from '@/constants'
import plugin from '@/main'
import { PluginRuntime } from '@/runtime/PluginRuntime'

import { createTestContext } from '../../context'

class Collection<T> extends Service implements ClientCollection<T> {
  public readonly entries = new Map<string, T>()
  public register(value: T) {
    return this.ctx.effect(() => {
      if (this.entries.has(pluginName)) throw new Error('duplicate registration')
      this.entries.set(pluginName, value)
      return () => {
        this.entries.delete(pluginName)
      }
    })
  }
}

class Content extends Collection<ContentModel> {
  public constructor(ctx: Context) {
    super(ctx, 'content')
  }
  public onHotCategoryClick() {}
  public onHotTopButtonClick() {}
}
class User extends Collection<UserModel> {
  public constructor(ctx: Context) {
    super(ctx, 'user')
  }
  public async authenticate() {}
}
class Share extends Collection<SocialModel> {
  public constructor(ctx: Context) {
    super(ctx, 'share')
  }
}
class Remote extends Service {
  public readonly entries = new Map<string, RemoteModel>()
  public constructor(ctx: Context) {
    super(ctx, 'remote')
  }
  public async register(value: RemoteModel) {
    return this.ctx.effect(() => {
      this.entries.set(pluginName, value)
      return () => {
        this.entries.delete(pluginName)
      }
    })
  }
}

class Account extends UniUser {
  public override customUser = {}
}

const roots: Context[] = []
const setup = () => {
  const host = createTestContext()
  roots.push(host.root)
  const content = new Content(host.root)
  const user = new User(host.root)
  const share = new Share(host.root)
  const remote = new Remote(host.root)
  vi.spyOn(PluginRuntime.prototype, 'preload').mockResolvedValue(undefined)
  const mount = async () => {
    const fibers: ReturnType<Context['plugin']>[] = []
    const parent = await host.root.plugin((ctx: Context) => {
      for (const fn of plugin) fibers.push(ctx.plugin(fn))
    })
    for (const fiber of fibers) await fiber
    return { parent, fibers }
  }
  return { ...host, content, user, share, remote, mount }
}

afterEach(async () => {
  for (const root of roots.splice(0)) await root.fiber.dispose()
  vi.restoreAllMocks()
})

describe('Cordis plugin lifecycle', () => {
  test('mounts, disposes and reloads without retaining registrations or session state', async () => {
    const host = setup()
    const disposeI18n = vi.fn(async () => {})
    host.i18n.register.mockReturnValue(disposeI18n)
    const first = await host.mount()
    expect(first.fibers.every(fiber => fiber.state === 2)).toBe(true)
    expect(
      [host.content, host.user, host.share, host.remote].map(service => service.entries.size),
    ).toEqual([1, 1, 1, 1])
    const service = host.root.jmcomic
    const account = new Account({ $$plugin: pluginName, id: '1', name: 'Tester' })
    UniUser.userBase.set(pluginName, account)
    await first.parent.dispose()
    expect(service.signal.aborted).toBe(true)
    expect(UniUser.userBase.has(pluginName)).toBe(false)
    expect(
      [host.content, host.user, host.share, host.remote].every(
        service => service.entries.size === 0,
      ),
    ).toBe(true)
    expect(disposeI18n).toHaveBeenCalledOnce()
    const second = await host.mount()
    expect(second.fibers.every(fiber => fiber.state === 2)).toBe(true)
    expect(host.root.jmcomic).not.toBe(service)
    expect(host.root.jmcomic.signal.aborted).toBe(false)
    expect(host.content.entries.size).toBe(1)
    await second.parent.dispose()
  })

  test('cleans failed registrations when the plugin owner is disposed', async () => {
    const host = setup()
    vi.spyOn(host.remote, 'register').mockRejectedValueOnce(new Error('probe failed'))
    await expect(host.mount()).rejects.toThrow('probe failed')
    await host.root.fiber.dispose()
    expect(
      [host.content, host.user, host.share, host.remote].every(
        service => service.entries.size === 0,
      ),
    ).toBe(true)
  })

  test('disposes an asynchronous remote registration while it is pending', async () => {
    const host = setup()
    let finish: ((dispose: () => Promise<void>) => void) | undefined
    const cleanup = vi.fn(async () => {})
    vi.spyOn(host.remote, 'register').mockImplementation(
      () =>
        new Promise(resolve => {
          finish = resolve
        }),
    )
    const provider = plugin[0]!
    await host.root.plugin(provider)
    const register = plugin.find(fn => fn.name === 'registerRemote')!
    const fiber = host.root.plugin(register)
    await vi.waitFor(() => expect(finish).toBeDefined())
    const disposing = fiber.dispose()
    finish?.(cleanup)
    await disposing
    expect(cleanup).toHaveBeenCalledOnce()
  })
})