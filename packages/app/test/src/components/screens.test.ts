import { routeToContent } from '@delta-comic/client'
import { config, flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, test, vi } from 'vitest'

import CreatorReader from '@/components/content/CreatorReader.vue'
import JmCommentRow from '@/components/JmCommentRow.vue'
import PromoteTab from '@/components/search/PromoteTab.vue'
import WeekBestTab from '@/components/search/WeekBestTab.vue'
import BadgeManager from '@/components/user/BadgeManager.vue'
import JmUserCard from '@/components/user/JmUserCard.vue'
import JmUserEditor from '@/components/user/JmUserEditor.vue'
import TitleManager from '@/components/user/TitleManager.vue'
import { pluginName } from '@/constants'
import { serviceKey } from '@/runtime/injection'

import { createTestService } from '../../context'
const { service, runtime } = createTestService()
const { JmUser } = service.items
config.global.provide = { [serviceKey]: service }

const comic = {
  id: 1,
  name: 'Comic',
  author: 'Author',
  image: 'https://example.com/comic.jpg',
  category: { id: '1', title: 'Main' },
  category_sub: { id: '2', title: 'Sub' },
  is_favorite: false,
  liked: false,
} as never

afterEach(() => {
  vi.restoreAllMocks()
  runtime.jm.auth.clearSession()
  runtime.promotes = []
  runtime.weekBest = undefined
})

describe('content and account screens', () => {
  test('renders a creator work grid', async () => {
    const page = new service.pages['book-author'](undefined, '1', '1')
    vi.spyOn(page, 'loadAuthor').mockResolvedValue({
      author_name: 'Creator',
      author_id: '1',
      work_title: '',
      work_date: '',
      sponsor: [],
      filters: { language: [], source: [] },
      author_avatar: 'https://example.com/avatar.jpg',
      background_image: 'https://example.com/banner.jpg',
      related_works: [
        {
          id: 2,
          work_title: 'Work',
          work_image: 'https://example.com/work.jpg',
          work_date: '2026-01-01',
          platform_name: 'source',
        },
      ],
    })
    const creator = mount(CreatorReader, { props: { page } })
    await flushPromises()
    expect(creator.text()).toContain('Creator')
    expect(creator.text()).toContain('Work')
  })

  test('opens promoted and weekly content through host navigation', async () => {
    runtime.promotes = [
      { id: 1, title: 'Promote', slug: '', type: 'comic', filter_val: '', content: [comic] },
    ]
    const promoted = mount(PromoteTab, {
      props: { isActive: true, tabbar: { id: '1', title: 'Promote', comp: PromoteTab } },
    })
    await promoted.get('article').trigger('click')
    expect(routeToContent).toHaveBeenCalledWith([pluginName, 'comic'], '1', '1', expect.anything())

    runtime.weekBest = {
      categories: [{ id: '1', title: 'Week', time: 'week' }],
      type: [{ id: 'comic', title: 'Comic' }],
    }
    vi.spyOn(runtime.jm.promote, 'getWeekBestList').mockResolvedValue({ total: 1, list: [comic] })
    const weekly = mount(WeekBestTab, {
      props: { isActive: true, tabbar: { id: 'week-best', title: 'Week', comp: WeekBestTab } },
    })
    await flushPromises()
    expect(weekly.text()).toContain('Comic')
    await weekly.get('article').trigger('click')
    expect(runtime.jm.promote.getWeekBestList).toHaveBeenCalledOnce()
  })

  test('renders user summary and saves profile changes without storing credentials', async () => {
    const rawUser = {
      uid: 7,
      username: 'tester',
      fname: 'Tester',
      photo: 'nopic.gif',
      level: 2,
      level_name: 'Reader',
      coin: 3,
      charge: '4',
      album_favorites: 5,
      invited_cnt: 6,
      jwttoken: 'token',
      s: 'avs',
    } as never
    const card = mount(JmUserCard, { props: { user: new JmUser(rawUser) } })
    expect(card.text()).toContain('Tester')
    expect(card.text()).toContain('Reader')

    runtime.jm.auth.restoreSession({ username: 'tester', token: 'token', user: rawUser })
    const profile = { nickName: 'Tester', email: 'test@example.invalid', gender: null }
    vi.spyOn(runtime.jm.user, 'getUser').mockResolvedValue(profile as never)
    const save = vi.spyOn(runtime.jm.user, 'setUser').mockResolvedValue(profile as never)
    const editor = mount(JmUserEditor)
    await flushPromises()
    await editor.get('button').trigger('click')
    await flushPromises()
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ uid: 7, user: expect.objectContaining({ nickName: 'Tester' }) }),
      runtime.signal,
    )
    expect(editor.text()).toContain('jmcomic.state.saved')
  })

  test('loads titles and badges and sends only explicit account mutations', async () => {
    vi.spyOn(runtime.jm.user, 'getAllTitles').mockResolvedValue([
      { id: 'title-1', name: 'Title', done: true },
    ] as never)
    const setTitle = vi
      .spyOn(runtime.jm.user, 'setTitles')
      .mockRejectedValueOnce(new Error('title rejected'))
    const titles = mount(TitleManager)
    await flushPromises()
    expect(titles.text()).toContain('Title')
    await titles.get('button').trigger('click')
    expect(setTitle).toHaveBeenCalledWith({ id: 'title-1' })
    await flushPromises()
    expect(titles.text()).toContain('title rejected')

    const badge = { id: 1, name: 'Badge', content: '/badge.jpg', coin: 1, done: false }
    vi.spyOn(runtime.jm.user, 'getAllBadges').mockResolvedValue([badge] as never)
    vi.spyOn(runtime.jm.user, 'getMyBadges').mockResolvedValue([
      { ...badge, done: true },
      { ...badge, id: 2, name: 'Badge 2', done: true },
    ] as never)
    vi.spyOn(runtime.jm.user, 'buyBadge').mockResolvedValue({ status: 'ok' })
    const order = vi.spyOn(runtime.jm.user, 'changeBadgesOrder').mockResolvedValue({ status: 'ok' })
    const badges = mount(BadgeManager)
    await flushPromises()
    expect(badges.text()).toContain('Badge')
    const badgeButton = (text: string) =>
      badges.findAll('button').find(entry => entry.text().includes(text))!
    await badgeButton('↓').trigger('click')
    await badges
      .findAll('button')
      .filter(entry => entry.text().includes('↑'))
      .at(-1)!
      .trigger('click')
    await badgeButton('jmcomic.action.saveOrder').trigger('click')
    await flushPromises()
    expect(order).toHaveBeenCalledWith({ idList: ['1', '2'] })
  })

  test('submits comment replies and reports remote errors', async () => {
    const sendComment = vi
      .fn()
      .mockRejectedValueOnce(new Error('rejected'))
      .mockResolvedValue(undefined)
    const comment = {
      id: '1',
      sender: { name: 'Alice' },
      time: 0,
      content: { type: 'string', text: 'Comment' },
      sendComment,
    }
    const wrapper = mount(JmCommentRow, {
      props: { comment: comment as never, item: { commentSendable: true } as never },
    })
    await wrapper.get('button').trigger('click')
    const textarea = wrapper.get('textarea')
    await textarea.setValue('reply')
    await wrapper.findAll('button').at(-1)!.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('rejected')
    await wrapper.findAll('button').at(-1)!.trigger('click')
    await flushPromises()
    expect(sendComment).toHaveBeenCalledTimes(2)
  })
})