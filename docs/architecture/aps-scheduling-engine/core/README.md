# APS 排产引擎 - Core

本目录只保留 APS 排产引擎的核心实现深挖文档。

通用设计规范以父目录文档为准：

- `../domain-model.md`
- `../engine-rules.md`
- `../event-driven-adjustment.md`
- `../api-design.md`
- `../implementation-roadmap.md`

当前 core 文档：

- `dynamic-hooks-design.md`
  - 动态排程钩子、事件接入、重排触发与状态同步边界。
- `greedy-heuristic-design.md`
  - 启发式 + 贪婪排产的后端实现方案。
- `models/order-model.md`
  - Order 输入模型字段边界。

不要在本目录重新创建与父目录同名的短版概要文档；如果需要补充通用规范，直接更新父目录对应文档。
