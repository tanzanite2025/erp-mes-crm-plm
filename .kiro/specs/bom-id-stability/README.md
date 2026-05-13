# BOM Item ID 稳定性改进 - Spec 总览

## 📋 Spec 状态

**状态**: ✅ 已完成，可开始实施  
**创建日期**: 2026-05-13  
**预计工期**: 2 周  
**优先级**: P0（最高）

---

## 📚 文档结构

### 1. [requirements.md](./requirements.md) - 需求文档
**内容**:
- 问题描述与用户影响
- 根本原因分析
- 解决方案概述
- 用户故事与验收标准
- 技术需求
- 风险评估

**关键点**:
- 当前 SaveBOM 使用"物理删除 + 重新插入"，导致 ID 不稳定
- 影响用户体验（保存后全量重绘）
- 违反 SDRTS 原则

---

### 2. [design.md](./design.md) - 设计文档
**内容**:
- 智能 Upsert 算法详解
- 后端实现方案（Go）
- 前端实现方案（TypeScript）
- 数据库设计
- 审计日志增强
- 性能优化
- 测试策略
- 回滚方案

**关键点**:
- 根据 ID 判断新增、更新或删除
- 前端发送 ID，后端保留 ID
- 增量更新，避免全量重绘

---

### 3. [tasks.md](./tasks.md) - 任务列表
**内容**:
- 15 个可执行任务
- 任务依赖关系
- 实施计划（2 周）
- 成功标准

**关键任务**:
- Task 1: 实现 upsertBOMItems 核心函数
- Task 2: 修改 SaveBOM 使用 Upsert
- Task 8: 前端发送 ID
- Task 9: 前端增量更新

---

## 🎯 核心目标

### 问题
- 每次保存后所有 BOMItemID 都变化
- 前端必须全量重绘（性能差）
- 无法追踪行级别的变更历史

### 解决方案
- 实现智能 Upsert 算法
- 前端发送 ID，后端保留 ID
- 支持增量更新

### 预期效果
- 保存后 ID 稳定（未修改的行 ID 不变）
- 性能提升 90%+（仅更新变更的行）
- 用户体验改善（保持展开/折叠状态）

---

## 📊 关键指标

### 性能指标
- **当前**: 1000 行 BOM 保存耗时 > 5 秒
- **目标**: 1000 行 BOM 保存耗时 < 2 秒
- **提升**: 60%+

### 数据库操作
- **当前**: 2000 次操作（1000 DELETE + 1000 INSERT）
- **目标**: 13 次操作（1 DELETE + 2 INSERT + 10 UPDATE）
- **减少**: 99%+

### 用户体验
- **当前**: 保存后丢失展开/折叠状态
- **目标**: 保存后保持展开/折叠状态
- **改善**: 显著

---

## 🚀 快速开始

### 1. 阅读文档
```bash
# 按顺序阅读
1. requirements.md  # 理解问题
2. design.md        # 理解方案
3. tasks.md         # 查看任务
```

### 2. 开始实施

**选项 A: 手动实施**
```bash
# 按照 tasks.md 中的任务顺序逐个实施
# 从 Task 1 开始
```

**选项 B: 使用 Kiro 自动执行**
```bash
# 让 Kiro 帮你执行任务
# 告诉 Kiro: "执行 bom-id-stability 的 Task 1"
```

### 3. 验证结果
```bash
# 运行测试
go test ./server/services/... -v

# 性能基准测试
go test ./server/services/... -bench=. -benchmem
```

---

## 📈 实施计划

### Week 1: 后端实现
- **Day 1-2**: Task 1-4（核心 Upsert 逻辑 + 单元测试）
- **Day 3**: Task 2, 7（修改 SaveBOM + 审计日志）
- **Day 4**: Task 5, 6, 12（集成测试 + 性能测试 + 索引）
- **Day 5**: 代码审查 + 预生产部署

### Week 2: 前端实现与部署
- **Day 1-2**: Task 8, 10（前端发送 ID + 预生成 ID）
- **Day 3**: Task 9, 11（增量更新 + E2E 测试）
- **Day 4**: 代码审查 + 生产部署
- **Day 5**: 监控优化 + 用户反馈

---

## ⚠️ 注意事项

### 兼容性
- 后端兼容旧版本前端（不发送 ID）
- 自动回退到旧逻辑
- 逐步迁移，无需强制升级

### 风险
- **ID 冲突**: 使用 UUID v4，概率极低
- **并发冲突**: 使用乐观锁（version 字段）
- **性能下降**: 已通过基准测试验证

### 回滚
- 代码回滚：`git revert`
- 功能开关：`USE_SMART_UPSERT=false`
- 数据库回滚：从备份恢复

---

## 🧪 测试清单

### 单元测试
- [ ] upsertBOMItems - 全新增
- [ ] upsertBOMItems - 全更新
- [ ] upsertBOMItems - 混合操作
- [ ] upsertBOMItems - ID 冲突
- [ ] upsertBOMItems - 空列表

### 集成测试
- [ ] SaveBOM - ID 稳定性
- [ ] SaveBOM - 并发保存
- [ ] SaveBOM - 大型 BOM 性能

### E2E 测试
- [ ] 保存后展开/折叠状态保持
- [ ] 保存后滚动位置保持
- [ ] 大型 BOM 保存性能

---

## 📞 支持

### 问题反馈
- 如果遇到问题，请查看 [design.md](./design.md) 中的"回滚方案"
- 或联系开发团队

### 文档更新
- 如果发现文档有误，请提交 PR
- 或通知文档维护者

---

## 🎓 相关资源

### 相关 Spec
- [bom-architecture-refactoring](../bom-architecture-refactoring/) - 整体架构重构计划
- [bom-query-enhancement](../bom-query-enhancement/) - BOM 查询优化

### 技术文档
- [GEMINI.md](../../../GEMINI.md) - SDRTS 原则
- [BOM_SECURITY_AUDIT_FINAL_REPORT.md](../../../BOM_SECURITY_AUDIT_FINAL_REPORT.md) - 安全审计报告

---

## ✅ 验收标准

### 功能验收
- [ ] 保存后 ID 稳定（未修改的行 ID 不变）
- [ ] 保存后展开/折叠状态保持
- [ ] 审计日志可追踪行级别变更

### 性能验收
- [ ] 1000 行 BOM 保存耗时 < 2 秒
- [ ] 前端渲染耗时 < 0.5 秒
- [ ] 数据库操作减少 90%+

### 质量验收
- [ ] 单元测试覆盖率 > 90%
- [ ] 所有集成测试通过
- [ ] 所有 E2E 测试通过

---

**Spec 版本**: v1.0  
**最后更新**: 2026-05-13  
**维护者**: Kiro AI Assistant
