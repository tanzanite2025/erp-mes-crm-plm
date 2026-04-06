# 混合核销模型与 ClearingEntry 设计

## 1. 目标

构建“最贴近现实”的核销体系，支持：

1. 单单核销（Specific Matching）
2. 余额核销（Balance Clearing）
3. 多对多分摊、部分结清、预付款抵扣、折让处理

---

## 2. 业务场景定义

## 2.1 单单核销（Specific Matching）

用于明确指定“哪张债务凭证由哪笔资金凭证结清”，适用于争议对账和逐笔确认场景。

## 2.2 余额核销（Balance Clearing）

到款后按策略自动分配（如最老欠款优先 FIFO），适用于高频交易与批量清账场景。

---

## 3. 核心数据模型

## 3.1 FinancialVoucher（财务凭证）

作为债权债务统一载体，最少需包含：

- `ID`
- `BusinessType`
- `BusinessRefID`
- `CounterpartyID`
- `Currency`
- `Amount`
- `OpenAmount`
- `Status`（OPEN / PARTIAL / CLEARED / VOID）

## 3.2 ClearingEntry（核销项）

建议基础字段：

- `VoucherID`（被核销债务）
- `PaymentID`（核销来源资金）
- `AllocatedAmount`（本次核销金额）
- `Currency`
- `ClearingDate`
- `Operator`
- `Note`

建议扩展字段：

- `ClearingType`（SPECIFIC / BALANCE）
- `DiscountAmount`（折让）
- `FxDiffAmount`（汇兑差额）

---

## 4. 核销处理规则

1. 创建核销项后，同步回写对应 `FinancialVoucher.OpenAmount`；
2. `OpenAmount == 0` 时，状态更新为 `CLEARED`；
3. `OpenAmount > 0` 且已有核销项，状态为 `PARTIAL`；
4. 保持“资金凭证”与“债务凭证”双向可追溯链路。

---

## 5. 分配策略（建议）

## 5.1 指定分配（手工）

由用户明确输入每条 `AllocatedAmount`，系统仅做合法性校验。

## 5.2 自动分配（余额核销）

默认策略：

1. 同主体、同币种优先；
2. 到期早优先；
3. 同到期日按单据号稳定排序。

该策略可配置化，避免硬编码。

---

## 6. Fail Loudly 约束

1. 越界核销：
   - `AllocatedAmount > Voucher.OpenAmount` 时直接拒绝，返回 `[CRITICAL_CLEARING_OVER_ALLOCATED]`。
2. 非法主体：
   - `Voucher.CounterpartyID` 与 `Payment.CounterpartyID` 不一致时拒绝。
3. 非法币种：
   - 币种不一致且无汇率快照时拒绝核销。
4. 并发冲突：
   - 同凭证并发核销必须行锁或版本校验，冲突返回 409。
5. 重复提交：
   - 核销请求必须具备幂等键，重复请求不得重复扣减余额。

---

## 7. 审计与追溯

每次核销应记录：

- 请求参数快照
- 分配结果明细
- 余额变化前后值
- 操作人、时间、来源

确保满足财务审计和争议回溯要求。

---

## 8. 验证清单

1. 单单核销：一张发票部分核销后状态为 `PARTIAL`；
2. 余额核销：一笔付款自动结清多张历史欠款；
3. 预付款：先形成余额，再抵扣后续发票；
4. 折让：`DiscountAmount` 生效后余额正确收敛；
5. 并发：两次并发核销不会造成 `OpenAmount` 负数。
