# Jmcomic Cordis 迁移与本地验收

## 实现状态

- `packages/app/src/main.ts` 默认导出冻结的七个 Cordis `Plugin.Function`。
- `JmcomicRuntimeService` 提供 SDK、模型、页面和业务服务，依赖宿主 config、i18n、network。
- 内容、账户、翻译、远程和订阅注册通过 Cordis 服务完成，`ctx.effect()` 管理资源释放。
- 漫画、图文、小说、作者与画册五类内容，以及搜索、推荐、收藏、评论、图片解密和账户功能已迁移。
- 会话使用宿主 `ClientConfig`。请求随服务卸载取消；远程登出失败时仍清理宿主账户。
- 测试位于 `packages/app/test`；SDK 生产源码保持原样，在线测试支持空搜索结果。

## 宿主本地修复

仓库：`/Users/wenxig/Documents/delta-comic`，分支 `develop`。

签名提交：

- `4ef0a21b`：公开 SDK 与 Vite 构建工具入口。
- `134aef16`：SDK 内部包打包引用。
- `0fa6190c`：公开声明过滤内部导航注册类型。
- `1d0427f0`：宿主使用 `delta-comic-workspace` 条件共享源码入口和模型身份，导航按需加载。

宿主清单版本为 `3.0.0-next.19`；插件依赖已发布的 `3.0.0-next.20`，本次验收使用上述源码构建的本地产物覆盖。未执行 registry 发布。

## 本地产物安装

先在宿主仓库执行：

```sh
vp run --concurrency-limit 1 lib-build
vp run --filter @delta-comic/client build
```

在 jmcomic-sdk 安装依赖后，覆盖本地 SDK 产物和公开 Vite 导出：

```sh
vp install --frozen-lockfile
node --input-type=module <<'JS'
import { cp, readFile, realpath, writeFile } from 'node:fs/promises'
const source = '/Users/wenxig/Documents/delta-comic/packages/client/core/sdk'
const target = await realpath('packages/app/node_modules/@delta-comic/client')
await cp(`${source}/dist`, `${target}/dist`, { recursive: true, force: true })
const installed = JSON.parse(await readFile(`${target}/package.json`, 'utf8'))
const local = JSON.parse(await readFile(`${source}/package.json`, 'utf8'))
installed.exports['./vite'] = local.exports['./vite']
await writeFile(`${target}/package.json`, JSON.stringify(installed, null, 2) + '\n')
JS
vp run lib-build
vp check
vp run -r typecheck
vp test run
vp run build
```

全新安装或依赖重建后，应重新应用该本地覆盖步骤。

## 验收记录（2026-10-18）

- 插件依赖构建、格式/lint、工作区类型检查和完整测试已通过；22 文件、105 测试通过，1 项账户测试跳过。
- Cordis 测试验证挂载、卸载、重载、注册失败、异步远程注册清理、会话恢复及离线登出清理。
- `packages/app/dist/manifest.json` 指向 `index.js`；ZIP 内容和资源 SHA-256 校验通过。
- 打包 JS 加载得到七个只读函数，提供五种内容模型；SDK 服务挂载和卸载通过。
- 宿主 `lib-build`、`vp check`、完整工作区类型检查通过；SDK/注册服务/构建适配器定向测试 13 项通过。
- SDK `index.mjs`、`vite.mjs` 独立 Node 导入通过，运行时和声明扫描符合公共依赖边界。
- 账户在线测试需要 `JMCOMIC_TEST_USERNAME`、`JMCOMIC_TEST_PASSWORD`；本地未配置，保持跳过。API 测试在发现失败时可使用 MSW fixture，测试结果不作为全路径在线验收证明。
