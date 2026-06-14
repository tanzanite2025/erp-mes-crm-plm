# Locale 去重清单

这份清单记录了本轮从 `src/locales/messages` 中移除的、已被 `src/locales/overrides` 长期接管的重复 key。

处理原则：

- 只删除 base messages 中与 override 同路径的叶子 key。
- 仍承担兜底职责、或 override 未完整接管的 key 继续保留在 base messages。
- 删除后仍通过 `src/locales/index.ts` 的 deep merge 输出同一份最终词典。

## 本轮去重范围

| Base 文件                                | Override 文件                                   | 原叶子数 | 删除数 | 保留数 |
| ---------------------------------------- | ----------------------------------------------- | -------: | -----: | -----: |
| `src/locales/messages/zh-CN/purchase.ts` | `src/locales/overrides/purchase/zh-CN/index.ts` |      189 |    124 |     65 |

### purchase zh-CN

- 删除：124 个重复叶子 key
- 保留：65 个 base-only / fallback key
- 删除最多的分区：`orders` (35)，`logistics` (34)，`suppliers` (31)，`logs` (20)，`tabs` (4)
- 保留分区：`tabs`，`suppliers`，`orders`，`payables`，`logistics`

| `src/locales/messages/en-US/purchase.ts` | `src/locales/overrides/purchase/en-US/index.ts` | 234 | 169 | 65 |

### purchase en-US

- 删除：169 个重复叶子 key
- 保留：65 个 base-only / fallback key
- 删除最多的分区：`orders` (80)，`logistics` (34)，`suppliers` (31)，`logs` (20)，`tabs` (4)
- 保留分区：`tabs`，`suppliers`，`orders`，`payables`，`logistics`

| `src/locales/messages/zh-CN/tradingSalesOrder.ts` | `src/locales/overrides/sales/zh-CN/index.ts` | 174 | 89 | 85 |

### sales zh-CN

- 删除：89 个重复叶子 key
- 保留：85 个 base-only / fallback key
- 删除最多的分区：`linesEditor` (28)，`detail` (20)，`master` (13)，`headerFields` (11)，`status` (5)
- 保留分区：`tabs`，`notifications`，`toasts`，`errors`，`detail`，`headerFields`，`packagingPreview`，`footer`，`print`，`fileUploader`，`master`

| `src/locales/messages/en-US/tradingSalesOrder.ts` | `src/locales/overrides/sales/en-US/index.ts` | 165 | 87 | 78 |

### sales en-US

- 删除：87 个重复叶子 key
- 保留：78 个 base-only / fallback key
- 删除最多的分区：`linesEditor` (28)，`detail` (18)，`master` (13)，`headerFields` (11)，`status` (5)
- 保留分区：`tabs`，`notifications`，`toasts`，`errors`，`detail`，`headerFields`，`packagingPreview`，`footer`，`print`，`master`

| `src/locales/messages/zh-CN/basicSettings.ts` | `src/locales/overrides/basic-settings.zh-CN.ts` | 300 | 43 | 257 |

### basicSettings zh-CN

- 删除：43 个重复叶子 key
- 保留：257 个 base-only / fallback key
- 删除最多的分区：`dmNumbering` (43)
- 保留分区：`tabs`，`placeholders`，`sequences`，`appearanceMapping`，`units`，`securityPage`，`enterprisePage`，`dmNumbering`

| `src/locales/messages/en-US/basicSettings.ts` | `src/locales/overrides/basic-settings.en-US.ts` | 397 | 43 | 354 |

### basicSettings en-US

- 删除：43 个重复叶子 key
- 保留：354 个 base-only / fallback key
- 删除最多的分区：`dmNumbering` (43)
- 保留分区：`tabs`，`placeholders`，`sequences`，`units`，`securityPage`，`appearanceMapping`，`enterprisePage`，`linearBarcode`，`dmNumbering`

| `src/locales/messages/zh-CN/systemManagement.ts` | `src/locales/overrides/system-management.zh-CN.ts` | 99 | 5 | 94 |

### systemManagement zh-CN

- 删除：5 个重复叶子 key
- 保留：94 个 base-only / fallback key
- 删除最多的分区：`layout` (5)
- 保留分区：`layout`，`statusPage`，`serverIdentity`，`infrastructure`，`componentStatus`，`diagnostic`，`routingTab`，`permissionAudit`，`logisticsFallback`，`auditEngine`

| `src/locales/messages/en-US/systemManagement.ts` | `src/locales/overrides/system-management.en-US.ts` | 135 | 41 | 94 |

### systemManagement en-US

- 删除：41 个重复叶子 key
- 保留：94 个 base-only / fallback key
- 删除最多的分区：`layout` (6)，`routingTab` (1)
- 保留分区：`layout`，`statusPage`，`serverIdentity`，`infrastructure`，`componentStatus`，`diagnostic`，`routingTab`，`permissionAudit`，`logisticsFallback`，`auditEngine`

| `src/locales/messages/zh-CN/workflowCore.ts` | `src/locales/overrides/workflow-core.zh-CN.ts` | 38 | 2 | 36 |

### workflowCore zh-CN

- 删除：2 个重复叶子 key
- 保留：36 个 base-only / fallback key
- 删除最多的分区：`commands` (2)
- 保留分区：`commands`

| `src/locales/messages/en-US/workflowCore.ts` | `src/locales/overrides/workflow-core.en-US.ts` | 38 | 2 | 36 |

### workflowCore en-US

- 删除：2 个重复叶子 key
- 保留：36 个 base-only / fallback key
- 删除最多的分区：`commands` (2)
- 保留分区：`commands`

## 说明

- 这份清单是“删除记录”，不是新的运行时配置源。
- 后续新增业务词时，优先决定它应该落在 base messages 还是 override，避免再次双写。
- 当某个 override 已经长期成为唯一入口时，base messages 应只保留 fallback 或跨页面复用的 key。

## 提交前护栏

- `pre-commit` 不再无条件跑全部 locale 校验，而是按 staged 文件命中范围触发：
- 命中 `src/locales/**`、`scripts/verify-i18n-parity.mjs`、`scripts/i18n-parity-baseline.json` 时，运行 `verify:i18n`
- 命中任意 `zh-CN` locale 文件或 `scripts/verify-zh-cn-encoding.mjs` 时，运行 `verify:zh-cn-encoding`
- 这样做的目的不是放松校验，而是把校验和真实改动范围对齐，避免普通业务提交被整仓 locale 扫描拖慢
- CI 仍会完整运行 `verify:i18n`，所以本地 hook 是轻量前置护栏，远端仍有全量兜底
