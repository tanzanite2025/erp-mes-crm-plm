# BOM 文件职责分离 - 迁移指南

## 概述

本指南帮助开发者从旧的模块结构迁移到新的模块结构。新结构提供了更清晰的职责分离和更好的可维护性。

---

## 快速参考

### 旧模块 → 新模块映射

| 旧导入 | 新导入 |
|--------|--------|
| `./bom-workspace-source-model` | `./bom-workspace-source` |
| `./bom-workspace-branch-relation-builder` | `./bom-workspace-branch-relation` |

---

## 详细迁移步骤

### 1. 类型导入

#### 场景 A: 导入 Source Model 类型

**旧代码**:
```typescript
import {
  type BOMWorkspaceSourceModel,
  type BOMWorkspaceSourceNode,
  type BOMWorkspaceSourceRootNode,
} from './bom-workspace-source-model'
```

**新代码（推荐）**:
```typescript
// 选项 1: 从统一入口导入
import {
  type BOMWorkspaceSourceModel,
  type BOMWorkspaceSourceNode,
  type BOMWorkspaceSourceRootNode,
} from './bom-workspace-source'

// 选项 2: 从具体文件导入（更明确）
import {
  type BOMWorkspaceSourceModel,
  type BOMWorkspaceSourceNode,
  type BOMWorkspaceSourceRootNode,
} from './bom-workspace-source/types'
```

---

#### 场景 B: 导入 Branch/Leaf 节点类型

**旧代码**:
```typescript
import {
  type BOMWorkspaceSourceBranchNode,
  type BOMWorkspaceSourceLeafNode,
} from './bom-workspace-source-model'
```

**新代码（推荐）**:
```typescript
// 选项 1: 从 branch-relation 模块导入
import {
  type BOMWorkspaceSourceBranchNode,
  type BOMWorkspaceSourceLeafNode,
} from './bom-workspace-branch-relation'

// 选项 2: 从 source 模块导入（re-export）
import {
  type BOMWorkspaceSourceBranchNode,
  type BOMWorkspaceSourceLeafNode,
} from './bom-workspace-source'
```

---

#### 场景 C: 导入 Protocol 类型

**旧代码**:
```typescript
import {
  type BOMWorkspaceParentChildrenProtocolDraft,
} from './bom-workspace-source-model'
```

**新代码（推荐）**:
```typescript
import {
  type BOMWorkspaceParentChildrenProtocolDraft,
} from './bom-workspace-branch-relation'
```

---

### 2. 函数导入

#### 场景 A: 导入模型构建函数

**旧代码**:
```typescript
import {
  buildBOMWorkspaceSourceModel,
  resolveBOMWorkspaceSourceRootNodeId,
} from './bom-workspace-source-model'
```

**新代码（推荐）**:
```typescript
// 选项 1: 从统一入口导入
import {
  buildBOMWorkspaceSourceModel,
  resolveBOMWorkspaceSourceRootNodeId,
} from './bom-workspace-source'

// 选项 2: 从具体文件导入
import {
  buildBOMWorkspaceSourceModel,
  resolveBOMWorkspaceSourceRootNodeId,
} from './bom-workspace-source/model-builder'
```

---

#### 场景 B: 导入构建器函数

**旧代码**:
```typescript
import {
  buildSyntheticBOMWorkspaceBranchRelations,
  buildParentChildrenProtocolBranchRelations,
  resolveBOMWorkspaceBranchRelationBuilder,
} from './bom-workspace-branch-relation-builder'
```

**新代码（推荐）**:
```typescript
// 选项 1: 从统一入口导入
import {
  buildSyntheticBOMWorkspaceBranchRelations,
  buildParentChildrenProtocolBranchRelations,
  resolveBOMWorkspaceBranchRelationBuilder,
} from './bom-workspace-branch-relation'

// 选项 2: 从具体文件导入
import { buildSyntheticBOMWorkspaceBranchRelations } from './bom-workspace-branch-relation/synthetic-builder'
import { buildParentChildrenProtocolBranchRelations } from './bom-workspace-branch-relation/protocol-adapter'
import { resolveBOMWorkspaceBranchRelationBuilder } from './bom-workspace-branch-relation/builder-resolver'
```

---

### 3. 混合导入

#### 场景: 同时导入类型和函数

**旧代码**:
```typescript
import {
  buildBOMWorkspaceSourceModel,
  type BOMWorkspaceSourceModel,
  type BOMWorkspaceParentChildrenProtocolDraft,
} from './bom-workspace-source-model'
```

**新代码（推荐）**:
```typescript
// 选项 1: 从统一入口导入
import {
  buildBOMWorkspaceSourceModel,
  type BOMWorkspaceSourceModel,
} from './bom-workspace-source'
import {
  type BOMWorkspaceParentChildrenProtocolDraft,
} from './bom-workspace-branch-relation'

// 选项 2: 更明确的导入
import { buildBOMWorkspaceSourceModel } from './bom-workspace-source/model-builder'
import { type BOMWorkspaceSourceModel } from './bom-workspace-source/types'
import { type BOMWorkspaceParentChildrenProtocolDraft } from './bom-workspace-branch-relation/types'
```

---

## 常见问题

### Q1: 我需要立即迁移吗？

**A**: 不需要。旧的导入路径仍然有效（通过兼容层），但建议在修改相关代码时顺便更新导入路径。

---

### Q2: 使用统一入口还是具体文件？

**A**: 两种方式都可以：
- **统一入口** (`./bom-workspace-source`): 更简洁，适合大多数情况
- **具体文件** (`./bom-workspace-source/types`): 更明确，依赖关系更清晰

推荐使用统一入口，除非你需要非常明确的依赖关系。

---

### Q3: 兼容层什么时候会被移除？

**A**: 兼容层将在所有代码迁移完成后的下一个主版本中移除。届时会提前通知。

---

### Q4: 如何快速找到需要迁移的文件？

**A**: 使用以下命令搜索：

```bash
# 查找所有导入旧模块的文件
grep -r "from.*bom-workspace-source-model" src/
grep -r "from.*bom-workspace-branch-relation-builder" src/
```

---

### Q5: 迁移后如何验证？

**A**: 
1. 运行 TypeScript 编译: `pnpm tsc --noEmit`
2. 运行测试: `pnpm test`
3. 检查 IDE 是否有类型错误

---

## 迁移检查清单

使用此清单确保完整迁移：

### 文件级别
- [ ] 更新所有 `bom-workspace-source-model` 导入
- [ ] 更新所有 `bom-workspace-branch-relation-builder` 导入
- [ ] 检查是否有遗漏的导入
- [ ] 运行 TypeScript 编译检查
- [ ] 运行相关测试

### 项目级别
- [ ] 所有文件已迁移
- [ ] 所有测试通过
- [ ] 代码审查通过
- [ ] 文档已更新

---

## 示例：完整文件迁移

### Before（迁移前）

```typescript
// use-bom-workspace-projection.ts
import {
  buildBOMWorkspaceSourceModel,
  type BOMWorkspaceParentChildrenProtocolDraft,
  type BOMWorkspaceSourceBranchNode,
  type BOMWorkspaceSourceLeafNode,
  type BOMWorkspaceSourceNode,
} from './bom-workspace-source-model'

export function useBOMWorkspaceProjection() {
  // ... implementation
}
```

### After（迁移后）

```typescript
// use-bom-workspace-projection.ts
import {
  buildBOMWorkspaceSourceModel,
  type BOMWorkspaceSourceBranchNode,
  type BOMWorkspaceSourceLeafNode,
  type BOMWorkspaceSourceNode,
} from './bom-workspace-source'
import {
  type BOMWorkspaceParentChildrenProtocolDraft,
} from './bom-workspace-branch-relation'

export function useBOMWorkspaceProjection() {
  // ... implementation (unchanged)
}
```

---

## 自动化迁移脚本

如果你有大量文件需要迁移，可以使用以下脚本：

```bash
#!/bin/bash

# 替换 bom-workspace-source-model 导入
find src/ -type f -name "*.ts" -o -name "*.tsx" | xargs sed -i \
  "s|from './bom-workspace-source-model'|from './bom-workspace-source'|g"

# 替换 bom-workspace-branch-relation-builder 导入
find src/ -type f -name "*.ts" -o -name "*.tsx" | xargs sed -i \
  "s|from './bom-workspace-branch-relation-builder'|from './bom-workspace-branch-relation'|g"

# 运行编译检查
pnpm tsc --noEmit

# 运行测试
pnpm test
```

**注意**: 使用自动化脚本前请先备份代码！

---

## 获取帮助

如果在迁移过程中遇到问题：

1. 查看兼容层文件中的注释（`bom-workspace-source-model.ts`）
2. 参考新模块的 JSDoc 文档
3. 查看测试文件中的使用示例
4. 联系团队成员

---

## 总结

迁移到新的模块结构将带来以下好处：

✅ **更清晰的职责分离** - 每个文件只负责一件事  
✅ **更好的可维护性** - 更小的文件，更易理解  
✅ **更明确的依赖关系** - 知道每个导入的来源  
✅ **更好的 IDE 支持** - 更准确的自动补全和跳转  

虽然迁移需要一些工作，但长期来看是值得的！
