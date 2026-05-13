# BOM 文件职责分离 - 需求文档

## 概述

**需求版本**: v1.0  
**创建日期**: 2025-01-13  
**优先级**: 高  
**类型**: 架构重构

---

## 问题陈述

当前 BOM workspace 相关文件存在职责重叠和边界不清的问题，导致代码可维护性降低、逻辑混乱、重复代码增加。具体问题包括：

### 1. bom-workspace-source-model.ts - 职责过载

**当前状态**:
- 文件既定义了核心数据模型（`BOMWorkspaceSourceModel`、各种节点类型）
- 又作为入口文件，re-export 了大量来自其他模块的类型和函数
- 包含 20+ 个 re-export 语句，混合了类型导出和函数导出

**问题**:
- 职责不清：既是模型定义又是模块入口
- 依赖关系复杂：导入此文件的模块不清楚实际依赖来源
- 维护困难：修改 re-export 需要理解多个模块的关系
- 循环依赖风险：作为中心枢纽容易引入循环依赖

### 2. bom-workspace-branch-relation-builder.ts - 逻辑混杂

**当前状态**:
- 包含"合成模式"（Synthetic）的完整实现（`buildSyntheticBOMWorkspaceBranchRelations`）
- 同时 re-export "协议模式"（Protocol）相关函数和类型
- 文件长度过长（150+ 行），包含多种职责
- 既有具体实现又有类型定义和 re-export

**问题**:
- 单一职责原则违反：一个文件包含两种不同的构建模式
- 代码可读性差：需要在同一文件中理解两套不同的逻辑
- 测试困难：测试时需要 mock 不相关的依赖
- 扩展性差：添加新的构建模式会进一步增加文件复杂度

### 3. bom-section-utils.ts - 功能重复

**当前状态**:
- 提供了 `resolveBOMSection` 函数用于解析 section
- 该功能与 `bom-workspace-parent-children-protocol-adapter.ts` 中的 `resolveSectionOption` 高度重合
- 两个函数的逻辑相似但实现细节不同
- 存在于不同的目录层级（utils vs hooks）

**问题**:
- 代码重复：相似的逻辑在两个地方维护
- 不一致风险：两个函数可能产生不同的结果
- 维护成本：修改逻辑需要同步更新两处
- 职责不清：不清楚应该使用哪个函数

---

## 功能需求

### FR-1: 拆分 bom-workspace-source-model.ts

**需求描述**: 将 `bom-workspace-source-model.ts` 拆分为职责单一的模块

**验收标准**:
- [ ] 创建独立的类型定义文件（`bom-workspace-source-types.ts`）
  - 包含所有节点类型定义（`BOMWorkspaceSourceNode`、`BOMWorkspaceSourceRootNode` 等）
  - 包含 `BOMWorkspaceSourceModel` 接口定义
  - 不包含任何 re-export
  
- [ ] 创建独立的模型构建文件（`bom-workspace-source-model-builder.ts`）
  - 包含 `buildBOMWorkspaceSourceModel` 函数
  - 包含 `resolveBOMWorkspaceSourceRootNodeId` 函数
  - 仅导入必要的类型和依赖
  
- [ ] 创建可选的入口文件（`index.ts`）
  - 如果需要统一导出，在此文件中 re-export
  - 明确标注为"模块入口"
  - 使用命名空间或注释组织导出项
  
- [ ] 更新所有导入路径
  - 将直接导入改为从具体文件导入
  - 减少不必要的依赖传递

**优先级**: P0（必须）

---

### FR-2: 分离 bom-workspace-branch-relation-builder.ts 中的两种模式

**需求描述**: 将"合成模式"和"协议模式"分离到独立文件

**验收标准**:
- [ ] 创建 `bom-workspace-synthetic-builder.ts`
  - 包含 `buildSyntheticBOMWorkspaceBranchRelations` 完整实现
  - 包含合成模式特有的类型定义
  - 不包含协议模式相关代码
  
- [ ] 保留 `bom-workspace-branch-relation-builder.ts` 作为类型定义文件
  - 定义 `BOMWorkspaceBranchRelationBuilder` 接口
  - 定义通用的节点类型（`BOMWorkspaceSourceBranchNode`、`BOMWorkspaceSourceLeafNode`）
  - 定义构建参数和结果类型
  - 移除具体实现代码
  
- [ ] 协议模式保持在 `bom-workspace-parent-children-protocol-adapter.ts`
  - 确保协议模式实现独立
  - 不依赖合成模式代码
  
- [ ] 创建 `bom-workspace-branch-relation-builder-resolver.ts`（如果不存在）
  - 包含选择构建器的逻辑
  - 根据参数决定使用哪种模式
  
- [ ] 更新所有导入
  - 根据实际需要导入合成或协议构建器
  - 避免导入不使用的代码

**优先级**: P0（必须）

---

### FR-3: 统一 Section 解析逻辑

**需求描述**: 消除 `bom-section-utils.ts` 和 adapter 中的重复逻辑

**验收标准**:
- [ ] 分析两个函数的差异
  - 对比 `resolveBOMSection` 和 `resolveSectionOption` 的实现
  - 识别功能差异和使用场景
  - 确定统一后的 API 设计
  
- [ ] 选择保留位置
  - 如果逻辑通用，保留在 `bom-section-utils.ts`
  - 如果逻辑特定于 workspace，移至 workspace 相关目录
  - 如果逻辑特定于 protocol adapter，保留在 adapter 中
  
- [ ] 实现统一函数
  - 合并两个函数的功能
  - 提供清晰的参数和返回值
  - 添加完整的 JSDoc 注释
  
- [ ] 更新所有调用点
  - 将所有 `resolveSectionOption` 调用替换为统一函数
  - 确保行为一致性
  - 添加单元测试验证

**优先级**: P1（重要）

---

## 非功能需求

### NFR-1: 代码可维护性

**需求描述**: 提高代码的可维护性和可读性

**验收标准**:
- [ ] 每个文件职责单一，不超过 150 行（不含注释）
- [ ] 文件命名清晰反映其职责
- [ ] 导入语句清晰，避免深层嵌套
- [ ] 添加文件级 JSDoc 注释说明职责

---

### NFR-2: 向后兼容性

**需求描述**: 确保重构不破坏现有功能

**验收标准**:
- [ ] 所有现有测试通过
- [ ] 如果需要修改导入路径，提供迁移指南
- [ ] 考虑提供临时的兼容层（deprecated exports）
- [ ] 运行时行为完全一致

---

### NFR-3: 类型安全

**需求描述**: 保持 TypeScript 类型安全

**验收标准**:
- [ ] 所有导出都有明确的类型定义
- [ ] 不使用 `any` 类型
- [ ] 类型推导正确工作
- [ ] 编译时无类型错误

---

## 约束条件

### 技术约束
- 必须保持 TypeScript 严格模式
- 不能引入新的外部依赖
- 必须与现有的构建流程兼容

### 业务约束
- 重构期间不能影响现有功能
- 必须在一个迭代内完成
- 需要代码审查通过

---

## 依赖关系

### 前置依赖
- 无

### 后续依赖
- 此重构可能为后续的 BOM 架构优化铺平道路
- 可能影响其他正在进行的 BOM 相关重构

---

## 验收测试场景

### 场景 1: 导入路径更新
**前置条件**: 完成文件拆分  
**操作步骤**:
1. 在任意组件中导入 `BOMWorkspaceSourceModel` 类型
2. 检查导入路径是否清晰
3. 检查 IDE 自动补全是否正常

**预期结果**: 
- 导入路径明确指向类型定义文件
- IDE 能正确解析和跳转
- 编译无错误

---

### 场景 2: 构建器选择
**前置条件**: 完成模式分离  
**操作步骤**:
1. 调用 `resolveBOMWorkspaceBranchRelationBuilder` 传入合成模式参数
2. 调用 `resolveBOMWorkspaceBranchRelationBuilder` 传入协议模式参数
3. 验证返回的构建器类型

**预期结果**:
- 正确返回对应的构建器
- 构建结果与重构前一致
- 类型推导正确

---

### 场景 3: Section 解析一致性
**前置条件**: 完成 section 逻辑统一  
**操作步骤**:
1. 使用统一函数解析各种 section 输入（code、name、legacy name）
2. 对比重构前后的解析结果
3. 运行相关单元测试

**预期结果**:
- 解析结果与重构前完全一致
- 所有测试通过
- 性能无明显下降

---

## 成功指标

### 代码质量指标
- 文件平均行数减少 30%
- 循环依赖数量为 0
- 代码重复率降低 50%

### 可维护性指标
- 新开发者理解代码时间减少 40%
- 修改相关逻辑的文件数量减少 50%

### 稳定性指标
- 所有现有测试通过率 100%
- 无新增运行时错误
- 类型检查通过率 100%

---

## 风险与缓解

### 风险 1: 破坏现有功能
**影响**: 高  
**概率**: 中  
**缓解措施**:
- 完整的单元测试覆盖
- 渐进式重构，每次提交保持功能完整
- 代码审查

### 风险 2: 导入路径混乱
**影响**: 中  
**概率**: 中  
**缓解措施**:
- 使用 IDE 的重构工具批量更新导入
- 提供清晰的迁移文档
- 考虑保留临时的兼容导出

### 风险 3: 性能下降
**影响**: 低  
**概率**: 低  
**缓解措施**:
- 重构前后进行性能基准测试
- 避免增加不必要的函数调用层级

---

## 附录

### 相关文件清单
- `src/features/product-structure/hooks/bom-workspace-source-model.ts`
- `src/features/product-structure/hooks/bom-workspace-branch-relation-builder.ts`
- `src/features/product-structure/utils/bom-section-utils.ts`
- `src/features/product-structure/hooks/bom-workspace-parent-children-protocol-adapter.ts`
- `src/features/product-structure/utils/bom-node-id-resolver.ts`

### 参考资料
- [单一职责原则 (SRP)](https://en.wikipedia.org/wiki/Single-responsibility_principle)
- [TypeScript 模块最佳实践](https://www.typescriptlang.org/docs/handbook/modules.html)
