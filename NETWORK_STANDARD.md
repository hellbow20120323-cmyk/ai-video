核心原则：局部代理，生产环境隔离。

1. 代理禁令 (No-Global-Proxy)
严禁全局劫持：禁止在代码中使用 setGlobalDispatcher 等全局分发器。

局部化 fetch：只有针对 generative-ai.google 的请求允许通过环境变量指定的代理，其余请求（尤其是 Supabase）必须直连。

2. 环境一致性
本地环境：仅在 development 模式下启用代理逻辑。

生产环境：自动识别环境，移除所有本地调试相关的代理配置。
