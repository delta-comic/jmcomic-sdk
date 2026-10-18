import { UniUser } from '@delta-comic/client'
import type { User } from '@delta-comic/client'
import { type LoginUser } from 'jmcomic-sdk'

import { pluginName } from '@/constants'
import type { createItems } from '@/models/items'
import type { PluginRuntime } from '@/runtime/PluginRuntime'

export const createAuth = (runtime: PluginRuntime, items: ReturnType<typeof createItems>) => {
  const { JmUser } = items
  const setCurrentUser = (login: LoginUser) => {
    const user = JmUser.fromLogin(login)
    UniUser.userBase.set(pluginName, user)
    return user
  }

  const restoreUser = async () => {
    const session = runtime.jm.auth.session ?? (await runtime.restoreSession())
    if (!session?.token || !session.user) return false
    const valid = await runtime.validateSession()
    if (!valid) return false
    runtime.signal.throwIfAborted()
    setCurrentUser(valid)
    return true
  }

  const login = async (by: User.Method) => {
    const form = await by.form({
      username: { type: 'string', info: 'jmcomic.auth.username' },
      password: { type: 'string', info: 'jmcomic.auth.password' },
    })
    setCurrentUser(await runtime.login(form))
  }

  const signUp = async (by: User.Method) => {
    const form = await by.form({
      username: { type: 'string', info: 'jmcomic.auth.username' },
      email: { type: 'string', info: 'jmcomic.auth.email' },
      password: { type: 'string', info: 'jmcomic.auth.password' },
      password_confirm: { type: 'string', info: 'jmcomic.auth.passwordConfirm' },
      gender: {
        type: 'radio',
        comp: 'radio',
        info: 'jmcomic.auth.gender',
        selects: [
          { label: 'jmcomic.gender.male', value: 'Male' },
          { label: 'jmcomic.gender.female', value: 'Female' },
        ],
      },
    })
    if (form.gender !== 'Male' && form.gender !== 'Female')
      throw new Error(runtime.translate('jmcomic.auth.invalidGender'))
    await runtime.jm.auth.signUp({ ...form, gender: form.gender }, runtime.signal)
    setCurrentUser(
      await runtime.login({ username: form.username, password: form.password }, runtime.signal),
    )
  }
  return { restoreUser, login, signUp }
}