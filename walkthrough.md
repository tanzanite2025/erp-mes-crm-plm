# 变更记录与验证（walkthrough.md）

## 2026-04-13 - fix：应收 / 应付页面样式纠偏与演示残留清理

### 本轮目标

修正应收 / 应付页面“功能已落地但视觉仍像演示壳层”的问题：让两个页面回到通用工业风样式体系，并删除“骨架已建立”演示卡片与 mock / placeholder 残留文案。

### 实现细节

1. **应收页面样式对齐**
   - 更新 `src/features/trading/receivables/tabs/sales-receivables-tab.tsx`
   - 统计卡片改为工业风样式：
     - `rounded-[32px]`
     - `border-dashed`
     - `italic + font-black` 标题数字层级
   - 列表卡片改为通用工业风容器：
     - 顶部说明栏使用虚线分隔与 muted 背景
     - 卡片内容区去掉多余默认内边距

2. **应付页面样式对齐**
   - 更新 `src/features/trading/payables/tabs/purchase-payables-tab.tsx`
   - 与应收页面保持同构样式：
     - 统计卡片风格一致
     - 列表卡片风格一致
     - 字体层级、圆角、边框风格一致

3. **删除演示卡片残留**
   - 删除应收页底部“销售应收骨架已建立”演示卡片
   - 删除应付页底部“采购应付骨架已建立”演示卡片

4. **清理本地化中的 mock / placeholder 文案**
   - 更新 `src/locales/messages/zh-CN/trading.ts`
   - 更新 `src/locales/messages/zh-CN/purchase.ts`
   - 更新 `src/locales/messages/en-US/trading.ts`
   - 更新 `src/locales/messages/en-US/purchase.ts`
   - 删除：
     - `placeholderTitle`
     - `placeholderDescription`
   - 把 `tableDescription` 改为真实页面语义，不再强调 mock 验证阶段

### 当前实现边界

本轮明确保持：

1. 未重做表格字段结构
2. 未扩展新的业务动作按钮
3. 未新增新的 mock 回退逻辑
4. 若后续真实数据异常，仍应按系统既有加载/错误链路处理，而不是重新显示演示卡片

### 验证结果

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. 前端 TypeScript 编译校验通过。

### 当前阶段结论

这一步已经把应收 / 应付页面从“过渡演示页面”纠偏为“真实业务页面”视觉语义：样式已回到通用工业风体系，演示卡片已移除，mock / placeholder 残留文案已清理。当前页面展示更符合 `GEMINI.md` 的后端权威与 fail loudly 原则，也不再向用户传达“这里只是演示壳层”的错误信号。

### 补充修正：表格表头与说明区字体继续纠偏

根据后续视觉检查，继续收紧了应收 / 应付列表区域里“默认表格字体感过强”的问题：

1. 表格说明区改为更贴近系统通用列表页的说明层级：
   - `text-[11px] md:text-sm`
   - `leading-6`
   - `text-muted-foreground/80`

2. 表格表头改为工业风小号高字重标题：
   - `text-[10px]`
   - `font-black`
   - `uppercase`
   - `tracking-widest`
   - `text-muted-foreground/60`

3. 表格正文单元格补齐统一间距与字重：
   - `px-4 md:px-6`
   - `py-3`
   - 首列 `font-medium`
   - 金额列 `tabular-nums`

本次补充修正后，应收 / 应付两页的列表卡片顶部说明区、表头字体、正文层级已经更接近系统中其它工业风列表页的表现。

补充验证：

1. `pnpm exec tsc --noEmit`
   - 通过

### 补充修正：应收 / 应付清单卡片说明文字对齐正常卡片辅助说明

根据继续核对，进一步把应收 / 应付“清单卡片”里的说明文字收口到系统中更常见的卡片辅助说明样式：

1. 使用：
   - `text-[10px] md:text-[11px]`
   - `font-medium`
   - `leading-5`
   - `text-muted-foreground/70`

2. 作用范围：
   - `src/features/trading/receivables/tabs/sales-receivables-tab.tsx`
   - `src/features/trading/payables/tabs/purchase-payables-tab.tsx`

3. 目的：
   - 让“查看应收/应付台账余额、账龄状态...”这类卡片说明文字，不再显得过大或过硬，而是回到系统里普通卡片说明文本的视觉档位。

## 2026-04-13 - feat：独立搜索弹窗式台账选择器

### 本轮目标

在远程搜索、筛选、排序与动态币种来源都已经具备之后，继续把台账选择从 allocation 行内控件提升为独立搜索弹窗，降低表单行内控件堆叠复杂度，并为后续更丰富的候选展示留出空间。

### 实现细节

1. **新增可复用独立搜索弹窗组件**
   - 新增 `src/features/trading/components/ledger-search-dialog.tsx`
   - 弹窗内部承载：
     - 关键词搜索
     - 状态筛选
     - 动态币种筛选
     - 金额区间筛选
     - 排序字段 / 排序方向
     - 候选列表单选
   - 交互模型采用：
     - 单选后确认
     - 支持取消关闭
     - 不点击即回填

2. **应收详情弹层接入弹窗触发入口**
   - 更新 `src/features/trading/receivables/components/sales-receivable-detail-dialog.tsx`
   - 每条 allocation 行改为：
     - 展示当前已选台账文本
     - 点击“选择台账”打开独立弹窗
   - 详情弹层额外维护：
     - 当前正在编辑的 `sequenceNo`
     - 弹窗开关状态
   - 确认后只回填当前目标行 `ledgerId`

3. **应付详情弹层接入弹窗触发入口**
   - 更新 `src/features/trading/payables/components/purchase-payable-detail-dialog.tsx`
   - 行为与应收侧保持一致：
     - 行内最小展示
     - 弹窗中完成搜索、筛选、排序与选择确认
     - 回填当前目标 allocation 行

4. **复用现有搜索 authority**
   - 本轮没有新增后端接口
   - 继续复用既有：
     - 远程搜索接口
     - 结构化筛选
     - 服务端排序
     - finance currency authority 动态币种来源

### 当前实现边界

本轮明确保持：

1. 当前仅支持单选后确认，不支持多选
2. 当前不支持批量回填多个 allocation 行
3. 当前未扩成分页结果表格
4. 当前仍不是完整对账工作台

### 验证结果

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. 前端 TypeScript 编译校验通过。

### 当前阶段结论

这一步已经把 AR/AP 台账选择从“表单行内控件”推进到“独立搜索弹窗”阶段。当前 allocation 行只负责展示当前值与触发选择动作，复杂的搜索、筛选、排序与候选承载都被收口到独立弹窗中，交互边界更清晰，也更适合后续继续增强候选展示能力。

## 2026-04-13 - feat：币种下拉切换为系统动态来源

### 本轮目标

在状态/币种字典化下拉已经落地后，继续把币种从“本地常量字典”提升为“系统真实 authority 动态来源”，避免后续因为硬编码常量遗漏财务配置中的真实币种。

### authority 判定结果

本轮确认系统内现成币种 authority 已存在，无需新造接口：

1. **后端 authority**
   - `server/services/finance_master_service.go`
   - `ListCurrencies()`

2. **前端只读服务**
   - `src/features/finance/services/currency-core-service.ts`
   - `CurrencyCoreService.getCurrencies()`

3. **前端可复用资源 hook**
   - `src/features/trading/hooks/use-trading-finance-resources.ts`
   - 已支持 `includeCurrencies: true` 读取币种列表

因此本轮直接复用现有 finance currency authority，而不是继续维护 AR/AP 本地币种副本。

### 实现细节

1. **应收详情弹层接入动态币种来源**
   - 更新 `src/features/trading/receivables/components/sales-receivable-detail-dialog.tsx`
   - 复用 `useTradingFinanceResources({ includeCurrencies: true })`
   - 币种下拉改为动态渲染 `currencies`
   - 仅展示 `Active` 币种

2. **应付详情弹层接入动态币种来源**
   - 更新 `src/features/trading/payables/components/purchase-payable-detail-dialog.tsx`
   - 复用 `useTradingFinanceResources({ includeCurrencies: true })`
   - 币种下拉改为动态渲染 `currencies`
   - 仅展示 `Active` 币种

3. **失败兜底策略**
   - 动态币种加载中：显示“币种字典加载中”
   - 动态币种为空且非 loading：禁用币种下拉，并显示“币种字典加载失败，请稍后重试”
   - 明确不再静默退回本地硬编码币种常量，避免用户误以为仍是系统真实配置

### 当前实现边界

本轮明确保持：

1. 状态下拉仍保持本地受控枚举
2. 当前币种展示使用 `code`，未额外拼接名称/符号
3. 当前未额外新增币种专用错误边界组件，仅在表单内做轻量提示
4. 当前未修改后端 AR/AP search 语义，仍只按传入 `currency` 过滤

### 验证结果

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. 前端 TypeScript 编译校验通过。

### 当前阶段结论

这一步已经把 AR/AP 台账搜索里的币种筛选从“本地常量字典”切换为“系统 finance currency authority 动态来源”。当前行为更符合系统真实配置，也更不容易因为后续新增币种或财务配置调整而遗漏同步。下一步若继续推进，更值得做的是币种下拉展示名称/符号增强，以及独立搜索弹窗阶段的交互升级。

## 2026-04-13 - feat：状态/币种字典化下拉 + 服务端排序

### 本轮目标

在远程搜索筛选增强之后，继续提升台账选择器的可控性与结果可预测性：把状态/币种筛选从自由输入升级为字典化下拉，并让后端 search 接口支持受控排序。

### 实现细节

1. **后端 search query 增加排序参数**
   - 更新 `server/services/ar_ap_dto.go`
   - `LedgerSearchQuery` 新增：
     - `SortBy`
     - `SortOrder`

2. **后端 handler 解析排序参数**
   - 更新 `server/handlers/ar_ap_handlers.go`
   - 应收 / 应付 search handler 现支持解析：
     - `sortBy`
     - `sortOrder`

3. **后端 search service 增加排序白名单**
   - 更新 `server/services/ar_ap_query_service.go`
   - 新增排序字段白名单：
     - `updated_at`
     - `outstanding_amount`
     - `ledger_no`
   - 默认排序：
     - `updated_at desc`
   - 当前排序方向支持：
     - `asc`
     - `desc`

4. **前端 search query key 扩展排序参数**
   - 更新 `src/features/trading/query-keys.ts`
   - 把 `sortBy / sortOrder` 纳入 search query key，避免缓存串用

5. **前端 search service / hook 扩展排序参数**
   - 更新 `src/features/trading/receivables/services/receivables-query-service.ts`
   - 更新 `src/features/trading/payables/services/payables-query-service.ts`
   - 更新 `src/features/trading/receivables/hooks/use-receivables.ts`
   - 更新 `src/features/trading/payables/hooks/use-payables.ts`

6. **前端详情弹层接入字典化下拉与排序控件**
   - 更新 `src/features/trading/receivables/components/sales-receivable-detail-dialog.tsx`
   - 更新 `src/features/trading/payables/components/purchase-payable-detail-dialog.tsx`
   - 当前新增/升级控件：
     - 状态 `Select`
     - 币种 `Select`
     - 排序字段 `Select`
     - 排序方向 `Select`

7. **独立搜索弹窗明确延期**
   - 本轮不实现独立搜索弹窗
   - 该项保留到下一阶段，避免与当前筛选/排序增强混做造成交互结构大改

### 当前实现边界

本轮明确保持：

1. 状态 / 币种候选仍是本地最小字典，不引入新的远程字典源
2. 排序字段采用白名单，不支持任意列排序
3. 当前仍未扩成独立搜索弹窗
4. 当前仍未扩成分页结果表格

### 验证结果

已执行：

1. `go test ./handlers ./routes ./db -run "ArAp|^$"`
2. `pnpm exec tsc --noEmit`

结果：

1. 后端定向校验通过。
2. 前端 TypeScript 编译校验通过。

### 当前阶段结论

这一步已经把远程搜索式台账选择器从“基础筛选增强”推进到“可控筛选 + 可控排序”的阶段。当前 AR/AP allocation 选择器已经具备：关键词远程搜索、状态/币种字典化下拉、金额区间筛选、服务端排序，以及远程候选优先展示。下一阶段更适合单独推进独立搜索弹窗，而不是继续在当前弹层内堆叠更多交互控件。

## 2026-04-13 - feat：远程搜索筛选增强

### 本轮目标

在真正的远程搜索式台账选择器已经落地后，继续增强最常用的结构化筛选能力，让搜索结果在中等规模数据下更快收敛，而不把选择器扩成复杂查询工作台。

### 实现细节

1. **后端 search query 增加结构化筛选参数**
   - 更新 `server/services/ar_ap_dto.go`
   - `LedgerSearchQuery` 新增：
     - `Currency`
     - `OutstandingMin`
     - `OutstandingMax`

2. **后端 handler 解析筛选参数**
   - 更新 `server/handlers/ar_ap_handlers.go`
   - 应收 / 应付 search handler 现支持解析：
     - `status`
     - `currency`
     - `outstandingMin`
     - `outstandingMax`

3. **后端 search service 增加筛选逻辑**
   - 更新 `server/services/ar_ap_query_service.go`
   - 当前过滤语义：
     - `status` 精确匹配
     - `currency` 精确匹配
     - `outstandingMin >=`
     - `outstandingMax <=`

4. **前端 query key 扩展为结构化筛选缓存键**
   - 更新 `src/features/trading/query-keys.ts`
   - 把 `keyword / status / currency / outstandingMin / outstandingMax` 全部纳入 search query key

5. **前端 search service / hook 改为结构化参数版本**
   - 更新 `src/features/trading/receivables/services/receivables-query-service.ts`
   - 更新 `src/features/trading/payables/services/payables-query-service.ts`
   - 更新 `src/features/trading/receivables/hooks/use-receivables.ts`
   - 更新 `src/features/trading/payables/hooks/use-payables.ts`

6. **前端详情弹层接入轻量筛选 UI**
   - 更新 `src/features/trading/receivables/components/sales-receivable-detail-dialog.tsx`
   - 更新 `src/features/trading/payables/components/purchase-payable-detail-dialog.tsx`
   - 当前新增筛选项：
     - 状态
     - 币种
     - 未结最小值
     - 未结最大值
   - 继续保留：
     - 关键词 debounce 搜索
     - 远程候选优先展示
     - 本地列表映射兜底

### 当前实现边界

本轮明确保持：

1. 当前筛选仍是轻量结构化参数，不是高级 DSL
2. 当前状态 / 币种筛选仍使用简单输入，不是受控字典下拉
3. 当前未扩成独立搜索弹窗或结果表格
4. 当前仍未补服务端排序策略配置

### 验证结果

已执行：

1. `go test ./handlers ./routes ./db -run "ArAp|^$"`
2. `pnpm exec tsc --noEmit`

结果：

1. 后端定向校验通过。
2. 前端 TypeScript 编译校验通过。

### 当前阶段结论

这一步已经把远程搜索式台账选择器从“只有关键词搜索”推进到“支持常用结构化筛选”的阶段。当前 AR/AP allocation 选择器已经具备：关键词远程搜索、状态筛选、币种筛选、金额区间筛选，以及远程候选优先展示。后续如果继续推进，更值得做的是状态/币种字典化下拉、结果分页、服务端排序与独立搜索弹窗，而不是继续扩增原始输入框数量。

## 2026-04-13 - feat：真正远程搜索式台账选择器落地

### 本轮目标

在客户端过滤版台账选择器已经可用的基础上，继续把 allocation 编辑器升级为真正的远程搜索式台账选择器：后端提供 search API，前端以 debounce 方式远程查询候选项，不再把已加载列表缓存作为唯一候选来源。

### 实现细节

1. **后端新增应收 / 应付台账 search DTO**
   - 更新 `server/services/ar_ap_dto.go`
   - 新增：
     - `LedgerSearchQuery`
     - `LedgerSearchCandidateResponse`
     - `LedgerSearchResponse`

2. **后端新增应收 / 应付台账 search service**
   - 更新 `server/services/ar_ap_query_service.go`
   - 新增：
     - `SearchReceivableLedgers()`
     - `SearchPayableLedgers()`
   - 支持：
     - `keyword`
     - `page`
     - `pageSize`
     - `status`
   - 当前搜索字段：
     - 应收：`ledger_no / customer_name`
     - 应付：`ledger_no / supplier_name`

3. **后端新增 search handler 与 route**
   - 更新 `server/handlers/ar_ap_handlers.go`
   - 更新 `server/routes/routes_ar_ap.go`
   - 新增接口：
     - `GET /receivables/search`
     - `GET /payables/search`

4. **后端路由校验同步补充**
   - 更新 `server/routes/routes_ar_ap_test.go`
   - 断言 search 路由已注册

5. **前端新增远程搜索 DTO / service / hook**
   - 更新 `src/features/trading/query-keys.ts`
   - 更新 `src/features/trading/receivables/contracts/receivable-api-dto.ts`
   - 更新 `src/features/trading/payables/contracts/payable-api-dto.ts`
   - 更新 `src/features/trading/receivables/services/receivables-query-service.ts`
   - 更新 `src/features/trading/payables/services/payables-query-service.ts`
   - 更新 `src/features/trading/receivables/hooks/use-receivables.ts`
   - 更新 `src/features/trading/payables/hooks/use-payables.ts`

6. **前端详情弹层接入 debounce 远程搜索**
   - 更新 `src/features/trading/receivables/components/sales-receivable-detail-dialog.tsx`
   - 更新 `src/features/trading/payables/components/purchase-payable-detail-dialog.tsx`
   - 当前行为：
     - 输入搜索词后 300ms debounce
     - 关键词长度达到阈值后触发远程查询
     - 选择器优先展示远程返回候选项
     - 本地列表仍作为回退展示映射来源

### 当前实现边界

本轮明确保持：

1. 当前远程搜索仍使用简单关键词匹配，不是高级条件组合查询
2. 当前仍未扩为独立搜索弹窗或分页表格选择器
3. 当前候选展示仍以最小字段为主，不返回完整 detail payload
4. 当前本地列表映射逻辑仍保留，作为过渡与兜底

### 验证结果

已执行：

1. `go test ./handlers ./routes ./db -run "ArAp|^$"`
2. `pnpm exec tsc --noEmit`

结果：

1. 后端路由 / handler 定向校验通过。
2. 前端 TypeScript 编译校验通过。

### 当前阶段结论

这一步已经把 AR/AP allocation 选择器从“本地过滤版搜索”推进到“真正远程搜索式选择器”的阶段。当前详情弹层已经具备：allocation 编辑、历史分组展示、目标台账展示名映射、历史筛选，以及后端 search API 支撑的 debounce 远程台账选择能力。后续如果继续推进，更值得做的是 search 结果分页、状态筛选、选择器独立弹窗，以及彻底移除对本地列表映射的过渡依赖。

## 2026-04-13 - feat：搜索式台账选择器 + allocation 历史筛选

### 本轮目标

在已经具备台账选择器和 allocation 历史分组展示之后，继续提升可用性：为台账选择器补客户端搜索能力，并为 allocation 历史补筛选能力，降低数据量上来后的操作成本。

### 实现细节

1. **应收台账选择器增加搜索过滤**
   - 更新 `src/features/trading/receivables/components/sales-receivable-detail-dialog.tsx`
   - 新增 `ledgerSearchTerm`
   - 当前可按以下信息过滤台账候选：
     - 单据编号
     - 客户名称
     - 未收金额

2. **应付台账选择器增加搜索过滤**
   - 更新 `src/features/trading/payables/components/purchase-payable-detail-dialog.tsx`
   - 新增 `ledgerSearchTerm`
   - 当前可按以下信息过滤台账候选：
     - 单据编号
     - 供应商名称
     - 未付金额

3. **allocation 历史增加筛选词**
   - 应收 / 应付详情弹层均新增 `historySearchTerm`
   - 当前可按以下信息筛选历史分组：
     - `recordNo`
     - `recordDate`
     - 目标台账展示名
     - `remark`
     - `allocatedAmount`

4. **保持客户端过滤，不改后端 authority**
   - 本轮搜索与筛选均基于当前已加载数据做前端过滤
   - 不引入新的后端搜索接口

### 当前实现边界

本轮明确保持：

1. 当前搜索仍是客户端过滤，不是远程搜索
2. 当前选择器还不是弹出式搜索面板，仅是在现有弹层内增加搜索输入
3. 当前历史筛选未补高级条件组合，仅支持单关键词过滤

### 验证结果

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. 前端 TypeScript 编译校验通过。

### 当前阶段结论

这一步已经把 AR/AP 弹层从“基本可用”推进到“中等数据量下仍可操作”的阶段。当前详情弹层已经同时具备：allocation 编辑、台账选择器、按记录号分组的历史展示、目标台账展示名映射、客户端搜索与历史筛选。后续如果继续推进，更适合进入远程搜索、筛选持久化和专门对账工作台阶段，而不是继续堆叠基础弹层能力。

## 2026-04-13 - feat：allocation 历史按记录号分组 + 目标台账展示名映射

### 本轮目标

在已经具备 allocation 历史基础展示之后，继续把历史区域从“平铺底层字段”提升成更接近业务阅读的模式：按 `recordNo` 分组，并把目标台账从 `ledgerId` 映射为可读展示名。

### 实现细节

1. **后端 detail 数据继续对齐历史展示需求**
   - 更新 `server/services/ar_ap_dto.go`
   - 更新 `server/services/ar_ap_query_service.go`
   - 保持 detail 输出包含：
     - `receiptRecords / paymentRecords`
     - `allocations`
   - 让前端能够基于 `receiptRecordId / paymentRecordId` 做历史分组

2. **应收历史按记录号分组展示**
   - 更新 `src/features/trading/receivables/components/sales-receivable-detail-dialog.tsx`
   - 当前行为：
     - 以 `receiptRecord` 为分组头
     - 每组下展示对应 allocations

3. **应付历史按记录号分组展示**
   - 更新 `src/features/trading/payables/components/purchase-payable-detail-dialog.tsx`
   - 当前行为：
     - 以 `paymentRecord` 为分组头
     - 每组下展示对应 allocations

4. **目标台账展示名映射**
   - 前端使用现有列表数据 + 当前详情台账信息构造显示映射
   - 当前展示格式：
     - 单据编号
     - 往来方名称
     - 当前未结金额

### 当前实现边界

本轮明确保持：

1. 当前展示名映射仍依赖前端已加载列表数据，不是后端直接回传的完整 displayName
2. 当前历史分组仍在详情弹层内展示，未拆为专门的对账历史页
3. 当前未补 allocation 历史的筛选 / 搜索 / 展开折叠能力

### 验证结果

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. 前端 TypeScript 编译校验通过。

### 当前阶段结论

这一步已经把 allocation 历史从“技术字段列表”推进到“按记录号分组、可读展示目标台账”的阶段。当前 AR/AP 详情弹层已经同时具备：allocation 编辑、台账选择器、历史展示和按记录分组的阅读能力。后续如果继续推进，更值得做的是搜索式台账选择器、历史筛选与更完整的对账工作台，而不是再补基础可读性。

## 2026-04-13 - feat：allocation 历史明细展示接入

### 本轮目标

在已经具备 allocation 编辑与提交能力后，继续补上 allocation 历史明细展示，让应收 / 应付详情弹层不仅能“登记分摊”，也能直接看到“已经如何分摊过”。

### 实现细节

1. **后端 detail response 增加 allocations**
   - 更新 `server/services/ar_ap_dto.go`
   - `ReceivableLedgerDetailResponse / PayableLedgerDetailResponse` 新增 `allocations`

2. **后端 detail 查询预加载 settlement mappings**
   - 更新 `server/services/ar_ap_query_service.go`
   - 当前 detail 查询已预加载：
     - `ReceiptRecords / PaymentRecords`
     - `SettlementMappings`
   - detail 映射时同步输出 allocation 历史明细

3. **前端 detail DTO 对齐 allocations**
   - 更新 `src/features/trading/receivables/contracts/receivable-api-dto.ts`
   - 更新 `src/features/trading/payables/contracts/payable-api-dto.ts`

4. **应收详情弹层展示 allocation 历史**
   - 更新 `src/features/trading/receivables/components/sales-receivable-detail-dialog.tsx`
   - 当前展示字段：
     - `sequenceNo`
     - `ledgerId`
     - `allocatedAmount`
     - `remark`

5. **应付详情弹层展示 allocation 历史**
   - 更新 `src/features/trading/payables/components/purchase-payable-detail-dialog.tsx`
   - 当前展示字段：
     - `sequenceNo`
     - `ledgerId`
     - `allocatedAmount`
     - `remark`

### 当前实现边界

本轮明确保持：

1. 当前历史明细以 allocation 基础字段展示为主，尚未补目标台账名称映射
2. 当前仍未把 allocation 历史和具体 `recordNo` 做更细粒度的分组展示
3. 当前仍未扩成专门的对账明细页

### 验证结果

已执行：

1. `go test ./handlers ./routes ./db -run "CreateReceiptRecordHandler|CreatePaymentRecordHandler|^$"`
2. `pnpm exec tsc --noEmit`

结果：

1. 后端定向校验通过。
2. 前端 TypeScript 编译校验通过。

### 当前阶段结论

这一步已经把 AR/AP 详情弹层从“只能录入 allocation”推进到“既能录入，也能查看 allocation 历史”的阶段。当前闭环已经覆盖：台账列表、详情读取、allocation 编辑、台账选择器、allocation 历史展示。后续更自然的增强点将是 allocation 历史按记录号分组、目标台账展示名映射，以及搜索式台账选择器，而不是再补基础骨架。

## 2026-04-13 - feat：allocation 编辑器接入台账选择器

### 本轮目标

在前端已经支持多条 allocation 编辑之后，继续把 `ledgerId` 的手工输入替换为台账选择器，降低误填风险并改善核销分摊录入体验。

### 实现细节

1. **应收分摊行接入台账选择器**
   - 更新 `src/features/trading/receivables/components/sales-receivable-detail-dialog.tsx`
   - 复用 `useGetReceivables()` 列表结果生成可选项
   - 分摊行中的 `ledgerId` 从手工输入改为选择器

2. **应付分摊行接入台账选择器**
   - 更新 `src/features/trading/payables/components/purchase-payable-detail-dialog.tsx`
   - 复用 `useGetPayables()` 列表结果生成可选项
   - 分摊行中的 `ledgerId` 从手工输入改为选择器

3. **当前选择器展示信息**
   - 每个选项展示：
     - 单据编号
     - 往来方名称
     - 当前未结金额

### 当前实现边界

本轮明确保持：

1. 当前选择器仍基于已有列表数据，不是独立搜索弹窗
2. 当前未补模糊搜索 / 远程筛选能力
3. 当前 allocation 历史展示仍未单独展开

### 验证结果

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. 前端 TypeScript 编译校验通过。

### 当前阶段结论

这一步已经把 allocation 编辑器从“可编辑但仍需手填 ledgerId”推进到“可直接选择目标台账”的阶段。这样当前 AR/AP 的核销分摊体验已经具备基本可用性，后续更值得继续推进的是搜索式台账选择器、allocation 历史明细展示，以及更完整的对账交互，而不是再回退到原始输入模式。

## 2026-04-13 - feat：前端多条 allocation 编辑器接入

### 本轮目标

在后端已经切换到 `record + allocations` authority 后，把应收 / 应付详情弹层从“单金额兼容层”升级为真正可编辑多条 allocation 的前端模式，支持录入多笔分摊行并提交真实 `allocations[]`。

### 实现细节

1. **应收详情弹层升级为 allocation 编辑器**
   - 更新 `src/features/trading/receivables/components/sales-receivable-detail-dialog.tsx`
   - 当前支持：
     - 多条分摊行
     - 新增分摊行
     - 删除分摊行
     - 编辑 `ledgerId / allocatedAmount / remark`
     - 计算分摊合计并按真实 `allocations[]` 提交

2. **应付详情弹层升级为 allocation 编辑器**
   - 更新 `src/features/trading/payables/components/purchase-payable-detail-dialog.tsx`
   - 当前支持：
     - 多条分摊行
     - 新增分摊行
     - 删除分摊行
     - 编辑 `ledgerId / allocatedAmount / remark`
     - 计算分摊合计并按真实 `allocations[]` 提交

3. **基础前端校验**
   - 提交前要求：
     - 至少存在一条 allocation
     - allocation 合计金额大于 0
     - 每条分摊行具备 `ledgerId`
     - 每条分摊行金额大于 0

4. **保持 authority 在后端**
   - 前端当前只做输入编排与合计提示
   - 最终金额守恒、超额校验、非法状态校验仍由后端裁决

### 当前实现边界

本轮明确保持：

1. 当前分摊目标 ledger 仍以手工输入 `ledgerId` 为主，还未做专门的台账选择器
2. 当前仍是详情弹层内编辑，不是完整对账工作台
3. 当前未补 allocation 历史明细的专门展示区域

### 验证结果

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. 前端 TypeScript 编译校验通过。

### 当前阶段结论

这一步已经把前端从“单条 allocation 兼容模式”推进到“可编辑多条 allocation 的真实分摊输入模式”。这样 AR/AP 在当前阶段已经形成了从后端 allocation authority 到前端分摊编辑器的完整闭环，后续若继续推进，更合理的重点将是台账选择器、allocation 历史展示与更完整的对账交互，而不是再回退到单金额登记模型。

## 2026-04-13 - feat：SettlementAllocation 核销分摊阶段落地（后端 authority + 前端兼容层）

### 本轮目标

在已有 AR/AP 最小登记骨架的基础上，继续把“单台账直接回写”的临时模式升级为 `SettlementAllocation` 核销分摊模式，确保登记记录与实际核销关系可审计、可扩展，并先为现有前端补一层兼容包装，避免接口升级后页面失效。

### 实现细节

1. **后端登记 DTO 升级为 `record + allocations`**
   - 更新 `server/services/ar_ap_dto.go`
   - 新增：
     - `SettlementAllocationRequest`
     - `SettlementAllocationResponse`
   - `CreateReceiptRecordRequest / CreatePaymentRecordRequest` 新增 `allocations`
   - `CreateReceiptRecordResponse / CreatePaymentRecordResponse` 新增 `allocations`

2. **后端正式落地 `SettlementAllocation` 写入逻辑**
   - 更新 `server/services/ar_ap_query_service.go`
   - 当前登记流程已升级为：
     - 创建 `ReceiptRecord / PaymentRecord`
     - 校验 allocation 明细
     - 创建 `SettlementAllocation`
     - 同事务回写 ledger 的 `settledAmount / outstandingAmount / status / version`

3. **新增 allocation 级校验**
   - 当前已覆盖：
     - `allocations` 不能为空
     - allocation 合计必须等于 `record.amount`
     - allocation 金额不得超过目标 ledger 当前 `outstandingAmount`
     - 已结清 / 已作废 / 已取消 ledger 不允许继续分摊

4. **handler 错误映射补齐**
   - 更新 `server/handlers/ar_ap_handlers.go`
   - 对以下错误返回 400：
     - 分摊明细为空
     - 合计不一致
     - 超额分摊
     - 非法台账状态

5. **新增 AR/AP handler 负向测试**
   - 新增 `server/handlers/ar_ap_handlers_test.go`
   - 覆盖：
     - 金额与 allocation 合计不一致
     - 超额分摊
     - 已结清台账重复分摊
   - 测试数据库采用手工建表，绕开 SQLite 对 `uuid DEFAULT gen_random_uuid()` 的 DDL 兼容问题

6. **前端增加 allocation 兼容层**
   - 更新：
     - `src/features/trading/receivables/contracts/receivable-api-dto.ts`
     - `src/features/trading/payables/contracts/payable-api-dto.ts`
     - `src/features/trading/receivables/components/sales-receivable-detail-dialog.tsx`
     - `src/features/trading/payables/components/purchase-payable-detail-dialog.tsx`
   - 当前行为：
     - 现有“单金额登记”会自动包装为单条 allocation 请求
     - 不需要立即推翻现有详情弹层交互

### 当前实现边界

本轮明确保持：

1. 后端已进入 allocation authority 模式，但前端仍只是单条 allocation 兼容层
2. 当前前端尚未支持多条 allocation 手工编辑
3. 当前仍未进入完整对账工作台
4. 当前仍未补并发锁 / 乐观锁级的更严格核销冲突保护

### 验证结果

已执行：

1. `go test ./handlers -run "CreateReceiptRecordHandler|CreatePaymentRecordHandler"`
2. `go test ./handlers ./routes ./db -run "CreateReceiptRecordHandler|CreatePaymentRecordHandler|^$"`
3. `pnpm exec tsc --noEmit`

结果：

1. AR/AP handler 负向测试通过。
2. 后端 routes/db 定向校验通过。
3. 前端 TypeScript 编译校验通过。

### 当前阶段结论

这一步已经把 AR/AP 从“登记后直接回写单台账”的临时骨架推进到“登记记录 + allocation 分摊 + 台账同事务回写”的正式方向。虽然前端还只是单条 allocation 兼容模式，但后端 authority 已经切换到可继续扩展多台账核销的结构上，下一阶段只需要把前端弹层升级为真正可编辑多条 allocation 的模式，而不需要再推翻后端模型。

## 2026-04-13 - feat：前端应收 / 应付详情弹层与最小登记入口接入

### 本轮目标

在后端已经具备 AR/AP 详情读取与登记骨架接口之后，继续把前端页面从“只能看列表”推进到“可查看详情并登记一笔最小收款 / 付款”的阶段，但仍然不进入完整核销分摊界面。

### 实现细节

1. **补充前端 detail / settlement contracts**
   - 更新 `src/features/trading/receivables/contracts/receivable-api-dto.ts`
   - 更新 `src/features/trading/payables/contracts/payable-api-dto.ts`
   - 新增详情 DTO 与收款 / 付款登记 DTO

2. **补充 query key**
   - 更新 `src/features/trading/query-keys.ts`
   - 新增：
     - `receivableDetail(id)`
     - `payableDetail(id)`

3. **补充详情与登记 services**
   - 新增 `src/features/trading/receivables/services/receivable-ledger-detail-service.ts`
   - 新增 `src/features/trading/payables/services/payable-ledger-detail-service.ts`
   - 当前支持：
     - 读取详情
     - 提交最小收款 / 付款登记

4. **补充详情与登记 hooks**
   - 新增 `src/features/trading/receivables/hooks/use-receivable-ledger-detail.ts`
   - 新增 `src/features/trading/payables/hooks/use-payable-ledger-detail.ts`
   - 登记成功后自动失效列表与详情缓存

5. **新增独立详情弹层组件**
   - 新增 `src/features/trading/receivables/components/sales-receivable-detail-dialog.tsx`
   - 新增 `src/features/trading/payables/components/purchase-payable-detail-dialog.tsx`
   - 当前弹层能力：
     - 展示台账基础信息
     - 展示历史收款 / 付款记录
     - 提交一笔最小登记

6. **页面接线**
   - 更新 `src/features/trading/receivables/tabs/sales-receivables-tab.tsx`
   - 更新 `src/features/trading/payables/tabs/purchase-payables-tab.tsx`
   - 当前行为：
     - 点击列表行打开详情弹层
     - 在弹层中提交最小登记

### 当前实现边界

本轮明确保持：

1. 当前 UI 仍是最小详情弹层，不是完整详情页
2. 当前登记表单仅提交金额、日期、参考号等基础字段
3. 仍未进入 allocation 核销分摊 UI
4. 仍未补账龄分析专用视图与完整错误原因映射

### 验证结果

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. 前端 TypeScript 编译校验通过。

### 当前阶段结论

这一步已经把 AR/AP 前端从“只读列表”推进到“列表 + 详情弹层 + 最小收款/付款登记”的阶段。这样后续如果继续推进，只需要在现有 detail / mutation 结构上继续扩展 allocation、核销分摊与更完整的详情展示，而不需要再推翻当前的低耦合子域组织。

## 2026-04-13 - feat：AR/AP 详情读取与收款/付款登记骨架

### 本轮目标

在已经具备独立 ledger 模型与列表级只读接口的基础上，继续向前推进 AR/AP 的详情读取能力，以及最小收款/付款登记骨架，但仍然不进入完整 allocation 核销算法和复杂财务闭环。

### 实现细节

1. **补充 AR/AP 详情 DTO**
   - 更新 `server/services/ar_ap_dto.go`
   - 新增：
     - `ReceivableLedgerDetailResponse`
     - `PayableLedgerDetailResponse`
     - `ReceiptRecordResponse`
     - `PaymentRecordResponse`
     - `CreateReceiptRecordRequest/Response`
     - `CreatePaymentRecordRequest/Response`

2. **补充详情查询服务**
   - 更新 `server/services/ar_ap_query_service.go`
   - 新增：
     - `GetReceivableLedgerByID(...)`
     - `GetPayableLedgerByID(...)`

3. **补充最小收款/付款登记骨架**
   - 更新 `server/services/ar_ap_query_service.go`
   - 新增：
     - `CreateReceiptRecord(...)`
     - `CreatePaymentRecord(...)`
   - 当前行为：
     - 新建 `ReceiptRecord / PaymentRecord`
     - 回写 ledger 的 `settledAmount / outstandingAmount / status / version`
     - 返回登记后的 ledger 详情与记录对象

4. **补充 handler 与 route**
   - 更新 `server/handlers/ar_ap_handlers.go`
   - 更新 `server/routes/routes_ar_ap.go`
   - 更新 `server/routes/routes_ar_ap_test.go`
   - 当前新增接口：
     - `GET /api/v1/receivables/:id`
     - `GET /api/v1/payables/:id`
     - `POST /api/v1/receivables/:id/receipts`
     - `POST /api/v1/payables/:id/payments`

### 当前实现边界

本轮明确保持：

1. 已有详情读取接口，但前端尚未扩写详情弹层或登记表单
2. 已有最小收款/付款登记骨架，但仍未实现 `SettlementAllocation` 分摊算法
3. 当前登记逻辑是“单台账直接回写 settled/outstanding”的骨架实现
4. 账龄仍是骨架级派生，不代表完整账龄分析已完成

### 验证结果

已执行：

1. `go test ./handlers ./routes ./db -run ^$`

结果：

1. 后端定向编译校验通过。

### 当前阶段结论

这一步已经把 AR/AP 从“只有列表级只读接口”推进到“具备详情读取与最小登记骨架”的阶段。当前后端已经具备继续往登记表单、详情面板和 allocation 核销逻辑扩展的结构基础，但还没有把本轮扩大为完整财务闭环。

## 2026-04-13 - feat：独立 AR/AP 后端模型骨架与真实只读接口接入

### 本轮目标

在完成严格后端规划确认后，正式落地独立 AR/AP 后端主模型骨架，并提供最小真实只读接口，避免继续把前端页面长期挂在 mock 数据上。

### 实现细节

1. **新增独立 AR/AP 后端模型骨架**
   - 新增 `server/models/ar_ap_ledger.go`
   - 落地：
     - `ReceivableLedger`
     - `PayableLedger`
     - `ReceiptRecord`
     - `PaymentRecord`
     - `SettlementAllocation`

2. **接入数据库迁移**
   - 更新 `server/db/db.go`
   - 将上述 AR/AP 模型加入 `AutoMigrate`

3. **新增后端 DTO 与查询服务**
   - 新增 `server/services/ar_ap_dto.go`
   - 新增 `server/services/ar_ap_query_service.go`
   - 当前提供：
     - 分页列表响应
     - 汇总字段响应
     - 独立 ledger 查询映射

4. **新增后端 handler 与 route**
   - 新增 `server/handlers/ar_ap_handlers.go`
   - 新增 `server/routes/routes_ar_ap.go`
   - 新增 `server/routes/routes_ar_ap_test.go`
   - 更新 `server/routes/routes.go`
   - 当前新增只读接口：
     - `GET /api/v1/receivables`
     - `GET /api/v1/payables`

5. **前端切换为真实 API**
   - 更新 `src/features/trading/receivables/services/receivables-query-service.ts`
   - 更新 `src/features/trading/payables/services/payables-query-service.ts`
   - 从 mock service 切换到真实 `/receivables` / `/payables` 请求

6. **前后端 contract 对齐**
   - 后端当前列表项已按前端现有 `documentNo / invoiceAmount / receivedAmount / paidAmount / outstandingAmount / agingBucket / status` 结构输出
   - 这样可以在不重写前端表格组件的前提下先完成真实接口接入

### 当前实现边界

本轮明确保持：

1. 已落地独立 ledger / settlement 模型骨架，但尚未实现完整写流程
2. 当前只提供列表级只读接口，不包含详情、登记、核销写接口
3. `agingBucket` 当前仍是骨架级派生字段，不代表最终账龄引擎已完成
4. 当前没有把订单或 voucher 继续包装成 AR/AP 主模型，而是转为独立表语义

### 验证结果

已执行：

1. `go test ./handlers ./routes ./db -run ^$`
2. `pnpm exec tsc --noEmit`

结果：

1. 后端定向编译校验通过。
2. 前端 TypeScript 编译校验通过。

### 当前阶段结论

这一步已经把 AR/AP 从“前端独立子域壳层”推进到“后端独立模型 + 真实只读接口”的阶段。最关键的变化是：应收 / 应付终于不再依赖订单或 voucher 的语义挪用，而是拥有了独立 ledger 入口。下一阶段如果继续推进，优先级应是补详情接口、收款/付款记录写入、以及 allocation 级核销逻辑，而不是继续在前端扩展 mock 或临时拼装 authority。

## 2026-04-13 - feat：销售应收 / 采购应付只读查询壳层接入

### 本轮目标

在上一轮完成 Tab、路由和独立子域骨架之后，继续把 AR/AP 页面升级为可读的只读查询壳层，但仍然不进入真实后端 AR/AP authority、收款/付款登记或核销写操作。

### 实现细节

1. **为销售应收建立只读查询分层**
   - 新增 `src/features/trading/receivables/contracts/receivable-api-dto.ts`
   - 新增 `src/features/trading/receivables/adapters/receivable-api-adapter.ts`
   - 新增 `src/features/trading/receivables/services/receivables-query-service.ts`
   - 新增 `src/features/trading/receivables/hooks/use-receivables.ts`

2. **为采购应付建立只读查询分层**
   - 新增 `src/features/trading/payables/contracts/payable-api-dto.ts`
   - 新增 `src/features/trading/payables/adapters/payable-api-adapter.ts`
   - 新增 `src/features/trading/payables/services/payables-query-service.ts`
   - 新增 `src/features/trading/payables/hooks/use-payables.ts`

3. **接入 query key**
   - 更新 `src/features/trading/query-keys.ts`
   - 新增 `receivables()` 与 `payables()`，保持与现有 trading 查询缓存模式一致

4. **页面从占位升级为只读视图**
   - 更新 `src/features/trading/receivables/tabs/sales-receivables-tab.tsx`
   - 更新 `src/features/trading/payables/tabs/purchase-payables-tab.tsx`
   - 页面当前展示：
     - 汇总卡片
     - 只读表格
     - 当前阶段说明区

5. **补齐文案 key**
   - 更新 `src/locales/messages/zh-CN/trading.ts`
   - 更新 `src/locales/messages/en-US/trading.ts`
   - 更新 `src/locales/messages/zh-CN/purchase.ts`
   - 更新 `src/locales/messages/en-US/purchase.ts`

### 当前实现边界

本轮明确保持：

1. 当前 `receivables / payables` service 使用前端 mock 数据
2. 只读页面用于验证低耦合 contracts / adapters / hooks / queryKey 组织方式
3. 未引入真实后端 AR/AP handler / service / dto / route
4. 未新增收款、付款、核销、账龄重算等写逻辑
5. 未让前端按订单数据自行推导 authority，只是临时展示 mock 聚合结果

### 验证结果

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. TypeScript 编译校验通过。

### 当前阶段结论

这一步已经把 AR/AP 从“仅有空页面”推进到“具备 contracts / adapters / services / hooks / queryKeys / page view 的只读结构壳层”。这样后续如果后端补齐真实 AR/AP 查询接口，只需要替换 service 层与 DTO 即可，不需要再回头重做页面和子域组织。同时页面仍然保持低耦合，没有把应收 / 应付查询逻辑塞进销售订单页或采购订单页。

## 2026-04-13 - feat：销售应收 / 采购应付低耦合骨架接入

### 本轮目标

在不进入 AR/AP 真实业务实现的前提下，先把销售应收与采购应付的模块骨架接入现有销售管理 / 采购管理 Tab 宿主，确保后续可以在独立子域内继续演进，而不是把逻辑直接塞进销售订单页或采购订单页。

### 实现细节

1. **销售管理新增应收 Tab**
   - 更新 `src/features/trading/tabs.ts`
   - 新增 `/trading/receivables` 页签入口

2. **采购管理新增应付 Tab**
   - 更新 `src/features/purchase/tabs.ts`
   - 新增 `/purchase/payables` 页签入口

3. **建立独立子域页面骨架**
   - 新增 `src/features/trading/receivables/tabs/sales-receivables-tab.tsx`
   - 新增 `src/features/trading/payables/tabs/purchase-payables-tab.tsx`
   - 页面当前只承载模块标题、说明和占位内容，不接真实 AR/AP 查询或写操作

4. **接入文件路由骨架**
   - 新增 `src/routes/_authenticated/trading/receivables.tsx`
   - 新增 `src/routes/_authenticated/trading/receivables.lazy.tsx`
   - 新增 `src/routes/_authenticated/purchase/payables.tsx`
   - 新增 `src/routes/_authenticated/purchase/payables.lazy.tsx`

5. **补齐中英文文案**
   - 更新 `src/locales/messages/zh-CN/trading.ts`
   - 更新 `src/locales/messages/en-US/trading.ts`
   - 更新 `src/locales/messages/zh-CN/purchase.ts`
   - 更新 `src/locales/messages/en-US/purchase.ts`

### 明确保留不变的边界

本轮没有扩大范围：

1. 没有接入真实 AR/AP 后端查询
2. 没有修改现有销售订单 / 采购订单业务逻辑
3. 没有把 AR/AP 暂时塞进 `finance-management`
4. 没有在前端自行计算余额、账龄、逾期或核销状态

### 验证结果

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. TypeScript 编译校验通过。

### 当前阶段结论

这一步已经把“销售里挂应收、采购里挂应付”的最小接入层搭起来了，同时保持了物理隔离：入口仍在业务模块中，但页面与后续逻辑的承载位置已经拆到独立子域目录。下一阶段如果继续推进，应优先补只读查询契约与列表/统计视图，而不是把 AR/AP 状态和聚合逻辑回写到订单页面内部。

### 实现细节（BOM 导入 authority 收口）

1. **停止在前端解析阶段生成 `standardUsage`**
   - `bom-excel-parser.ts` 不再根据 `unitUsage * (1 + wastage / 100)` 生成 `standardUsage`
   - 导入阶段只保留原始采集字段

2. **停止在导入落地阶段透传 `standardUsage`**
   - `use-bom-data.ts` 中 `processedItems` 不再写入 `standardUsage`
   - 同时移除对导入行里 `standardUsage` 的前端校验依赖

3. **authority 边界明确化**
   - 这一步把 `standardUsage` 从“客户端可带入的派生结果”降级回“应由服务端当前工程配置重算的值”

### 实现细节（源码字符集损坏修复）

1. **修复 `use-bom-data.ts` 的乱码报错块**
   - 删除损坏的 `toast.error('BOM 鐎电厧...')`
   - 保留已存在的本地化失败提示 `t('engineering.bomArchive.toasts.parseFailed')`

2. **修复 `drilling-action-dialog.tsx` 的损坏文案**
   - 标题
   - 描述
   - 按钮文案
   - 标签文案
   - placeholder 文案
   - 注释文本

### 实现细节（Drilling dialog 可维护性收口）

1. **显式使用产品 options 模式查询**
   - `useGetProducts({ mode: 'options' })`

2. **同步修复现有表单 immutability / typing 问题**
   - 引入 `DeltaSet`
   - 去掉 `delta?: any`
   - 补 `setFormData / updateField`
   - 移除 `useMemo` 对 `open` 的多余依赖

3. **保持边界不扩写**
   - 本轮没有新增钻孔公式联动
   - 没有把 dialog 扩成钻孔权威计算引擎

### 明确保留不变的边界

本轮没有扩大范围：

1. 没有把 BOM 导入链路一次性改造成完整后端重算平台
2. 没有在没有实锤前编造钻孔联动 authority 泄露整改
3. 没有对 engineering-db 全域组件做乱码扫荡式重写

### 验证结果

已执行：

1. `pnpm exec eslint src/features/engineering/hooks/use-bom-data.ts src/features/engineering/services/bom-excel-parser.ts src/features/engineering-db/components/drilling-action-dialog.tsx`
2. `pnpm exec tsc --noEmit`

结果：

1. 定向 ESLint 通过。
2. TypeScript 编译校验通过。

### 当前阶段结论

这一步把第二十一轮的真实问题按最小边界收口：BOM Excel 导入不再把客户端的 `standardUsage` 当作可直接落库的派生值；`use-bom-data.ts` 的乱码报错块已被移除；`drilling-action-dialog.tsx` 的大面积字符集损坏也已恢复可读，同时保持了“当前未实锤钻孔权威公式泄露”的审计结论，没有把本轮扩大成不存在的联动算法整改。

## 2026-04-12 - audit：第二十二轮审计修复（Sales Order 摘要 authority + i18n fallback gap + use-products 生命周期审计）

### 本轮目标

围绕两个实锤问题和一个非实锤点做最小、可验证收口：

1. 收口订单证据区标题的英文硬编码兜底
2. 为 `use-products.ts` 的 `options / page` 模式补生命周期边界
3. 保留销售详情摘要金额 authority 的真实审计结论，不虚构不存在的前端重算整改

### 本轮真实结论

1. `useSalesOrderDetailSummaryViewModel` 当前未实锤前端重算订单总额
2. 证据区标题存在 `Order Evidence` / `Purchase Evidence` 英文硬编码兜底
3. `use-products.ts` 已支持 `mode: 'options' | 'page'`，但此前仍共用同一个 `staleTime`

### 本轮实现

本轮修改文件：

1. `src/features/trading/components/parts/order-evidence-gallery.tsx`
2. `src/features/trading/components/parts/sales-order-detail-summary.tsx`
3. `src/features/trading/components/purchase/purchase-order-detail.tsx`
4. `src/features/engineering/hooks/use-products.ts`

### 实现细节（i18n fallback 收口）

1. **移除 `OrderEvidenceGallery` 内部英文兜底**
   - 删除 `fallbackTitle?: string`
   - 删除默认英文值 `Order Evidence`
   - 删除 `t(titleKey) || fallbackTitle` 这类英文 fallback 路径

2. **收口调用点**
   - `sales-order-detail-summary.tsx` 不再传 `fallbackTitle='Order Evidence'`
   - `purchase-order-detail.tsx` 不再传 `fallbackTitle='Purchase Evidence'`

3. **本地化契约明确化**
   - 标题统一直接走翻译键
   - 不再允许组件 props 层用英文硬编码兜底

### 实现细节（产品数据生命周期边界）

1. **为 `useGetProducts()` 引入模式化 `staleTime`**
   - `options`：`5 * 60 * 1000`
   - `page`：`60 * 1000`

2. **生命周期语义更清晰**
   - 下拉 options 允许更长缓存
   - 分页列表模式使用更短缓存，降低旧数据存留时间

### 明确保留不变的边界

本轮没有扩大范围：

1. 没有对 `useSalesOrderDetailSummaryViewModel` 编造不存在的金额重算整改
2. 没有把销售订单编辑态预览计算体系一次性重构
3. 没有做全项目 i18n fallback 扫荡式改造

### 验证结果

已执行：

1. `pnpm exec eslint src/features/trading/components/parts/order-evidence-gallery.tsx src/features/trading/components/parts/sales-order-detail-summary.tsx src/features/trading/components/purchase/purchase-order-detail.tsx src/features/engineering/hooks/use-products.ts`
2. `pnpm exec tsc --noEmit`

结果：

1. 定向 ESLint 通过。
2. TypeScript 编译校验通过。

### 当前阶段结论

这一步把第二十二轮的真实问题按最小边界收口：销售订单详情摘要没有被误改成前端金额重算逻辑；订单证据区的英文兜底已经移除；`use-products.ts` 也补上了按 `options / page` 区分的默认 `staleTime` 边界，从而让产品数据缓存语义更清晰，同时避免把本轮扩大成并不存在的财务 authority 整改工程。

## 2026-04-12 - audit：第二十三轮审计修复（Material version lock authority + Excel 映射韧性 + filteredMaterials 影子逻辑核对）

### 本轮目标

围绕两个实锤问题和一个非实锤点做最小、可验证收口：

1. 收口物料 patch 调用中的版本 fallback
2. 提升物料 Excel 导入的映射韧性
3. 保留 `filteredMaterials` 当前仅为引用重命名的结论，不虚构前端影子计算整改

### 本轮真实结论

1. `use-material-mgmt-data.ts` 里此前确实存在 `data.version || 1`
2. `filteredMaterials` 当前只是 `materials` 的引用重命名，未实锤额外前端计算
3. 物料导入链路的真实问题位于 `material-archive/services/excel-service.ts`
4. 其问题主要是工作表定位、分类映射、全局版本与复合 ID 解析的韧性不足，而不是完全黑盒吞错

### 本轮实现

本轮修改文件：

1. `src/features/material-archive/hooks/use-material-mgmt-data.ts`
2. `src/features/material-archive/services/excel-service.ts`
3. `src/locales/messages/zh-CN/materialArchive.ts`
4. `src/locales/messages/en-US/materialArchive.ts`

### 实现细节（版本锁 authority 收口）

1. **移除 patch 时的非权威版本降级**
   - `use-material-mgmt-data.ts` 不再使用 `data.version || 1`
   - 当 patch 缺失 `version` 时：
     - `failLoudly(...)`
     - 直接抛错

2. **并发锁语义恢复强制性**
   - patch 必须携带真实版本号
   - 前端不再伪造默认版本 `1`

### 实现细节（Excel 映射韧性提升）

1. **收紧配置页校验**
   - `parseMaterialExcel()` 现在要求 `__SYSTEM_CONFIG__` 必须存在
   - `GLOBAL_MATERIAL_VERSION` 必须是有效正整数

2. **收紧维护页定位**
   - 不再默认回退到 `workbook.getWorksheet(1)`
   - 未找到维护页时显式失败

3. **收紧复合 ID 解析**
   - 新增 `parseCompositeId()`
   - 对 `id_version` 格式做显式校验
   - 无效格式直接失败，不再弱解析

4. **收紧分类映射**
   - `categoryMap.get(categoryLabel)` 缺失时直接报错
   - 不再把未映射标签原样透传到导入数据

5. **补齐显式失败词条**
   - `configSheetNotFound`
   - `invalidGlobalVersion`
   - `invalidCompositeId`
   - `categoryMappingMissing`

### 明确保留不变的边界

本轮没有扩大范围：

1. 没有对 `filteredMaterials` 编造不存在的影子计算整改
2. 没有把整个物料导入体系一次性重构成全新平台
3. 没有对 material archive 其它 hooks 做扫荡式重写

### 验证结果

已执行：

1. `pnpm exec eslint src/features/material-archive/hooks/use-material-mgmt-data.ts src/features/material-archive/services/excel-service.ts src/locales/messages/zh-CN/materialArchive.ts src/locales/messages/en-US/materialArchive.ts`
2. `pnpm exec tsc --noEmit`

结果：

1. 定向 ESLint 通过。
2. TypeScript 编译校验通过。

### 当前阶段结论

这一步把第二十三轮的真实问题按最小边界收口：物料 patch 不再在版本缺失时静默降级到 `1`；物料 Excel 导入也从“工作表误命中 + 分类透传 + 版本语义偏弱”的宽松路径收紧为显式校验路径；同时 `filteredMaterials` 保持原样，因为当前并没有证据表明它承担了任何前端影子计算逻辑。

## 2026-04-12 - audit：第二十四轮源码损坏收口（Critical Source Corruption / Engineering Core）

### 本轮目标

围绕源码级损坏风险做最小、可验证收口：

1. 清理 `use-bom-form.ts` 中残留的前端降级语义
2. 对 engineering / engineering-db 关键文件做一次定向乱码扫描
3. 保持已恢复正常的核心文件稳定，不做无证据回滚

### 本轮真实结论

1. `use-bom-data.ts` 当前未见新的大面积乱码残留
2. `drilling-action-dialog.tsx` 当前未见新的大面积乱码残留
3. `use-bom-form.ts` 是本轮唯一仍需收口的高风险残留点
4. 当前风险更集中在历史污染残留与前端降级语义，而不是语法结构被字符集损坏破坏

### 本轮实现

本轮修改文件：

1. `src/features/engineering/hooks/use-bom-form.ts`

### 实现细节（use-bom-form.ts 残留污染收口）

1. **移除编辑态的 `standardUsage` 前端降级**
   - 不再使用 `standardUsage: item.standardUsage || 0`

2. **移除初始化态的 `standardUsage` 前端降级**
   - 不再在 `initialItems` 映射中写入 `standardUsage: item.standardUsage || 0`

3. **authority 边界恢复**
   - 表单只承接现有数据
   - 不再在前端因缺失值而主动回填 `0`

### 实现细节（定向乱码扫描）

1. **对 `engineering` 做定向检索**
   - 未发现新的大面积乱码残留

2. **对 `engineering-db` 做定向检索**
   - 未发现新的大面积乱码残留

3. **扫描结论**
   - 当前无需对 `use-bom-data.ts` 与 `drilling-action-dialog.tsx` 做重复性回滚或改写

### 明确保留不变的边界

本轮没有扩大范围：

1. 没有把整个工程仓做全量编码迁移
2. 没有对已恢复正常的 `use-bom-data.ts` / `drilling-action-dialog.tsx` 做无证据回滚
3. 没有对 engineering 全域文件做扫荡式重写

### 验证结果

已执行：

1. `pnpm exec eslint src/features/engineering/hooks/use-bom-form.ts src/features/engineering/hooks/use-bom-data.ts src/features/engineering-db/components/drilling-action-dialog.tsx`
2. `pnpm exec tsc --noEmit`

结果：

1. 定向 ESLint 通过。
2. TypeScript 编译校验通过。

### 当前阶段结论

这一步把第二十四轮的真实风险按最小边界收口：`use-bom-form.ts` 中残留的 `standardUsage || 0` 前端降级语义已被移除；对 engineering / engineering-db 的定向扫描也没有再发现新的大面积乱码残留。因此当前更合理的结论不是“所有核心文件仍在持续损坏”，而是“历史字符集污染曾真实存在，当前剩余高风险残留点已继续缩小并完成定向收口”。

## 2026-04-12 - audit：第二十五轮离线持久层收口（Persistence Layer Drift / Dexie Reuse）

### 本轮目标

围绕离线持久层漂移做最小、可验证收口：

1. 让 `PersistenceService` 脱离轻量 IndexedDB KV authority 路径
2. 复用项目内已有的 `OfflineStorage` / Dexie 骨架
3. 不重复发明新的 Dexie schema 或第二套离线数据库

### 本轮真实结论

1. `PersistenceService` 当前并不直接使用 `localStorage`
2. 真实问题是它此前仍绕开现有 Dexie 离线层，走另一套轻量 IndexedDB KV 路径
3. 项目内已经有现成的 `snapshots + pendingDeltas + syncMeta + conflictRecords` 骨架可复用

### 本轮实现

本轮修改文件：

1. `src/features/system-mgmt/services/persistence-service.ts`
2. `src/offline-sync/storage/offline-storage.ts`

### 实现细节（PersistenceService 对齐 Dexie 骨架）

1. **初始化改为直接检查 Dexie 离线库**
   - `initLocalStore()` 不再调用轻量 `StorageService`
   - 改为 `OfflineStorage.ensureReady()`

2. **保存路径改为 snapshot + pending log + sync meta**
   - `saveLocal()` 现在在事务中：
     - 读取既有 snapshot
     - 计算 `baseVersion / nextVersion`
     - `saveSnapshot(...)`
     - `enqueueDelta(...)`
     - `upsertSyncMeta(...)`

3. **删除路径改为 pending log + snapshot 移除 + sync meta 更新**
   - `deleteLocal()` 不再直接删轻量 KV
   - 改为在事务中记录 delete delta，并更新离线状态

4. **读取与导出路径改为基于 snapshots**
   - `getLocal()` 直接读取 `OfflineStorage.getSnapshot(...)`
   - `getFullDataSnapshot()` 改为聚合 `listSnapshotsByEntityType(...)`

### 实现细节（OfflineStorage 通用能力补齐）

1. **补充 `ensureReady()`**
   - 供 `PersistenceService` 启动期检测 Dexie 可用性

2. **补充 snapshot 列表与删除能力**
   - `listSnapshotsByEntityType(...)`
   - `removeSnapshot(...)`

### 明确保留不变的边界

本轮没有扩大范围：

1. 没有新建第二套 Dexie 数据库
2. 没有重写整个 `offline-sync` 模块
3. 没有把所有轻量 KV 使用点一次性替换

### 验证结果

已执行：

1. `pnpm exec eslint src/features/system-mgmt/services/persistence-service.ts src/offline-sync/storage/offline-storage.ts src/offline-sync/storage/dexie-offline-db.ts`
2. `pnpm exec tsc --noEmit`

结果：

1. 定向 ESLint 通过。
2. TypeScript 编译校验通过。

### 当前阶段结论

这一步把第二十五轮的真实问题按最小边界收口：`PersistenceService` 已不再依赖轻量 IndexedDB KV 作为关键 authority 路径，而是直接复用项目现有的 Dexie / `OfflineStorage` 骨架来承接 `snapshot + pending log + sync meta` 语义。这样既对齐了离线重算架构，也避免了重复造轮子和继续维护两套并行的持久层抽象。

## 2026-04-12 - audit：第二十六轮逻辑泄露收口（Mold Loan Authority + BOM Core Parameter）

### 本轮目标

围绕模具借还 authority 与 BOM 核心参数 false alarm 做最小、可验证收口：

1. 收口模具借还状态的前端动态改写
2. 复核借入场景的资产种子数据边界
3. 保持 `use-bom-data.ts` 当前已收口的 `standardUsage` 边界，不扩写不存在的问题

### 本轮真实结论

1. `use-bom-data.ts` 当前未再实锤前端计算或回填 `standardUsage`
2. 模具借还链路的实锤问题在 `MoldLoanService.getLoans()` 的前端 `OVERDUE` 再判定
3. 借入场景仍需传递 `moldData` 给当前后端接口，但应尽量保持为最小原始采集语义

### 本轮实现

本轮修改文件：

1. `src/features/equipment-tooling/services/mold-loan-service.ts`
2. `src/features/equipment-tooling/hooks/use-mold-loan-mgmt.ts`

### 实现细节（模具借还状态 authority 收口）

1. **移除 `getLoans()` 的前端状态覆盖**
   - 不再在前端将 `ACTIVE + expectedReturnDate < now` 改写为 `OVERDUE`
   - 列表状态统一直接使用后端返回值

2. **authority 边界恢复**
   - `ACTIVE / RETURNED / OVERDUE` 等借还状态改由后端权威决定
   - 前端不再自行覆盖状态字段

### 实现细节（借入场景种子数据边界）

1. **保留当前接口必需字段**
   - `/mold-loans/borrow` 当前仍要求 `loan + moldData`
   - 因此本轮没有破坏既有接口契约

2. **保持种子数据组装最小化**
   - `moldData` 仅继续承接当前接口所需的：
     - `sn`
     - `name`
     - `maxCycles`
     - `currentCycles`
   - 不额外扩写资产初始化裁定逻辑

### 明确保留不变的边界

本轮没有扩大范围：

1. 没有对 `use-bom-data.ts` 编造不存在的 `standardUsage` 再整改
2. 没有重构整个 `equipment-tooling` 模块
3. 没有在本轮改造全部资产服务 authority 契约

### 验证结果

已执行：

1. `pnpm exec eslint src/features/equipment-tooling/services/mold-loan-service.ts src/features/equipment-tooling/hooks/use-mold-loan-mgmt.ts src/features/engineering/hooks/use-bom-data.ts`
2. `pnpm exec tsc --noEmit`

结果：

1. 定向 ESLint 通过。
2. TypeScript 编译校验通过。

### 当前阶段结论

这一步把第二十六轮的真实问题按最小边界收口：`use-bom-data.ts` 没有被误改成重复治理的目标；模具借还链路中最明确的 authority 泄露——前端自行把借单状态改写为 `OVERDUE`——已经移除；借入场景的数据组装也保持在当前后端接口要求的最小原始采集范围内，没有继续扩大前端资产初始化语义。

## 2026-04-12 - audit：第二十七轮库存调拨并发锁收口（Concurrency Lock Vacuum / Inventory Transfer）

### 本轮目标

围绕库存调拨写路径的并发锁缺口做最小、可验证收口：

1. 为调拨服务补齐 `version` 参数
2. 让调拨请求显式提交源库存快照版本
3. 保持整改范围聚焦在调拨链路，不扩大到整个库存模块

### 本轮真实结论

1. 前端库存主实体与 DTO 本身已经具备 `version`
2. 真实问题在于 `transferInventory(...)` 写链路此前丢失了 `version`
3. 这属于高危并发锁缺口，可能放大库存悬挂与负库存风险

### 本轮实现

本轮修改文件：

1. `src/features/warehouse/inventory/services/inventory-transaction-service.ts`

### 实现细节

1. **为调拨服务补齐 `version` 入参**
   - `transferInventory(...)` 现在显式接收：
     - `materialId`
     - `quantity`
     - `fromCat`
     - `toCat`
     - `version`

2. **为调拨请求补齐源库存快照版本**
   - `/inventory/transfer` 请求体新增：
     - `version`

3. **并发锁语义恢复**
   - 调拨动作不再是“只凭物料 ID 与数量”的裸写请求
   - 而是升级为“基于带版本快照的写操作”

### 明确保留不变的边界

本轮没有扩大范围：

1. 没有重构整个库存模块
2. 没有对全部库存写接口一次性做统一改造
3. 没有修改其它非调拨库存事务

### 验证结果

已执行：

1. `pnpm exec eslint src/features/warehouse/inventory/services/inventory-transaction-service.ts src/features/warehouse/services/inventory-transaction-service.ts`
2. `pnpm exec tsc --noEmit`

结果：

1. 定向 ESLint 通过。
2. TypeScript 编译校验通过。

### 当前阶段结论

这一步把第二十七轮的真实问题按最小边界收口：库存调拨写路径已经显式补齐 `version`，从而不再把源库存并发锁快照静默丢在前端服务层。当前这一步至少保证了调拨请求能够把悲观锁所需的版本信息提交到后端，为后端进行冲突判定提供了必要前提，同时避免把整改范围扩大成整个库存事务体系的全面重写。

## 2026-04-12 - audit：第二十八轮 DTO 运行时校验收口（Validation Gap / Inventory Inbound Service）

### 本轮目标

围绕库存入库 Service 出口的 runtime 校验缺口做最小、可验证收口：

1. 为 `InboundRecord` 补齐 runtime schema
2. 在 `recordInbound(...)` 出口补 `parse(...)`
3. 保持 adapter 只负责映射，不承担 runtime 契约职责

### 本轮真实结论

1. `recordInbound(...)` 之前只有 DTO -> contract 映射，没有最后一道 runtime parse
2. `toInboundRecordContract(...)` 只是字段映射，不能代替 schema 校验
3. `InboundRecord` 之前只有 TypeScript interface，没有 zod 级运行时防线

### 本轮实现

本轮修改文件：

1. `src/features/warehouse/inventory/data/schema.ts`
2. `src/features/warehouse/inventory/services/inventory-transaction-service.ts`

### 实现细节

1. **为 `InboundRecord` 补 runtime schema**
   - 新增 `inboundRecordSchema`
   - 并将 `InboundRecord` 类型改为从 schema 推导

2. **在 Service 出口补最后一道 parse 防线**
   - `recordInbound(...)` 先执行：
     - `ensureObjectResponse(...)`
     - `toInboundRecordContract(...)`
   - 然后新增：
     - `inboundRecordSchema.parse(contract)`

3. **adapter 边界保持清晰**
   - `inventory-api-adapter.ts` 继续只负责 DTO -> contract 映射
   - runtime 契约校验回归 Service 出口负责

### 明确保留不变的边界

本轮没有扩大范围：

1. 没有重写整个 inventory adapter 体系
2. 没有对全部 warehouse Service 一次性补齐所有 schema parse
3. 没有扩展到其它非 inbound 事务出口

### 验证结果

已执行：

1. `pnpm exec eslint src/features/warehouse/inventory/data/schema.ts src/features/warehouse/inventory/services/inventory-transaction-service.ts src/features/warehouse/inventory/adapters/inventory-api-adapter.ts`
2. `pnpm exec tsc --noEmit`

结果：

1. 定向 ESLint 通过。
2. TypeScript 编译校验通过。

### 当前阶段结论

这一步把第二十八轮的真实问题按最小边界收口：库存入库 Service 在 DTO 映射之后已经重新补上 `inboundRecordSchema.parse(...)` 这道运行时防线，从而避免后端隐形 `null`、字段漂移或契约不完整的数据直接穿透到 UI。当前整改保持在 `InboundRecord` 与 `recordInbound(...)` 这条最小闭环内，没有把问题泛化成整个 inventory 模块的全面 schema 重构。

## 2026-04-12 - plan/impl：第三十四轮 Reservation 模型最小落地（Reservation Source of Truth + Inventory Aggregate Output）

### 本轮目标

围绕 `availableQty = onHand - reserved` 的后端权威链路做最小、可验证落地：

1. 为 `reserved` 建立独立 Reservation source of truth
2. 在库存查询中输出 `onHand / reserved / availableQty`
3. 同步前端 DTO / adapter / schema 只读消费接入

### 本轮实现

本轮修改文件：

1. `server/models/inventory.go`
2. `server/services/inventory_query_dto.go`
3. `server/services/inventory_query_mapper.go`
4. `server/services/inventory_query_service.go`
5. `server/services/inventory_command_service_test.go`
6. `server/handlers/inventory_query_handlers_test.go`
7. `server/handlers/inventory_command_handlers.go`
8. `src/features/warehouse/inventory/contracts/inventory-api-dto.ts`
9. `src/features/warehouse/inventory/data/schema.ts`
10. `src/features/warehouse/inventory/adapters/inventory-api-adapter.ts`

### 实现细节（后端）

1. **新增 Reservation 模型**
   - 在 `server/models/inventory.go` 新增 `Reservation`
   - 使用 `inventory_reservations` 作为独立预留表
   - 明确保留：
     - 物料
     - 仓类
     - 批次
     - 数量
     - 状态
     - 来源单据
     - 生命周期时间戳

2. **库存查询 DTO 输出权威派生字段**
   - 在 `server/services/inventory_query_dto.go` 扩展：
     - `onHand`
     - `reserved`
     - `availableQty`

3. **库存查询聚合 Reservation**
   - 在 `server/services/inventory_query_service.go` 新增 Reservation 聚合逻辑
   - 当前按 `material_id + category_code + batch_no + status=RESERVED` 聚合 `reserved`

4. **mapper 输出最终权威结果**
   - 在 `server/services/inventory_query_mapper.go` 中：
     - `onHand = item.Quantity`
     - `reserved = Reservation 聚合值`
     - `availableQty = onHand - reserved`

5. **兼容现有 patch 响应**
   - `PatchInventoryHandler` 的 mapper 调用补了显式 `reserved=0`
   - 避免旧响应链路因为新签名中断

### 实现细节（前端）

1. **扩展 DTO 契约**
   - `InventoryItemApiDTO` 新增：
     - `onHand`
     - `reserved`
     - `availableQty`

2. **扩展前端实体**
   - `InventoryRecord` 新增：
     - `onHand`
     - `reserved`
     - `availableQty`

3. **adapter 只读消费**
   - `toInventoryRecordContract(...)` 现在显式映射：
     - `onHand`
     - `reserved`
     - `availableQty`
   - 没有在前端补任何公式

### 测试与验证

已执行：

1. `go test ./handlers -run TestGetInventoryHandlerReturnsNamedPagedResponse`（在 `server` 目录执行）
2. `go test ./services -run TestRecordInboundMovingAverageUpdatesInventoryValue`（在 `server` 目录执行）
3. `pnpm exec eslint src/features/warehouse/inventory/contracts/inventory-api-dto.ts src/features/warehouse/inventory/data/schema.ts src/features/warehouse/inventory/adapters/inventory-api-adapter.ts src/features/warehouse/inventory/services/inventory-core-service.ts`
4. `pnpm exec tsc --noEmit`

结果：

1. Go handler 定向测试通过。
2. Go service 定向测试通过。
3. 定向 ESLint 通过。
4. TypeScript 编译校验通过。

### 当前阶段结论

这一步把第三十四轮的最小实现闭环落地完成：`reserved` 已经不再依赖 `ShipmentRecord` 语义，而是有了独立 Reservation source of truth；库存查询链路可以后端权威输出 `onHand / reserved / availableQty`；前端也已经切换为只读消费这些字段，没有在客户端补任何公式。当前实现仍然是最小闭环——只触达库存查询聚合与消费契约，没有把整个 Reservation 生命周期接口一次性铺开。

## 2026-04-12 - audit/impl：第三十五轮版本兜底风险收口（Version Fallback Risk / Product Patch）

### 本轮目标

收口产品维护 PATCH 写路径中的版本静默降级：

1. 去掉 `version ?? 0`
2. 让编辑态 PATCH 缺失版本时直接失败
3. 复核相邻 adapter 是否需要最小同步修复

### 本轮实现

本轮修改文件：

1. `src/features/engineering/services/product-maintenance-service.ts`
2. `src/features/engineering/adapters/product-api-adapter.ts`

### 实现细节

1. **收口 PATCH 版本静默兜底**
   - `product-maintenance-service.ts`
   - 原先：
     - `metadata.version: product.version ?? 0`
   - 现在改为：
     - 优先取 `product.version ?? current.version`
     - 若版本仍缺失，直接抛出 `[CRITICAL]` 错误

2. **并发锁契约恢复为 fail loud**
   - 这意味着编辑态 PATCH 不再把缺失版本伪装成 `0`
   - Service 层会把缺失版本视为硬错误，而不是静默降级

3. **复核 adapter `_v` 默认值**
   - 当前 `_v: product.version ?? 1` 仍保留
   - 本轮未把它扩大整改为并发锁问题
   - 原因：当前 PATCH 并发锁路径由 `DeltaPayload.metadata.version` 独立承载，风险实锤点不在 `_v`

4. **顺手修平一个真实类型边界问题**
   - `toBulkSyncProductsApiDTO(...)` 的入参类型收口为 `SaveProductInput[]`
   - 与 `bulkSyncProducts(products: SaveProductInput[])` 的调用保持一致

### 测试与验证

已执行：

1. `pnpm exec eslint src/features/engineering/services/product-maintenance-service.ts src/features/engineering/adapters/product-api-adapter.ts src/features/engineering/hooks/use-product-write-actions.ts`
2. `pnpm exec tsc --noEmit`

结果：

1. 定向 ESLint 通过。
2. TypeScript 编译校验通过。

### 当前阶段结论

这一步把第三十五轮的真实风险按最小边界收口完成：产品维护 PATCH 写路径已经不再使用 `version ?? 0` 对缺失版本做静默降级，而是恢复为显式断言版本存在的 fail loud 语义。这样可以避免核心实体修改在并发锁环节被伪合法默认值侵蚀。与此同时，本轮没有把问题泛化成整个 engineering 模块 version 字段的全面重构，只顺手修平了与 bulk sync 相关的一个真实类型边界问题。

## 2026-04-12 - audit/impl：第三十七轮 DTO Integrity Gap 收口（StocktakeCoreService）

### 本轮目标

从第三十七轮候选链路中优先选择 `StocktakeCoreService`，为盘点任务/盘点项查询补 runtime schema 防线：

1. 为 `StocktakeTask` / `StocktakeItem` 建立 zod schema
2. 在 `StocktakeCoreService` 出口对 adapter 映射结果执行 parse
3. 保持改动限定在仓储盘点最小闭环内

### 本轮实现

本轮修改文件：

1. `src/features/warehouse/stocktake/data/schema.ts`
2. `src/features/warehouse/stocktake/services/stocktake-core-service.ts`

### 实现细节

1. **补充 Stocktake runtime schema**
   - 在 `stocktake/data/schema.ts` 中新增：
     - `stocktakeTaskSchema`
     - `stocktakeItemSchema`
     - `stocktakeTaskArraySchema`
     - `stocktakeItemArraySchema`
   - 同时让 `StocktakeTask` / `StocktakeItem` 类型从 schema 推导

2. **在 Service 出口执行 parse**
   - `StocktakeCoreService.getTasks()`
     - 现在对 `toStocktakeTaskContracts(...)` 结果执行 `stocktakeTaskArraySchema.parse(...)`
   - `StocktakeCoreService.getItems()`
     - 现在对 `toStocktakeItemContracts(...)` 结果执行 `stocktakeItemArraySchema.parse(...)`

3. **保持 adapter 只负责映射**
   - `stocktake-api-adapter.ts` 仍然保持 DTO -> contract 映射职责
   - runtime schema 防线明确收口在 service 出口

### 测试与验证

已执行：

1. `pnpm exec eslint src/features/warehouse/stocktake/data/schema.ts src/features/warehouse/stocktake/services/stocktake-core-service.ts src/features/warehouse/stocktake/adapters/stocktake-api-adapter.ts`
2. `pnpm exec tsc --noEmit`

结果：

1. 定向 ESLint 通过。
2. TypeScript 编译校验通过。

### 当前阶段结论

这一步把第三十七轮的最小闭环收口到 `StocktakeCoreService`：盘点任务与盘点项查询链路不再只是“ensureArrayResponse + adapter 纯映射”，而是在进入 UI 之前增加了明确的 zod runtime schema 防线。当前整改没有扩散到 `CustomerService` 或 `SupplierService`，保持了单链路、最小边界的实现策略。

## 2026-04-12 - plan/impl：第四十轮 SalesOrder 后端测试基线 `payment_method` 列漂移修复

### 本轮目标

修复 `SalesOrder` 后端测试基线中 `sales_orders` 手写建表 SQL 落后于当前业务模型的问题：

1. 补齐 payment 相关缺失列
2. 保持修复边界只落在测试基线
3. 通过定向 Go 测试验证

### 本轮实现

本轮修改文件：

1. `server/services/sales_order_flow_test.go`

### 实现细节

1. **补齐 sales_orders 测试表缺失列**
   - 在 `setupSalesOrderFlowTestDB(...)` 的 `CREATE TABLE sales_orders` 中新增：
     - `payment_method`
     - `payment_method_name`
     - `payment_term`
     - `payment_term_name`

2. **保持最小修复边界**
   - 本轮没有修改：
     - 生产 model
     - handler
     - service 业务逻辑
   - 只修正测试基线与当前业务字段集合的漂移

### 测试与验证

已执行：

1. `go test ./services -run SalesOrder`（在 `server` 目录执行）

结果：

1. 定向 Go 测试通过。

### 当前阶段结论

这一步把 `SalesOrder` 后端测试基线的 `payment_method` 列漂移按最小边界修复完成：根因是 `sales_order_flow_test.go` 里的手写建表 SQL 缺少 payment 相关列，而不是生产业务链路字段契约出错。当前整改仅补齐测试 schema，并通过定向 Go 测试验证通过。

## 2026-04-12 - plan/impl：第四十二轮架构收口第一阶段（Version Guard 单源）

### 本轮目标

先实现第四十二轮三项架构收口中的第一优先级：`Version Guard` 单源。

目标是：

1. 抽出公共 version 断言/helper
2. 让样板 PATCH / 关键写路径统一走 fail loud 模式
3. 先接入少量高风险样板链路，验证模式可行

### 本轮实现

本轮修改文件：

1. `src/lib/version-guard.ts`
2. `src/features/engineering/services/product-maintenance-service.ts`
3. `src/features/material-archive/services/material-maintenance-service.ts`
4. `src/features/warehouse/inventory/services/inventory-transaction-service.ts`

### 实现细节

1. **新增公共 Version Guard helper**
   - `src/lib/version-guard.ts`
   - 新增：
     - `assertRequiredVersion(...)`
     - `buildVersionedPatchMetadata(...)`

2. **产品维护链路接入 Version Guard**
   - `product-maintenance-service.ts`
   - `patchProduct(...)` 改为统一使用：
     - `assertRequiredVersion(...)`
     - `buildVersionedPatchMetadata(...)`

3. **物料维护链路接入 Version Guard**
   - `material-maintenance-service.ts`
   - `patchMaterial(...)` 改为统一使用：
     - `assertRequiredVersion(...)`
     - `buildVersionedPatchMetadata(...)`

4. **库存调拨链路接入 Version Guard**
   - `inventory-transaction-service.ts`
   - `transferInventory(...)` 在发请求前先统一执行：
     - `assertRequiredVersion(...)`

### 当前边界

本轮只做了第一版样板接入，没有一次性改造全仓：

1. 没有同时扩到 `supplier / purchase / sales / warehouse-category`
2. 还没有进入第二优先级的 Runtime Contract 统一改造
3. 还没有进入第三优先级的 Go 测试 Schema helper 收口

### 测试与验证

已执行：

1. `pnpm exec eslint src/lib/version-guard.ts src/features/engineering/services/product-maintenance-service.ts src/features/material-archive/services/material-maintenance-service.ts src/features/warehouse/inventory/services/inventory-transaction-service.ts`
2. `pnpm exec tsc --noEmit`

结果：

1. 定向 ESLint 通过。
2. TypeScript 编译校验通过。

### 当前阶段结论

这一步把第四十二轮的第一优先级“Version Guard 单源”落成了第一版可复用公共能力：核心写路径的 version 断言与 versioned patch metadata 不再完全散落在各模块内，而是开始收口到公共 helper。当前只在产品、物料、库存三条样板链路中验证模式，目的是先证明这套公共约束稳定可用，再决定是否继续向更多维护型 service 扩散。

## 2026-04-12 - plan/impl：第四十三轮 Service 出口 Runtime Contract 统一模式（Customer / Supplier 样板）

### 本轮目标

落地第四十三轮的首批样板链路，把 Service 出口 Runtime Contract 统一为：

1. adapter 只负责 DTO -> contract 映射
2. service 出口负责 `schema.parse(...)`
3. 先在 `CustomerService` 与 `SupplierService` 中验证模式

### 本轮实现

本轮修改文件：

1. `src/features/trading/data/schema.ts`
2. `src/features/trading/customer/services/customer-service.ts`
3. `src/features/trading/supplier/services/supplier-service.ts`

### 实现细节

1. **补充 Customer / Supplier runtime schema**
   - 在 `trading/data/schema.ts` 中新增：
     - `customerSchema`
     - `customerArraySchema`
     - `supplierSchema`
     - `supplierArraySchema`
   - 同时让 `Customer` / `Supplier` 类型从 schema 推导

2. **统一 CustomerService 出口 parse**
   - `getCustomers()` 改为对映射结果执行 `customerArraySchema.parse(...)`
   - `getCustomerList()` 改为对 `items` 执行 `customerArraySchema.parse(...)`
   - `executeCustomerTransaction()` / `createCustomer()` / `patchCustomer()` 改为对单条 contract 执行 `customerSchema.parse(...)`

3. **统一 SupplierService 出口 parse**
   - `getSuppliers()` 改为对映射结果执行 `supplierArraySchema.parse(...)`
   - `getSupplierList()` 改为对 `items` 执行 `supplierArraySchema.parse(...)`
   - `executeSupplierTransaction()` / `createSupplier()` / `patchSupplier()` 改为对单条 contract 执行 `supplierSchema.parse(...)`

4. **保持 adapter 纯映射职责不变**
   - `customer-api-adapter.ts`
   - `supplier-api-adapter.ts`
   - 本轮没有把 parse 塞回 adapter，继续保持 DTO -> contract 映射职责

### 测试与验证

已执行：

1. `pnpm exec eslint src/features/trading/data/schema.ts src/features/trading/customer/services/customer-service.ts src/features/trading/customer/adapters/customer-api-adapter.ts src/features/trading/supplier/services/supplier-service.ts src/features/trading/supplier/adapters/supplier-api-adapter.ts`
2. `pnpm exec tsc --noEmit`

结果：

1. 定向 ESLint 通过。
2. TypeScript 编译校验通过。

### 当前阶段结论

这一步把第四十三轮的统一模式在 `CustomerService` 与 `SupplierService` 两条样板链路中跑通：adapter 继续只负责映射，而 runtime schema 防线统一收口到 service 出口。这样既降低了 DTO Integrity 审计复杂度，也为后续把同类模式扩展到更多 trading / maintenance service 提供了明确模板。

## 2026-04-12 - plan/impl：第四十四轮 Go 测试 Schema 基线收口（trading helper 样板）

### 本轮目标

落地第四十四轮的第一批 Go 测试 Schema 基线收口：

1. 抽共享 trading test schema helper
2. 先接入少量样板测试文件
3. 验证能否减少重复手写 `CREATE TABLE` 与列漂移补丁

### 本轮实现

本轮修改文件：

1. `server/services/trading_test_schema_helper_test.go`
2. `server/services/sales_order_flow_test.go`
3. `server/services/purchase_transaction_service_test.go`

### 实现细节

1. **新增 trading test schema helper**
   - 新增 `applyTradingTestSchema(...)`
   - 当前支持按选项收口：
     - `sales_orders`
     - `sales_order_lines`
     - `purchase_orders`
     - `purchase_order_lines`
     - `audit_logs`

2. **接入 SalesOrder 样板测试**
   - `sales_order_flow_test.go` 不再手写 `sales_orders` / `sales_order_lines`
   - 改为复用 `applyTradingTestSchema(t, testDB, tradingTestSchemaOptions{includeSales: true})`

3. **接入 PurchaseTransaction 样板测试**
   - `purchase_transaction_service_test.go` 不再手写 `purchase_orders` / `purchase_order_lines` / `audit_logs`
   - 改为复用 `applyTradingTestSchema(t, testDB, tradingTestSchemaOptions{includePurchase: true, includeAuditLog: true})`

4. **在样板实施中反向补齐 helper 基线缺口**
   - 首次定向测试暴露出共享 helper 对真实模型覆盖不完整：
     - `purchase_orders` 缺少 `evidences`
     - `purchase_order_lines` 缺少 `returned_qty`
   - 随后已将这些列补入 helper
   - 同时在 `purchase_transaction_service_test.go` 的 seed 中显式写入 `Evidences: json.RawMessage("[]")`，避免 SQLite 默认值回读为 `string` 导致 `json.RawMessage` 扫描失败

### 测试与验证

已执行：

1. `go test ./services -run "SalesOrderFlow|PurchaseOrderTransaction|PurchaseOrderReceiptConfirmation"`

结果：

1. 定向 Go 测试通过。

### 当前阶段结论

这一步把第四十四轮的第一批收口模式跑通：交易测试中重复出现的 `sales_orders` / `purchase_orders` 相关建表 SQL 已经开始向共享 helper 收口，`sales_order_flow_test.go` 与 `purchase_transaction_service_test.go` 也已经完成样板接入。更重要的是，这次实施验证了共享 helper 的真正价值：一旦 helper 不完整，问题会集中暴露在一个地方，然后通过补齐公共基线即可同时避免后续更多测试继续复制错误 schema。

## 2026-04-12 - fix：engineering-db TypeScript 类型报错收口

### 本轮目标

修复 `engineering-db` 模块中一组已暴露的 TypeScript 报错，重点处理：

1. patch 场景错误从 `Input` 类型对象读取 `id`
2. service 返回对象与 schema 必填字段不匹配
3. dialog 直接修改 `useDeltaTracker(...).data` 导致不可变规则报错

### 本轮修改文件

1. `src/features/engineering-db/hooks/use-spoke-length-mgmt.ts`
2. `src/features/engineering-db/tabs/labeling-tab.tsx`
3. `src/features/engineering-db/services/hub-service.ts`
4. `src/features/engineering-db/services/nipple-service.ts`
5. `src/features/engineering-db/components/labeling-action-dialog.tsx`
6. `src/features/engineering-db/components/spoke-length-action-dialog.tsx`

### 实现细节

1. **修复 patch 场景的 `id` 来源**
   - `use-spoke-length-mgmt.ts` 与 `labeling-tab.tsx` 的保存参数新增 `recordId`
   - patch 时不再从 `SpokeLengthInput` / `LabelingDraftInput` 读取 `id`
   - 改为由编辑态组件从 `currentRow.id` 显式传入

2. **修复 service 返回映射与 schema 不一致**
   - `hub-service.ts` 与 `nipple-service.ts` 改为显式构造对象
   - `name` 统一按 `xxxData?.name ?? s.name`
   - 返回前通过 `hubSchema.safeParse(...)` / `nippleSchema.safeParse(...)` 做收口

3. **修复 dialog 对 `useDeltaTracker` 代理对象的直接写入**
   - `labeling-action-dialog.tsx`
   - `spoke-length-action-dialog.tsx`
   - 对齐仓内已有 `hub-action-dialog.tsx` / `nipple-action-dialog.tsx` 模式
   - 新增 `setFormData` / `updateField`
   - 不再直接写 `formData.xxx = ...`

4. **收口局部类型噪音**
   - `hub-service.ts` / `nipple-service.ts` 的 `delta` 参数改为 `Record<string, unknown>`
   - 去除本轮涉及文件中的 `console.error` 与部分 `any`
   - `use-spoke-length-mgmt.ts` 的失败提示改为直接中文文本，避免当前 i18n key 类型约束继续阻塞编译

### 测试与验证

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. TypeScript 编译校验通过。

## 2026-04-13 - impl：BOM / ECO 控制字段接入全局码规范化

### 本轮目标

将 engineering 中 BOM / ECO 的控制字段收口到统一 helper，重点覆盖：

1. `bomNo`
2. `bomVersion`

### 本轮修改文件

1. `src/features/engineering/utils/product-code-normalization.ts`
2. `src/features/engineering/hooks/use-bom-form.ts`
3. `src/features/engineering/tabs/bom-mgmt.tsx`
4. `src/features/engineering/services/bom-service.ts`

### 实现细节

1. **扩展 BOM / ECO 控制字段统一 helper**
   - 在 `product-code-normalization.ts` 中新增：
     - `normalizeEngineeringBomNo(...)`
     - `normalizeEngineeringBomVersion(...)`
     - `normalizeBOMInput(...)`
   - 明确将 `bomNo / bomVersion` 作为 BOM/ECO 控制字段治理，而不是继续散落直接调用 lib codec

2. **收口 BOM 默认值与初始化值**
   - `use-bom-form.ts` 中：
     - 默认值里的 `bomVersion` 改为复用 `normalizeEngineeringBomVersion('V1.0')`
     - 初始化值里的 `bomVersion` 也改为统一 helper

3. **收口提交前 payload 边界**
   - `bom-mgmt.tsx` 中：
     - 提交前不再手动调用 `normalizeBomNo / normalizeBomVersion`
     - 改为统一复用 `normalizeBOMInput(...)`

4. **收口 service 保存边界**
   - `bom-service.ts` 中：
     - `sanitizeBOMInput(...)` 先统一走 `normalizeBOMInput(...)`
     - 不再只做 `bomNo / bomVersion` 的局部 trim

### 当前阶段结论

这一步把 `bomNo / bomVersion` 从“schema 有约束、form 有默认值、提交前和 service 又各自手动处理”的分散状态，收口成了 BOM/ECO 控制字段统一 helper。现在默认值、初始化值、提交前 payload、service 保存边界已经共享同一套口径，不需要继续在 `use-bom-form / bom-mgmt / bom-service` 之间重复拼接同一套规则。

### 测试与验证

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. TypeScript 编译校验通过。

## 2026-04-13 - impl：Product / ChangeOrder 变更控制字段接入全局码规范化

### 本轮目标

将 engineering 域内的变更控制字段收口到统一 helper，重点覆盖：

1. `revisionNo`
2. `siteCode`
3. `changeOrderNo`

### 本轮修改文件

1. `src/features/engineering/utils/product-code-normalization.ts`
2. `src/features/engineering/utils/default-builders.ts`
3. `src/features/engineering/hooks/use-change-order-write-actions.ts`
4. `src/features/engineering/services/change-order-service.ts`
5. `src/features/engineering/tabs/change-orders.tsx`
6. `src/features/engineering/adapters/product-api-adapter.ts`

### 实现细节

1. **扩展 engineering 控制字段统一 helper**
   - 在 `product-code-normalization.ts` 中新增：
     - `normalizeEngineeringRevisionNo(...)`
     - `normalizeEngineeringSiteCode(...)`
     - `normalizeEngineeringChangeOrderNo(...)`
     - `normalizeChangeOrderInput(...)`
     - `normalizeChangeOrderEntity(...)`
   - 同时让 `normalizeSaveProductInput(...)` 也纳入：
     - `revisionNo`
     - `siteCode`
     - `changeOrderNo`

2. **收口 ChangeOrder draft 初始化边界**
   - `default-builders.ts` 中：
     - `createChangeOrderDraft(...)` 改为复用 `normalizeChangeOrderEntity(...)`
     - `buildChangeOrderDraft(...)` 改为复用 engineering 控制字段 helper

3. **收口 ChangeOrder 输入与保存边界**
   - `change-orders.tsx` 中：
     - `changeOrderNo / siteCode / revisionNo` 输入改为复用 engineering 控制字段 helper
     - 保存前 payload 组装改为复用 `normalizeChangeOrderInput(...)`

4. **去重 write actions 重复规范化**
   - `use-change-order-write-actions.ts` 不再重复做 `changeOrderNo / siteCode / revisionNo` 规范化
   - 直接交给 service / helper 处理

5. **收口 ChangeOrder service 保存边界**
   - `change-order-service.ts` 删除本地散落 normalize 实现
   - 改为直接复用 `normalizeChangeOrderInput(...)`

6. **让 Product 侧复用同一套控制字段 helper**
   - `product-api-adapter.ts` 中：
     - Product 的 `revisionNo / siteCode / changeOrderNo` DTO 入出边界
     - 改为统一复用 engineering 控制字段 helper

### 当前阶段结论

这一步把 `revisionNo / siteCode / changeOrderNo` 从“lib codec 可用，但 tab、draft、write actions、service、adapter 各自散落调用”收口成了 engineering 域内统一控制字段 helper。现在 `ChangeOrder` 与 `Product` 已经共享同一套控制字段边界，不需要继续在不同层次重复粘贴相同的 normalize 逻辑。

### 测试与验证

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. TypeScript 编译校验通过。

## 2026-04-13 - impl：717 Product 主数据链路接入全局码规范化

### 本轮目标

将 `Product` 主数据链路中的三类字段按语义分型收口到统一 helper，重点覆盖：

1. `Product.sku`
2. `Product.modelCode`
3. `Product.templateKey`

### 本轮修改文件

1. `src/features/engineering/utils/product-code-normalization.ts`
2. `src/features/engineering/utils/product-form-utils.ts`
3. `src/features/engineering/hooks/use-product-form-derive.ts`
4. `src/features/engineering/components/product/product-basic-info.tsx`
5. `src/features/engineering/adapters/product-api-adapter.ts`
6. `src/features/engineering/services/product-maintenance-service.ts`

### 实现细节

1. **扩展 Product 主数据统一 helper**
   - 在 `product-code-normalization.ts` 中新增：
     - `normalizeProductSkuValue(...)`
     - `normalizeProductModelCodeValue(...)`
     - `normalizeProductTemplateKeyValue(...)`
     - `deriveNormalizedProductSku(...)`
     - `normalizeSaveProductInput(...)`
   - 明确区分：
     - 业务编码：`sku`
     - 固定数字码：`modelCode`
     - 稳定引用键：`templateKey`

2. **收口 Product 输入与展示边界**
   - `product-basic-info.tsx` 中：
     - `modelCode` 输入改为复用 `normalizeProductModelCodeValue(...)`
     - `sku` 展示改为复用 `normalizeProductSkuValue(...)`

3. **收口 SKU 派生链路**
   - `product-form-utils.ts` 中：
     - 默认值里的 `modelCode / templateKey` 改为统一 helper
     - `deriveSku(...)` 改为复用 `deriveNormalizedProductSku(...)`
     - `ensureSkuUnique(...)` 改为基于统一规范后的 SKU 比较
   - `use-product-form-derive.ts` 中：
     - authority engine 回填的 `modelCode` 改为统一 helper
     - `skuPreview` 改为统一 helper + 派生 helper

4. **收口 DTO 边界**
   - `product-api-adapter.ts` 中：
     - API -> contract 的 `sku / modelCode / templateKey` 改为复用 Product helper
     - contract -> API DTO 前先走 `normalizeSaveProductInput(...)`

5. **收口保存边界**
   - `product-maintenance-service.ts` 中：
     - `createProduct(...)`
     - `patchProduct(...)`
     - `saveProduct(...)`
     - `bulkSyncProducts(...)`
   - 全部在 service 边界先统一走 `normalizeSaveProductInput(...)`

### 当前阶段结论

这一步把 `Product` 主数据链路的 `sku / modelCode / templateKey` 从“输入层、派生层、adapter、service 各自做一点”收口成了统一的领域 helper。现在这三类字段已经不再依赖散落的通用 codec 调用，而是通过 `engineering/product-code-normalization.ts` 形成清晰一致的 Product 主数据边界。

### 测试与验证

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. TypeScript 编译校验通过。

## 2026-04-12 - impl：714 生产共享资源模块接入全局码规范化

### 本轮目标

将 `production-shared` 中已经存在但分散的机器码处理逻辑收口为领域内部统一 helper，重点覆盖：

1. `ProductionLine.code`
2. `ProductionProcessStep.code`

### 本轮修改文件

1. `src/features/production-shared/utils/production-code-normalization.ts`
2. `src/features/production-shared/services/production-lines-service.ts`
3. `src/features/production-shared/services/production-processes-service.ts`
4. `src/features/production-shared/adapters/production-resource-api-adapter.ts`
5. `src/features/production-shared/tabs/work-architecture/components/process-library-panel.tsx`
6. `src/features/production-shared/tabs/line-mgmt/components/line-dialog.tsx`

### 实现细节

1. **新增 production-shared 统一 helper**
   - 新增 `production-code-normalization.ts`
   - 提供：
     - `normalizeProductionLineCode(...)`
     - `normalizeProductionProcessStepCode(...)`
     - `normalizeProductionLineEntity(...)`
     - `normalizeProductionProcessStepEntity(...)`

2. **收口 service 保存边界**
   - `production-lines-service.ts` 改为复用 `normalizeProductionLineEntity(...)`
   - `production-processes-service.ts` 改为复用 `normalizeProductionProcessStepEntity(...)`

3. **收口 adapter DTO 边界**
   - `production-resource-api-adapter.ts` 不再直接调用通用 `normalizeMachineCode`
   - line / process 的 DTO 入出边界统一复用 production-shared helper

4. **收口 process 输入边界**
   - `process-library-panel.tsx` 的：
     - 编辑态回填
     - 输入时规范化
     - 提交前组装
   - 全部统一复用 `normalizeProductionProcessStepCode(...)` / `normalizeProductionProcessStepEntity(...)`

5. **收口 line 输入边界**
   - `line-dialog.tsx` 的：
     - 编辑态回填
     - 新建态初始值
     - 自动生成 code
   - 统一复用 `normalizeProductionLineCode(...)` / `normalizeProductionLineEntity(...)`
   - 同时修复该文件对 `useDeltaTracker(...).data` 的直接修改问题，改为通过本地 `setForm(...)` 封装更新

### 当前阶段结论

这一步把 `production-shared` 里原本分散在 service、adapter、process form、line dialog 的机器码处理逻辑收成了模块内部统一入口。这样 `ProductionLine.code` 与 `ProductionProcessStep.code` 的输入边界、保存边界、DTO 边界已经对齐到同一套 production-shared helper，不需要继续在各文件散落补 `normalizeMachineCode(...)`。

### 测试与验证

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. TypeScript 编译校验通过。

## 2026-04-12 - impl：715 工程属性值模块接入全局码规范化

### 本轮目标

将工程属性值模块现有的 `product-attribute-machine-value` 规则从“多处散落重复调用”收口为更清晰的领域边界，重点覆盖：

1. `ProductAttributeCategory.key`
2. `ProductAttributeOption.value`

### 本轮修改文件

1. `src/features/engineering/utils/product-attribute-machine-value.ts`
2. `src/features/engineering/components/product-attributes/product-attribute-category-dialog.tsx`
3. `src/features/engineering/components/product-attributes/product-attribute-option-dialog.tsx`
4. `src/features/engineering/services/product-attribute-category-service.ts`
5. `src/features/engineering/services/product-attribute-option-service.ts`
6. `src/features/engineering/hooks/use-product-attribute-write-actions.ts`
7. `src/features/engineering/tabs/product-attributes-mgmt.tsx`

### 实现细节

1. **扩展属性值专用 helper**
   - 在 `product-attribute-machine-value.ts` 中新增：
     - `normalizeProductAttributeCategoryInputKey(...)`
     - `normalizeProductAttributeOptionInputValue(...)`
     - `buildProductAttributeCategorySaveInput(...)`
     - `buildProductAttributeOptionSaveInput(...)`
     - `findProductAttributeOptionConflictInCategory(...)`
   - 明确把“输入态规范化”“保存态规范化”“按分类冲突判断”放到统一模块中

2. **收口 dialog 输入边界**
   - category dialog 改为复用 `normalizeProductAttributeCategoryInputKey(...)`
   - option dialog 改为复用 `normalizeProductAttributeOptionInputValue(...)`
   - 不再在组件里直接散落调用基础 normalize 函数

3. **收口 service 保存边界**
   - category service 改为复用 `buildProductAttributeCategorySaveInput(...)`
   - option service 改为复用 `buildProductAttributeOptionSaveInput(...)`

4. **去重 write actions 重复规范化**
   - `use-product-attribute-write-actions.ts` 不再重复对 payload 做机器值规范化
   - 直接把原始 payload 交给 service 的统一 helper 处理

5. **收口 tab 层散落逻辑**
   - `product-attributes-mgmt.tsx` 中：
     - 新建 category / option 时复用输入态 helper
     - 保存前 payload 组装改为复用保存态 helper
     - option 冲突判断改为复用 `findProductAttributeOptionConflictInCategory(...)`
   - 同时顺手修正了 `categories/options` 的稳定引用，以及避免在 effect 中同步 `setState` 的问题

### 当前阶段结论

这一步并没有替换掉工程属性值模块现有的小写机器值规则，而是把它正式提升为模块内部的单一权威入口。现在属性值链路的输入态、保存态、冲突判断与页面 payload 组装已经基本对齐，避免继续在 dialog、tab、write actions、service 之间重复散落同一套规则。

### 测试与验证

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. TypeScript 编译校验通过。

## 2026-04-12 - impl：716 第二批遗漏边界补齐

### 本轮目标

补齐 `716` 第一批之后仍残留的 template 侧遗漏边界：

1. 新建草稿入口
2. sync 保存边界
3. `template-mgmt.tsx` 的稳定引用小缺口

### 本轮修改文件

1. `src/features/engineering/utils/default-builders.ts`
2. `src/features/engineering/services/product-template-service.ts`
3. `src/features/engineering/tabs/template-mgmt.tsx`

### 实现细节

1. **补齐 template 草稿入口**
   - `createProductTemplateDraft()` 改为复用 `normalizeProductTemplateEntity(...)`
   - 这样新建态初始值也统一经过 engineering 内部 helper

2. **补齐 template sync 保存边界**
   - `productTemplateService.sync(...)` 发送前改为先执行：
     - `templates.map(normalizeProductTemplateInput)`
   - 避免批量同步链路绕过 `code / componentKey` 规范化

3. **收口稳定引用小缺口**
   - `template-mgmt.tsx` 中将 `templatesQuery.data ?? []` 改为 `useMemo(...)`
   - 避免继续制造 hook 依赖不稳定 warning

### 当前阶段结论

`716` 第二批没有继续扩大范围，而是把 template 这条链路最后几个遗漏口补完整：从草稿创建，到页面编辑，再到 sync 保存，已经都能经过 engineering 内部统一 helper。这样 `716` 这条主线就从“第一批样板收口”推进到了更完整的边界闭环。

### 测试与验证

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. TypeScript 编译校验通过。

### 当前阶段结论

这一步把 `engineering-db` 当前最明显的类型断裂点收口到了两条主线：

1. patch 调用与 `Input` / 实体态边界重新对齐
2. dialog 表单更新方式与仓内现有 `useDeltaTracker` 样板对齐

这样既解决了截图中的 `id` / `name` 报错，也避免继续在 `engineering-db` 里保留“有的 dialog 直接改代理对象、有的 dialog 走 setFormData”的分裂写法。

## 2026-04-12 - fix：basic-settings 单点 TypeScript 编译阻塞

### 本轮目标

修复 `basic-settings` 中在完整 TypeScript 编译时新暴露出的单点阻塞：

1. `src/features/basic-settings/tabs/linear-barcode-mgmt.tsx`
2. 未使用的 `AppearanceMapping` 类型导入

### 本轮实现

1. 删除 `linear-barcode-mgmt.tsx` 中未使用的 `AppearanceMapping` 类型导入
2. 保留 `AppearanceActionDialog` 导入不变
3. 不改动任何条码业务逻辑

### 测试与验证

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. TypeScript 编译校验通过。

### 当前阶段结论

这次 follow-up 属于典型的“修掉上一批错误后露出的下一个编译断点”。当前已经按最小边界清除 `linear-barcode-mgmt.tsx` 的未使用类型导入，并确认完整 TypeScript 编译重新通过。

## 2026-04-12 - impl：716 工程 template / product type 模块接入全局码规范化（第一批）

### 本轮目标

恢复此前已规划的 `716` 主线，先把工程主数据里更核心的标识字段边界收口：

1. `ProductTemplate.code`
2. `ProductTemplate.componentKey`
3. `ProductType.code`

### 本轮修改文件

1. `src/features/engineering/utils/product-code-normalization.ts`
2. `src/features/engineering/tabs/template-mgmt.tsx`
3. `src/features/engineering/hooks/use-product-template-write-actions.ts`
4. `src/features/engineering/services/product-template-service.ts`
5. `src/features/engineering/adapters/product-template-api-adapter.ts`
6. `src/features/engineering/components/product-type-action-dialog.tsx`
7. `src/features/engineering/services/product-type-service.ts`
8. `src/features/engineering/adapters/product-type-api-adapter.ts`

### 实现细节

1. **新增 engineering 内部统一规范化 helper**
   - 新增 `product-code-normalization.ts`
   - 提供：
     - `normalizeEngineeringTemplateCode(...)`
     - `normalizeEngineeringTemplateComponentKey(...)`
     - `normalizeProductTemplateInput(...)`
     - `normalizeProductTemplateEntity(...)`
     - `normalizeEngineeringProductTypeCode(...)`
     - `normalizeProductTypeInput(...)`
     - `normalizeProductTypeEntity(...)`

2. **收口 template 输入边界与保存边界**
   - `template-mgmt.tsx` 不再直接散落调用 `normalizeMachineCode` / `normalizeComponentKey`
   - 改为复用统一 helper 处理：
     - 编辑态回填
     - 输入时规范化
     - 提交前规范化
   - `use-product-template-write-actions.ts`、`product-template-service.ts`、`product-template-api-adapter.ts` 统一复用同一 helper，避免继续重复拼装规则

3. **收口 product type 输入边界与保存边界**
   - `product-type-action-dialog.tsx` 改为复用统一 helper 处理：
     - 编辑态回填
     - 自动生成 code
     - 手输 code
     - 提交前规范化
   - `product-type-service.ts`、`product-type-api-adapter.ts` 也统一改为复用同一 helper

### 当前阶段结论

这一步没有去重写整条工程主数据链路，而是先把 `template / product type` 中原本散落在页面、dialog、service、adapter 里的码规范化逻辑抽成了 engineering 内部统一 helper。这样做的收益是：

1. 工程主数据核心标识字段开始具备单一规范入口
2. 输入边界与保存边界不再各自拼一套局部规则
3. 后续若继续推进 `715` / `714`，可以沿用同样的“领域内 helper + 边界接入”模式

### 测试与验证

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. TypeScript 编译校验通过。
