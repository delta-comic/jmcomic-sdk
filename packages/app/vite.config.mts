import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from '@vizejs/vite-plugin/vite-plus'
import browserslist from 'browserslist'
import { browserslistToTargets } from 'lightningcss'
import { lazyPlugins } from 'vite-plus'

import packageJson from './package.json' with { type: 'json' }
import { pluginName } from './src/constants.ts'

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      output: {
        chunkFileNames: '[name]-[hash].js',
        entryFileNames: chunk => (chunk.name.endsWith('.d') ? 'index.d.ts' : 'index.js'),
      },
    },
    sourcemap: true,
  },
  css: {
    lightningcss: { targets: browserslistToTargets(browserslist('> 1%, last 2 versions')) },
    transformer: 'lightningcss',
  },
  plugins: lazyPlugins(async () => {
    const [{ deltaComic }, { default: tailwindcss }] = await Promise.all([
      import('@delta-comic/client/vite'),
      import('@tailwindcss/vite'),
    ])
    return [
      tailwindcss(),
      deltaComic({
        protocolVersion: 2,
        id: pluginName,
        name: '禁漫天堂',
        author: 'wenxig',
        description: packageJson.description,
        client: { entry: 'index.js' },

        resources: [],
        version: packageJson.version,
      }),
    ]
  }),
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  run: {
    tasks: {
      build: {
        command: 'vp build',
        dependsOn: [{ task: 'build', from: 'dependencies' }],
        cache: true,
      },
      dev: {
        command: 'vp dev',
        dependsOn: [{ task: 'build', from: 'dependencies' }],
        cache: false,
      },
      typecheck: {
        command: [
          'tsrs --fast --runExternalCode -p tsconfig.app.json --noEmit',
          'tsrs --fast --runExternalCode -p tsconfig.node.json --noEmit',
        ],
        dependsOn: [{ task: 'build', from: 'dependencies' }],
        cache: true,
      },
    },
  },
  server: { host: true, port: 6175, strictPort: true },
}).withVue({})