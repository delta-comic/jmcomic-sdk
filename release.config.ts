import { createReleaseNameTemplate, defineConfig } from '@delta-comic/release-cli'

import pkg from './package.json' with { type: 'json' }
export const releaseBranches = ['main', { name: 'next', channel: 'next', prerelease: 'next' }]

export default defineConfig({
  branches: releaseBranches,
  repositoryUrl: pkg.repository.url,
  tagFormat: '${version}',
  plugins: [
    ['@semantic-release/commit-analyzer', { preset: 'angular' }],
    ['@semantic-release/release-notes-generator', { preset: 'angular' }],
    ['@semantic-release/changelog', { changelogFile: 'CHANGELOG.md' }],
    [
      '@semantic-release/github',
      {
        assets: [
          { path: 'packages/app/dist/manifest.json', label: 'manifest.json' },
          { path: 'packages/app/dist/plugin.zip', label: 'plugin.zip' },
        ],
        releaseNameTemplate: createReleaseNameTemplate(),
      },
    ],
  ],
}).withCI({
  jsonVersionPaths: ['package.json', 'packages/app/package.json', 'packages/sdk/package.json'],
  cargoTomlVersionPaths: [],
  cargoLockPackageNames: [],
  workspace: { roots: ['packages'] },
  registry: 'https://npm.pkg.github.com/',
})