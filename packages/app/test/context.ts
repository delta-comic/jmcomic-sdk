import {
  Context,
  type ClientConfig,
  type ClientI18n,
  type ClientNetwork,
} from '@delta-comic/client'
import { vi } from 'vite-plus/test'

import { JmcomicRuntimeService } from '@/runtime/cordis'

export const createTestContext = () => {
  const root = new Context()
  const values = new Map<string, Record<string, unknown>>()
  const config = {
    get: (plugin: string) => values.get(plugin) ?? {},
    set: vi.fn(async (plugin: string, value: Record<string, unknown>) => {
      values.set(plugin, value)
    }),
  } satisfies ClientConfig
  const i18n = {
    register: vi.fn(() => async () => {}),
    translate: vi.fn((key: string) => key),
    translateText: (value: string) => value,
  } satisfies ClientI18n
  const network = {
    request: vi.fn(async () => new Response('{}')),
    get: vi.fn(async () => new Response('{}')),
    post: vi.fn(async () => new Response('{}')),
  } satisfies ClientNetwork
  root.provide('config', config)
  root.provide('i18n', i18n)
  root.provide('network', network)
  return { root, config, i18n, network, values }
}

export const createTestService = () => {
  const host = createTestContext()
  const service = new JmcomicRuntimeService(host.root)
  return { ...host, service, runtime: service.runtime }
}