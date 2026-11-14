import { defineConfig } from '@vizejs/vite-plugin/vite-plus'
import { defaultClientConditions } from 'vite-plus'
import type { OxfmtConfig } from 'vite-plus/fmt'
import type { OxlintConfig } from 'vite-plus/lint'

import fmt from './.oxfmtrc.json' with { type: 'json' }
import lint from './.oxlintrc.json' with { type: 'json' }

export default defineConfig(
  {
    resolve: { conditions: ['delta-comic-workspace', ...defaultClientConditions] },
    staged: {
      '*': () => ['vp check --fix'],
      '*.{ts,tsx,mts,js,jsx,mjs,vue,html,md,json,yaml,toml}': 'vp exec cspell --no-must-find-files',
    },
    fmt: { ...fmt, vue: false } as OxfmtConfig,
    lint: lint as OxlintConfig,
    run: {
      cache: { tasks: true, scripts: false },
      tasks: {
        // dev
        'dev': { command: 'vp run @delta-comic/app#dev:desktop', cache: false },
        'dev:android': { command: 'vp run @delta-comic/app#dev:mobile', cache: false },
        'dev:web': { command: 'vp run @delta-comic/app#dev:web:mobile', cache: false },
        // build
        'build:packages': { command: 'vp run -r build', cache: { output: [] } },
        'build': { command: 'echo "no need"' },
        // release
        'branch:develop': { command: 'vp exec dr branch prepare develop', cache: false },
        'release': { command: 'vp exec dr release run', cache: false },
        'release:preview': { command: 'vp exec dr branch promote preview', cache: false },
        'release:stable': { command: 'vp exec dr branch promote stable', cache: false },
        // linter
        'typecheck': {
          command: 'vp exec tsc --project ./tsconfig.json && vp run -r typecheck',
          dependsOn: ['build:packages'],
          cache: { output: [] },
        },
      },
    },
    test: {
      clearMocks: true,
      restoreMocks: true,
      unstubEnvs: true,
      unstubGlobals: true,
      coverage: {
        provider: 'v8',
        include: ['packages/*/*/{app,lib,src,src-web,vite}/**/*.ts', 'script/**/*.{ts,mts}'],
        exclude: ['**/*.d.ts', '**/{test,dist,generated}/**', '**/*.test.ts', '**/src/router.ts'],
        thresholds: { lines: 0, functions: 0, branches: 0, statements: 0 },
      },
      exclude: ['**/node_modules/**', '**/.git/**', '.agents/**'],
      projects: [
        'script/*/vite.config.*',
        'packages/*/vite.config.*',
        'packages/*/*/vite.config.*',
      ],
    },
  },
  { lint: false, fmt: false },
).withVue({})