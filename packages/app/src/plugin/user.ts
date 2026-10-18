import { UniUser, type UserModel } from '@delta-comic/client'
import { routeToSearch } from '@delta-comic/client'
import { BadgeOutlined, EditOutlined, SearchOutlined, TitleOutlined } from '@vicons/material'

import BadgeManager from '@/components/user/BadgeManager.vue'
import JmUserCard from '@/components/user/JmUserCard.vue'
import JmUserEditor from '@/components/user/JmUserEditor.vue'
import TitleManager from '@/components/user/TitleManager.vue'
import { pluginName, searchKeys } from '@/constants'
import type { createAuth } from '@/plugin/auth'
import type { createFavourites } from '@/plugin/favourites'
import type { JmcomicRuntimeService } from '@/runtime/cordis'
import { bindComponent } from '@/runtime/injection'
import type { PluginRuntime } from '@/runtime/PluginRuntime'

export const createUser = (
  runtime: PluginRuntime,
  auth: ReturnType<typeof createAuth>,
  favourites: ReturnType<typeof createFavourites>,
  service: JmcomicRuntimeService,
) => {
  const { login, restoreUser, signUp } = auth
  const { downloadFavorites, uploadFavorites } = favourites
  const user: UserModel = {
    auth: {
      selections: [
        { id: 'login', name: 'jmcomic.auth.login', call: login },
        { id: 'signup', name: 'jmcomic.auth.signup', call: signUp },
        {
          id: 'logout',
          name: 'jmcomic.auth.logout',
          call: async () => {
            try {
              await runtime.logout()
            } finally {
              UniUser.userBase.delete(pluginName)
            }
          },
        },
      ],
      default: async () => ((await restoreUser()) ? 'login' : false),
    },
    card: bindComponent(JmUserCard, service),
    edit: bindComponent(JmUserEditor, service),
    favourites: { download: downloadFavorites, upload: uploadFavorites },
    userActionPages: [
      {
        title: 'jmcomic.user.achievements',
        items: [
          {
            type: 'button',
            icon: EditOutlined,
            key: 'profile',
            name: 'jmcomic.user.edit',
            page: bindComponent(JmUserEditor, service),
          },
          {
            type: 'button',
            icon: BadgeOutlined,
            key: 'badges',
            name: 'jmcomic.user.badges',
            page: bindComponent(BadgeManager, service),
          },
          {
            type: 'button',
            icon: TitleOutlined,
            key: 'titles',
            name: 'jmcomic.user.titles',
            page: bindComponent(TitleManager, service),
          },
          {
            type: 'statistic',
            key: 'coin',
            name: 'jmcomic.user.coin',
            value: () => Number(runtime.jm.auth.session?.user?.coin ?? 0),
          },
          {
            type: 'statistic',
            key: 'charge',
            name: 'jmcomic.user.charge',
            value: () => String(runtime.jm.auth.session?.user?.charge ?? ''),
          },
        ],
      },
    ],
    userActions: [
      {
        id: 'search',
        name: 'jmcomic.search.comic',
        icon: SearchOutlined,
        call: author => routeToSearch(author.label, [pluginName, searchKeys.keyword]),
      },
    ],
  }
  return user
}