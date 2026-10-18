import { UniUser, type Context, type Plugin } from '@delta-comic/client'
import { SortType } from 'jmcomic-sdk'

import { pluginName, searchKeys } from '@/constants'
import { jmcomicMessages } from '@/i18n'

const registerI18n = Object.assign(
  function registerI18n(ctx: Context) {
    ctx.effect(() => ctx.i18n.register(jmcomicMessages))
  },
  { inject: ['i18n'] },
)

const registerContent = Object.assign(
  async function registerContent(ctx: Context) {
    const { runtime, content } = ctx.jmcomic
    const controller = new AbortController()
    ctx.effect(() => () => controller.abort())
    await runtime.preload(controller.signal)
    controller.signal.throwIfAborted()
    runtime.signal.throwIfAborted()
    const categories = (content.promotes.categories ??= [])
    categories.splice(
      0,
      categories.length,
      ...(runtime.categories?.categories ?? []).flatMap(category => [
        {
          title: category.name,
          namespace: category.slug,
          search: {
            input: `category:${category.slug}`,
            search: { method: searchKeys.keyword, sort: SortType.Relate },
          },
        },
        ...(category.sub_categories ?? []).map(child => ({
          title: child.name,
          namespace: child.slug,
          search: {
            input: `category:${child.slug}`,
            search: { method: searchKeys.keyword, sort: SortType.Relate },
          },
        })),
      ]),
    )
    ctx.effect(() => ctx.content.register(content))
  },
  { inject: ['content', 'jmcomic', 'jmcomicRemote'] },
)

const registerUser = Object.assign(
  function registerUser(ctx: Context) {
    ctx.effect(() => ctx.user.register(ctx.jmcomic.user))
    ctx.effect(() => () => {
      UniUser.userBase.delete(pluginName)
    })
  },
  { inject: ['user', 'jmcomic'] },
)

const checkIn = Object.assign(
  async function checkIn(ctx: Context) {
    const { runtime } = ctx.jmcomic
    await runtime.restoreSession()
    if (!(await runtime.validateSession())) return
    try {
      await runtime.jm.user.dailyCheck(runtime.signal)
    } catch (error) {
      if (runtime.signal.aborted) throw error
    }
  },
  { inject: ['jmcomic', 'jmcomicRemote'] },
)

const registerRemote = Object.assign(
  async function registerRemote(ctx: Context) {
    await ctx.effect(() => ctx.remote.register(ctx.jmcomic.remotes))
    ctx.provide('jmcomicRemote', true)
  },
  { provide: 'jmcomicRemote', inject: ['remote', 'jmcomic'] },
)

const registerShare = Object.assign(
  function registerShare(ctx: Context) {
    ctx.effect(() => ctx.share.register({ subscribe: ctx.jmcomic.search.jmcomicSubscribe }))
  },
  { inject: ['share', 'jmcomic'] },
)

export const jmcomicFunctions = [
  registerI18n,
  registerContent,
  registerUser,
  checkIn,
  registerRemote,
  registerShare,
] satisfies readonly Plugin.Function[]