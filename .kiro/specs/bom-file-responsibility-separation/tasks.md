# Tasks

## Task 1: 创建 bom-workspace-source 模块结构
创建新的目录结构和类型定义文件

### Subtasks
- 创建 `hooks/bom-workspace-source/` 目录
- 创建 `types.ts` 文件，包含所有节点类型定义
- 创建 `model-builder.ts` 文件，包含模型构建函数
- 创建 `index.ts` 统一入口文件
- 添加 JSDoc 注释

## Task 2: 创建 bom-workspace-branch-relation 模块结构
拆分 branch relation builder 为独立模块

### Subtasks
- 创建 `hooks/bom-workspace-branch-relation/` 目录
- 创建 `types.ts` 文件，定义通用类型和接口
- 创建 `synthetic-builder.ts`，实现合成模式
- 创建 `builder-resolver.ts`，实现构建器选择逻辑
- 创建 `index.ts` 统一入口文件

## Task 3: 移动 protocol adapter 到新模块
将协议模式实现移动到新的模块结构中

### Subtasks
- 创建 `hooks/bom-workspace-branch-relation/protocol-adapter.ts`
- 从现有文件移动协议模式相关代码
- 更新导入路径
- 确保功能完整性

## Task 4: 统一 section 解析逻辑
消除 bom-section-utils 和 protocol adapter 中的重复代码

### Subtasks
- 分析两个函数的差异
- 增强 `bom-section-utils.ts` 中的 `resolveBOMSection` 函数
- 在 protocol adapter 中使用统一的解析函数
- 移除重复的 `resolveSectionOption` 函数
- 添加完整的 JSDoc 文档

## Task 5: 添加单元测试
为新模块添加完整的单元测试覆盖

### Subtasks
- 创建 `types.test.ts` 测试类型定义
- 创建 `model-builder.test.ts` 测试模型构建
- 创建 `synthetic-builder.test.ts` 测试合成模式
- 创建 `protocol-adapter.test.ts` 测试协议模式
- 创建 `bom-section-utils.test.ts` 测试 section 解析

## Task 6: 更新导入路径
将所有使用旧文件的地方更新为新的导入路径

### Subtasks
- 使用 grep 查找所有导入旧文件的位置
- 逐个文件更新导入语句
- 运行 TypeScript 编译检查
- 运行测试确保无破坏

## Task 7: 创建兼容层
为旧文件添加 deprecated 标记和 re-export

### Subtasks
- 修改 `bom-workspace-source-model.ts` 为兼容层
- 修改 `bom-workspace-branch-relation-builder.ts` 为兼容层
- 添加 @deprecated JSDoc 标记
- 添加迁移指南注释

## Task 8: 添加集成测试
测试整个工作流的端到端功能

### Subtasks
- 创建集成测试文件
- 测试 synthetic 模式完整流程
- 测试 protocol 模式完整流程
- 验证节点关系正确性
- 验证性能无明显下降

## Task 9: 更新文档
更新相关文档和迁移指南

### Subtasks
- 更新 README 或相关文档
- 创建迁移指南文档
- 更新 API 文档
- 添加使用示例

## Task 10: 代码审查和清理
最终审查和优化

### Subtasks
- 运行 ESLint 检查
- 使用 madge 检查循环依赖
- 运行完整测试套件
- 性能基准测试
- 代码审查
