# 禁漫天堂 · Delta Comic 插件

为 Delta Comic 提供禁漫天堂内容的插件与 TypeScript SDK。

## 功能

- 漫画：搜索、分类、章节、图片解密、推荐、收藏、评论与回复。
- 图文：搜索、安全富文本、推荐、评论与回复。
- 小说：搜索、章节正文、推荐、收藏与评论。
- 创作者画册：作者、作品详情和图片内容；服务端不支持的点赞、评论和举报不会伪造成功。
- 账户：登录、注册、令牌会话恢复、收藏同步、签到、资料编辑、徽章与称号。
- 发现：分区、排行榜、热门标签、推荐页、随机推荐、JM 编号识别和作者订阅。
- 分流：插件探测 API 分流时自动选择延迟最低的可用节点；图片 CDN 则独立探测并在加载时执行图片解密。

插件默认导出只读 Cordis 函数数组，通过宿主服务注册内容、账户、分流、翻译与订阅。界面使用 Naive UI 与 Tailwind CSS。

本地宿主 SDK 构建和覆盖安装步骤见 [交接与验收记录](HANDOFF.md)。

## 仓库结构

- `packages/app`：唯一 Delta Comic 插件入口，注册 `comic`、`blog`、`novel`、
  `book-author`、`book` 五个技术路由。
- `packages/sdk`：请求、分流、鉴权、分页、响应校验和图片解码。浏览器解码器从
  `jmcomic-sdk/browser` 导出，Node/Sharp 解码器从 `jmcomic-sdk/node` 导出。
- `script`：发布分支和 semantic-release。

服务端没有官方 API 文档。SDK 的响应类型与解析规则来自解包。

## 开发

项目使用 Vite+、pnpm catalog、TypeScript 7 与 `vue-tsc`：

```sh
vp install --frozen-lockfile
vp run lib-build
vp check
vp run -r typecheck
vp test run
vp test run --coverage
vp run build
```

运行时集成测试默认请求真实服务。若初始分流发现因网络不可用而失败，测试才启动本地 MSW
回退服务。账户读取测试通过 `JMCOMIC_TEST_USERNAME` 与 `JMCOMIC_TEST_PASSWORD` 注入凭据；不要把
凭据写进仓库。测试代码不导入 Zod，公共类型使用 Vitest `.test-d.ts`、`expectTypeOf` 与
`assertType` 验证。

覆盖率门槛为 statements 80%、branches 70%、functions 80%、lines 80%。

## 安装插件

GitHub Release 固定提供两个来自 `packages/app/dist` 的资产：

- `manifest.json`
- `plugin.zip`

请在 Delta Comic 的插件管理界面使用对应 Release 资产安装。发布流程详见
[发布流程](docs/release-workflow.md)。

## SDK

使用示例与公共接口见 [SDK 文档](packages/sdk/README.md)。

## 许可证

[MIT](LICENSE)
