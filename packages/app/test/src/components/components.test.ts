import { UniImage, UniItem } from '@delta-comic/client'
import { config, flushPromises, mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'

import RichTextReader from '@/components/content/RichTextReader.vue'
import SafeRichText from '@/components/content/SafeRichText.vue'
import JmItemCard from '@/components/JmItemCard.vue'
import ResolvedImage from '@/components/ResolvedImage.vue'
import { pluginName } from '@/constants'
import { serviceKey } from '@/runtime/injection'

import { createTestService } from '../../context'
const { service } = createTestService()
config.global.provide = { [serviceKey]: service }

class TestItem extends UniItem {
  public override async like() {}
  public override async report() {}
  public override async sendComment() {}
}

const item = new TestItem({
  $$plugin: pluginName,
  author: [],
  categories: [],
  commentSendable: false,
  contentType: [pluginName, 'comic'],
  cover: { $$plugin: pluginName, forkNamespace: 'default', path: 'https://example.com/cover.jpg' },
  epLength: '1',
  id: '1',
  length: '1',
  thisEp: { $$plugin: pluginName, id: '1', name: 'Chapter' },
  title: 'Card title',
})

describe('shared UI components', () => {
  test('resolves direct images and emits their URL', async () => {
    const wrapper = mount(ResolvedImage, {
      props: { image: 'https://example.com/image.jpg', alt: 'alt' },
    })
    await flushPromises()
    expect(wrapper.get('img').attributes()).toMatchObject({
      src: 'https://example.com/image.jpg',
      alt: 'alt',
    })
    expect(wrapper.emitted('loaded')).toEqual([['https://example.com/image.jpg']])
  })

  test('normalizes image resolver failures for the host', async () => {
    vi.spyOn(UniImage, 'is').mockReturnValue(false)
    vi.spyOn(UniImage, 'create')
      .mockReturnValueOnce({ getUrl: vi.fn().mockRejectedValue('bad image') } as never)
      .mockReturnValueOnce({ getUrl: vi.fn().mockRejectedValue(new Error('offline')) } as never)
    const wrapper = mount(ResolvedImage, {
      props: { image: { $$plugin: pluginName, path: '/broken.jpg' } as never },
    })
    await flushPromises()
    expect(wrapper.emitted('error')?.[0]?.[0]).toEqual(new Error('bad image'))
    await wrapper.setProps({ image: { $$plugin: pluginName, path: '/offline.jpg' } as never })
    await flushPromises()
    expect(wrapper.emitted('error')?.[1]?.[0]).toEqual(new Error('offline'))
  })

  test('item cards emit clicks unless disabled', async () => {
    const wrapper = mount(JmItemCard, { props: { item } })
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
    await wrapper.setProps({ disabled: true })
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
    expect(wrapper.text()).toContain('Card title')
  })

  test('safe rich text never creates script or iframe elements', () => {
    const wrapper = mount(SafeRichText, {
      props: {
        html: '<h2>Title</h2><script>alert(1)</script><iframe src="x"></iframe><p>Body</p>',
      },
    })
    expect(wrapper.find('script').exists()).toBe(false)
    expect(wrapper.find('iframe').exists()).toBe(false)
    expect(wrapper.text()).toContain('Title')
    expect(wrapper.text()).toContain('Body')
  })

  test('renders every allowed rich text block as inert markup', () => {
    const wrapper = mount(SafeRichText, {
      props: {
        html: [
          '<h1>One</h1>',
          '<h3>Three</h3>',
          '<blockquote>Quote</blockquote>',
          '<pre>Code</pre>',
          '<img src="https://example.com/image.jpg" alt="Image">',
          '<a href="https://example.com">Link</a>',
        ].join(''),
      },
    })
    expect(wrapper.get('h1').text()).toBe('One')
    expect(wrapper.get('h3').text()).toBe('Three')
    expect(wrapper.get('blockquote').text()).toBe('Quote')
    expect(wrapper.get('code').text()).toBe('Code')
    expect(wrapper.get('a').attributes('rel')).toBe('noopener noreferrer')
  })

  test('rich text reader exposes loading success and error retry states', async () => {
    const loadRichText = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue('<p>Loaded</p>')
    const page = new service.pages.blog(undefined, '1', '1')
    vi.spyOn(page, 'loadRichText').mockImplementation(loadRichText)
    const wrapper = mount(RichTextReader, { props: { page } })
    await flushPromises()
    expect(wrapper.text()).toContain('offline')
    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Loaded')
    expect(loadRichText).toHaveBeenCalledTimes(2)
  })
})