# Wire Contract Samples

本目录存放后端 wire format 的真实样本 JSON，作为前后端 schema 契约的"金样本"。

## 用途

前端 `src/__contract__/*-wire-contract.test.ts` 读取这些 sample，跑 service 层
的 wire→schema 映射 / adapter / zod parse 完整链路。一旦后端 wire format 字段
改名 / 类型改变 / 字段被删除，前端测试会立即失败。

## 工作流程

### 后端改了 model 时

1. 跑 `pnpm wire-contracts:refresh`（等价于 `cd server && go test ./services/ -run TestExportContractSamples -update`）重新生成所有 sample
2. 检查 `git diff server/contract-samples/` 确认变更符合预期
3. 如果是不兼容变更，前端 `src/__contract__/` 测试会立即 fail，提示同步 mapper / adapter / schema
4. 提交 sample + model 改动一起 commit

### 不带 `-update` 跑测试

- 后端 `TestExportContractSamples` 验证当前 sample 与从 model 生成的内容一致
- 不一致就失败（防止 sample 与代码 drift）

### 前端契约测试

- `pnpm test:wire-contracts`（等价于 `vitest run src/__contract__/`）跑所有契约测试
- 也已纳入 `pnpm test:contracts` 一并执行

## 当前覆盖

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

## 为什么这样设计

- 不依赖运行中的数据库或环境变量（sample 是纯 JSON 静态资源）
- 跨语言（前端 TS / 后端 Go）共享同一份事实
- CI 可以并行跑前后端测试，互不依赖
- Golden file pattern 让 sample drift 在 PR 中可见可审

