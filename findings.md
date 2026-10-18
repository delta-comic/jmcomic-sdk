# Findings

- 插件默认入口为冻结的七个 Cordis 函数；JmcomicRuntimeService 提供 SDK、模型、页面和业务工厂，依赖 config、i18n、network。
- 内容注册等待远程探测完成。i18n、内容、用户、订阅和异步远程注册均由 ctx.effect 管理；服务释放会取消请求并清理会话及预载状态。
- ReaderLayout 组合阅读、详情、章节、推荐、评论；ImageReader、RichTextReader、CreatorReader 使用宿主 UniContentPage props 和服务页面类收窄能力。
- 搜索排序通过枚举查找收窄；评论通过字段检查识别可回复目标；业务实现未使用不安全 as 类型断言。
- 旧布局插件与宿主私有包依赖已清理；packages/sdk 的生产源码保持原样。SDK 测试调整了空搜索结果与分类数据的关联，并报告在线或 fixture 模式。
- 宿主 SDK 独立产物包括 index、vite 等公开入口，声明和运行时依赖扫描通过。宿主工作区使用 delta-comic-workspace 导出条件共享模型源码入口，消除私有字段类型身份冲突。
- 应用声明生成曾让 manifest 选择 index.d.ts。应用构建现生成 index.js、index.css、源码映射及 ZIP，manifest 正确指向 index.js。
- 当前已发布 @delta-comic/client@3.0.0-next.20 需使用本地修复产物覆盖验证。宿主清单仍为 next.19，本次按源码提交验收；未执行发布。
- SDK 在线搜索可合法返回空列表；分类查询从导航分类中取 slug，漫画章节继续使用既定公开 fixture。
