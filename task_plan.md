# 禁漫插件 Cordis 架构重构

## 目标

将 `packages/app` 改为 Delta Comic Cordis `Plugin.Function[]` 架构，保留现有功能并移除旧聚合配置与 expose；SDK 生产源码保持不变。

## 阶段

- [x] 核对 Cordis/宿主 API 与依赖生命周期，明确服务和函数边界。
- [x] 实现 Cordis SDK 服务、功能注册函数和新插件入口。
- [x] 迁移业务消费方、UI 状态、测试与类型契约。
- [x] 运行构建、检查、类型检查和测试，修复回归。
- [x] 审查差异并创建签名提交。

## Next Step

已完成本地实现与验收；构建产物和本地 SDK 使用步骤见 HANDOFF.md。

## Errors Encountered

| Error | Attempt | Resolution |
| --- | --- | --- |
| 旧锁文件私有包元数据 404 | 安装依赖 | 更新锁文件并清理旧依赖 |
| SDK 打包类型与内部模型冲突 | 宿主完整类型检查 | 工作区源码入口条件 |
| manifest 入口为 index.d.ts | 构建产物检查 | 移除应用声明打包 |

