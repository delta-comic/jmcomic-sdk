# jmcomic-sdk

面向浏览器与 Node.js 的禁漫天堂移动端 API TypeScript SDK。它提供完整类型、运行时响应校验、
自动分流、会话复用，以及浏览器和 Node.js 两套图片解码适配器。

> 本项目是非官方 SDK，接口行为可能随上游服务变化。请仅在当地法律和服务条款允许的范围内使用。

## 安装

从 npm 安装稳定版：

```sh
pnpm add jmcomic-sdk
```

体验 `next` 预发布版：

```sh
pnpm add jmcomic-sdk@next
```

同一版本也会发布到 GitHub Packages，包名为 `@delta-comic/jmcomic-sdk`。GitHub Packages
通常要求在本机配置具有 `read:packages` 权限的令牌：

```ini
# .npmrc
@delta-comic:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_PACKAGES_TOKEN}
```

```sh
pnpm add @delta-comic/jmcomic-sdk@next
```

## 快速开始

```ts
import { JMComic, SortType } from 'jmcomic-sdk'

const jm = new JMComic({ timeout: 15_000, retry: 1 })

// 自动选择延迟最低的可用分流；也可在构造函数中直接传入 baseUrl。
const baseUrl = await jm.fork.autoPickFork()

const result = await jm.comic.searchByKeyword({
  keyword: '作者或作品名',
  order: SortType.Relate,
  page: 1,
})

const comic = await jm.comic.getInfo({ id: result.list[0]!.id })
console.log(baseUrl, comic)
```

从 GitHub Packages 安装时，把示例中的导入路径换为
`@delta-comic/jmcomic-sdk`、`@delta-comic/jmcomic-sdk/browser` 或
`@delta-comic/jmcomic-sdk/node` 即可。

## 初始化选项

```ts
const jm = new JMComic({
  // 可选；未提供时先调用 jm.fork.autoPickFork()。
  baseUrl: 'https://example.com',
  timeout: 15_000,
  retry: 1,
  // 可选；恢复之前持久化的登录态。
  session,
  // 可选；用于测试或需要固定时间戳的宿主。
  now: () => Date.now(),
})
```

所有异步业务 API 的最后一个参数都是可选的 `AbortSignal`：

```ts
const controller = new AbortController()
const request = jm.comic.getInfo({ id: 350234 }, controller.signal)

controller.abort()
await request
```

## 功能模块

`JMComic` 暴露以下稳定模块：

| 模块 | 常用能力 |
| --- | --- |
| `fork` | 获取、解密并自动选择分流 |
| `auth` | 登录、注册、登出、找回密码和会话恢复 |
| `comic` | 搜索、详情、分页图片、收藏、点赞和评论 |
| `blog` | 搜索、详情、点赞和评论 |
| `novel` | 列表、搜索、章节正文、收藏和评论 |
| `book` | 画册搜索、作者详情、画册详情与图片列表 |
| `promote` | 分类、推荐、周榜、热门标签、随机与最新内容 |
| `user` | 签到、资料、收藏、历史、徽章和称号 |
| `image` | 下载并还原分段打乱的图片 |

分页接口统一返回 `PageResult<T>`：

```ts
interface PageResult<T> {
  total: number
  list: T[]
}
```

## 登录与会话

```ts
const login = await jm.auth.login({
  username: process.env.JMCOMIC_USERNAME!,
  password: process.env.JMCOMIC_PASSWORD!,
})

// 登录成功后读取会话并安全地持久化；不要保存明文密码。
const session = jm.auth.session

// 下次启动时恢复。
const restored = new JMComic({ session })
await restored.fork.autoPickFork()

console.log(login.user.username)
```

需要账户的接口会读取当前会话。缺少登录态时会抛出 `JmApiError`，错误码为
`AUTH_REQUIRED`。

## 图片解码

浏览器环境使用独立入口，避免把 Node.js 的 Sharp 打进前端包：

```ts
import { BrowserImageDecoder } from 'jmcomic-sdk/browser'
import { JMComic } from 'jmcomic-sdk'

const jm = new JMComic({ imageDecoder: new BrowserImageDecoder() })
await jm.fork.autoPickFork()

const { url: dataUrl } = await jm.image.decryptImage(
  '/media/photos/350234/00001.webp',
  350234,
  1,
)
```

Node.js 环境使用 `jmcomic-sdk/node`；`sharp` 是可选依赖，需要在禁用可选依赖安装时自行添加：

```ts
import { JMComic } from 'jmcomic-sdk'
import { NodeImageDecoder } from 'jmcomic-sdk/node'

const jm = new JMComic({ imageDecoder: new NodeImageDecoder() })
```

## 错误处理

网络失败、响应结构变化、缺少会话或分流不可用都会归一为 `JmApiError`：

```ts
import { JmApiError } from 'jmcomic-sdk'

try {
  await jm.user.getHistory({ page: 1 })
} catch (error) {
  if (error instanceof JmApiError) {
    console.error(error.code, error.endpoint, error.message)
  }
  throw error
}
```

目前的错误码包括 `AUTH_REQUIRED`、`DECRYPTION_FAILED`、`INVALID_RESPONSE`、
`NETWORK_ERROR`、`NO_AVAILABLE_FORK` 和 `UNSUPPORTED_OPERATION`。

## 运行环境与入口

- 包为纯 ESM，并包含 TypeScript 声明和 source map。
- 根入口依赖现代 `fetch`、`FormData`、`Blob` 与 `AbortController` Web API。
- `jmcomic-sdk/browser` 使用 `createImageBitmap`、`OffscreenCanvas` 和 `FileReader`。
- `jmcomic-sdk/node` 按需加载 `sharp`。

生产服务使用固定的时间戳、摘要和版本请求头验证协议。它属于服务兼容性契约，不能按普通
REST 客户端习惯随意删改。

## 开发

仓库统一使用 Vite+：

```sh
vp install
vp run -t jmcomic-sdk#typecheck
vp run -t jmcomic-sdk#build
vp test run --project sdk
```

`src/model/*.ts` 中带 `@zod` 的 TypeScript 接口是模型的唯一结构来源。修改这些接口或其
JSDoc 后运行 `vp run -t jmcomic-sdk#schema:generate`，并提交同步生成的
`src/model/generated/*.ts`；生成文件不要手工编辑。`@description`、约束标签和少量
`@schema` 注解会同步进入 Zod schema，构建前也会自动重新生成并验证类型兼容性。

## License

[MIT](./LICENSE)
