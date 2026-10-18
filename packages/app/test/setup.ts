import { vi } from 'vite-plus/test'

vi.mock('@delta-comic/client', async importOriginal => {
  const sdk = await importOriginal<typeof import('@delta-comic/client')>()
  return {
    ...sdk,
    routeToContent: vi.fn().mockResolvedValue(undefined),
    routeToSearch: vi.fn().mockResolvedValue(undefined),
  }
})