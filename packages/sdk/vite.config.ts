import { defineConfig } from 'vite-plus'

export default defineConfig({
  pack: {
    platform: 'neutral',
    entry: ['./src/index.ts', './src/browser.ts', './src/node.ts'],
    dts: { tsconfig: './tsconfig.app.json' },
    sourcemap: true,
  },
  run: {
    tasks: {
      'schema:generate': {
        command: ['ts-to-zod --all', 'vp fmt src/model/generated --write'],
        cache: true,
      },
      'build': { command: 'vp pack', dependsOn: ['schema:generate'], cache: true },
      'typecheck': {
        command: [
          'tsrs --fast --runExternalCode -p tsconfig.app.json --noEmit',
          'tsrs --fast --runExternalCode -p tsconfig.node.json --noEmit',
        ],
        dependsOn: ['schema:generate'],
        cache: true,
      },
    },
  },
})