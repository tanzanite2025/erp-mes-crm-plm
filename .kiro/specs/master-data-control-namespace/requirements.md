# Requirements Document

## Introduction

将 `MasterDataControl` 字段从当前的平铺（flat）结构改造为嵌套命名空间（nested namespace）结构。当前后端 Go struct embedding 将 `revisionNo / effectiveFrom / effectiveTo / changeType / changeOrderNo / siteCode / isDefaultSite` 等控制字段直接平铺到 BOM、Material、Product 等实体的顶层 JSON 中，前端通过 `.extend(masterDataControlSchema.shape)` 同样平铺。改造后，这些字段将统一收纳到 `masterDataControl: { ... }` 嵌套对象中，使业务字段与版本控制字段在 wire format 和前端 schema 中有清晰的边界。

改造采用分步推进策略，每次只处理一个 model，并在过渡期同时输出平铺和嵌套两种格式以保持向后兼容。

## Glossary

- **Wire_Format**: 前后端通过 HTTP JSON 传输的数据格式
- **DTO_Layer**: 后端 Data Transfer Object 层，负责将内部 model 转换为 wire format
- **MasterDataControl**: 包含 `revisionNo / effectiveFrom / effectiveTo / changeType / changeOrderNo / siteCode / isDefaultSite` 的版本控制字段集合
- **Nested_Namespace**: 将 MasterDataControl 字段收纳到 `masterDataControl` 嵌套对象中的结构
- **Flat_Layout**: 当前将 MasterDataControl 字段平铺到实体顶层的结构
- **Transition_Period**: 同时输出 Flat_Layout 和 Nested_Namespace 两种格式的过渡阶段
- **Contract_Test**: 基于 golden file pattern 的前后端 schema 契约测试
- **Delta_Path**: PATCH 请求中用于定位字段的 JSON 路径（如 `revisionNo` 或 `masterDataControl.revisionNo`）
- **Schema_Module**: 前端 Zod schema 定义文件（如 `engineering/data/schema.ts`、`material-archive/data/schema.ts`）
- **Affected_Models**: BOM、Material、Product、ProductTemplate、ProductAppearance、EngineeringSpec、WeavingMode

## Requirements

### Requirement 1: 后端 DTO 层嵌套输出

**User Story:** As a 前端开发者, I want 后端 API 响应中 MasterDataControl 字段以 `masterDataControl` 嵌套对象形式输出, so that 业务字段与控制字段有清晰的层级边界。

#### Acceptance Criteria

1. WHEN a GET request is made to any Affected_Models endpoint, THE DTO_Layer SHALL include a `masterDataControl` nested object containing all MasterDataControl fields (`revisionNo`, `effectiveFrom`, `effectiveTo`, `changeType`, `changeOrderNo`, `siteCode`, `isDefaultSite`)
2. WHILE in Transition_Period, THE DTO_Layer SHALL output MasterDataControl fields in both Flat_Layout (top-level) and Nested_Namespace (`masterDataControl` object) simultaneously
3. THE DTO_Layer SHALL serialize `effectiveFrom` and `effectiveTo` as ISO 8601 strings or null within the nested object
4. THE DTO_Layer SHALL default `changeType` to `"MANUAL"` and `isDefaultSite` to `true` within the nested object when values are empty

### Requirement 2: 后端 DTO 层嵌套输入解析

**User Story:** As a 前端开发者, I want 后端 API 接受 `masterDataControl` 嵌套对象作为输入, so that 我可以使用新的嵌套格式提交数据。

#### Acceptance Criteria

1. WHEN a POST or PUT request contains a `masterDataControl` nested object, THE DTO_Layer SHALL parse the nested fields and map them to the internal MasterDataControl struct
2. WHILE in Transition_Period, WHEN a request contains MasterDataControl fields in Flat_Layout (without `masterDataControl` object), THE DTO_Layer SHALL accept and parse the flat fields as before
3. IF a request contains both Flat_Layout fields and a `masterDataControl` nested object, THEN THE DTO_Layer SHALL prioritize the Nested_Namespace values
4. THE DTO_Layer SHALL apply the same validation rules (Normalize, MergeMissingFrom) regardless of input format

### Requirement 3: PATCH Delta 路径迁移

**User Story:** As a 前端开发者, I want PATCH 请求支持 `masterDataControl.revisionNo` 等嵌套路径, so that 增量更新与新的嵌套结构一致。

#### Acceptance Criteria

1. WHEN a PATCH request uses Delta_Path with prefix `masterDataControl.` (e.g., `masterDataControl.revisionNo`), THE DTO_Layer SHALL correctly resolve the nested path to the corresponding MasterDataControl field
2. WHILE in Transition_Period, WHEN a PATCH request uses flat Delta_Path (e.g., `revisionNo`), THE DTO_Layer SHALL continue to resolve the flat path to the MasterDataControl field
3. THE DTO_Layer SHALL reject a PATCH request that uses both flat and nested Delta_Path for the same MasterDataControl field with a 400 Bad Request error

### Requirement 4: 前端 Schema 嵌套改造

**User Story:** As a 前端开发者, I want 前端 Zod schema 使用嵌套的 `masterDataControl` 字段, so that TypeScript 类型与 wire format 保持一致。

#### Acceptance Criteria

1. THE Schema_Module SHALL define a `masterDataControlSchema` as an independent Zod object schema containing `revisionNo`, `effectiveFrom`, `effectiveTo`, `changeType`, `changeOrderNo`, `siteCode`, `isDefaultSite`
2. WHEN a model schema (BOM, Material, Product, ProductTemplate, EngineeringSpec) references MasterDataControl, THE Schema_Module SHALL include it as `masterDataControl: masterDataControlSchema` nested field instead of using `.extend(masterDataControlSchema.shape)`
3. THE Schema_Module SHALL export updated TypeScript types reflecting the nested structure (e.g., `Product['masterDataControl']['revisionNo']`)

### Requirement 5: 前端 Service 层适配

**User Story:** As a 前端开发者, I want service 层的 wire mapper 处理新旧两种格式, so that 过渡期内前端能正确解析后端响应。

#### Acceptance Criteria

1. WHILE in Transition_Period, WHEN the wire response contains both flat and nested MasterDataControl fields, THE Service_Layer SHALL prefer the nested `masterDataControl` object for mapping
2. WHEN the wire response contains only Flat_Layout MasterDataControl fields (legacy format), THE Service_Layer SHALL construct the nested `masterDataControl` object from flat fields
3. WHEN the wire response contains only Nested_Namespace, THE Service_Layer SHALL directly use the `masterDataControl` object

### Requirement 6: 契约测试更新

**User Story:** As a 开发者, I want 契约测试覆盖新的嵌套格式, so that wire format 变更能被自动检测。

#### Acceptance Criteria

1. WHEN the golden file samples are regenerated, THE Contract_Test SHALL include the `masterDataControl` nested object in all Affected_Models samples
2. WHILE in Transition_Period, THE Contract_Test SHALL verify that both flat and nested fields are present in the wire output
3. WHEN Transition_Period ends and flat fields are removed, THE Contract_Test SHALL verify that only the nested `masterDataControl` object is present
4. THE Contract_Test SHALL validate that the nested `masterDataControl` object passes the `masterDataControlSchema` Zod parse

### Requirement 7: 分步推进策略

**User Story:** As a 团队, I want 每次只改造一个 model, so that 风险可控且可以逐步验证。

#### Acceptance Criteria

1. THE System SHALL support per-model migration where each Affected_Model can independently be in Flat_Layout, Transition_Period, or Nested_Namespace state
2. WHEN a model enters Transition_Period, THE DTO_Layer SHALL output both formats for that model without affecting other models
3. WHEN a model completes migration (exits Transition_Period), THE DTO_Layer SHALL only output Nested_Namespace for that model
4. THE System SHALL provide a configuration mechanism (e.g., feature flag or constant) to control each model's migration state

### Requirement 8: 过渡期结束与清理

**User Story:** As a 团队, I want 在所有 model 完成迁移后移除平铺格式的兼容代码, so that 代码库保持简洁。

#### Acceptance Criteria

1. WHEN all Affected_Models have completed migration to Nested_Namespace, THE System SHALL remove Flat_Layout output logic from the DTO_Layer
2. WHEN all Affected_Models have completed migration, THE System SHALL remove flat-to-nested adapter logic from the frontend Service_Layer
3. WHEN Transition_Period ends for a model, THE System SHALL update the corresponding Contract_Test golden files to exclude flat MasterDataControl fields
