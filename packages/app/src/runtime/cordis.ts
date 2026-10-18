import { Service, UniUser, type Context, type Plugin } from '@delta-comic/client'

import { createSearch } from '@/adapters/search'
import { pluginName } from '@/constants'
import { createComments } from '@/models/comments'
import { createItems } from '@/models/items'
import { createPages } from '@/models/pages'
import { createAuth } from '@/plugin/auth'
import { createContent } from '@/plugin/content'
import { createFavourites } from '@/plugin/favourites'
import { createRemotes } from '@/plugin/remotes'
import { createUser } from '@/plugin/user'

import { PluginRuntime } from './PluginRuntime'

export class JmcomicRuntimeService extends Service {
  public readonly runtime
  public readonly items
  public readonly comments
  public readonly pages
  public readonly search
  public readonly content
  public readonly user
  public readonly remotes

  public constructor(ctx: Context) {
    super(ctx, 'jmcomic')
    this.runtime = new PluginRuntime(ctx.config, ctx.i18n, ctx.network)
    ctx.effect(() => () => {
      this.runtime.shutdown()
      UniUser.userBase.delete(pluginName)
    })
    this.items = createItems(this.runtime)
    this.comments = createComments(this.runtime)
    this.search = createSearch(this.runtime, this.items)
    this.pages = createPages(this.runtime, this.items, this.comments, this)
    this.content = createContent(this.runtime, this.items, this.search, this.pages, this)
    this.user = createUser(
      this.runtime,
      createAuth(this.runtime, this.items),
      createFavourites(this.runtime, this.items),
      this,
    )
    this.remotes = createRemotes(this.runtime)
  }

  public get jm() {
    return this.runtime.jm
  }
  public get signal() {
    return this.runtime.signal
  }
}

declare module 'cordis' {
  interface Context {
    jmcomic: JmcomicRuntimeService
    jmcomicRemote: boolean
  }
}

export const provideJmcomic = Object.assign(
  function provideJmcomic(ctx: Context) {
    new JmcomicRuntimeService(ctx)
  },
  { provide: 'jmcomic', inject: ['config', 'i18n', 'network'] },
) satisfies Plugin.Function