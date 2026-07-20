# Wire Contract Samples

本目录保留后端 wire format 的历史样本 JSON。

> 状态：休眠参考数据。仓库当前没有生成这些样本的 Go 测试，也没有消费它们的
> 前端契约测试；这些文件不会被 CI 自动验证，不能作为当前 schema 的权威金样本。

## 用途

这些 sample 只用于追溯曾经设计的 wire→schema 映射、adapter 和 zod parse
覆盖范围。重新启用前必须同时补齐样本生成器、前端消费测试和 CI 门禁。

## 工作流程

当前没有可执行工作流。不要手工修改 sample 后宣称契约已通过；恢复该机制时应先
实现生成/校验测试，再新增对应 package scripts 和 CI 步骤。

## 历史样本清单（当前未自动验证）

| Sample | 说明 | 验证方式 | 已发现的 wire/schema 不一致 |
|---|---|---|---|
| `bom-detail.json` | 单条 BOM 详情 | service 层 wire mapper + zod parse | wire `version` (string) vs schema `bomVersion`；wire `_v` vs schema `version`；ISO 8601 vs `YYYY-MM-DD` —— 全部已通过 mapper 处理 |
| `bom-list.json` | BOM 列表响应 | 同上 | 同上 |
| `trading-customer.json` | 客户实体 | 直接 zod parse | 字段对齐，无问题 |
| `trading-supplier.json` | 供应商实体 | adapter + zod parse | wire `mainProducts` 是 JSON 字符串 vs schema `string[]`；adapter 已处理 |
| `trading-sales-order.json` | 销售订单（DTO 响应） | DTO zod 解析 + adapter | 字段对齐，无问题 |
| `trading-purchase-order.json` | 采购订单（DTO 响应） | adapter | 字段对齐，无问题 |
| `inventory-item.json` | 库存条目（DTO 响应） | 字段存在性验证 + zod parse | 字段对齐，无问题 |
| `logistics-record.json` | 物流记录 | 字段存在性 + events 数组验证 | ~~events 是 base64~~ → 已修复为 JSON 数组 |
| `quality-inspection-standard.json` | 质量检验标准 | zod parse + items 数组验证 | ~~OQC 类型前端不接受~~ → 已修复；status 字典前端更宽（设计如此） |
| `engineering-product.json` | 工程产品（ProductApiDTO） | 字段存在性 + `_v` 映射 + zod parse | wire `_v` → schema `version`（adapter 处理）；jsonb 字段已在 handler 层 unmarshal |
| `equipment-mold.json` | 模具资产 | 字段存在性 + zod parse | version 是 UnixMilli 时间戳（设计如此，前端 schema 接受 number） |
| `production-line.json` | 产线拓扑 | 字段存在性 + 嵌套结构验证 | attributes 是 JSON 对象/null（json.RawMessage 正确展开）；version 是递增整数 |
| `finance-receivable-ledger.json` | 应收台账列表项 | zod parse（receivableRecordApiDTOSchema） | 字段对齐，无问题 |
| `org-personnel-employee.json` | 员工列表项 | 字段存在性 + nullable/omitempty 验证 | birthday nil 时 omitempty 不出现；version 是 UnixMilli（秒级） |

## 待覆盖（按优先级）

- Warehouse（PackagingAssembly）—— 字段简单，风险低
- 其它模块按"风险/价值"优先级铺开

## 原设计目标（当前未实现）

- 不依赖运行中的数据库或环境变量（sample 是纯 JSON 静态资源）
- 跨语言（前端 TS / 后端 Go）共享同一份事实
- CI 可以并行跑前后端测试，互不依赖（当前尚未接入）
- Golden file pattern 让 sample drift 在 PR 中可见可审

