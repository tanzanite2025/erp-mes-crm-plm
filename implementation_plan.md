## 2026-04-19 销售退货创建弹窗交互重构：从整单展开改为按 `+` 逐项加入退货商品

1. 目标：
   - 将销售退货创建交互从“订单全部商品直接展开、逐行填写数量”改为更符合业务直觉的“从订单商品中按 `+` 逐个加入退货清单”。
   - 让用户先明确选择“哪些商品要退”，再在已加入的退货清单中填写退货数量，减少当前弹窗中无效行与批量按钮的语义困扰。
2. 已确认现状：
   - 当前 `sales-return-create-sheet.tsx` 会把来源订单的全部明细行直接渲染到退货明细区。
   - 当前 `lineDrafts` 默认覆盖所有订单行，用户通过逐行输入数量来表达“退哪些商品”。
   - 当前存在 `全部退满 / 全部清零` 之类批量按钮，但这与“按需挑选退货商品”的用户心智不一致。
3. 目标交互：
   - 弹窗中的商品区拆为两部分：
     - `可选订单商品池`：展示该订单中可退的商品行，每行提供 `+` 操作。
     - `已加入退货清单`：只展示用户已经加入的商品行，并在这里填写退货数量。
   - 商品未被加入前，不应出现在“退货清单”中。
   - 商品加入后支持移除，移除后对应数量草稿一并清空。
4. 数据与状态设计：
   - 前端新增“已加入行 ID 集合”或等价状态，例如：`selectedLineIds`。
   - `lineDrafts` 不再承担“所有订单行默认可见”的语义，只为已加入行保存数量草稿。
   - `payloadLines` 继续只提交数量大于 0 的已加入行，后端接口无需新增字段。
5. 计划修改范围：
   - `src/features/trading/sales-returns/components/sales-return-create-sheet.tsx`
   - 如需抽取行选择子组件，可新增销售退货本地组件文件，但优先保持改动收敛。
   - 如需文案补充：
     - `src/locales/messages/zh-CN/trading.ts`
     - `src/locales/messages/en-US/trading.ts`
6. 主要改造点：
   - 下线当前“全部退满 / 全部清零”批量操作，改为 `添加` / `移除` 单行操作。
   - 明细区标题和说明文案改为“先从订单商品中加入退货商品，再填写数量”。
   - 保留现有 `可退数量 / 已退数量 / 单价` 等信息展示，但承载位置从“全部展开表”改为“商品池 + 已加入清单”。
7. 风险：
   - 这是创建弹窗的交互重构，不是单纯文案微调；需要同步调整状态管理、明细渲染和批量按钮逻辑。
   - 若只改文案不改交互，会继续造成“语义解释得通但操作仍别扭”的问题。
8. 建议：
   - 按用户要求直接切到“按 `+` 逐个加入退货商品”的单一路径交互，不保留旧的整单默认展开模式。
   - 实施时优先保证：第一屏能看到商品池与已加入清单的核心操作，不再依赖滚动到底部才能完成选品。

## 2026-04-20 销售退货创建链路修复规划：稳定 `issueCategory` 契约与前端状态真相

1. 目标：
   - 在不扩大到销售退货主状态流重构的前提下，先修复创建弹窗中已经暴露出的两个结构性风险：
     - `issueCategory` 以展示名 `name` 作为提交值，缺少稳定持久标识。
     - `selectedLineIds` 与 `lineDrafts` 的职责边界仍残留旧“整单默认展开”模型，状态真相不够收敛。
   - 同时收口顶部统计与提交校验的语义表达，避免“看起来已选很多行，但提交仍提示未填写明细”的理解偏差。
2. 已确认现状：
   - 当前销售退货创建交互已改为“商品池 + 已加入退货清单”，并由 `selectedLineIds` 标识用户已加入的商品行。
   - 当前 `lineDrafts` 虽已配合新交互使用，但初始化与持有方式仍更接近“为全部订单行预建草稿”。
   - 当前异常分类下拉使用字典项 `code` 作为 `key`，但 `value` 仍采用 `name`，导致提交 payload 发送展示名而不是稳定编码。
   - 当前顶部摘要更接近“已加入行数”的统计，但提交阻断按“已加入且数量大于 0”的有效明细行判断，二者口径未完全对齐。
3. 本轮建议边界：
   - 只收口创建弹窗、其直接依赖的前端字典映射与提交装配逻辑。
   - 不扩大到销售退货列表页、详情页、打印模板、物流补录入口或主状态流重构。
   - 若服务端当前已明确要求 `issueCategory` 必须传 `name`，则需先回退到方案确认，不在未确认契约前直接改接口含义。
4. 计划修改范围：
   - `src/features/trading/sales-returns/components/sales-return-create-sheet.tsx`
   - 如异常分类展示映射需抽取，可联动销售退货本地工具函数或当前字典消费位置，但应保持改动收敛。
   - 如文案需同步澄清统计语义：
     - `src/locales/messages/zh-CN/trading.ts`
     - `src/locales/messages/en-US/trading.ts`
   - 若确认服务端也要统一 `issueCategory` 契约，则再补：
     - `src/features/trading/sales/contracts/sales-return-api-dto.ts`
     - `src/features/trading/sales/services/sales-return-service.ts`
     - 以及后端销售退货 handler / service / mapper 的对应契约层
5. 主要改造点：
   - 异常分类：
     - 将下拉选择值从 `name` 改为 `code`。
     - 提交 payload 时发送稳定 `code`。
     - 展示时通过当前字典数据把 `code` 映射为可读名称，而不是把名称当持久值。
   - 行项目状态：
     - `selectedLineIds` 继续作为“哪些行已进入退货清单”的唯一真相来源。
     - `lineDrafts` 改为仅对已加入行懒初始化；未加入行不再预创建草稿。
     - 移除商品行时直接删除对应草稿，避免旧值残留制造伪状态。
   - 统计语义：
     - 顶部统计卡片文案显式指向“已加入退货商品数”或等价语义。
     - 提交校验继续按“已加入且数量大于 0 的有效退货行”判断，不再让统计口径暗示“已可提交”。
6. 风险：
   - 如果后端或历史数据已经把 `issueCategory` 当展示名存储，本轮前端单改为 `code` 可能引发详情展示或筛选值不兼容；因此需要先确认服务端权威契约。
   - 若只改提交值、不补展示映射，后续详情页或列表页可能直接露出 `code`，影响可读性。
   - 若 `lineDrafts` 收口时遗漏“弹窗重新打开 / 切换来源订单 / 移除后再加入”的边界处理，容易出现数量草稿丢失或回显异常。
7. 验证建议：
   - 前端静态校验：`pnpm exec tsc --noEmit --pretty false`
   - 前端定向 lint：`pnpm exec eslint src/features/trading/sales-returns/components/sales-return-create-sheet.tsx src/locales/messages/zh-CN/trading.ts src/locales/messages/en-US/trading.ts`
   - 如契约联动服务端，再补充对应 `go test` / 定向编译验证。
   - 手工回归重点：
     - 从来源订单列表直接发起创建
     - 从来源订单详情发起创建
     - 商品加入、移除、重复加入后的数量草稿行为
     - 异常分类提交值与详情展示值是否一致
8. 结论与待确认项：
   - 推荐先按“`issueCategory` 收口到 `code` + `selectedLineIds` 成为唯一真相 + `lineDrafts` 只服务已加入行”的组合方案推进。
   - 但在你明确批准前，不进入业务代码修改；若你确认，我再进入执行阶段，并在完成后补 `walkthrough.md`。

## 2026-04-20 订单结算方式收口规划：直接删除两个预付内置项

1. 背景与问题
   - 当前财务中心 `payment terms` 字典由 `/finance/payment-terms` 驱动，前端订单建单通过 `useTradingFinanceResources()` 读取活跃结算方式，并在销售订单表单中把选中项直接保存为 `paymentTerm / paymentTermName`。
   - `paymentTerm` 在现有订单主链里主要承担“标签展示 + 文本归档”职责，尚未参与真实预付金额、未收余额、账龄或应收核销计算。
   - 当前内置项与文案包含 `PREPAY`、`PREPAY100`、`PREPAY30_BAL70`、`INST_30_60_10`、`NET30`、`NET60` 等语义，其中比例型选项会让业务录单误以为系统已经理解并落库了精确收款计划，但事实上只是保存了一个显示标签。

2. 目标
   - 本轮只做一个小切口：直接删除两个预付内置项，避免业务继续使用伪精确比例语义。
   - 确保财务中心结算方式字典中不再存在这两个选项。
   - 不在本轮引入新的预付金额字段、计算逻辑或 AR 扩展。

3. 当前代码现状
   - 前端财务字典：
     - `src/features/finance/services/payment-term-core-service.ts` 负责读取 `/finance/payment-terms`。
     - `src/features/finance/components/payment-term-action-dialog.tsx` 当前允许维护 `code / name / description / installments / status`。
     - `src/features/finance/data/schema.ts` 仍保留 `installments: string`，暗示历史上试图用结算方式字典承载分期 JSON。
   - 下游订单下拉：
     - 订单相关界面的结算方式下拉自动读取该财务字典，因此删除字典项后，下游选择入口会同步消失。

4. 最小改造边界（本轮建议）
   - 仅聚焦“财务中心结算方式字典”这一条链路。
   - 不在本轮同时扩展其它结算方式项或业务字段。
   - 不在本轮引入预付金额字段、计算逻辑或后端财务模型扩展。

5. 建议改造方案
   - 结算方式字典层：
     - 把比例型、分期型系统内置项视为错误语义来源。
     - 按你最新要求，直接删除 `PREPAY100` 与 `PREPAY30_BAL70` 这两个预付内置项，不采用先改为 `Inactive` 的保守方案。
     - `INST_30_60_10` 等其它分期型旧项暂不在本轮一并扩大清理，避免把当前小切口修复扩成整套结算字典重做。
     - 保留真正表达账期/结算规则的项，如 `COD`、`NET30`、`NET60`、现结等。
     - 同步收紧财务中心文案与维护提示，避免继续暗示“结算方式 = 自动分期计划”。

6. 风险与兼容性
  - 需要确保默认结算方式补种链不会再把这两个预付系统项重新写回系统。
  - `installments` 字段当前虽未真正驱动业务计算，但若贸然删除，可能影响财务字典维护页或历史接口兼容；建议先停止其业务语义，再评估第二阶段是否下线字段。

7. 验证建议
   - 前端静态校验：`pnpm exec tsc --noEmit --pretty false`
   - 前端定向 lint：按最终改动文件执行 `pnpm exec eslint`
   - 手工回归重点：
    - 财务中心结算方式字典中不再出现 `PREPAY100` 与 `PREPAY30_BAL70`。
    - 默认结算方式补种后，这两个系统项不会被重新写回。

8. 待确认项
  - 是否按最小方案先只处理结算方式字典本身，不额外扩展其它结算方式项。
  - 你确认后，我再进入执行阶段。

## 2026-04-20 收款登记职责收口规划：先完善应收侧

1. 背景与目标
   - 当前销售订单列表、订单详情页承载的是业务单据动作，如新增、编辑、删除、状态流转、打印与审计展示，并不适合作为完整财务录入表单入口。
   - 当前应收侧已经具备“收款登记”的主链：`SalesReceivableDetailDialog` -> `SettlementLedgerDetailDialog` -> `POST /receivables/:id/receipts`。
   - 本轮目标是：先把收款详细录入统一收口到应收台账，不在销售订单侧混入完整财务表单。

2. 当前代码现状
   - 后端模型：`server/models/ar_ap_ledger.go` 中 `ReceiptRecord` 目前仅包含 `Amount`、`Currency`、`PaymentMethod`、`PaymentTerm`、`RecordDate`、`ReferenceNo`、`Evidences`。
   - 后端 DTO：`server/services/ar_ap_dto.go` 的 `CreateReceiptRecordRequest` / `ReceiptRecordResponse` 也只暴露上述简化字段。
   - 前端契约：`src/features/trading/contracts/settlement-record-api-dto.ts` 当前只支持 `amount`、`paymentMethod`、`paymentTerm`、`recordDate`、`referenceNo`、`allocations`。
   - 前端表单：`SettlementRecordFormSection` 当前重点在“日期 + 参考号 + 分摊”，尚未完整承载收款账号、实际收款时间等详细财务字段。

3. 职责边界结论
   - 收款详细录入统一归属到应收台账详情。
   - 销售订单侧本轮不新增完整财务表单。
   - 销售订单侧本轮补“查看应收 / 登记收款 / 展示摘要”的轻入口，但不承载收款明细本体。

4. 本轮建议改造范围
   - 只完善应收详情中的收款登记能力。
   - 同时为销售订单列表或详情补轻入口，但不扩展订单侧财务录入表单。
   - 不同时扩展应付侧，先把应收收款链做完整。

5. 拟改造点
   - 后端模型与契约：
     - 扩展 `ReceiptRecord` 模型，新增收款账号、实际收款时间等详细字段。
     - 同步扩展 `CreateReceiptRecordRequest`、`ReceiptRecordResponse` 以及对应 mapper / service。
   - 前端收款登记表单：
     - 在 `SettlementLedgerDetailDialog` / `SettlementRecordFormSection` 所在主链补齐收款详细字段。
     - 保留现有凭证上传主链，并把凭证语义继续绑定到“收款记录”而不是订单附件。
   - 前端详情展示：
     - 让收款记录历史区能回显新增字段，保证后续核对时信息完整。
   - 订单侧轻入口：
     - 在销售订单列表卡片或详情壳层增加“查看应收 / 登记收款”轻入口。
     - 入口只负责跳转到对应应收或打开应收登记弹层，不新增第二套收款表单。

6. 风险与注意点
   - 当前通用 `SettlementLedgerDetailDialog` 同时服务应收与应付，本轮若直接改公共表单，需要控制好“只先补应收”与“不要误伤应付”的边界。
   - 如果新增字段直接进入公共 `settlement-record-api-dto.ts` 契约，需同步审查 payable 侧是否会被严格 schema 影响。
   - 收款账号字段需要明确是“收款账户名称 / 账号尾号 / 完整账号”中的哪一种，避免一次命名错位后面继续返工。

7. 验证建议
   - 前端静态校验：`pnpm exec tsc --noEmit --pretty false`
   - 前端定向 lint：按最终改动文件执行 `pnpm exec eslint`
   - 服务端定向测试：`go test ./services ./handlers`
   - 手工回归重点：
     - 应收详情内新增收款字段的录入、保存、回显
     - 收款凭证上传后在记录历史中可见
     - 销售订单侧轻入口可正常跳转/打开应收，但不出现重复的财务录入表单

8. 待确认项
   - 是否按最小方案先只完善应收侧收款登记，不同时扩展应付侧。
   - 订单侧本轮已确认补轻入口，但不补完整财务录入表单；若你确认，我就按这个边界执行。
   - 你确认后，我再进入执行阶段。

## 2026-04-20 应收事实源重构：订单即应收

1. 背景与根因结论
   - 当前 `/trading/receivables` 页面只读取 `receivable_ledgers`，不直接读取 `sales_orders`，这是现在“订单存在但应收为空”的直接根因。
   - 当前后端已经把销售订单建成了权威主链：创建、补丁保存、状态迁移、取消、状态重算都围绕 `sales_orders`。
   - 当前应收查询链却围绕 `receivable_ledgers` 展开，形成了“订单真相”和“应收真相”两套持久化来源，数据天然存在漂移风险。
   - 本轮重构目标不是继续补一条“订单到台账”的同步链，而是把应收事实源收回到订单本身。

2. 长期治理目标
   - 建立“订单即应收”的架构约束：`sales_orders` 是应收唯一事实源。
   - 应收页直接从订单主链聚合出应收列表、应收详情、已收金额、未收金额、关闭态与冲减关系。
   - 收款记录、分摊记录、退货/冲减关系统一围绕订单真相组织，避免继续维护一份会漂移的独立应收主表。

3. 目标架构与权威归属
  - 后端应收查询服务改为直接读取 `sales_orders`，并聚合：
    - 订单主数据：客户、币种、金额、订单号、状态、日期
    - 收款记录：已收金额、收款明细、凭证
    - 分摊/冲减：收款分摊、退货或其它冲减关系
  - `receivable_ledgers` 不再作为应收主真相；本轮确认不保留兼容辅助层，直接从业务链路中移除。
  - 前端 `/trading/receivables` 与销售订单详情共享同一份订单真相，只是视角不同，不再依赖第二份主实体。

4. 推荐业务规则
   - 只要订单创建成功，它就天然进入应收视图，除非其业务状态明确表示不应收或已取消。
   - 订单金额、客户、币种、状态、订单号变更后，应收视图直接随订单变化，不再依赖额外同步作业。
   - 订单取消后，应收视图必须关闭；若已有收款记录，则关闭态仍需保留财务追溯关系，不能简单丢失历史。

5. 计划改造点
  - 后端查询重构：
    - 新增独立的订单应收聚合查询服务，建议拆分为单独文件，避免把逻辑堆进现有 handler。
    - `/receivables` 与 `/receivables/:id` 改为读取订单主链并聚合收款/分摊，而不是先查 `receivable_ledgers`。
  - 关系模型重构：
    - 审计 `receipt_records`、`settlement_allocations`、凭证上传链当前对 `ledger_id` 的依赖。
    - 将收款记录的主归属彻底切到订单级主体关系，并删除剩余 `ledger_id` fallback 读取，保证“订单变，应收跟着变”是结构性能力，不是同步补丁。
  - 前端主链调整：
    - `useGetReceivables`、详情弹窗打开参数、搜索过滤条件统一切回订单事实源。
    - 销售订单页“查看应收 / 登记收款”继续保留，但打开目标改为订单聚合后的应收详情，不再接受旧 `ledgerId` 兼容跳转。
  - 旧表处置：
    - 直接删除 `receivable_ledgers` 在业务代码中的剩余依赖，不再保留只读兼容层。
    - 清理后端 `ledger_id` fallback 映射、前端旧台账 ID 打开逻辑、相关测试夹具与辅助函数。

6. 风险与注意点
  - 这不是简单补接口，而是应收事实源重构；需要同步梳理前后端所有 `ledgerId` 依赖点。
  - 本轮明确不做历史迁移，任何仍停留在旧 `ledger_id` / `receivable_ledgers` 结构上的本地或测试数据都将失效，需要用订单主链重新准备。
  - 如果只删列表查询、不删详情打开、收款归属和测试夹具，仍会留下“列表按订单、详情按台账”的双轨裂缝。
  - 删除兼容层后，更容易暴露隐藏依赖；必须接受通过编译失败或测试失败把残留旧链路一次性清掉。

7. 验证建议
  - 服务层定向测试：
    - 新建订单后立即出现在应收列表。
    - 修改订单金额/客户/币种后，应收列表与详情同步变化。
    - 取消订单后，应收视图关闭但历史收款仍可追溯。
  - 清理验证：
    - 搜索全项目后，不再存在应收主链对 `receivable_ledgers` 或 `ledger_id` fallback 的业务依赖。
    - 前端详情打开、收款登记、列表刷新均只接受订单主键链路。
  - 前端回归重点：
    - 应收页可直接展示现有订单。
    - 销售订单详情入口稳定打开对应应收详情。
    - 收款登记、回显、凭证查看都不再依赖旧 `ledgerId`。

8. 待确认项
  - 是否确认本轮不做历史迁移，直接删除 `ledger_id` 兼容读取与旧 `receivable_ledgers` 依赖。
  - 是否确认本地/测试环境中仍停留在旧台账结构上的数据不再保留，需要按订单主链重新准备。
  - 你确认后，我再进入执行阶段。

9. 当前执行结论（2026-04-20）
   - 后端已删除 `sales_order_receivable_service.go` 中的 legacy ledger fallback，`ar_ap_query_service.go` 中的旧应收台账 helper，`db.go` 中的 `ReceivableLedger` 自动迁移，以及 handler / DTO 上的 `SourceDocumentNo` 兼容入口。
   - 前端已删除 `sourceDocumentNo` 兜底过滤，销售订单详情到应收页的轻入口、应收列表缓存键、详情弹窗打开状态均已收口到订单主键链路。
   - `server/handlers/ar_ap_handlers_test.go` 应收夹具已改为仅创建销售订单；旧 `ReceivableLedger` 测试数据不再生成。
   - 当前定向验证通过：`go test ./handlers -run "Receivable|Payable"`、`pnpm exec vitest run src/features/trading/receivables/services/receivables-query-service.test.ts src/features/trading/receivables/services/receivable-ledger-detail-service.test.ts`。
   - 现阶段剩余工作仅为后续若用户需要，再进一步统一前端/DTO 中保留的 `ReceivableLedger*` 类型命名；这属于命名收口，不再影响“订单即应收”的单链路事实源。

## 2026-04-20 应收板块拆分治理（第一批规划）

1. 目标与原则
   - 本轮目标是为应收板块后续继续增加字段、统计和结算动作预留更稳定的结构边界。
   - 本轮第一批只做结构拆分，不改变业务语义，不顺手引入新字段、新接口或新交互规则。
   - 拆分时优先遵循“容器更薄、hook 更聚焦、service 单职责、DTO/adapter 分层明确”的方向。

2. 当前最需要拆分的高耦合文件
   - 后端：`server/services/sales_order_receivable_service.go`
     - 当前同时承载列表、搜索、详情、收款创建、分摊校验、金额计算、状态推导和 DTO 映射。
   - 前端：`src/features/trading/components/settlement-ledger-detail-dialog.tsx`
     - 当前同时承载弹窗布局、表单区块编排、搜索弹窗编排、历史区块与提交入口。
   - 前端：`src/features/trading/hooks/use-settlement-ledger-detail-dialog-view-model.ts`
     - 当前同时承载状态编排、远程搜索、展示派生、历史过滤与提交封装。

3. 第一批拆分范围
   - 后端拆分目标：`server/services/sales_order_receivable_service.go`
     - 建议拆为：
       - `sales_order_receivable_list_service.go`
       - `sales_order_receivable_detail_service.go`
       - `sales_order_receivable_settlement_service.go`
       - `sales_order_receivable_mapper.go`
       - `sales_order_receivable_policy.go` 或 `sales_order_receivable_calculator.go`
   - 前端拆分目标：`src/features/trading/components/settlement-ledger-detail-dialog.tsx`
     - 建议拆为：
       - 保留当前文件作为薄容器
       - 新增内容编排子组件
       - 新增搜索筛选子组件
       - 新增底部提交区块子组件
   - 前端拆分目标：`src/features/trading/hooks/use-settlement-ledger-detail-dialog-view-model.ts`
     - 建议拆为：
       - `use-settlement-ledger-search.ts`
       - `use-settlement-allocation-history.ts`
       - `use-settlement-summary-items.ts`
       - `use-settlement-submit.ts`

4. 第二批预留范围
   - `src/features/trading/receivables/tabs/sales-receivables-tab.tsx`
   - `server/handlers/ar_ap_handlers.go`
   - `src/features/trading/query-keys.ts`
   - 这一批的目标是把页面容器、HTTP 入口和缓存键管理继续拆开，但不在第一批同时推进，避免改动面过大。

5. 关键风险
   - 如果第一批拆分时顺手改动业务规则，容易把“结构治理”变成“结构 + 行为”双重变更，回归面会显著扩大。
   - `settlement-ledger-detail-dialog.tsx` 与 `use-settlement-ledger-detail-dialog-view-model.ts` 是应收/应付共享链路，拆分时必须保持 payables 侧不被误伤。
   - 后端 `sales_order_receivable_service.go` 虽然应收语义已切到订单主链，但对外 service 入口仍保留 `ReceivableLedger*` 命名，拆分时要避免接口名同步漂移导致无谓联动。

6. 验证策略
   - 后端：优先做 `handlers` 与目标 `services` 包的定向编译/测试校验，确认拆分后路由与响应契约不变。
   - 前端：优先做 receivables 相关 service/hook 测试、目标文件 TypeScript 校验，以及详情弹窗打开/提交链路回归。
   - 文档：结构拆分完成后更新 `walkthrough.md`，记录新的文件边界、验证结果与后续第二批拆分入口。

7. 当前待你确认的实施边界
   - 第一批是否确认只做结构拆分，不追加业务需求。
   - 第一批是否确认按“后端 service -> 前端 view-model -> 前端 dialog 容器”的顺序实施。
   - 你确认后，我再进入业务代码修改阶段。

## 2026-04-21 应收详情弹窗 view-model / 容器层前端测试补强方案

1. 目标与边界
   - 目标是在不改动业务实现的前提下，为第一批结构拆分后的 `view-model` 与薄容器补齐更稳的前端测试护栏。
   - 本轮优先扩展现有测试文件：
     - `src/features/trading/hooks/use-settlement-ledger-detail-dialog-view-model.test.tsx`
     - `src/features/trading/components/settlement-ledger-detail-dialog.test.tsx`
   - 本轮不主动扩散到 `settlement-ledger-detail-dialog-body.tsx`、`settlement-ledger-detail-dialog-footer.tsx`、`settlement-ledger-search-dialog-container.tsx` 各自独立测试文件，避免测试碎片化过快。

2. view-model 测试补强范围
   - 保留现有“派生结果 + 提交 payload”测试，新增“编排层委派”断言。
   - 通过 mock `useSettlementRecordDialogState`、`useSettlementLedgerSearch`、`useSettlementSummaryItems`、`useSettlementAllocationHistory`、`useSettlementSubmit`，验证：
     - `view-model` 是否把 state hook 的输入态与动作原样透传到返回结果。
     - `view-model` 是否将 `config`、`detail`、`records`、`allocationHistory`、`ledgerOptions`、`currencies`、`paymentMethods` 等参数正确拼装并传给四个子 hook。
     - `activeAllocation?.ledgerId` 是否被正确收口为 `activeAllocationLedgerId`。
     - `actionRecordLabel` 与 `fieldPrefix` 是否继续由配置驱动。

3. 容器层测试补强范围
   - 现有容器测试已覆盖基础渲染与关闭按钮，本轮新增“薄容器连线”断言。
   - 通过 mock `SettlementLedgerDetailDialogBody`、`SettlementLedgerDetailDialogFooter`、`SettlementLedgerSearchDialogContainer`，验证：
     - 容器是否把 `vm`、`config`、`isCurrencyLoading`、`allocationHistory.length` 正确透传给 body。
     - `config.recordType === 'receipt'` 时，`showDetailedFields` 是否为 `true`；非 receipt 时是否为 `false`。
     - 容器是否把 `actionLabel`、`isSubmitPending`、`isDetailLoading` 正确透传给 footer。
     - 容器是否把 `ledgerKindLabel`、`partnerLabel`、`amountLabel` 正确透传给 search container。
     - `Dialog` 是否继续以 `vm.handleOpenChange` 作为开关入口。

4. 夹具与 mock 策略
   - 尽量复用现有测试中的 `config`、`createViewModel`、`renderDialog` 夹具，避免重复维护两套示例数据。
   - 若现有 mock 粒度过粗，则优先把旧测试从“直接 mock 深层 section”调整为“mock 新容器子组件”，使测试边界与当前代码结构对齐。
   - 不新增复杂 test harness；仅在必要时抽取本文件内 helper，保持可读性。

5. 关键风险
   - 如果继续沿用拆分前的 mock 边界，测试可能只是“绿了”，但不能真正保护新拆分出来的容器连线。
   - `view-model` 同时服务 payables / receivables，共享配置驱动逻辑；测试应避免写死某一侧特例，防止后续另一侧重构时频繁误报。
   - 过度断言内部实现细节会让后续重构成本上升，因此优先验证参数拼装和对外返回契约，而不是每个中间变量。

6. 验证策略
   - `pnpm exec vitest run src/features/trading/hooks/use-settlement-ledger-detail-dialog-view-model.test.tsx src/features/trading/components/settlement-ledger-detail-dialog.test.tsx`
   - `pnpm exec eslint src/features/trading/hooks/use-settlement-ledger-detail-dialog-view-model.test.tsx src/features/trading/components/settlement-ledger-detail-dialog.test.tsx`
   - `pnpm exec tsc --noEmit --pretty false`
   - 完成后更新 `walkthrough.md`，记录新增覆盖点与验证结果。

7. 当前待你确认的实施边界
   - 是否确认本轮先扩展现有两个测试文件，不另外新增 body / footer / search container 的独立测试文件。
   - 是否确认测试重点放在“编排层委派 + 薄容器透传”，不去覆盖更深层 UI 细节。
   - 你确认后，我再进入测试代码修改阶段。

## 2026-04-21 第二批结构拆分起步：`sales-receivables-tab.tsx`

1. 目标与边界
   - 目标是在不改变应收页现有行为的前提下，将 `src/features/trading/receivables/tabs/sales-receivables-tab.tsx` 从“页面壳 + 统计卡片 + 表格 + 自动打开详情状态”混合体，收口为更清晰的页面容器层。
   - 本轮只做结构拆分，不新增筛选栏、分页、批量操作、空态增强或新的接口参数。
   - 保持以下契约不变：
     - 仍通过 `Route.useSearch()` 读取 `sourceType / sourceRefId / autoOpen`。
     - 仍通过 `useGetReceivables()` 拉取列表数据。
     - 点击表格行仍打开 `SalesReceivableDetailDialog`。
     - 自动打开详情与关闭后抑制重复自动打开的行为不变。

2. 当前文件职责盘点
   - 页面级数据收口：组装 `listQueryParams` 并调用 `useGetReceivables()`。
   - 页面级状态：维护 `selectedReceivableId`、`dismissedAutoOpenKey`，并派生 `autoOpenKey / autoOpenReceivableId / activeReceivableId`。
   - 统计区渲染：3 张 summary cards。
   - 列表区渲染：应收表格表头、行点击打开详情。
   - 详情弹窗编排：将 `activeReceivableId` 接到 `SalesReceivableDetailDialog`。

3. 建议拆分落点
   - 页面容器继续保留在：
     - `src/features/trading/receivables/tabs/sales-receivables-tab.tsx`
   - 建议新增页面子组件：
     - `src/features/trading/receivables/components/sales-receivables-summary-cards.tsx`
       - 负责 summary 三张卡片渲染。
     - `src/features/trading/receivables/components/sales-receivables-table-card.tsx`
       - 负责表格卡片、表头与行点击回调。
   - 建议新增页面级 hook：
     - `src/features/trading/receivables/hooks/use-sales-receivables-page-state.ts`
       - 负责 `selectedReceivableId`、`dismissedAutoOpenKey`、`autoOpenKey`、`autoOpenReceivableId`、`activeReceivableId` 以及 dialog 关闭后的状态回收。

4. 拆分策略
   - 第一步：抽离 summary 组件，仅接收 `summary` 与 `t` 所需文本结果或直接接收已翻译文案，避免新组件继续感知整页逻辑。
   - 第二步：抽离 table card 组件，仅接收 `items` 与 `onSelectReceivable`，保持“点击行打开详情”语义不变。
   - 第三步：将自动打开 / 手动选择 / 关闭回收逻辑收口到页面级 hook，使 tab 文件主要负责：读 route search、取数、拼装 props、挂载详情弹窗。
   - 第四步：仅在必要时补轻量页面测试或复用现有入口测试，不为了本轮拆分额外铺设复杂 harness。

5. 关键风险
   - `autoOpen` 与 `dismissedAutoOpenKey` 组合是当前页面最脆弱的行为边界，若拆分时误改依赖顺序，可能造成详情弹窗重复自动弹出或无法再次自动弹出。
   - `items[0]?.id` 当前承担“来源过滤后默认打开第一条”的语义，拆分时不能把它误解为通用默认选中逻辑。
   - 若摘要区或表格区组件直接继续依赖 `Route.useSearch()`、`useGetReceivables()`，会把耦合从 tab 文件平移到子组件，达不到容器收薄目的。

6. 验证策略
   - `pnpm exec eslint src/features/trading/receivables/tabs/sales-receivables-tab.tsx [新拆出文件]`
   - `pnpm exec tsc --noEmit --pretty false`
   - 如本轮同步补充页面级定向测试，则优先覆盖：
     - route search 过滤存在且 `autoOpen=true` 时默认打开第一条。
     - 手动关闭后同一 `autoOpenKey` 不重复自动打开。
     - 点击表格行仍能打开对应详情。
   - 完成后更新 `walkthrough.md`，记录新的文件边界与第二批剩余入口。

7. 当前待你确认的实施边界
   - 是否确认第二批先从 `sales-receivables-tab.tsx` 开始，不并行推进 `ar_ap_handlers.go` 与 `query-keys.ts`。
   - 是否确认本轮优先拆 summary / table / page-state 三块，不额外加入新筛选、新统计或交互增强。
   - 你确认后，我再进入这一文件的代码修改阶段。

## 2026-04-21 第二批结构拆分下一步：应收 query keys 从 `trading/query-keys.ts` 独立

1. 目标与边界
   - 目标是在不改变缓存 key 结构与失效语义的前提下，将应收相关 query keys 从 `src/features/trading/query-keys.ts` 中独立出来，为后续 receivables 目录继续内聚化拆分预留边界。
   - 本轮只迁移应收 keys：
     - `receivableDetail`
     - `receivableList`
     - `receivableSearch`
     - `receivables`
   - 本轮不拆 `payables`、`salesOrders`、`salesReturns` 等其它 trading keys，也不改 key tuple 的值结构。

2. 为什么优先于 `server/handlers/ar_ap_handlers.go`
   - `query-keys.ts` 的消费面目前集中在 receivables hooks：`use-receivables.ts` 与 `use-receivable-ledger-detail.ts`，联动面小、回归面可控。
   - `ar_ap_handlers.go` 同时受路由注册、payable/receivable/receipt/payment handler、以及 `ar_ap_handlers_test.go` 多段测试约束，拆分时会同步触及后端入口与测试组织，变更面明显更大。
   - 因此第二批建议先做应收前端缓存键内聚，再进入后端 handler 分层。

3. 当前消费点与建议落点
   - 当前消费点：
     - `src/features/trading/receivables/hooks/use-receivables.ts`
     - `src/features/trading/receivables/hooks/use-receivable-ledger-detail.ts`
   - 建议新增：
     - `src/features/trading/receivables/query-keys.ts`
       - 仅导出应收链路所需的 query key builders。
   - 建议调整：
     - `src/features/trading/query-keys.ts`
       - 删除应收 keys，保留其余 trading keys。
     - `use-receivables.ts` / `use-receivable-ledger-detail.ts`
       - 改为从 receivables 本地 query keys 文件引用。

4. 拆分策略
   - 第一步：原样抽取应收 key builders 到 receivables 本地文件，确保 tuple 内容完全一致。
   - 第二步：回收消费侧 import 到本地 receivables query keys。
   - 第三步：从全局 `tradingQueryKeys` 中删除应收 keys，仅保留其它业务域 keys。
   - 第四步：巡检是否仍有遗漏的 `tradingQueryKeys.receivable*` 调用点，避免残留双入口。

5. 关键风险
   - 若迁移时改动了 tuple 结构或根 key 名称，会直接改变 React Query 缓存命中与失效行为，属于本轮必须避免的风险。
   - `use-receivable-ledger-detail.ts` 中 mutation `invalidateQueries` 依赖根 key 与 detail key；若迁移后漏改任一入口，会导致列表或详情不刷新。
   - 若保留全局与本地双入口长期并存，后续继续拆分时容易形成重复定义与误用，因此本轮最好一次收口到单入口。

6. 验证策略
   - `pnpm exec eslint src/features/trading/query-keys.ts src/features/trading/receivables/query-keys.ts src/features/trading/receivables/hooks/use-receivables.ts src/features/trading/receivables/hooks/use-receivable-ledger-detail.ts`
   - `pnpm exec tsc --noEmit --pretty false`
   - 如需要定向测试，优先确认：
     - 列表 query 仍使用原 `receivableList(sourceType, sourceRefId)` 结构。
     - 搜索 query 仍使用原 `receivableSearch(...)` 结构。
     - receipt 创建后的 `invalidateQueries` 仍命中 `receivables()` 与 `receivableDetail(id)`。
   - 完成后更新 `walkthrough.md`，并记录下一步再进入 `ar_ap_handlers.go`。

7. 当前待你确认的实施边界
   - 是否确认第二批下一步先拆应收 query keys，而不是直接进入 `ar_ap_handlers.go`。
   - 是否确认本轮只迁移应收 keys，不顺手扩散到其它 trading 域。
   - 你确认后，我再进入代码修改阶段。

## 2026-04-21 第二批后端入口拆分：`server/handlers/ar_ap_handlers.go`

1. 目标与边界
   - 目标是在不改变 HTTP 契约、路由注册、导出函数名与服务层调用参数的前提下，将 `server/handlers/ar_ap_handlers.go` 从单文件混合入口收口为更清晰的 handler 分层结构。
   - 本轮仅处理 `ar_ap_handlers.go` 相关 handler 与必要的共享 helper。
   - 本轮不改：
     - `server/routes/routes_ar_ap.go` 的注册路径与调用的导出函数名
     - 状态码与中文错误文案
     - `services` 层函数签名与业务语义

2. 当前职责盘点
   - 应收列表/搜索/详情：
     - `GetReceivableLedgersHandler`
     - `SearchReceivableLedgersHandler`
     - `GetReceivableLedgerHandler`
   - 应付列表/搜索/详情：
     - `GetPayableLedgersHandler`
     - `SearchPayableLedgersHandler`
     - `GetPayableLedgerHandler`
   - 结算动作：
     - `CreateReceiptRecordHandler`
     - `CreatePaymentRecordHandler`
   - 共享逻辑：
     - 列表/搜索 query 组装
     - 服务错误到 HTTP 状态码与中文错误文案的映射

3. 建议拆分落点
   - 建议新增文件：
     - `server/handlers/ar_ap_receivable_handlers.go`
       - 放应收列表 / 搜索 / 详情 / 收款 handlers。
     - `server/handlers/ar_ap_payable_handlers.go`
       - 放应付列表 / 搜索 / 详情 / 付款 handlers。
     - `server/handlers/ar_ap_settlement_helpers.go`
       - 放收款/付款的共享 bind + error mapping helper，避免两侧 switch 继续平行膨胀。
   - 建议回收：
     - `server/handlers/ar_ap_handlers.go`
       - 尽量删空或仅保留极少量兼容入口；若无必要，直接让新文件承接全部原导出函数。

4. 拆分策略
   - 第一步：按 receivable / payable 拆开 handler 实现，保持原导出函数名不变。
   - 第二步：抽取列表与搜索所需的 query builder helper，避免两侧继续复制 `parsePageQuery + query*Filter` 组合。
   - 第三步：抽取收款/付款错误映射 helper，只复用结构，不改变错误分支与文案。
   - 第四步：确认 `routes_ar_ap.go` 与 `ar_ap_handlers_test.go` 无需改名即可继续编译与通过。

5. 关键风险
   - `CreateReceiptRecordHandler` 与 `CreatePaymentRecordHandler` 的错误分支非常相似，但文案与 NotFound 错误不同，若过度抽象，容易把应收/应付错误文案混淆。
   - `GetReceivableLedgersHandler` 与 `GetPayableLedgersHandler` 的 query 类型不同；应收多了 `SourceType / SourceRefID`，不能在抽 helper 时误抹平差异。
   - 路由文件当前直接引用具体函数名；若拆分时改名或改包可见性，会立即导致路由注册与测试失效。

6. 验证策略
   - `go test ./handlers -run "Receivable|Payable|Receipt|Payment" -count=1`
   - 如有必要，再补 `go test ./routes -run "ArAp|Receivable|Payable" -count=1` 或等效编译校验。
   - 巡检 `server/routes/routes_ar_ap.go`，确认仍引用原导出函数名。
   - 完成后更新 `walkthrough.md`，记录新文件边界、共享 helper 与验证结果。

7. 当前待你确认的实施边界
   - 是否确认本轮按“receivable handlers / payable handlers / settlement helpers”三块拆分。
   - 是否确认本轮保持原导出函数名、HTTP 状态码与中文错误文案不变，只做结构治理。
   - 你确认后，我再进入代码修改阶段。

## 2026-04-21 既有测试契约收口：修 `TestCreatePaymentRecordHandlerReturnsLockedCreateResponseContract`

1. 目标与边界
   - 目标是在不改动付款创建业务实现与 DTO 返回契约的前提下，修复 `server/handlers/ar_ap_handlers_test.go` 中付款创建返回契约测试的既有失败。
   - 本轮只处理测试契约与测试 helper。
   - 本轮不改：
     - `services.PaymentRecordResponse`
     - `CreatePaymentRecordHandler` 的返回 payload
     - 收款/付款业务实现

2. 根因确认
   - `ReceiptRecordResponse` 包含：`receivedAt`、`receiptAccount`。
   - `PaymentRecordResponse` 不包含：`receivedAt`、`receiptAccount`。
   - 当前 `requireSettlementRecordJSONContract` 作为共享 helper，同时被收款创建测试与付款创建测试复用，但它强制要求 `receivedAt / receiptAccount`，因此对付款创建返回契约形成了过宽断言。
   - 这说明失败根因在测试契约层，而不是付款创建真实响应异常。

3. 建议修复落点
   - 目标文件：
     - `server/handlers/ar_ap_handlers_test.go`
   - 建议调整：
     - 将 `requireSettlementRecordJSONContract` 拆为更明确的断言 helper，例如：
       - `requireReceiptRecordJSONContract`
       - `requirePaymentRecordJSONContract`
     - 或者保留一个基础 helper，再由收款/付款侧各自补充字段断言。
   - 优先选择：
     - 收款 / 付款断言分离，可读性更高，也更不容易在后续继续演进时误伤另一侧。

4. 拆分/修复策略
   - 第一步：抽出收款与付款共享的基础字段集合。
   - 第二步：为收款记录补充 `receivedAt / receiptAccount` 断言。
   - 第三步：付款记录只断言 `PaymentRecordResponse` 的真实字段集合。
   - 第四步：回归收款创建与付款创建两条 handler 契约测试，确认两侧都准确命中各自 DTO。

5. 关键风险
   - 如果继续使用一个“超集字段”的共享 helper，后续任一侧加字段都可能再次误伤另一侧，属于当前结构上的隐患。
   - 如果把付款测试改成接受收款字段，会掩盖 `PaymentRecordResponse` 与 DTO 定义不一致的问题，不应采用。
   - 修改 helper 时要避免误伤收款侧既有断言，尤其是 `receivedAt / receiptAccount` 的存在性检查。

6. 验证策略
   - `go test ./handlers -run "CreateReceiptRecordHandlerReturnsLockedCreateResponseContract|CreatePaymentRecordHandlerReturnsLockedCreateResponseContract" -count=1`
   - 如有必要，再补：`go test ./handlers -run "Receipt|Payment" -count=1`
   - 完成后更新 `walkthrough.md`，记录根因、修复方式与验证结果。

7. 当前待你确认的实施边界
   - 是否确认本轮只修测试契约/helper，不改支付创建业务返回。
   - 是否确认按“收款断言 / 付款断言”分离的方式收口，而不是保留单一共享超集 helper。
   - 你确认后，我再进入代码修改阶段。

## 2026-04-21 修复 authz 权限目录构建错误：`action-permission-catalog.ts`

1. 目标与边界
   - 目标是在不改变权限结构与权限语义的前提下，修复 `src/features/authz/data/action-permission-catalog.ts` 中同文件内多处导致 Vite/SWC 报 `Unterminated string constant` 与文案乱码的损坏字符串。
   - 本轮只处理静态目录文案与语法层问题。
   - 本轮不改：
     - 权限 `id`
     - `category` / `parentId`
     - 权限层级与判定逻辑
     - 非受损 authz 文件的大范围文本清洗

2. 根因确认
   - `user_view` 条目附近的 `desc` 文本已发生字符损坏，当前内容在字符串中出现替代字符并提前截断，导致引号未闭合。
   - 同一条目的 `routeBindings` 文本也出现乱码，说明该条静态中文文案曾发生编码污染或文本写入损坏。
   - 进一步巡检发现：同一文件内存在多处 `�` 替代字符，问题并非只限于 `user_view` 单条，而是 `systemActions` 中多条 `label / desc` 文本受损。
   - 当前报错属于源文件语法损坏，而不是 React/Vite 运行时逻辑错误。

3. 建议修复落点
   - 目标文件：
     - `src/features/authz/data/action-permission-catalog.ts`
   - 修复范围：
     - 该文件内已巡检到的带 `�` 替代字符的受损条目
     - 相关的 `label / desc / routeBindings` 文本恢复
     - 不扩散到其它 authz 文件

4. 修复策略
   - 第一步：优先恢复最先触发语法错误的 `user_view` 条目，使文件重新可被 TS/ SWC 解析。
   - 第二步：在同一文件内继续收口所有已定位到的受损 `label / desc / routeBindings` 文本，避免修完一处后被下一处同类损坏继续阻塞。
   - 第三步：将受损中文文案恢复为合理、简洁且与当前权限语义一致的文本。

5. 关键风险
   - 如果仅补闭合引号而不修正文案乱码，文件虽然可能恢复语法，但会留下脏文本，后续维护仍会混乱。
   - 如果顺手大范围替换整个 authz 目录的中文文案，会超出本轮最小修复边界，也可能引入无谓 diff。
   - 该文件存在字符集异常迹象，读取/编辑时要以最小变更为主，避免误伤其它未损坏条目。

6. 验证策略
   - 优先执行目标文件相关校验，至少确认不再出现 `Unterminated string constant`。
   - 执行 `pnpm exec tsc --noEmit --pretty false`。
   - 如有必要，再补执行最小 Vite 构建/ESLint 校验，确认该 catalog 文件已恢复正常解析。
   - 完成后更新 `walkthrough.md`，记录根因、修复条目与验证结果。

7. 当前待你确认的实施边界
   - 是否确认本轮扩大为“同文件内多处受损文本收口”，但仍只处理 `action-permission-catalog.ts`，不扩散到 authz 全目录。
   - 是否确认修复目标是“恢复正确中文文案 + 保持权限 ID/结构不变”，而不是顺手重写整份权限目录文案。
   - 你确认后，我再进入代码修改阶段。

## 2026-04-21 补充方案：排查其它高风险目录中的同类文本污染

1. 目标与边界
   - 目标：在已完成 `src/features/authz` 目录排查的基础上，继续定位其它前端高风险目录中是否存在相同类型的编码污染、mojibake 或受损中文文案。
   - 本轮边界：先做只读巡检与问题定位，不直接修改业务文件；若发现可疑文件，再单独回到规划/确认流程决定是否修复。
   - 不做事项：
     - 不做全仓无差别扫描后直接批量替换文案。
     - 不因扫描顺手改业务逻辑、权限逻辑或接口契约。

2. 高风险目录选择依据
   - `src/features/trading`
     - 已存在 `copy-encoding-checklist.md` 与 `copy-encoding-guard.test.ts`，说明该目录历史上出现过编码或中文文案污染问题。
     - 该目录包含较多表格、弹窗、状态文案、字典与选项配置，静态中文文本密度高。
   - `src/features/scan-platform`
     - 包含 `registry / catalog` 类静态目录文件，存在较多中文标签、说明文案与模块说明，易出现复制链路带来的编码污染。
   - `src/features/org-personnel`
     - 包含导入、预览、弹窗确认、错误提示等可见中文文案，且 often 分散在组件内部与配置项中，容易漏检。
   - `src/data/seed`
     - 作为兜底扩展范围，仅在前三个目录未发现明显问题但仍怀疑有历史残留时再纳入。

3. 巡检方法
   - 第一层：严格 UTF-8 解码检查，识别无法按 UTF-8 稳定读取的文件。
   - 第二层：替代字符 `�` 检查，识别已发生损坏并被替换的文本。
   - 第三层：常见 mojibake 片段扫描，例如 `鏈€ / 鍙拌处 / 鎼滅储 / 甯佺 / 鐘舵€ / 纭 / 閫夋嫨 / 姝ｅ湪 / 璇疯緭鍏 / 鏈寚瀹 / 闄嶅簭 / 鍗囧簭 / 锟`。
   - 第四层：如目录自身已存在护栏测试或清单，优先复用现有约定与可疑 token 集合，而不是另起一套不一致的扫描标准。

4. 建议执行顺序
   - 第一步：`src/features/trading`
   - 第二步：`src/features/scan-platform`
   - 第三步：`src/features/org-personnel`
   - 第四步：根据前三步结果决定是否扩大到 `src/data/seed`

5. 风险与注意事项
   - 高风险目录中文案很多，如果一次性扩大到整个 `src`，容易产生大量噪音结果，不利于聚焦真正的编码污染。
   - 部分英文 label 或双语文案并不是问题，不能把“不是中文”误判为“乱码”。
   - `trading` 已有自己的编码护栏，若扫描方法与现有护栏不一致，可能出现同一问题两套口径，需要优先对齐现有 token 集合。

6. 验证与输出
   - 输出每个已排查目录的结论：`发现问题 / 未发现问题 / 待继续扩大范围`。
   - 若发现问题，至少记录文件路径、命中的可疑 token 或受损片段类型。
   - 完成后更新 `walkthrough.md`，记录本轮排查范围、方法与结果。

7. 当前待你确认的实施边界
   - 是否确认本轮先按 `trading → scan-platform → org-personnel → 视结果再决定是否扩到 src/data/seed` 的顺序排查。
   - 是否确认本轮先只做只读扫描与问题定位，不在未单独确认的情况下直接改动这些目录中的业务文件。
   - 你确认后，我再进入目录扫描阶段。

## 2026-04-21 补充方案：收窄快捷扫描侧边栏卡片内容

1. 目标与边界
   - 目标：将快捷扫描侧边栏中每张快捷动作卡片从“标题 + 简短描述”收窄为仅展示标题，提升移动端可视区域利用率。
   - 本轮边界：只处理卡片列表中的描述文本渲染，不改抽屉头部说明文案，不改快捷动作配置结构，不改权限和跳转逻辑。
   - 不做事项：
     - 不删除 `quick-action-registry` 中的 `descriptionKey`。
     - 不清理 `zh-CN` 等多语言文案里的描述字段。
     - 不调整卡片排序、图标、安装按钮、权限判定或扫码触发逻辑。

2. 当前实现落点
   - 侧边栏快捷扫描抽屉组件位于：`src/features/quick-actions/components/quick-action-drawer.tsx`。
   - 当前每张卡片在标题下方渲染一行描述：`{t(action.descriptionKey)}`。
   - 快捷动作配置位于：`src/features/quick-actions/data/quick-action-registry.ts`。
   - 中文文案位于：`src/locales/messages/zh-CN/quickActions.ts`。

3. 建议修改策略
   - 第一步：仅在 `quick-action-drawer.tsx` 中移除卡片描述 `<p>` 的渲染。
   - 第二步：保留标题行、图标、箭头、安装按钮与点击区域结构，确保交互行为完全不变。
   - 第三步：保持注册表与多语言字段原样不动，避免把一次视觉收窄改成结构性清理。

4. 关键风险
   - 如果顺手删除 `descriptionKey` 类型与文案字段，会扩大 diff，并可能影响未来其它地方复用这些描述文案。
   - 如果误删抽屉头部 `SheetDescription`，会超出当前“只压缩卡片高度”的范围。
   - 需要注意标题与图标垂直对齐，避免去掉第二行后卡片视觉重心异常。

5. 验证策略
   - 优先执行目标文件 `eslint`。
   - 如有必要，补执行最小前端类型检查，确认 `quick-actions` 相关类型未受影响。
   - 完成后更新 `walkthrough.md`，记录修改范围、边界与验证结果。

6. 当前待你确认的实施边界
   - 是否确认本轮只去掉每张快捷卡片的简短描述，不处理抽屉头部说明文案。
   - 是否确认本轮按最小变更处理：只改渲染层，不顺手删 `descriptionKey` 或国际化文案字段。
   - 你确认后，我再进入 UI 修改阶段。

## 2026-04-21 补充方案：进一步压缩快捷扫描指令卡片高度

1. 目标与边界
   - 目标：在已移除卡片简短描述的基础上，继续小幅压缩快捷扫描指令卡片的纵向高度，提升移动端同屏可见数量。
   - 本轮边界：仅调整卡片样式 class，不改文案、不改数据结构、不改抽屉宽度和头部区域。
   - 不做事项：
     - 不修改快捷动作注册表或国际化字段。
     - 不调整抽屉整体宽度、顶部说明文案或空态区布局。
     - 不为了压缩高度而牺牲安装按钮的基本点击尺寸。

2. 当前实现落点
   - 目标组件：`src/features/quick-actions/components/quick-action-drawer.tsx`。
   - 当前卡片高度主要由以下样式共同决定：
     - 外层卡片容器：`px-4 py-4`
     - 主点击区布局：`gap-3`
     - 图标容器：`size-11`
     - 标题行与安装按钮之间的整体行高/对齐方式

3. 建议修改策略
   - 第一步：将卡片外层纵向 padding 做小幅收窄，例如从 `py-4` 下调到更紧凑的值。
   - 第二步：同步收窄主点击区与图标区域的 gap，以及图标容器尺寸，使卡片在视觉上更紧凑。
   - 第三步：尽量保持安装按钮当前尺寸，优先通过卡片本体收窄来降高度，避免影响触控。

4. 关键风险
   - 如果只压缩卡片容器而不协调图标容器和 gap，容易出现视觉重心失衡。
   - 如果把安装按钮也大幅缩小，移动端点击体验会明显变差。
   - 如果压缩过度，标题可能显得拥挤，尤其在装有安装按钮的卡片上更明显。

5. 验证策略
   - 优先执行目标文件 `eslint`。
   - 如有必要，补执行最小前端类型检查。
   - 完成后更新 `walkthrough.md`，记录收窄策略与验证结果。

6. 当前待你确认的实施边界
   - 是否确认本轮按“小幅收窄”处理：只调整卡片内边距、gap 和图标容器尺寸，不再动抽屉宽度或头部区域。
  - 是否确认本轮保持安装按钮可点击尺寸，不为了继续压缩高度而把按钮缩得过小。
  - 你确认后，我再进入 UI 修改阶段。

## 2026-04-21 订单分析页 `/trading/orders-analysis` 500 排查与修复方案

1. 当前现象
   - 页面：`/_authenticated/trading/orders-analysis?timeRange=last_30_days`
   - 前端报错：`TypeError: analytics.map is not a function or its return value is not iterable`
   - 触发位置：`src/features/trading/sales/analytics/tabs/analytics-tab.tsx` 中构造 `customerOptions` 的 `useMemo`。

2. 已确认的数据流
   - `OrdersAnalysisTab` 通过 `useSalesAnalytics()` 获取 `analytics`。
   - `useSalesAnalytics` 调用 `SalesAnalyticsService.getCustomerProductStats()`。
   - `SalesAnalyticsService.getCustomerProductStats()` 再调用 `src/features/trading/sales/services/sales-query-service.ts` 中的 `getCustomerProductStats()`。
   - 该查询服务当前对响应使用的是 `ensureObjectResponse(...)`，返回对象本身。
   - 后端 `server/handlers/sales_order_analytics.go` 实际返回结构为：`{ items: [...], total: number }`，不是裸数组。

3. 根因判断
   - 当前前端服务层把后端对象包裹响应直接强转成 `CustomerAnalytics[]` / `ProductStat[]`。
   - `analytics-tab.tsx` 随后按数组直接调用 `analytics.map(...)`、`analytics.reduce(...)`、`globalRanking.map(...)`。
   - 因此在接口返回 `{ items, total }` 时，`analytics` 实际拿到的是对象而不是数组，最终在渲染阶段触发 `map is not a function`。
   - 这不是单纯空值问题，而是**前后端接口契约错配**。

4. 最小修复策略
   - 优先修复 `sales-query-service.ts` / `analytics-service.ts` 的契约适配。
   - 对 `/sales-orders/analytics/customer-product-stats` 与 `/sales-orders/analytics/global-product-ranking`：
     - 先校验响应对象；
     - 再从对象中提取 `items` 数组；
     - 返回给上层稳定的数组类型。
   - 保持 `analytics-tab.tsx` 继续消费数组，不在渲染层散落临时补丁。

5. 风险与边界
   - 如果只在 `analytics-tab.tsx` 用 `Array.isArray` 做兜底，会掩盖接口契约问题，且其它消费方后续仍可能踩坑。
   - 如果扩大为整个 `sales-query-service` 的统一重构，diff 会超出本轮 500 修复范围。
   - 本轮仅处理订单分析页直接依赖的两个 analytics 查询接口。

6. 验证策略
   - 优先执行与订单分析页相关目标文件的 `eslint`。
   - 补执行 `pnpm exec tsc --noEmit --pretty false`，确认类型未破坏。
   - 如需要，再补一轮订单分析页定向运行验证，确认 `map` / `reduce` 不再在运行时崩溃。

7. 当前待你确认的实施边界
   - 是否确认本轮按最小修复处理：只修正订单分析页相关 analytics 查询结果的解包/适配逻辑，不扩大到其它 trading 查询服务重构。
  - 是否确认优先在服务层统一把响应中的 `items` 提取成数组，而不是在 `analytics-tab.tsx` 临时加 `Array.isArray` 防御式补丁。
  - 你确认后，我再进入代码修复阶段。

## 2026-04-21 订单分析抽离为销售管理独立分析模块的结构评估

1. 当前结构现状
   - `orders-analysis` 当前作为 `/trading/orders-analysis` 挂在 `Trading` 模块顶部 tab 中。
   - `Trading` 模块本身使用 `src/features/trading/index.tsx` + `getTradingTabs()` 统一渲染客户、销售订单、退货、换货、物流、应收、订单分析等顶部 tabs。
   - `shipping-management` 已经是独立模块：主侧边栏中有单独入口 `/shipping-management`，模块内部再使用自己的 `ModuleTabbedLayout` 管理子 tabs。
   - 主侧边栏销售管理分组当前已有：`/trading`、`/quotes`、`/shipping-management`。

2. 为什么建议抽离
   - `订单分析` 的职责已经偏向“分析工作台”，不是典型的交易主数据/单据 tab。
   - 其未来方向明确是“升级为更详细分析”，这天然更适合独立模块壳，而不是继续塞在 `Trading` 顶部 tab 尾部。
   - 参考 `shipping-management` 的现有模式，独立模块更利于后续逐步扩展多个分析子 tab，而不挤占 `Trading` 顶部导航。

3. 推荐结构
   - 推荐把当前订单分析升级为一个**销售管理分组下的独立分析模块入口**，与 `发货管理` 同级。
   - 模块命名建议优先考虑：`销售分析` 或 `经营分析`，而不是继续把整个模块命名为单一的 `订单分析`。
   - 模块内部采用独立 `ModuleTabbedLayout`：
     - 第一阶段先提供首个 tab：`订单分析`
     - 第二阶段可自然扩展：`客户分析`、`产品分析`、`趋势分析`、`履约分析` 等

4. 为什么不建议继续留在 `/trading` 顶部 tab
   - `Trading` 顶部 tab 更适合承载交易流程型页面（客户、订单、退货、换货、物流、应收）。
   - 如果未来继续往里加分析页，`Trading` 顶部导航会继续膨胀，语义也会混杂“业务操作”和“经营分析”两类职责。
   - 长期看会让销售管理入口既像业务台账，又像分析中心，边界不清晰。

5. 实施影响范围（如进入代码改造）
   - 侧边栏入口：`src/components/layout/data/sidebar-data.ts`
   - 搜索/命令入口：`src/components/layout/data/search-data.ts`
   - 路由：新增独立分析模块根路由与首个子路由；旧 `/trading/orders-analysis` 需决定是否保留跳转兼容
   - 模块壳：新增独立分析模块 `index.tsx` 与 `tabs.ts`
   - 多语言：侧边栏标题、模块标题、tab 标题
   - 权限路径映射：将新路径继续映射到现有 `menu_trading`，避免本轮扩大为权限树拆分

6. 权限建议
   - 本轮不建议新建一套分析专用权限树。
   - 建议先把新独立分析模块路径继续映射到现有 `menu_trading`，保持侧边栏与访问控制的一致性。
   - 若后续分析模块成为真正独立业务域，再评估是否拆出单独 menu 权限。

7. 当前待你确认的结构边界
   - 是否确认推荐方向为：在“销售管理”分组下新增一个与“发货管理”同级的独立菜单入口，作为分析模块外壳，而不是继续塞在 `/trading` 顶部 tab 里。
  - 是否确认新模块命名优先考虑“销售分析/经营分析”，模块内第一个 tab 再落为“订单分析”，以适配后续详细分析升级。
  - 是否确认本轮若实施，权限先继续复用 `menu_trading`，不新增权限树。

## 2026-04-21 销售分析模块清理旧兼容路径方案

1. 清理目标
   - 当前用户已明确要求：系统尚未上线，不保留旧兼容跳转，不允许 `/trading/orders-analysis` 与 `/sales-analysis/orders-analysis` 双路径并存。
   - 本轮目标是将订单分析入口彻底收敛为唯一新路径：`/sales-analysis/orders-analysis`。

2. 当前遗留点
   - 旧路由文件 `src/routes/_authenticated/trading/orders-analysis.tsx` 目前仅承担跳转到新路径的兼容职责。
   - 旧 lazy 路由 `src/routes/_authenticated/trading/orders-analysis.lazy.tsx` 仍保留在路由树来源中。
   - 自动生成的认证路由清单中当前同时包含 `/trading/orders-analysis` 与 `/sales-analysis/orders-analysis`，形成双路径并存。

3. 建议清理策略
   - 直接删除旧 `trading/orders-analysis` 路由文件，不保留 redirect。
   - 保留新模块 `sales-analysis` 及其首个子 tab `orders-analysis` 作为唯一入口。
   - 删除旧路径后，重新执行：
     - `pnpm run gen:route-tree`
     - `pnpm run gen:auth-routes`
     - `pnpm run gen:permission-contract`
   - 以生成结果校验系统内部已不存在旧路径残留。

4. 为什么这次不保留兼容层
   - 当前系统未上线，没有真实外部链接与历史用户行为包袱。
   - 保留兼容跳转会让分析模块在代码和认知上长期存在两个合法入口，增加后续维护与排障歧义。
   - 既然已经决定抽离，就应尽快完成“单一事实来源”的收口。

5. 风险与边界
   - 删除旧路径后，任何手工输入或本地收藏的 `/trading/orders-analysis` 将直接失效，这是本轮有意接受的破坏性变更。
   - 本轮只清理订单分析旧路径，不顺手扩大为其它历史路由兼容清理。
   - 本轮仍继续复用 `menu_trading` 权限，不触碰权限树结构。

6. 验证策略
   - 重新生成路由树、认证路由清单与权限契约。
   - 搜索确认源码中不再残留 `/trading/orders-analysis` 的可达引用。
   - 执行目标文件 `eslint` 与 `pnpm exec tsc --noEmit --pretty false`。

7. 当前待你确认的实施边界
   - 是否确认本轮直接删除旧 `/trading/orders-analysis` 路由文件及其所有兼容跳转，不保留任何 fallback。
   - 是否确认若存在外部旧链接失效风险，也不在当前未上线阶段保留兼容层，而是统一以新路径为准。
   - 你确认后，我再进入代码清理阶段。

## 2026-04-21 原材料管理独立菜单模块结构评估

1. 当前结构现状
   - 侧边栏“资源管理”分组当前只有：仪表盘、MRP、采购管理。
   - `采购管理` 已经是独立模块：`/purchase` 自己有模块壳和顶部 tabs。
   - `materials` 当前实际上也已经是独立路由模块：
     - 根路径：`/materials`
     - 根布局：`src/routes/_authenticated/materials/route.tsx`
     - 自己有 `ModuleTabbedLayout`
     - 自己有 tabs（`all`、`assembly`、动态分类）
   - 但它目前没有在资源管理侧边栏中显性暴露，且权限映射仍挂在 `engineering` 域。

2. 为什么建议显性升格为资源管理下独立菜单
   - 从信息架构看，原材料主数据更接近采购/资源域，而不是继续隐性躲在工程相关语义下。
   - 既然 `materials` 已经具备独立模块壳与独立 tabs，继续不在侧边栏显性呈现，反而会造成入口隐蔽与认知不一致。
   - 你又明确希望“独立文件夹、独立文件、独立 tabs”，这与当前 `materials` 的形态基本一致，只是还没完成菜单层面的正式升级。

3. 推荐方向
   - 推荐在“资源管理”分组下新增一个与“采购管理”同级的“原材料管理”菜单入口。
   - 推荐优先复用现有 `/materials` 独立模块作为承载壳，而不是再新建一套重复模块。
   - 如果要进一步收口命名，可在后续把 `features/material-archive` 目录演进为更贴近“原材料管理”的模块目录，但第一步不一定要连目录一起大迁移。

4. 关于 tabs 的建议
   - 当前 `materials` 已经是独立 tabs 模式，说明技术结构上无需重造。
   - 建议第一阶段先保留现有 tabs 机制：
     - 全部
     - 组装件
     - 动态分类 tabs
   - 后续若业务上需要更稳定的页签结构，再单独重构 tabs 语义，而不是把“显性菜单化”和“业务页签重构”绑在同一轮做。

5. 风险与边界
   - 如果本轮同时做“侧边栏新增入口 + 模块目录大迁移 + tabs 重构 + 权限域迁移”，改动面会明显扩大。
   - 当前最稳妥的第一步应是：
     - 让 `/materials` 成为资源管理下显性的一级菜单模块；
     - 再评估是否需要把权限从 `engineering` 域迁走。
   - 权限域迁移会影响 `permission-catalog`、路由菜单映射以及潜在已有角色配置，需要单独评估。

6. 实施影响范围（如进入代码改造）
   - 侧边栏：`src/components/layout/data/sidebar-data.ts`
   - 搜索入口：`src/components/layout/data/search-data.ts`
   - 多语言：`sidebar` / `commandMenu` / `materialArchive` 相关文案
   - 模块命名与壳层：`/materials` 入口说明、标题、描述
   - 如若继续推进权限收口：`src/features/authz/data/permission-catalog.ts`

7. 当前待你确认的结构边界
   - 是否确认推荐方向为：在“资源管理”分组下新增一个与“采购管理”同级的“原材料管理”菜单入口，并复用现有 `/materials` 独立模块作为承载壳。
  - 是否确认本轮若实施，应优先做“入口显性化 + 模块命名/文件夹收口”，而不是先大改材料 tabs 的业务结构。
  - 你确认后，我再进入代码实施阶段。

## 2026-04-21 原材料管理页面语义纠偏方案

1. 当前问题
   - 侧边栏入口已经被收口成“原材料管理”，但 `/materials` 页面内部仍残留大量“物料管理 / 物料档案 / 全部物料 / 登记档案”等旧语义。
   - 这会让用户感知上出现“点开原材料管理，却进入另一个叫物料管理的页面”的错位。

2. 已识别的主要残留点
   - 页面头部文案：虽已改为“原材料管理”，但模块其余文案仍大量使用 `materialArchive` 语义。
   - tabs 文案：如 `全部物料`、`拼装规则`。
   - toolbar / dialog / Excel：如 `登记档案`、`编辑物料档案`、`物料档案维护`、`全部物料`。
   - 命令菜单异步结果等仍存在 `物料档案` 语义残留。

3. 最小修复策略
   - 本轮优先修正**用户可见文案**，而不是先重命名内部文件夹、组件名、hook 名称。
   - 目标是先把用户主路径上的认知统一为“原材料管理”。
   - 具体优先级：
     - 第一层：页面标题、tab 标题、命令搜索显示名、按钮/弹窗标题
     - 第二层：导出模板名称、Excel sheet 名称、空状态和辅助说明
     - 第三层：如仍有明显冲突，再调整细粒度文案

4. 为什么不先改内部代码命名
   - 当前用户痛点是“看起来不是一个东西”，根因是显示语义错位，不是文件夹名错位。
   - 如果直接把 `material-archive`、`material-mgmt` 等内部代码名全部迁移，会扩大 diff，且不一定优先解决当前认知问题。
   - 先把用户看到的内容统一，收益更高，风险更低。

5. 风险与边界
   - `原材料管理` 并不意味着所有二级术语都必须替换为“原材料”；例如分类、包装、辅料、拼装规则等领域词仍可能保留。
   - 如果粗暴全量替换“物料”为“原材料”，可能反而把包装/辅料/组装件等真实业务范围说窄。
   - 因此本轮应以“入口级语义一致”为目标，而不是做无差别全文替换。

6. 当前待你确认的实施边界
   - 是否确认本轮先按“用户可见文案优先”处理：把页面内显示的“物料管理/物料档案”收口为与你确认的“原材料管理”语义。
  - 是否确认本轮先不动内部代码文件名与组件名，只修正你实际看得到的标题、tab、按钮、弹窗和导出文案。
  - 你确认后，我再进入代码修正阶段。

## 2026-04-21 纠偏：新增独立“原材料管理”模块，不碰现有物料管理

1. 正确需求澄清
   - 当前正确需求不是“把现有 `/materials` 改名为原材料管理”。
   - 正确方向是：**新建一个独立的“原材料管理”模块**，而现有 `/materials` 继续保持“物料管理”语义与职责不变。

2. 为什么此前方案是错的
   - 之前把 `/materials` 直接迁义为“原材料管理”，会导致原有“物料管理”被覆盖。
   - 这会让系统丢失原来那套物料管理语义，也让用户看到“原材料管理”点开后其实还是旧物料管理壳子。
   - 因此必须把两者拆开：一个是现有物料管理，一个是新增原材料管理。

3. 推荐结构
   - 保留现有模块：
     - 路径：`/materials`
     - 语义：`物料管理`
   - 新增模块：
     - 推荐路径：`/raw-materials`
     - 推荐目录：`src/features/raw-materials`
     - 推荐独立路由根、独立模块壳、独立 tabs
   - 侧边栏中两个入口并存，但名称必须明确区分：
     - `物料管理`
     - `原材料管理`

4. 推荐实施顺序
   - 第一步：把此前误改到“原材料管理”的 `/materials` 可见文案恢复为“物料管理”。
   - 第二步：新增独立 `raw-materials` 模块与路由。
   - 第三步：新增侧边栏与搜索入口，并把新模块挂到资源管理分组下。
   - 第四步：再评估新模块权限映射应挂在哪个菜单域。

5. 风险与边界
   - 本轮若同时恢复旧文案 + 新增新模块，会涉及两类改动：回滚误改与新增模块。
   - 但这是必要的，因为必须先恢复现有“物料管理”的完整语义，才能避免两个模块混成一个。
   - 本轮仍应避免把内部旧目录大规模改名；新增模块应走新目录，不与旧目录纠缠。

6. 当前待你确认的实施边界
   - 是否确认正确方向为：**新建**独立“原材料管理”模块，现有 `/materials` 物料管理完全不动。
   - 是否确认我接下来应先把此前误改到“原材料管理”的 `/materials` 可见文案恢复为“物料管理”，然后再新增独立原材料管理模块。
   - 你确认后，我再进入代码实施阶段。

## 2026-04-21 最终纠偏方案：仓储下恢复物料管理，资源管理下新增原材料管理

1. 最终结构
   - 保留原有模块：
     - 名称：`物料管理`
     - 路径：`/materials`
     - 菜单归属：`仓储` 分组
   - 新增独立模块：
     - 名称：`原材料管理`
     - 推荐路径：`/raw-materials`
     - 推荐目录：`src/features/raw-materials`
     - 菜单归属：`资源管理` 分组，与 `采购管理` 同级

2. 为什么这是最终正确方案
   - 现有 `/materials` 原本就代表一套既有物料管理能力，不能被直接改名替代。
   - 用户要的是“新增原材料管理”，不是“拿原物料管理去顶替原材料管理”。
   - 因此必须同时满足两件事：
     - 恢复 `物料管理` 原位置与原语义
     - 新建 `原材料管理` 独立模块

3. 推荐实施顺序
   - 第一步：将 `/materials` 入口恢复到仓储分组，并恢复其可见文案为 `物料管理`。
   - 第二步：新增 `/raw-materials` 独立模块、独立路由、独立模块壳与独立 tabs。
   - 第三步：在资源管理分组下新增 `原材料管理` 入口，并补充命令搜索与多语言文案。
   - 第四步：执行类型检查、lint 和文档更新。

4. 风险与边界
   - 本轮会同时包含“回滚前一轮误改”与“新增新模块”两类变更。
   - 这是必要的，因为只有先恢复 `物料管理`，才能保证两个模块边界清晰。
   - 本轮优先保证结构和用户认知正确，不在同一轮扩大为权限树重构。

5. 当前待你确认的实施边界
   - 是否确认最终结构为：`物料管理` 回到仓储分组；`原材料管理` 作为资源管理下的新增独立模块。
   - 是否确认新模块继续采用我建议的独立路径 `/raw-materials` 与独立目录 `src/features/raw-materials`。
   - 你确认后，我再进入代码实施阶段。

## 2026-04-21 阶段一恢复方案：先恢复现有 `/materials` 原状态

1. 阶段目标
   - 当前第一优先级不是新增 `raw-materials`，而是先把被误改的 `/materials` 恢复回原始位置与原始语义。
   - 即：`/materials` 先回到 `仓储` 分组，并恢复其原来的“物料管理 / 物料档案 / 物料资源中心”语义。

2. 本阶段只做这些
   - 恢复侧边栏：`/materials` 从资源管理迁回仓储。
   - 恢复命令搜索：`/materials` 不再归属资源管理。
   - 恢复本地化文案：撤回前一轮对 `sidebar`、`commandMenu`、`materialArchive` 的“原材料管理”改写。

3. 本阶段明确不做
   - 不创建 `/raw-materials` 路由。
   - 不创建 `src/features/raw-materials` 目录。
   - 不提前引入第二个菜单入口，避免在现有误改尚未恢复前继续扩大混乱。

4. 第二阶段（恢复完成后）
   - 再新增独立 `原材料管理` 模块：
     - 路径：`/raw-materials`
     - 目录：`src/features/raw-materials`
     - 菜单：资源管理分组下新增一级入口

5. 当前实施边界
   - 当前这一步只做“恢复 `/materials` 原状态”。
   - 恢复完成并通过验证后，再进入阶段二新增独立原材料管理模块。

## 2026-04-21 `产品外观` 独立主数据 TAB 方案

1. 背景与目标
   - 当前系统中的“外观码映射”被放在 `basic-settings` 的一维码页面中维护，但业务上外观并不属于条码协议私有配置，也不应绑定在产品型号建档时强制维护。
   - 用户已明确：产品型号建立本身不需要外观，只有销售订单根据客户需求时才需要外观，因此外观应升级为工程侧共享主数据。
   - 本轮目标是在 `产品工程管理` 下新增独立 TAB：`产品外观`，并让一维码界面与销售订单弹窗统一读取该主数据。

2. 目标架构
   - `产品型号`：继续只维护型号本体、型号编码、工程规格等，不强制关联外观。
   - `产品外观`：作为工程管理下独立主数据，维护外观名称、条码位值、描述、启用状态、排序等。
   - `销售订单`：在订单侧按客户需求选择外观，而不是从产品型号继承外观。
   - `一维码`：保留当前 15 位协议结构，但第 08 位“外观”字段的取值来源改为读取 `产品外观` 主数据，不再在 basic-settings 中单独维护外观字典。

3. 涉及改造的主要文件（预估）
   - 工程管理 tabs 与页面：
     - `src/features/engineering/tab-config.ts`
     - `src/features/engineering/index.tsx`
     - 新增 `src/features/engineering/tabs/product-appearance-tab.tsx`
     - 视情况新增 `src/features/engineering/data/product-appearance-schema.ts`
     - 视情况新增 `src/features/engineering/services/product-appearance-service.ts`
     - 视情况新增 `src/features/engineering/hooks/use-product-appearances.ts`
   - 一维码模块迁移读取来源：
     - `src/features/basic-settings/tabs/linear-barcode-mgmt.tsx`
     - `src/features/basic-settings/utils/linear-barcode-parser.ts`
     - `src/features/basic-settings/components/appearance-action-dialog.tsx`
     - `src/features/basic-settings/hooks/use-appearance-mapping.ts`
     - `src/features/basic-settings/data/appearance-mapping.ts`
   - 产品条码配置页：
     - `src/features/engineering/components/product-barcode-tab.tsx`
   - 销售订单：
     - `src/features/trading/data/schema.ts`
     - `src/features/trading/sales/contracts/sales-order-api-dto.ts`
     - `src/features/trading/components/parts/order-lines-editor.tsx`
     - 以及与订单 DTO/adapter/本地化相关文件

4. 推荐实施步骤
   - 第一步：在工程管理模块新增 `产品外观` TAB，并实现基础列表/新增/编辑能力。
   - 第二步：定义统一的外观主数据结构，至少包含：
     - `id`
     - `name`
     - `barcodeCode`
     - `description`
     - `active`
     - `sortOrder`
   - 第三步：在完成 `产品外观` TAB 本体后，再推进一维码页面改为只读消费 `产品外观` 数据。
   - 第四步：再推进销售订单接入外观选择字段，并保存必要快照字段。
   - 第五步：在完成最小闭环后，再继续讨论订单拆分项或打印批次如何精确绑定外观与孔数。

5. 当前实现边界（本轮先做到这里）
   - 先把 `产品外观` TAB 做出来，并让它成为新的唯一维护入口。
   - 本轮不同步接入一维码页面读取。
   - 本轮不同步接入销售订单弹窗读取。
   - 本轮不扩展为完整打印任务重构，不一次性解决所有订单拆分与批次绑定问题。

6. 风险与注意事项
   - 现有外观映射数据目前存储在 `StorageService` 本地存储中，迁移到工程主数据时需要考虑默认值兼容与历史数据平滑迁移。
   - 若订单历史记录未来需要稳定追溯，应在订单侧保留外观名称与条码位值的快照，而不是只存外键。
   - `产品外观` 不应反向污染产品型号建档逻辑，避免让型号创建流程重新变得耦合。
   - 一维码协议页的职责应收敛为“协议展示 + 取值来源说明 + 模拟消费”，不再承担外观主数据维护责任。

7. 当前待你确认的实施边界
   - 已确认新增 TAB 命名为：`产品外观`。
   - 已确认本轮先只做：`产品外观` TAB 本体。

## 2026-04-21 `产品外观` 页面高度压缩优化方案

1. 优化目标
   - 当前 `产品外观` 页面在仅有 6 张卡片时仍需要纵向滚动，说明顶部区、统计区和卡片内部垂直留白偏大。
   - 本轮目标是在不改业务逻辑的前提下压缩页面高度，提高单屏可见内容数量。
   - 已确认采用 `方案 B`：将当前卡片进一步收敛为更接近表格式的高密度卡片布局，而不是仅做轻量留白压缩。

2. 本轮只做这些
   - 压缩顶部标题区与按钮区高度。
   - 压缩统计卡区的内边距、字号和视觉占高。
   - 将外观卡片重排为更紧凑的“信息行 + 操作行”结构，减少大段垂直堆叠。
   - 压缩外观卡片的 header/content 留白、说明文本高度和操作区高度。
   - 视情况提高大屏下单行卡片数量或降低卡片最小占高。

3. 本轮明确不做
   - 不增加或删除任何业务字段。
   - 不改变新增 / 编辑 / 删除 / 启停交互逻辑。
   - 不同步接入销售订单或一维码。

4. 主要修改文件
   - `src/features/engineering/tabs/product-appearance-mgmt.tsx`

5. 当前待你确认的实施边界
   - 当前这一步只做 `产品外观` 页面布局压缩与信息密度优化。
   - 已收到你选择：`方案 B`。

## 2026-04-21 `产品外观` 编辑弹窗对齐系统 UDS1.0 视觉方案

1. 参考基准
   - 当前系统内较成熟的 UDS1.0 风格弹窗主要体现在 `ActionDialogShell` 及其衍生弹窗上。
   - 关键视觉特征包括：
     - `rounded-[32px]` 大圆角外层容器
     - `p-0` 的整体容器结构
     - header / footer 使用虚线分割
     - 标题使用粗黑、斜体、uppercase、紧字距
     - 描述使用小号、大写、高字距、副层级透明度
     - 底部使用圆角按钮与明显主次按钮关系

2. 本轮只做这些
   - 将 `产品外观` 的新增 / 编辑弹窗外层容器改为 UDS1.0 风格容器。
   - 调整 header、body、footer 的分区与留白，使之接近系统既有 Action Dialog 视觉。
   - 调整表单控件样式，使输入项与启用状态区更接近系统统一表单视觉。
   - 调整底部按钮尺寸、圆角与排布方式。

3. 本轮明确不做
   - 不调整弹窗字段结构。
   - 不修改保存校验、保存逻辑或数据模型。
   - 不将当前页面完全重构为公共 `ActionDialogShell` 组件，若仅通过局部 class 对齐即可达到一致性，则优先最小改动。

4. 主要修改文件
   - `src/features/engineering/tabs/product-appearance-mgmt.tsx`

5. 风险与注意事项
   - 需避免只对齐外层容器而忽略表单控件细节，导致整体仍与 UDS1.0 成熟弹窗风格割裂。
   - 需控制改动范围，避免顺手重构成新的公共抽象，影响当前交付节奏。

6. 当前待你确认的实施边界
   - 当前这一步只做 `产品外观` 编辑弹窗的视觉样式对齐。
   - 对齐基准采用系统现有 `ActionDialogShell` 视觉语言。

## 2026-04-22 `产品外观` 图片能力与销售订单无缝看图选择的分阶段方案

1. 当前代码现状
   - `产品外观` 当前存储在 `StorageService`，底层为浏览器 IndexedDB，仅能保证当前浏览器本地可见，不具备上线后的多人共享能力。
   - `product-appearance-service.ts` 当前只维护名称、条码位值、说明、启用状态、排序等基础字段，尚无图片字段与图片资源引用。
   - 销售订单入口当前位于：
     - `src/features/trading/components/sales-order-action-dialog.tsx`
     - `src/features/trading/components/parts/order-lines-editor.tsx`
   - 销售订单明细结构 `SalesOrderLine` 当前尚无任何外观关联字段与快照字段。

2. 目标拆解
   - 目标一：让 `产品外观` 主数据支持图片能力，并仍保持为唯一维护入口。
   - 目标二：让销售订单在选择外观时即可同步查看缩略图/说明，形成“选择即预览”的无缝体验。
   - 目标三：为正式上线时迁移到服务端共享存储预留正确数据结构，避免当前原型结构将来推倒重来。

3. 推荐分阶段路径
   - 第一阶段：前端主数据模型扩展
     - 为 `ProductAppearance` 增加图片相关字段（建议先按单主图设计）。
     - 图片字段当前先按前端原型可用结构设计，避免直接把大图二进制塞进主记录。
   - 第二阶段：销售订单选择体验原型
     - 在 `SalesOrderLine` 增加外观关联字段与必要快照字段。
     - 在订单明细编辑区域新增外观选择器，支持列表展示缩略图、名称、条码位值，并在选择时预览说明与图片。
   - 第三阶段：历史订单解释稳定化
     - 保存订单时同步保存外观名称、条码位值、图片引用等快照字段。
     - 确保主数据未来修改时，不影响历史订单回看。
   - 第四阶段：正式上线前的存储迁移
     - 将 `产品外观` 从 IndexedDB 迁移到服务端数据库。
     - 将图片迁移到文件服务/对象存储。
     - 前端改为通过 API 读写，而不是直接依赖 `StorageService`。

4. 本轮建议边界（先做这里）
   - 先推进第一阶段和第二阶段的前端原型准备与最小实现方案。
   - 本轮不直接落服务端数据库、文件上传接口和正式共享存储。
   - 本轮重点先把前端数据结构、选择交互和订单快照结构定型。

5. 关键设计原则
   - `产品外观` 仍然是唯一维护入口，销售订单只能消费，不反向维护主数据。
   - 订单侧不能只保存 `appearanceId`，必须保留必要快照字段。
   - 图片应按“缩略图消费 + 原图预览”的思路设计，不应让订单列表直接承载大图负载。
   - 当前本地存储仅视为原型手段，字段设计要面向未来服务端共享存储兼容。

6. 主要涉及文件（第一、二阶段）
   - `src/features/engineering/data/product-appearance.ts`
   - `src/features/engineering/services/product-appearance-service.ts`
   - `src/features/engineering/tabs/product-appearance-mgmt.tsx`
   - `src/features/trading/data/schema.ts`
   - `src/features/trading/components/sales-order-action-dialog.tsx`
   - `src/features/trading/components/parts/order-lines-editor.tsx`
   - `src/features/trading/hooks/use-sales-order-lines-editor-view-model.ts`

7. 当前待你确认的实施边界
   - 是否按上述分阶段路径开始推进。
   - 若确认，本轮先进入第一阶段：补 `产品外观` 图片字段与前端原型能力设计，并同步准备订单侧外观选择原型接入点。

## 2026-04-22 `产品外观` 服务端共享存储方案 B（细化版）

1. 基于现有项目结构的可落点
   - 后端当前使用 `Gin + Gorm`。
   - 资源上传已有统一入口：`POST /assets/upload`，返回 `url / fileName / size`。
   - 工程主数据已有 `product` 相关的 `routes / handlers / services / models` 结构可作为实现参考。

2. 推荐的后端主数据模型
   - 建议新增 `product_appearances` 对应模型，字段至少包括：
     - `id`
     - `name`
     - `barcode_code`
     - `description`
     - `image_url`
     - `image_thumbnail_url`
     - `image_name`
     - `active`
     - `sort_order`
     - `version`
     - `created_at`
     - `updated_at`
   - 说明：
     - 当前阶段图片仍只保存 URL / 名称 / 缩略图引用。
     - 若后续需要更严格资源治理，可再引入独立资产绑定表，但当前不建议过度设计。

3. 推荐的接口草案
   - `GET /engineering/product-appearances`
     - 查询全部外观主数据，供工程页和销售订单页共用。
   - `POST /engineering/product-appearances`
     - 新增外观。
   - `PATCH /engineering/product-appearances/:id`
     - 更新外观。
   - `DELETE /engineering/product-appearances/:id`
     - 删除外观。
   - 图片上传继续复用：
     - `POST /assets/upload`
     - 前端先上传文件，再把返回的 URL 写入 `产品外观`。

4. 前端迁移路径
   - 当前 `productAppearanceService` 基于 `StorageService`。
   - 迁移后拆为：
     - API adapter / fetch 层：负责 HTTP 请求。
     - `productAppearanceService`：保留前端调用面，但内部改为调用 API。
   - `React Query` 的 query key 可继续保留：
     - `PRODUCT_APPEARANCES_QUERY_KEY`
   - 这样工程页和销售订单页的数据消费层无需大改，只需切换数据源。

5. 销售订单侧兼容原则
   - 订单侧继续保留以下快照字段：
     - `appearanceId`
     - `appearanceNameSnapshot`
     - `appearanceBarcodeCodeSnapshot`
     - `appearanceDescriptionSnapshot`
     - `appearanceImageUrlSnapshot`
   - 原因：即使外观主数据后续改名、换图、停用，历史订单仍需要稳定回看。

6. 风险与注意事项
   - 不建议把图片 base64 直接写入数据库业务表；正式方案应始终以上传后的 URL 为准。
   - 需要考虑 `barcode_code` 的唯一约束，避免服务端与前端规则漂移。
   - 若后端先落地，而前端仍保留本地存储兜底，必须明确迁移优先级，避免双写冲突。
   - 当前阶段删除外观前需评估是否已被订单使用；正式实现时建议至少增加服务端保护或软删除策略讨论。

7. 本轮建议边界
   - 当前先完成设计确认，不直接改后端代码。
   - 待你确认后，再按以下顺序实现：
     - 后端 model / route / handler / service
     - 前端 API 适配层
     - `productAppearanceService` 从本地切换为 API
     - `产品外观` 页面与销售订单页面联调

8. 当前待你确认的实施边界
   - 是否按该服务端共享存储方案开始进入实现。
   - 若确认，下一步将先从后端模型、路由与 handler 开始。

## 2026-04-22 `销售订单` 建立弹窗宽度扩大到页面宽度 95%

1. 当前代码现状
   - `销售订单` 建立 / 编辑弹窗位于：
     - `src/features/trading/components/sales-order-action-dialog.tsx`
   - 当前 `DialogContent` 虽已做大弹窗样式处理，但仍存在 `lg:max-w-[1200px]` 之类的上限约束。
   - 订单明细区为高密度表格布局，字段列较多，在桌面视口下容易把横向滚动压力留给弹窗内部。

2. 目标
   - 将弹窗宽度扩大到接近页面宽度的 `95%`。
   - 优先通过放宽外层容器宽度，减少弹窗内部横向滚动条。
   - 保持现有业务逻辑、保存流程、权限与字段结构不变。

3. 推荐实现方式
   - 直接调整 `sales-order-action-dialog.tsx` 中 `DialogContent` 的最大宽度 class。
   - 让桌面宽度上限从固定像素值切换为更接近视口百分比的约束，如 `max-w-[95vw]`。
   - 保留 `max-h-[92vh]` 和纵向滚动能力，避免弹窗过宽后影响垂直内容可访问性。

4. 风险与注意事项
   - 若仅放大弹窗宽度仍无法完全消除横向滚动，则说明问题部分来自明细表格自身最小宽度约束，后续需要二次评估列宽。
   - 本轮先不重构 `DocumentLinesEditor` 列结构，避免改动范围扩大。

5. 本轮建议边界
   - 只做弹窗外层宽度与相关上限约束调整。
   - 不改明细字段、不改表格结构、不改业务逻辑。

6. 当前待你确认的实施边界
   - 若你确认，本轮下一步只修改 `src/features/trading/components/sales-order-action-dialog.tsx`，将弹窗宽度扩大到页面宽度约 95%，然后执行前端校验。

## 2026-04-22 `/basic-settings/linear-barcode` 外观映射弹窗只读化与编辑入口收口

1. 当前代码现状
   - 线性条码页面位于：
     - `src/features/basic-settings/tabs/linear-barcode-mgmt.tsx`
   - 当前页面在点击外观段位时，会打开：
     - `src/features/basic-settings/components/appearance-action-dialog.tsx`
   - 该弹窗当前通过 `useAppearanceMapping()` 读取 `StorageService` 中的 `xdfc_appearance_mapping`，并支持：
     - 直接修改 label / desc
     - 保存到本地存储
     - 重置默认值
   - 这套逻辑与现已建立的 `产品外观` 独立主数据中心并行存在，存在主数据漂移风险。

2. 目标
   - 线性条码页中的外观映射弹窗改为只读。
   - 所有外观编辑入口统一收口到产品工程管理下的 `产品外观` TAB。
   - 条码页只消费主数据结果，不再承担外观主数据维护职责。

3. 推荐实现方式
   - `AppearanceActionDialog` 改为只读展示组件：
     - 保留查看“编码 / 名称 / 说明”的能力
     - 移除输入框编辑、保存、重置逻辑
   - 将数据源从 `useAppearanceMapping()` 切换为读取 `productAppearanceService` / `PRODUCT_APPEARANCES_QUERY_KEY` 对应的外观主数据。
   - 在弹窗中增加显式引导文案，必要时提供跳转按钮，指向产品工程管理下的 `产品外观` TAB。
   - 线性条码解析与模拟显示所需的 appearance mapping 可由 `产品外观` 主数据即时派生，而不是继续依赖 `xdfc_appearance_mapping`。
   - 外观映射弹窗的列表渲染不再按 `1-9` 固定占位展开，而是只渲染 `产品外观` 主数据中真实存在的条目。
   - 对于尚未维护的位值（如 7 / 8 / 9），不展示空白卡片或 Reserved 占位卡片。
   - 若当前未维护任何产品外观，则弹窗显示空态提示与“前往产品外观”入口，而不是展示空白容器。

4. 风险与注意事项
   - 若仍保留 `xdfc_appearance_mapping` 作为显示来源，即使弹窗改成只读，也仍有历史漂移风险，因此数据源也应同步切到 `产品外观` 主数据。
   - 条码解析层仍可接受 `1-9` 任意位值输入，但查看弹窗的展示层不应伪造未维护的主数据条目。

5. 本轮建议边界
   - 只处理线性条码页中的外观映射展示与入口收口。
   - 不改线性条码其它段位规则，不改协议主逻辑。

6. 当前待你确认的实施边界
   - 若你确认，本轮下一步将修改：
     - `src/features/basic-settings/tabs/linear-barcode-mgmt.tsx`
     - `src/features/basic-settings/components/appearance-action-dialog.tsx`
     - `src/features/basic-settings/hooks/use-appearance-mapping.ts`
   - 目标是让条码页外观映射完全改为只读消费视图，并收口编辑入口到 `产品外观` TAB。

## 2026-04-22 `AppearanceActionDialog` 对齐 UDS 1.0 视觉规范

1. 当前代码现状
   - 弹窗文件位于：
     - `src/features/basic-settings/components/appearance-action-dialog.tsx`
   - 当前实现使用基础 `DialogContent`，头部、主体、底部结构较轻。
   - 尽管逻辑上已完成“只读化 + 统一跳转到产品外观 TAB”，但视觉层仍未对齐项目里较新的 UDS 1.0 弹窗语言。

2. 目标
   - 将 `查看外观编码映射` 弹窗的视觉表现统一到 UDS 1.0。
   - 保持现有只读逻辑、真实条目渲染规则、空态提示与跳转逻辑不变。

3. 推荐实现方式
   - 参考 `src/components/action-dialog-shell.tsx` 与 `src/components/action-dialog-shell.styles.ts` 的结构节奏。
   - 参考 `src/features/engineering/tabs/product-appearance-mgmt.tsx` 中弹窗的视觉语言：
     - 分层标题区
     - 圆角大容器
     - 边框 / 虚线 / 柔和背景层
     - 高对比度小标题与辅助编码标签
     - 底部独立操作区
   - 对 `AppearanceActionDialog` 的改造重点：
     - 头部：升级为 UDS 1.0 标题区，增加图标容器、辅助识别标签、描述层次。
     - 主体：将映射卡片改为更强的 UDS 1.0 卡片样式，统一位值徽标、字段块、滚动容器样式。
     - 空态：改为与 UDS 1.0 一致的空态容器，不再只是基础文本块。
     - 底部：增加边界分隔、按钮层次与间距对齐。

4. 风险与注意事项
   - 本轮只做视觉重构，不应引入外观映射逻辑回退。
   - 不应重新显示 `7 / 8 / 9` 这类未维护的占位卡片。
   - 需要兼顾中英文文案长度，避免标题与描述换行错位。

5. 本轮建议边界
   - 只修改 `src/features/basic-settings/components/appearance-action-dialog.tsx`。
   - 如确有必要，可补充极少量文案 class 调整，但不改业务逻辑文件。

6. 当前待你确认的实施边界
   - 若你确认，本轮下一步将只对 `AppearanceActionDialog` 做 UDS 1.0 风格重构，然后执行前端校验并更新 `walkthrough.md`。

## 2026-04-22 `@[current_problems]` 样式 warning 清理

1. 当前代码现状
   - 当前 IDE 列出的 warning 主要集中在两个文件：
     - `src/features/basic-settings/components/dm-simulation-section.tsx`
     - `src/features/engineering/tabs/product-appearance-mgmt.tsx`
   - 问题类型均为样式层面的 Tailwind class 规范化提醒或重复样式冲突提醒。
   - 目前未看到业务逻辑错误或类型错误。

2. 目标
   - 清理当前 IDE 已列出的样式 warning。
   - 保持视觉效果等价或近似等价，不引入交互与业务逻辑变化。

3. 推荐实现方式
   - 对 `dm-simulation-section.tsx`：
     - 将可直接替换的 class 写法切换为推荐简写。
     - 删除同一元素中重复生效的 `opacity-20` / `opacity-10` 冲突写法，只保留一套有效透明度。
     - 修正 `bg-[radial-gradient(circle_at_70%_30%,_var(--tw-gradient-stops))]` 为推荐格式。
   - 对 `product-appearance-mgmt.tsx`：
     - 将 `aspect-[16/8]` 调整为推荐写法 `aspect-16/8`。

4. 风险与注意事项
   - 本轮只做 class 级别替换，应避免顺手改动组件结构。
   - 需要注意透明度与圆角替换后视觉不能出现明显偏差。

5. 本轮建议边界
   - 只修改当前 warning 涉及的两个文件。
   - 不处理未在 `@[current_problems]` 中列出的其它历史提示。

6. 当前待你确认的实施边界
   - 若你确认，本轮下一步将只清理 `@[current_problems]` 中列出的样式 warning，然后执行前端校验并更新 `walkthrough.md`。

## 2026-04-22 `编码中心 > 共享编码源 > 孔型孔数`

1. 当前代码现状
   - `编码中心` 菜单已建立，当前包含：
     - `/code-center/linear-barcode`
     - `/code-center/dm-code`
   - 当前尚无 `共享编码源` 入口。
   - `孔型孔数` 相关能力当前分散在：
     - 一维码协议 mock 输入
     - 一维码解析器中的 `holePrefix / holes`
     - 产品条码配置中的 `category / holes`
   - 用户已经明确：当前阶段不要迁移已有 `外观` 等现有能力，只优先处理 `共享编码源` 与 `孔型孔数`。

2. 目标
   - 在 `编码中心` 下新增 `共享编码源`。
   - 在 `共享编码源` 下先新增 `孔型孔数` TAB。
   - 让 `孔型孔数` 成为当前阶段优先收口的编码来源页面。
   - 其他现有能力暂不迁移、不改入口。

3. 推荐实现方式
   - 侧边栏：
     - 在 `src/components/layout/data/sidebar-data.ts` 中新增 `共享编码源` 菜单项。
   - 路由：
     - 新增 `/code-center/shared-code-source` 路由壳层。
     - 在该模块下提供 `孔型孔数` TAB 路由。
   - 视图结构：
     - 参考现有 `code-center` 的 `ModuleTabbedLayout` 结构实现 `共享编码源` 页面。
   - 页面范围：
     - 先建设 `孔型孔数` 页面骨架、字段结构、表格/卡片展示与后续接入位。
     - 只对 `孔型孔数` 做接入，不迁移 `外观`。

4. 风险与注意事项
   - 本轮不要把 `共享编码源` 误做成“全量迁移容器”。
   - 不要把 `外观`、`一维码`、`DM码` 的已有入口重定向或删除。
   - 需要确保菜单、路由和权限路径新增后不影响现有导航。

5. 本轮建议边界
   - 只处理：
     - `编码中心 > 共享编码源`
     - `共享编码源 > 孔型孔数`
   - 不处理：
     - `外观` 迁移
     - 其它编码属性迁移
     - 现有页面职责重构

6. 当前待你确认的实施边界
   - 若你确认，本轮下一步将开始修改侧边栏、`code-center` 路由与 `共享编码源 > 孔型孔数` 页面代码，然后再执行校验并更新 `walkthrough.md`。

## 2026-04-22 `孔型孔数` 协议拆分为 `孔型前缀 1 位 + 孔数 2 位`

1. 当前代码现状
   - 当前一维码协议虽然最终输出为连续 3 位，但业务上已经使用：
     - `holePrefix`
     - `holes`
   - 现阶段问题不在“能不能拆”，而在于协议与页面认知仍把它笼统视为一个 `孔型孔数` 段。
   - 用户已明确下一步采用“一个一个来”的方式，先只处理协议层拆分。

2. 目标
   - 在协议定义中明确：
     - `孔型前缀` 占 1 位
     - `孔数` 占 2 位
   - 保持最终编码输出仍为连续 3 位。
   - 让规则页面、解析器说明和组码字段表达与该拆分保持一致。

3. 推荐实现方式
   - 规则配置层：
     - 将当前 `holes` 段位的描述从笼统的“孔型孔数 3 位”改为拆分表达。
   - 页面表达层：
     - 协议页面中的规则描述、字段说明与展示文案改为 `前缀 + 孔数` 的结构化表达。
   - 组码 / 解析层：
     - 继续使用 `holePrefix` 与 `holes` 两个字段参与组码与解析。
     - 不改变最终输出结构，只澄清和固化字段边界。

4. 风险与注意事项
   - 本轮不要把“协议拆分”误做成“型号约束关系”或“共享编码源双表重构”。
   - 本轮要避免额外改动外观、DM、产品条码配置等非目标模块。
   - 需要保持最终条码长度与协议产出不变，防止影响现有扫描解析链路。

5. 本轮建议边界
   - 只处理：
     - `孔型前缀 1 位`
     - `孔数 2 位`
     - 协议层与字段表达拆分
   - 不处理：
     - 型号适配关系
     - 共享编码源页面进一步拆成多个子 TAB
     - 其它编码属性重构

6. 当前待你确认的实施边界
   - 若你确认，本轮下一步将只修改协议层相关定义、文案和字段表达，然后再执行校验并更新 `walkthrough.md`。

## 2026-04-22 继续拆分 `共享编码源 > 孔型孔数` 页面：改为“孔型前缀 + 孔数”独立维护

1. 目标
   - 将当前共享编码源中的“孔型孔数组合项”维护模式，调整为与一维码协议一致的“孔型前缀独立维护 + 孔数独立维护”。
   - 降低组合型主数据造成的列表膨胀、分页过多和重复维护成本。
   - 保证一维码仿真、解析和下拉来源仍然可继续消费共享编码源，但消费方式改为分别读取前缀源和孔数源。

2. 范围与边界
   - 只处理：
     - `共享编码源 > 孔型孔数` 页面
     - 孔型前缀/孔数共享数据结构拆分
     - 共享服务、hooks、页面 UI、与一维码页面的数据接入调整
     - 旧组合型本地存储数据的兼容归一化
   - 不处理：
     - 型号与孔型/孔数的约束矩阵
     - 外观、DM、产品条码等其它编码模块
     - 更复杂的组合规则引擎

3. 推荐实现方式
   - 数据模型层：
     - 将当前单一 `hole-code-source` 组合数据结构拆为两类主数据：
       - `hole-prefix-source`
       - `hole-count-source`
     - 各自具备独立的 `id / code / label / status / sortOrder / description` 等字段。
     - 为旧组合型存储增加归一化迁移：
       - 从旧组合项中提取唯一前缀列表
       - 从旧组合项中提取唯一孔数列表
       - 迁移后按新结构回写或至少在读取层统一归一化
   - 服务与 hooks 层：
     - 拆分当前共享编码源 service / hook 的职责，使前缀与孔数各自可独立查询、保存、删除。
     - 保留对一维码消费端友好的派生结果，例如：
       - 前缀 options
       - 孔数 options
       - 如仍有解析展示需要，可在 hook 中临时派生组合标签，而不是再把组合项作为主存储。
   - UI 层：
     - 将当前单页组合项列表改为两个独立维护区块，或两个子卡片/子列表：
       - 孔型前缀管理
       - 孔数管理
     - 每个区块独立支持新增、编辑、启停、删除。
     - 避免本轮再新增新的路由层级；优先在现有 `共享编码源 > 孔型孔数` 页面内完成双区块布局。
   - 一维码接入层：
     - 仿真页面的前缀下拉改为读取 `孔型前缀源`
     - 孔数下拉改为读取 `孔数源`
     - 解析显示若需要组合文案，可在消费侧基于前缀和孔数即时拼接，不回退到组合型主数据模型。

4. 预计涉及文件
   - `src/features/code-center/data/hole-code-source.ts`
   - `src/features/code-center/services/hole-code-source-service.ts`
   - `src/features/code-center/hooks/use-hole-code-source.ts`
   - `src/features/code-center/shared-hole-code-source-mgmt.tsx`
   - `src/locales/messages/zh-CN/codeCenter.ts`
   - `src/locales/messages/en-US/codeCenter.ts`
   - `src/features/basic-settings/components/linear-barcode-simulation-section.tsx`
   - `src/features/basic-settings/tabs/linear-barcode-mgmt.tsx`
   - `src/features/basic-settings/utils/linear-barcode-parser.ts`

5. 风险与注意事项
   - 旧组合型本地存储如果直接废弃，可能导致已有数据丢失；必须先做兼容归一化。
   - 一维码现有消费端如果仍依赖组合标签映射，拆分后要明确哪些地方改为独立 options，哪些地方允许临时派生展示字符串。
   - 页面布局拆分后，需避免一次性改动过大导致共享编码源页面交互回归。
   - 本轮不要顺手扩展成新的多 tab 路由重构，优先控制改动面。

6. 当前待你确认的实施边界
   - 若你确认，本轮下一步将开始修改共享编码源的数据模型、服务、hooks、页面 UI 和一维码消费接入，并在完成后执行校验与更新 `walkthrough.md`。

---

## 补充实施方案：移除共享编码源旧版兼容逻辑

1. 目标
   - 将当前 `共享编码源 > 孔型前缀 / 孔数` 的双集合结构设为唯一合法存储结构。
   - 删除所有“旧组合项结构 -> 新结构”的兼容判断、迁移与回写逻辑。
   - 降低数据层复杂度，避免未发布阶段为不存在的历史数据引入长期维护成本。

2. 范围
   - 处理：
     - `hole-code-source` 数据定义中的旧组合型遗留类型
     - `hole-code-source-service` 中的旧结构识别、迁移、回写逻辑
     - 与实现说明相关的文档/文案收口
   - 不处理：
     - 一维码协议层当前已完成的 `孔型前缀 + 孔数` 拆分结构
     - 其它模块的本地存储兼容策略
     - 新增额外的数据修复脚本

3. 推荐实现方式
   - 数据模型层：
     - 删除 `LegacyHoleCodeSourceItem` 之类仅用于兼容旧结构的类型。
     - 保留 `HoleCodeSourceBundle` 作为唯一对外主结构。
   - 服务层：
     - 删除 `isLegacy...`、`normalizeLegacy...` 等兼容函数。
     - 读取存储时仅接受当前 bundle 结构；若不存在则初始化默认值。
     - 不再尝试从旧数组结构推导前缀/孔数，也不再回写迁移结果。
   - 说明层：
     - 清理本轮实现与 walkthrough 中“兼容旧版 / 自动迁移”的表述，避免后续误读。

4. 预计涉及文件
   - `src/features/code-center/data/hole-code-source.ts`
   - `src/features/code-center/services/hole-code-source-service.ts`
   - `walkthrough.md`

5. 风险与注意事项
   - 清理后，如果本地浏览器里残留旧测试数据，将不会再被自动识别；需要接受这类未发布阶段测试数据失效。
   - 由于你已明确系统未发布，本轮按“直接清理，不保留兼容”执行是合理的。

6. 当前待你确认的实施边界
   - 若你确认，本轮下一步将删除共享编码源旧版兼容代码，随后执行 `tsc` / `eslint` 校验，并更新 `walkthrough.md`。

---

## 补充实施方案：优化 `共享编码源 > 孔型前缀 / 孔数` 页面高度

1. 目标
   - 让当前双卡片布局尽量占满页面主内容区高度，减少整页纵向滚动。
   - 将未来的内容增长优先约束在卡片内部滚动区，而不是继续拉长整个页面。
   - 保持卡片头部信息、统计和操作按钮更稳定地停留在视野中。

2. 范围
   - 处理：
     - `shared-hole-code-source-mgmt.tsx` 的页面根容器高度分配
     - 双卡片区域的栅格/伸展布局
     - 卡片内部内容区的滚动策略
   - 不处理：
     - 数据结构、服务层或 hooks 改动
     - 其它共享编码源页面
     - 新增更复杂的可拖拽分栏或多面板系统

3. 推荐实现方式
   - 页面根层：
     - 让页面主体使用 `min-h` / `flex` 组合，尽量吃满当前主内容区高度。
   - 卡片层：
     - 双卡片容器使用可拉伸布局，使左右卡片在桌面端等高。
     - 每张卡片拆为：头部固定区 + 列表滚动区。
   - 滚动层：
     - 列表内容超出时在卡片内部滚动。
     - 避免让整页因卡片内容增长而无限变长。
   - 兼容层：
     - 移动端保持自然堆叠，不强行压缩到过小高度；重点优化桌面与大屏体验。

4. 预计涉及文件
   - `src/features/code-center/shared-hole-code-source-mgmt.tsx`
   - 如需少量样式辅助，仅限同文件 className 收口，不新增全局样式文件。

5. 风险与注意事项
   - 若高度约束过紧，可能导致卡片内部表单或空状态被压缩，需要在桌面端与小屏端分别平衡。
   - 若直接写死 viewport 高度，可能受上层布局 header / padding 影响，因此要优先采用相对容器伸展方案。

6. 当前待你确认的实施边界
   - 若你确认，本轮下一步将只修改 `shared-hole-code-source-mgmt.tsx` 的布局与滚动策略，随后执行校验并更新 `walkthrough.md`。

---

## 补充实施方案：将 `共享编码源 > 孔型前缀 / 孔数` 改为紧凑高密度布局

1. 目标
   - 解决当前“单个简单项占据过高卡片高度”的问题。
   - 明显提升同屏可见条目数，让 `14 / 16 / 18 / ...` 这类简单数据以更合理密度展示。
   - 保留编辑、删除、状态识别能力，但压缩非必要留白和重复信息块。

2. 范围
   - 处理：
     - `shared-hole-code-source-mgmt.tsx` 中前缀项、孔数项的单项渲染结构
     - 卡片内部列表区的排版密度与操作区布局
   - 不处理：
     - 数据结构、服务层、hooks
     - 其它模块的列表组件抽象
     - 新增通用 DataTable 体系

3. 推荐实现方式
   - 单项结构：
     - 将当前多层信息卡片压缩为紧凑行或轻量二维信息块。
     - 一行内优先呈现：编码 / 标签 / 排序 / 状态 / 操作。
   - 信息取舍：
     - 弱化大面积空白、重复标题块、过深层级的描述容器。
     - 说明字段无内容时不再占据过大视觉空间。
   - 交互布局：
     - 保留顶部统计与新增按钮。
     - 列表项之间使用更小间距，使滚动区能容纳更多条目。

4. 预计涉及文件
   - `src/features/code-center/shared-hole-code-source-mgmt.tsx`

5. 风险与注意事项
   - 过度压缩可能影响可读性，因此需要在“密度提升”和“操作清晰”之间平衡。
   - 由于前缀与孔数字段都比较简单，本轮应优先选择紧凑展示，而不是保留详情卡片样式。

6. 当前待你确认的实施边界
   - 若你确认，本轮下一步将把 `shared-hole-code-source-mgmt.tsx` 中的单项渲染从大卡片改为紧凑高密度布局，随后执行校验并更新 `walkthrough.md`。

---

## 补充实施方案：将 `共享编码源 > 孔型前缀 / 孔数` 排序改为系统自动分配

1. 目标
   - 消除弹窗中对 `排序` 的手工维护要求。
   - 让用户新增或编辑前缀/孔数时，只关注业务值本身，不承担内部展示顺序的认知负担。
   - 保持列表顺序稳定且可预测。

2. 范围
   - 处理：
     - `shared-hole-code-source-mgmt.tsx` 中前缀/孔数弹窗的排序输入移除
     - `hole-code-source-service.ts` 中保存时的排序分配逻辑
   - 不处理：
     - 其它模块的排序规则统一
     - 拖拽排序、手动上移下移、批量重排等能力

3. 推荐实现方式
   - UI 层：
     - 从前缀弹窗、孔数弹窗中移除 `排序` 输入框。
     - 其余字段保持不变，减少界面干扰。
   - 服务层：
     - 新增项时自动取当前同类集合的末尾顺序值并顺延分配。
     - 编辑已有项时默认继承原 `sortOrder`，不因编辑其它字段而改变顺序。
   - 展示层：
     - 列表中如继续展示 `排序`，仅作为只读结果展示，不再成为用户输入项。

4. 预计涉及文件
   - `src/features/code-center/shared-hole-code-source-mgmt.tsx`
   - `src/features/code-center/services/hole-code-source-service.ts`

5. 风险与注意事项
   - 需要确保新增时的自动排序在前缀与孔数两类集合中分别独立计算。
   - 需要确保编辑流程不会意外重置已有项顺序。

6. 当前待你确认的实施边界
   - 若你确认，本轮下一步将移除 `shared-hole-code-source-mgmt.tsx` 弹窗中的排序输入，并在 `hole-code-source-service.ts` 中改为系统自动分配排序，随后执行校验并更新 `walkthrough.md`。

---

## 补充实施方案：在 `工程数据库` 下新增 `工程主数据 > 编织方式`

1. 目标
   - 在 `工程数据库` 下建立新的承载层 `工程主数据`，专门容纳可复用、可引用、可约束的工程字典类主数据。
   - 在 `工程主数据` 内先落首个内部 TAB：`编织方式`。
   - 采用可扩展结构，为后续新增 `打孔方式`、`孔位规则`、`装配规则` 等分类预留统一承接点。

2. 范围
   - 处理：
     - `工程数据库` 下新增 `工程主数据` 入口
     - `工程主数据` 内部 TAB 容器
     - 首个 `编织方式` TAB 的页面、数据定义、服务、hooks、弹窗与文案
   - 不处理：
     - `打孔图纸原子中心` 对 `编织方式` 的引用改造
     - 图纸上传时对编织方式的自动识别
     - 共享编码源或一维码页面对该主数据的消费改造

3. 推荐实现方式
   - 路由层：
     - 在 `engineering-db` 下新增 `engineering-master` 路由承载层。
     - 在该承载层下新增 `weaving-mode` 子路由或内部 TAB 页面。
   - 页面层：
     - 一级显示为 `工程主数据`。
     - 内部首个 TAB 显示为 `编织方式`。
     - 页面使用紧凑主数据列表而不是大详情卡片。
   - 文件结构：
     - 建议以独立小域承载，而不是塞进现有 `drilling-tab.tsx`。
     - 建议结构包括：
       - `engineering-master/layout`
       - `engineering-master/tabs`
       - `weaving-mode-schema`
       - `weaving-mode-service`
       - `use-weaving-mode-mgmt`
       - `weaving-mode-action-dialog`
       - `weaving-mode-tab`
   - 第一阶段能力：
     - `编织方式` 列表
     - 新增 / 编辑 / 启停 / 删除（受约束）
     - 系统预置常规值
     - 归一化与唯一性约束

4. 预计涉及文件
   - `src/features/engineering-db/engineering-master-layout.tsx` 或对应子域 layout
   - `src/features/engineering-db/engineering-master-tabs.ts` 或对应 tabs 配置
   - `src/features/engineering-db/tabs/engineering-master-weaving-mode-tab.tsx` 或子域 `tabs/weaving-mode-tab.tsx`
   - `src/features/engineering-db/data/weaving-mode-schema.ts`
   - `src/features/engineering-db/services/weaving-mode-service.ts`
   - `src/features/engineering-db/hooks/use-weaving-mode-mgmt.ts`
   - `src/features/engineering-db/components/weaving-mode-action-dialog.tsx`
   - 对应 `engineering-db` 路由与中英文文案文件

5. 风险与注意事项
   - 第一阶段必须控制边界，避免把图纸引用、上传识别、共享编码联动一并卷入。
   - 命名上应统一使用 `工程主数据 > 编织方式`，避免实现中再次收窄成“编织比例”导致后续扩展受限。
   - 页面与文件结构应从一开始就按可扩展域拆分，避免第二个工程主数据分类出现时再返工。

6. 当前待你确认的实施边界
   - 若你确认，本轮下一步将新增 `工程数据库 > 工程主数据` 承载层与首个 `编织方式` TAB，仅实现主数据本体闭环，随后执行校验并更新 `walkthrough.md`。

---

## 补充实施方案：方案一——将 `打孔方案` 改为引用 `工程主数据 > 编织方式`

1. 目标
   - 让 `打孔方案` 不再使用自由文本 `lacingPattern` 或模块内写死选项作为编织比例来源。
   - 将 `打孔方案` 的编织相关事实统一收口为对 `工程主数据 > 编织方式` 的主引用，形成从主数据到工艺实例的单一数据源链路。
   - 为后续图纸上传识别、共享编码消费、钻孔规则约束等扩展打下稳定引用基础。

2. 范围
   - 处理：
     - `打孔方案` 数据结构改造：从 `lacingPattern` 过渡到 `weavingModeId`
     - `打孔方案` 弹窗下拉数据源改造：接入 `weavingModeService`
     - `打孔方案` 列表展示、搜索、保存、patch 链路的主数据引用适配
   - 不处理：
     - 图纸上传时自动识别未建档的编织方式
     - 共享编码源、条码协议、订单或其它工程模块同步切换为 `weavingModeId`
     - 后台批量迁移工具、一次性全库清洗或复杂数据修复后台
     - 旧 `lacingPattern` 字段的兼容读取、兼容展示或过渡映射层

3. 推荐实现方式
   - 数据结构层：
     - 将 `src/features/engineering-db/data/schema.ts` 中 `DrillingPlan` 扩展为：
       - 主引用字段：`weavingModeId?: string`
       - 兼容显示字段：`weavingModeLabel?: string`
     - 直接移除前端对旧 `lacingPattern` 字段的依赖，不设计过渡读取逻辑。
   - 服务层：
     - 在 `src/features/engineering-db/services/production-db-service.ts` 中补充 `drillingData` 的保存/读取适配。
     - 保存时以 `weavingModeId` 为准，并冗余写入可读 label，降低列表与搜索的显示成本。
     - patch 时确保 `drillingData.weavingModeId`、`drillingData.weavingModeLabel` 与 `drillingData.name / standardHoles / productId` 一起保持字段语义一致。
   - 页面层：
     - `src/features/engineering-db/components/drilling-action-dialog.tsx` 改为从 `weavingModeService` 拉取启用中的编织方式选项。
     - 下拉值改为 `weavingModeId`，展示文案使用 `label / normalizedRatioKey`。
     - `src/features/engineering-db/tabs/drilling-tab.tsx` 中的列表列、搜索文本与详情预览使用主数据 label，而不是本地常量。
   - 约束策略：
     - `打孔方案` 新增时强制选择有效的 `编织方式` 主数据。
     - 若引用的编织方式已停用，历史记录仍可显示，但新增/编辑默认不应再提供停用项供新建选择。

4. 预计涉及文件
   - `src/features/engineering-db/data/schema.ts`
   - `src/features/engineering-db/services/production-db-service.ts`
   - `src/features/engineering-db/components/drilling-action-dialog.tsx`
   - `src/features/engineering-db/tabs/drilling-tab.tsx`
   - `src/features/engineering-db/data/drilling-options.ts`（大概率删除或收窄 `LACING_PATTERN_OPTIONS`）
   - `src/features/engineering-db/services/weaving-mode-service.ts`（如需补充 options / lookup helper）
   - `src/locales/messages/zh-CN/engineering.ts`
   - `src/locales/messages/en-US/engineering.ts`
   - 若路由搜索参数或高亮逻辑需要扩展，则检查 `src/routes/_authenticated/engineering-db/drilling.tsx`

5. 风险与注意事项
   - `打孔方案` 当前 patch 逻辑基于 delta 路径透传，字段名调整后必须同时核对新增/编辑两条链路，避免只修创建未修 patch。
   - 当前系统虽未上线，但仍要确保前端数据契约、保存 payload 与 patch delta 的字段名同步切换，避免前后链路出现半切换状态。
   - `打孔方案` 列表搜索、显示 badge 与弹窗默认值都引用了旧字段语义，改造时必须成组收口，避免遗漏导致 UI 显示空白。

6. 当前待你确认的实施边界
   - 若你确认，本轮下一步将开始把 `打孔方案` 的编织比例直接切换为引用 `工程主数据 > 编织方式`，不保留旧 `lacingPattern` 兼容层，随后执行校验并更新 `walkthrough.md`。

---

## 补充实施方案：`工程主数据 > 编织方式` 稳定性整改

1. 目标
   - 在不改变 `工程主数据 > 编织方式` 承载边界的前提下，补齐主数据完整性保护，避免已被消费的数据被误删或出现重复主数据。
   - 去除主数据读取链中的副作用与失败语义混淆，避免“读取失败被当成空数据”进而放大为写入错误。
   - 对当前最重的服务/页面文件做最小必要职责收口，使后续继续扩展工程主数据分类或消费链时不至于迅速失控。

2. 范围
   - 处理：
     - `编织方式` 被 `打孔方案` 引用时的删除保护
     - `编织方式.normalizedRatioKey` 的唯一性保护与重复提交拦截
     - `weavingModeService.getWeavingModes()` 的读取副作用治理
     - 主数据读取失败与空数据语义分离
     - 对 `weavingModeService.ts`、`production-db-service.ts`、`drilling-tab.tsx`、`drilling-action-dialog.tsx` 的高风险职责混杂点做最小必要收口
   - 不处理：
     - 新增其它工程主数据分类
     - 图纸上传识别、共享编码源、订单链或其它模块的联动扩展
     - 大规模代码美化式重构或无直接稳定性收益的拆文件工程

3. 推荐实现方式
   - 数据完整性层：
     - 在后端 `EngineeringSpec` 删除链路补充针对 `DRILLING_PLAN` 的引用检查，阻止删除仍被 `drillingData.weavingModeId` 引用的 `编织方式`。
     - 在 `编织方式` 保存链路补充服务侧唯一性校验，确保相同 `normalizedRatioKey` 不会因并发或读失败假空列表而重复写入。
   - 服务层：
     - 将 `weavingModeService.ts` 中“读取 + 预置补种 + 归一化 + 排序 + 唯一性”这几类逻辑做最小必要拆分，至少把归一化/排序 helper 与读取/写入流程解耦。
     - 去掉 `getWeavingModes()` 中隐式补种预置数据的副作用；预置初始化应改为显式 ensure 流程或更清晰的初始化入口。
     - 调整读取失败策略：对 UI 层暴露明确失败，而不是统一吞成空数组；避免保存链路基于错误前提继续计算排序与重复校验。
   - 消费链层：
     - 在 `production-db-service.ts` 中继续保持 `weavingModeId / weavingModeLabel` 的读写契约一致，但避免因为单条坏记录导致整页 parse 全部失败。
     - 在 `drilling-action-dialog.tsx` 中收口主数据选项装配逻辑，确保当主数据加载失败时，表单会给出明确阻断而不是静默空下拉。
     - 在 `drilling-tab.tsx` 中优先提炼页面状态/预览/表格渲染的边界，若本轮不拆文件，也要至少避免继续叠加主数据业务判断。
   - 职责收口策略：
     - 本轮优先处理“稳定性相关的职责混杂”，而不是为了形式拆分所有文件。
     - 若拆分，优先抽取纯函数 helper、引用校验 helper 或页面状态 hook，避免一次性大改 UI 结构。

4. 预计涉及文件
   - `server/services/engineering_master_service.go`
   - `src/features/engineering/services/engineering-spec-service.ts`（如需补充错误语义适配）
   - `src/features/engineering-db/data/weaving-mode-schema.ts`（如需补充更清晰的输入/状态约束）
   - `src/features/engineering-db/services/weaving-mode-service.ts`
   - `src/features/engineering-db/hooks/use-weaving-mode-mgmt.ts`
   - `src/features/engineering-db/services/production-db-service.ts`
   - `src/features/engineering-db/components/drilling-action-dialog.tsx`
   - `src/features/engineering-db/tabs/drilling-tab.tsx`
   - 如删除保护/错误文案需要补充，则同步更新 `src/locales/messages/zh-CN/engineering.ts` 与 `src/locales/messages/en-US/engineering.ts`

5. 风险与注意事项
   - 若后端删除保护只补前端、不补服务端，仍无法防止绕过 UI 的直接删除请求造成悬挂引用。
   - 若读取失败继续统一回落为空数组，会让排序、重复校验和预置补种逻辑继续建立在错误前提上，必须优先改语义。
   - 若本轮过度追求文件拆分而不是先修完整性问题，容易扩大变更面并引入新的 UI 回归。
   - `打孔方案` 当前使用 `weavingModeLabel` 作为展示冗余字段，整改时需要明确它是“展示快照”还是“可回写缓存”，避免后续语义漂移。

6. 当前待你确认的实施边界
   - 若你确认，本轮下一步将优先落地 `编织方式` 的删除保护、唯一性保护、去副作用读取与失败语义整改，并对相关重文件做最小必要职责收口，随后执行校验并更新 `walkthrough.md`。

---

## 补充实施方案：`工程主数据` 相关文件结构拆分

1. 目标
   - 在保持现有 `编织方式` 主数据、`打孔方案` 消费链与稳定性整改结果不变的前提下，继续降低前端重文件的职责密度。
   - 将当前“页面容器 + 数据编排 + 状态管理 + 列表渲染 + 表单区块 + 动作绑定”混杂在单文件中的实现，收口为更可维护的层次结构。
   - 为后续继续扩展更多工程主数据分类、更多工艺消费页或进一步测试补强打下稳定文件边界。

2. 范围
   - 处理：
     - `drilling-tab.tsx` 的页面容器化与子组件拆分
     - `drilling-action-dialog.tsx` 的表单状态/区块组件拆分
     - `engineering-master-weaving-mode-tab.tsx` 的页面容器化与列表区块拆分
     - 视需要对 `use-weaving-mode-mgmt.ts` 做最小必要职责收口
   - 不处理：
     - 后端接口、数据库结构、删除保护、唯一性与当前稳定性语义的再次重做
     - 新增工程主数据分类或新的消费模块
     - 纯视觉层重写、样式体系调整或无业务收益的批量组件美化
     - 大规模通用基础设施抽象（如一次性引入新的通用表单框架）

3. 推荐实现方式
   - `drilling-tab.tsx`
     - 将当前 tab 收口为页面容器，保留路由搜索参数读取、主弹窗挂载与预览弹窗挂载。
     - 优先拆出一个页面状态 hook（例如页面搜索词、当前行、预览文件、save/delete mutation 编排、行高亮相关逻辑），避免 tab 文件同时管理数据请求、派生数据、预览、删除确认与表格配置。
     - 视实现阻力拆出：
       - 顶部概览/工具栏组件
       - 桌面表格卡片组件
       - 移动端卡片列表组件
       - 预览弹窗挂载容器
   - `drilling-action-dialog.tsx`
     - 保留一个薄的 dialog 容器，内部优先拆出表单 state hook，收口：初始数据构建、`useDeltaTracker` 对接、`weavingMode` 选项映射、保存前阻断判断。
     - 再按 UI 区块拆出：
       - 基础信息区（方案名 / 产品）
       - 技术参数区（编织方式 / 孔数）
       - 附件上传区
       - 只读元信息区
     - 拆分后保持 `onSave`、patch delta、`weavingModeId / weavingModeLabel` 写回语义不变。
   - `engineering-master-weaving-mode-tab.tsx`
     - 收口为页面容器，内部优先拆出工具栏与列表卡片区域，避免同文件继续承载指标计算、搜索栏、错误态、空态、表格/卡片映射和删除动作。
     - 若必要，可增加局部页面 state hook，但尽量复用现有 `useWeavingModeMgmt()`，避免本轮重复设计数据编排层。
   - `use-weaving-mode-mgmt.ts`
     - 若拆分收益明确，可把“数据获取 / mutation 编排”和“本地搜索过滤派生”拆开。
     - 若拆分收益一般，则保持现状，避免为了拆而拆。

4. 预计涉及文件
   - `src/features/engineering-db/tabs/drilling-tab.tsx`
   - `src/features/engineering-db/components/drilling-action-dialog.tsx`
   - `src/features/engineering-db/tabs/engineering-master-weaving-mode-tab.tsx`
   - `src/features/engineering-db/hooks/use-weaving-mode-mgmt.ts`
   - 预计新增若干前端结构文件，例如：
     - `src/features/engineering-db/hooks/use-drilling-page-state.ts`
     - `src/features/engineering-db/components/drilling-table-card.tsx`
     - `src/features/engineering-db/components/drilling-mobile-list.tsx`
     - `src/features/engineering-db/components/drilling-toolbar.tsx`
     - `src/features/engineering-db/hooks/use-drilling-action-dialog-state.ts`
     - `src/features/engineering-db/components/drilling-basic-info-section.tsx`
     - `src/features/engineering-db/components/drilling-spec-section.tsx`
     - `src/features/engineering-db/components/drilling-attachment-section.tsx`
     - `src/features/engineering-db/components/weaving-mode-toolbar.tsx`
     - `src/features/engineering-db/components/weaving-mode-list-card.tsx`
   - 具体文件名以实现时最小、最清晰为准，不强行一次性全部新增。

5. 风险与注意事项
   - `drilling-tab.tsx` 当前同时持有表格列定义、删除确认、预览打开、移动端/桌面端双视图映射；若拆分边界不清，容易把状态在父子之间来回穿透，导致 props 膨胀。
   - `drilling-action-dialog.tsx` 当前依赖 `useDeltaTracker` 与 `weavingMode` 查询结果，拆分时要避免把可变表单对象直接在多个子组件中无边界传递，防止 patch 语义漂移。
   - `engineering-master-weaving-mode-tab.tsx` 的删除、编辑、创建都依赖当前页级弹窗状态；若拆分时过度下沉动作，可能让组件反而更难追踪。
   - 本轮应优先维持稳定性整改结果，任何结构拆分都不应重新引入“读取失败回落空数组即继续保存”的旧问题。

6. 当前待你确认的实施边界
   - 若你确认，本轮下一步将优先从 `drilling-tab.tsx` 与 `drilling-action-dialog.tsx` 开始做结构拆分，并视进度补充 `engineering-master-weaving-mode-tab.tsx` 的页面容器化收口；完成后执行类型检查、目标文件 lint、必要测试并更新 `walkthrough.md`。

---

## 补充实施方案：`use-weaving-mode-mgmt.ts` 边界收口

1. 目标
   - 将 `use-weaving-mode-mgmt.ts` 中当前混合存在的“远端数据编排”和“本地视图过滤”进一步拆开，使 hook 边界与此前已完成的页面容器化结构一致。
   - 保持主数据页现有功能、错误提示、预置初始化策略和调用方式稳定，不为了拆分扩大改动面。

2. 范围
   - 处理：
     - `use-weaving-mode-mgmt.ts` 的职责收口
     - 最小必要的新 hook / helper 文件
     - `engineering-master-weaving-mode-tab.tsx` 的轻微适配（如果新 hook 返回结构需要调整）
   - 不处理：
     - `weaving-mode-service.ts` 的再次重构
     - `drilling` 链路或其它页面文件的继续拆分
     - 主数据业务语义、后端接口、查询 key 或 toast 文案的改写

3. 推荐实现方式
   - 将“远端数据编排”部分单独收口：
     - `useQuery` 获取 `weaving modes`
     - 显式 `ensure preset`
     - `save / delete` mutation
     - `invalidateQueries` 与错误 toast 映射
   - 将“本地视图派生”部分单独收口：
     - `searchTerm`
     - `setSearchTerm`
     - `filteredData`
   - 对外仍保留一个总入口给页面消费，避免 `engineering-master-weaving-mode-tab.tsx` 一次接入多个碎片 hook；但内部结构应从“一个大 hook”转为“一个组合 hook + 一个纯视图状态 hook / helper”。

4. 预计涉及文件
   - `src/features/engineering-db/hooks/use-weaving-mode-mgmt.ts`
   - 预计新增：
     - `src/features/engineering-db/hooks/use-weaving-mode-query-state.ts`
     - `src/features/engineering-db/hooks/use-weaving-mode-filter-state.ts`
   - 若需要轻微适配，则同步检查：
     - `src/features/engineering-db/tabs/engineering-master-weaving-mode-tab.tsx`

5. 风险与注意事项
   - 预置初始化逻辑当前依赖 `useEffect + ref` 防止重复触发，拆分时要确保不会因 hook 重组导致补种逻辑重复执行。
   - 删除 / 保存错误的 toast 映射带有较明确的业务语义，拆分时不能被“抽公共错误处理”误伤为通用提示。
   - 搜索过滤如果被拆成独立 hook，需要避免把 query 状态和本地 UI 状态重新耦合回去。

6. 当前待你确认的实施边界
   - 若你确认，本轮下一步将仅围绕 `use-weaving-mode-mgmt.ts` 做职责收口，优先拆出“远端数据编排”与“本地过滤派生”两个边界，并在完成后执行类型检查、目标文件 lint 与 `walkthrough.md` 更新。

---

## 补充实施方案：`use-weaving-mode-query-state.ts` 与 `use-weaving-mode-filter-state.ts` 测试补强

1. 目标
   - 为刚拆出的 `编织方式` hooks 建立独立回归保护，确保后续继续演进查询编排、预置初始化和搜索过滤逻辑时能及时发现行为漂移。
   - 保持本轮范围聚焦在测试补强，不把任务再次扩散为业务重构。

2. 范围
   - 处理：
     - `use-weaving-mode-query-state.ts` 的 hook 测试
     - `use-weaving-mode-filter-state.ts` 的 hook 测试
     - 必要的测试 wrapper / mock 封装
   - 不处理：
     - 继续重构 `weaving-mode-service.ts` 或页面组件
     - 新增复杂集成测试或 e2e 测试
     - 与本轮测试目标无关的 UI snapshot 测试

3. 推荐实现方式
   - `use-weaving-mode-query-state.ts`
     - 使用 `renderHook` + `QueryClientProvider` 测试。
     - mock `weavingModeService`、`toast` 与 `useLanguage`，把断言聚焦在：
       - 空数据触发 `ensureWeavingModePresets()`
       - 保存 / 删除后触发 `invalidateQueries`
       - 关键错误分支映射到正确 toast
       - `refetchWeavingModes()` 可重置补种尝试并重新刷新
   - `use-weaving-mode-filter-state.ts`
     - 使用轻量 `renderHook` 测试。
     - 直接传入伪造的 `WeavingMode[]` 数据，断言：
       - 默认返回全部数据
       - 搜索对 `label / normalizedRatioKey / description / system preset / custom` 生效
       - 搜索会做 `trim + toLowerCase`

4. 预计涉及文件
   - 预计新增：
     - `src/features/engineering-db/hooks/use-weaving-mode-query-state.test.tsx`
     - `src/features/engineering-db/hooks/use-weaving-mode-filter-state.test.tsx`
   - 如测试辅助封装有必要，可新增同目录轻量 helper；否则直接在测试文件内完成。

5. 风险与注意事项
   - `use-weaving-mode-query-state.ts` 依赖 `useEffect` 驱动预置初始化，测试时需要正确等待异步状态，避免把 effect 调度误判成重复触发。
   - `invalidateQueries` 与 toast 映射都属于实现细节较强的行为，断言应聚焦关键 contract，避免写成对内部调用顺序过度敏感的脆弱测试。
   - 过滤 hook 测试应避免依赖页面 UI，而只验证纯 hook 输入输出。

6. 当前待你确认的实施边界
   - 若你确认，本轮下一步将仅为 `use-weaving-mode-query-state.ts` 与 `use-weaving-mode-filter-state.ts` 补充 hook 测试，完成后执行目标测试、类型检查与 `walkthrough.md` 更新。

---

## 补充实施方案：`use-drilling-page-state.ts` 与 `use-drilling-action-dialog-state.ts` 测试补强

1. 目标
   - 为 `drilling` 页面在结构拆分后新增的状态 hooks 建立独立回归保护，确保页面容器层、表单状态层和预览/删除编排层在后续继续演进时能及时发现行为漂移。
   - 保持本轮范围聚焦在 hook 测试补强，不把任务再次扩展为页面重构或服务层改写。

2. 范围
   - 处理：
     - `use-drilling-page-state.ts` 的 hook 测试
     - `use-drilling-action-dialog-state.ts` 的 hook 测试
     - 必要的测试 wrapper / mock 封装
   - 不处理：
     - 继续重构 `drilling-tab.tsx`、`drilling-action-dialog.tsx` 或 `ProductionDBService`
     - 新增复杂页面集成测试或 e2e 测试
     - 与本轮测试目标无关的 UI snapshot 测试

3. 推荐实现方式
   - `use-drilling-page-state.ts`
     - 使用 `renderHook` + `QueryClientProvider` 测试。
     - mock `ProductionDBService`、`FileResolverService`、`toast`、`useLanguage`、`useConfirmedActionFlow`、`useEngineeringDbProductLookup` 与路由 `useSearch`。
     - 把断言聚焦在：
       - `filteredRows` 的搜索 / 产品映射派生
       - `handleCreate / handleEdit` 对本地状态的影响
       - `handlePreview` 的分支与预览弹窗状态
       - `handleDelete` 是否桥接确认流与删除动作
       - `handleSave` 在新增 / patch 场景下对服务层调用与成功收口语义
   - `use-drilling-action-dialog-state.ts`
     - 使用 `renderHook` 测试，必要时配合 `QueryClientProvider`。
     - mock `useGetProducts`、`weavingModeService.getWeavingModes`、`toast` 与 `useDeltaTracker`。
     - 断言聚焦在：
       - 初始表单状态构建
       - `availableWeavingModes` 与 `weavingModeItems` 的生成
       - `handleWeavingModeChange` 的双字段回写
       - `buildSaveParams()` 的阻断、校验与新增 / patch 返回值

4. 预计涉及文件
   - 预计新增：
     - `src/features/engineering-db/hooks/use-drilling-page-state.test.tsx`
     - `src/features/engineering-db/hooks/use-drilling-action-dialog-state.test.tsx`
   - 如测试辅助封装有必要，可新增同目录轻量 helper；否则直接在测试文件内完成。

5. 风险与注意事项
   - `use-drilling-page-state.ts` 同时依赖 query、mutation、预览打开和卸载时 `URL.revokeObjectURL`，测试时要避免把实现细节写成过于脆弱的顺序断言。
   - `use-drilling-action-dialog-state.ts` 依赖 `useDeltaTracker` 的可变表单对象语义，测试中应通过 mock 明确该 contract，避免误把测试失败归因到 hook 自身。
   - 若测试暴露真实缺陷，应优先修 hook 本身，而不是把断言降级为迎合当前 bug 的行为。

6. 当前待你确认的实施边界
   - 若你确认，本轮下一步将仅为 `use-drilling-page-state.ts` 与 `use-drilling-action-dialog-state.ts` 补充 hook 测试，完成后执行目标测试、类型检查与 `walkthrough.md` 更新。

---

## 补充实施方案：`engineering-master-weaving-mode-tab.tsx` 与 `drilling-tab.tsx` 页面容器层测试补强

1. 目标
   - 为已经完成容器化收口的 `engineering-master-weaving-mode-tab.tsx` 与 `drilling-tab.tsx` 建立薄容器层回归测试，锁定“页面容器只负责编排、透传与挂载”的当前结构边界。
   - 保持本轮范围聚焦在容器层测试补强，不重新打开页面重构或更深层组件实现改造。

2. 范围
   - 处理：
     - `engineering-master-weaving-mode-tab.tsx` 的容器层测试
     - `drilling-tab.tsx` 的容器层测试
     - 必要的测试 mock / wrapper 封装
   - 不处理：
     - 继续重构 toolbar / list-card / dialog / preview 子组件
     - 新增页面级集成测试或 e2e 测试
     - 与本轮目标无关的视觉快照测试

3. 推荐实现方式
   - `engineering-master-weaving-mode-tab.tsx`
     - mock `useWeavingModeMgmt` 与三个薄层子组件：
       - `WeavingModeToolbar`
       - `WeavingModeListCard`
       - `WeavingModeActionDialog`
     - 断言聚焦在：
       - 指标统计展示
       - toolbar props 透传
       - list card 的 retry / edit / delete 编排
       - dialog 的 open / currentRow / onSave / isLoading 透传
   - `drilling-tab.tsx`
     - mock `useDrillingPageState` 与薄层子组件：
       - `DrillingToolbar`
       - `DrillingTableCard`
       - `DrillingMobileList`
       - `DrillingActionDialog`
       - `CADViewerDialog`
       - `PDFViewerDialog`
       - `ExcelViewerDialog`
     - 断言聚焦在：
       - toolbar props 透传
       - table / mobile list 共享同一组 rows 与动作桥接
       - action dialog props 透传
       - 三个预览 dialog 的 open / file 信息 / onOpenChange 透传

4. 预计涉及文件
   - 预计新增：
     - `src/features/engineering-db/tabs/engineering-master-weaving-mode-tab.test.tsx`
     - `src/features/engineering-db/tabs/drilling-tab.test.tsx`

5. 风险与注意事项
   - 容器层测试应锁定“编排 contract”，不要深入断言子组件内部渲染细节，否则会让测试重新耦合到下沉组件实现。
   - 若页面标题、文案或 metrics 文本采用 i18n key 渲染，断言应优先针对关键 props 与少量稳定文本，不要把测试写成文案快照。
   - 如果测试暴露真实连线缺陷，应优先修容器层 wiring，而不是放松断言去接受错误透传。

6. 当前待你确认的实施边界
   - 若你确认，本轮下一步将仅为 `engineering-master-weaving-mode-tab.tsx` 与 `drilling-tab.tsx` 补充页面容器层测试，完成后执行目标测试、类型检查与 `walkthrough.md` 更新。

## `一维码 > 业务编号` TAB 迁移到 `共享编码源` 的安全性分析

1. 目标与结论形式
   - 目标不是直接实施迁移，而是先判断当前代码状态下，`一维码 > 业务编号` 是否已经具备“安全移动到 `编码中心 > 共享编码源`”的条件。
   - 输出结论需要明确回答：
     - 当前是否可以安全迁移
     - 若不能，阻断点是什么
     - 若可以，应如何分步迁移，是否需要兼容期或双入口过渡

2. 现状线索（基于初步只读定位）
   - `共享编码源` 当前已有独立 layout 与 tab 注册，但目前只承载 `孔型孔数`：
     - `src/features/code-center/shared-code-source-layout.tsx`
     - `src/features/code-center/tabs.ts`
     - `src/routes/_authenticated/code-center/shared-code-source/hole-codes.tsx`
   - `一维码 > 业务编号` 当前仍是独立路由，直接挂到 `SequenceMgmt`：
     - `src/routes/_authenticated/code-center/linear-barcode/numbering.tsx`
   - `一维码协议` 页中存在跳转到该业务编号页的入口，需要进一步确认该跳转是否只是普通导航，还是存在更深层语义绑定：
     - `src/features/basic-settings/tabs/linear-barcode-mgmt.tsx`

3. 分析维度
   - 路由与导航：
     - `业务编号` 是否仅由当前 linear-barcode tab 入口访问
     - 是否还存在菜单、命令搜索、快捷跳转、深链接或权限依赖
   - 页面语义与复用边界：
     - `SequenceMgmt` 是否真的是“共享编码源类能力”，还是仍然带有 `一维码` 专属业务上下文
     - 页面文案、标题、面包屑、tabs 语义是否会因迁移产生错位
   - 数据与存储：
     - `SequenceMgmt` 当前使用的 storage key / service / hook / schema 是否与 `一维码协议` 或其它 barcode 配置共享状态
     - 迁移是否只改挂载位置即可，还是会牵涉数据模型重命名、query key 调整、兼容读取
   - 消费方影响：
     - 是否存在其它模块直接把该页视为 `linear-barcode` 子能力
     - 若迁移路由，旧链接、旧书签、旧跳转链路是否会失效
   - 共享编码源承载能力：
     - 当前 `shared-code-source` layout / tabs 模式是否能无副作用地新增 `业务编号` tab
     - 新增后是否会破坏现有 `孔型孔数` 的导航体验或信息架构一致性

4. 推荐审查文件
   - `src/features/code-center/tabs.ts`
   - `src/features/code-center/shared-code-source-layout.tsx`
   - `src/routes/_authenticated/code-center/shared-code-source/route.tsx`
   - `src/routes/_authenticated/code-center/shared-code-source/hole-codes.tsx`
   - `src/routes/_authenticated/code-center/linear-barcode/numbering.tsx`
   - `src/features/basic-settings/tabs/linear-barcode-mgmt.tsx`
   - `SequenceMgmt` 对应实现文件、所依赖的 service / hook / storage key / schema / query key

5. 风险与注意事项
   - “能挂到新路由”不等于“能安全迁移”；若存在旧路由消费者、上下文文案耦合、模块权限语义耦合或存储命名歧义，则迁移仍可能带来回归。
   - 若 `SequenceMgmt` 目前仍以内嵌心智服务于 `一维码协议` 配置流程，那么直接搬到 `共享编码源` 可能造成用户路径断裂，需要保留从旧页进入新页的导流或兼容入口。
   - 若后续决定实施迁移，应单独规划：路由迁移、旧地址兼容、tabs 调整、文案语义修正、验证回归范围。

6. 当前待你确认的实施边界
   - 若你确认，本轮下一步将只做代码级只读审查，并输出“是否可安全迁移到 `共享编码源`”的结论、风险清单与建议迁移路径；不会直接修改业务代码或路由。

## `业务编号` 历史残留入口盘点清单（重点：`/basic-settings/sequences`）

1. 目标
   - 输出一份“业务编号历史残留入口盘点清单”，重点确认 `'/basic-settings/sequences'` 是否仍是有效入口，还是仅剩命令搜索 / 自动生成目录 / 文案级残留。
   - 结论需要区分：
     - 仍有效且仍需保留的入口
     - 已失效但仍被引用的残留入口
     - 仅为文案说明或自动生成目录痕迹、无需作为路由迁移对象处理的引用

2. 分析重点
   - 路由层：
     - 是否存在 `basic-settings/sequences` 对应 route 文件、redirect 或兼容跳转
     - `code-center/linear-barcode/numbering` 是否已成为唯一真实挂载点
   - 导航层：
     - 是否存在侧边栏、顶部 tabs、命令搜索、模块搜索或快捷入口仍指向旧路径
   - 权限 / 目录层：
     - `authenticated-route-catalog`、route tree、permission catalog 中是否仍把旧路径当作有效页面
   - 文案与说明层：
     - 哪些“业务编号”引用只是说明当前流程依赖，不构成历史残留入口
   - 消费影响层：
     - 若后续要清理旧入口，哪些消费者需要先改跳转或保留兼容

3. 推荐审查文件
   - `src/components/layout/data/search-data.ts`
   - `src/components/layout/data/sidebar-data.ts`
   - `src/features/authz/data/authenticated-route-catalog.ts`
   - `src/routeTree.gen.ts`
   - `src/routes/_authenticated/code-center/linear-barcode/numbering.tsx`
   - `src/routes/_authenticated/code-center/linear-barcode/index.tsx`
   - `src/routes/_authenticated/basic-settings/**`
   - `src/features/basic-settings/tabs/sequence-mgmt.tsx`
   - `src/features/basic-settings/tabs/linear-barcode-mgmt.tsx`

4. 风险与注意事项
   - 自动生成目录中的旧路径不一定代表真实可访问入口，需要与实际 route 文件交叉验证。
   - 命令搜索残留与文案残留不能混为一谈；前者会影响可达性，后者更多影响认知与后续清理范围。
   - 这轮盘点仍然只做只读判断，不应直接删除残留或修改入口。

5. 当前待你确认的实施边界
   - 若你确认，本轮下一步将只做 `业务编号` 历史残留入口盘点，重点输出 `'/basic-settings/sequences'` 的有效性判断、残留清单与建议清理顺序；不会直接修改任何路由或导航代码。

## `业务编号` 残留入口最小清理实施方案

1. 目标
   - 在不触发“承载层迁移”与“大范围语义调整”的前提下，只清理已经确认失效的 `业务编号` 旧入口残留。
   - 本轮目标聚焦两件事：
     - 移除命令搜索中的失效旧入口 `'/basic-settings/sequences'`
     - 查明并修正 `authenticated-route-catalog` 中该旧路径的来源链

2. 已知事实
   - 当前唯一真实入口为：`'/code-center/linear-barcode/numbering'`
   - 当前未发现 `'/basic-settings/sequences'` 对应的 route 文件或 redirect
   - `search-data.ts` 仍把旧路径作为可搜索入口暴露给用户
   - `authenticated-route-catalog.ts` 仍包含旧路径，说明自动生成目录与现状不一致

3. 实施策略
   - 第一步：直接清理用户可见且已确认失效的入口
     - 修改 `src/components/layout/data/search-data.ts`
     - 移除 `tab-basic-sequences` 指向 `'/basic-settings/sequences'` 的条目
   - 第二步：核查目录来源链
     - 继续确认 `authenticated-route-catalog` 中旧路径的生成来源
     - 判断是否来自：
       - 已删除但未重新生成的旧 route 文件残留
       - 生成脚本缓存 / 输入源漂移
       - 其它配置源未同步
   - 第三步：按最小范围修复目录残留
     - 若只需重新生成并验证少量目录文件，则在你确认实施后执行
     - 若会联动更多生成产物或权限目录，需要先回报影响面，再决定是否继续

4. 预计涉及文件
   - 必改：
     - `src/components/layout/data/search-data.ts`
   - 待核查来源后决定：
     - `src/features/authz/data/authenticated-route-catalog.ts`
     - 相关目录生成脚本输入源或生成产物

5. 风险与注意事项
   - `authenticated-route-catalog.ts` 为自动生成文件，不能在未确认来源链前草率手改，否则下次生成仍会回滚或造成新的漂移。
   - `SequenceMgmt` 与 `basicSettings.sequences.*` 当前仍被新入口复用，本轮不应误删这些实现或文案。
   - 若清理旧入口后命令搜索需要新增新的 `业务编号` 搜索项，应明确使用真实路径 `'/code-center/linear-barcode/numbering'`，但这属于是否补新入口的问题，需要与你确认是否一并处理。

6. 当前待你确认的实施边界
  - 若你确认，本轮下一步将先实施 `search-data.ts` 的旧入口清理，并只读核查 `authenticated-route-catalog` 的来源链；如来源链修复需要生成或改动更多文件，我会先停下向你说明影响，再继续。

## 新建全新的共享发号 TAB（统一承载一维码 / DM 码发号逻辑）

1. 目标
   - 不直接移动旧的 `业务编号` TAB，而是在新的共享承载层下新增一个全新 TAB，作为一维码与 DM 码共用的发号规则入口。
   - 该 TAB 的目标语义是“共享编号/发号引擎”，而不是继续延续仅面向一维码场景的旧页面心智。

2. 已知事实
   - 当前真实入口是 `'/code-center/linear-barcode/numbering'`，页面实现为 `SequenceMgmt`。
   - 底层 `numbering-service` 不仅服务一维码，还被销售订单条码相关流程复用，说明当前能力已具有通用引擎属性。
   - 当前用户新目标是：新增一个全新的共享 TAB，专门处理一维码与 DM 码发号逻辑，而不是把旧页原样迁入共享编码源。

3. 规划分析重点
   - 承载位置
     - 评估是挂在 `编码中心 > 共享编码源` 下新增 TAB，还是抽离为更独立的共享能力层。
   - 命名语义
     - 评估 `编号引擎`、`共享编号规则`、`共享发号引擎` 等命名是否更贴合能力边界。
   - 消费者边界
     - 明确一维码、DM 码、销售订单条码三类消费者中，哪些属于本轮统一承载范围，哪些暂时只复用底层服务不迁 UI。
   - 模型与复用
     - 评估现有 `SequenceMgmt` 页面与 `/numbering/*` 接口能否直接复用，还是需要抽出新的共享视图层以摆脱一维码语义。
   - 兼容策略
     - 明确旧 `'/code-center/linear-barcode/numbering'` 是否保留兼容期，以及 tab、命令搜索、权限映射如何分步迁移。

4. 预计涉及文件（分析阶段）
   - 路由与 tab：
     - `src/routes/_authenticated/code-center/**`
     - `src/features/code-center/tabs.ts`
   - 页面与服务：
     - `src/features/basic-settings/tabs/sequence-mgmt.tsx`
     - `src/features/basic-settings/services/numbering-service.ts`
   - 消费者：
     - 一维码相关页面
     - DM 码相关页面 / 配置页
     - `src/features/trading/hooks/use-sales-order-form.ts`
     - `src/features/trading/hooks/use-sales-order-init.ts`
   - 导航与权限：
     - `src/components/layout/data/search-data.ts`
     - `src/features/authz/data/authenticated-route-catalog.ts`
     - 相关权限目录与菜单配置

5. 风险与注意事项
   - 若把“共享编码源”同时承载字典型源数据与规则引擎型能力，需提前定义信息架构，避免同层语义混杂。
   - 若销售订单条码仍复用同一底层引擎，则新共享发号 TAB 的命名和边界不应被误解为“仅服务条码页面”。
   - 若 DM 码当前模型与一维码规则差异较大，可能不能简单复用 `SequenceMgmt`，需要先确认抽象层。
   - 旧页兼容期如果处理不当，容易造成双入口并存、命令搜索重复、权限目录漂移。

6. 当前待你确认的实施边界
   - 若你确认，本轮下一步将只做“新增共享发号 TAB”的架构与影响面分析，输出承载位置建议、命名建议、消费者边界、兼容策略与推荐实施顺序；不会直接新增业务代码。
