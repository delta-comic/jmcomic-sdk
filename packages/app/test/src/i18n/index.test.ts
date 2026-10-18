import { describe, expect, it } from 'vite-plus/test'

import { jmcomicMessages } from '@/i18n'

import { createTestService } from '../../context'

describe('jmcomic locale messages', () => {
  it('registers Simplified Chinese messages and delegates translations to the host', () => {
    const { runtime, i18n } = createTestService()
    expect(jmcomicMessages['zh-CN'].jmcomic.remotes.api).toBe('API 分流')
    expect(runtime.translate('jmcomic.reader.page', { page: 2 })).toBe('jmcomic.reader.page')
    expect(i18n.translate).toHaveBeenCalledWith('jmcomic.reader.page', { page: 2 })
  })
})