/**
 * @deprecated 此文件已被拆分为更小的模块，请使用新的模块结构
 * 
 * ## 迁移指南
 * 
 * ### 类型导入
 * ```typescript
 * // 旧代码
 * import { BOMWorkspaceSourceModel } from './bom-workspace-source-model'
 * 
 * // 新代码（推荐）
 * import { BOMWorkspaceSourceModel } from './bom-workspace-source/types'
 * // 或使用统一入口
 * import { BOMWorkspaceSourceModel } from './bom-workspace-source'
 * ```
 * 
 * ### 函数导入
 * ```typescript
 * // 旧代码
 * import { buildBOMWorkspaceSourceModel } from './bom-workspace-source-model'
 * 
 * // 新代码（推荐）
 * import { buildBOMWorkspaceSourceModel } from './bom-workspace-source/model-builder'
 * // 或使用统一入口
 * import { buildBOMWorkspaceSourceModel } from './bom-workspace-source'
 * ```
 * 
 * ### Branch Relation 导入
 * ```typescript
 * // 旧代码
 * import { buildSyntheticBOMWorkspaceBranchRelations } from './bom-workspace-source-model'
 * 
 * // 新代码（推荐）
 * import { buildSyntheticBOMWorkspaceBranchRelations } from './bom-workspace-branch-relation/synthetic-builder'
 * // 或使用统一入口
 * import { buildSyntheticBOMWorkspaceBranchRelations } from './bom-workspace-branch-relation'
 * ```
 * 
 * **此兼容层将在未来版本移除，请尽快迁移到新的模块结构。**
 */

// Re-export all content from new modules for backward compatibility
export * from './bom-workspace-source/types'
export * from './bom-workspace-source/model-builder'
export * from './bom-workspace-branch-relation/types'
export * from './bom-workspace-branch-relation/synthetic-builder'
export * from './bom-workspace-branch-relation/protocol-adapter'
export * from './bom-workspace-branch-relation/builder-resolver'

