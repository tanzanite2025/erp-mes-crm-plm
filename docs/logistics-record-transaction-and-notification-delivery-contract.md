# 物流记录事务与通知投递契约

更新时间：2026-10-20。代码已接入，本地验证与生产部署分开；通用收件、投递、保留和账号状态只在[消息中心长期契约](architecture/workflow/system-notification-inbox-cross-device-synchronization-and-delivery-contract.md)维护。

## 真实业务来源

`LOGISTICS_RECORD` 对应 `logistics_records`，Type 为 Shipment（销售发货）或 Receipt（采购收货）。实际状态为 Pending、InTransit、Delivered、Exception、Canceled。模板中的派车、装车、Signed、车牌、调度员和司机不是本模型事实，已移除。

承运商回调及实时查询使用另一模型 `DeliveryOrder`，其中 Signed 等状态属于轨迹投影；本次不把其回调冒充为物流记录事件。采购物流送达也不代表仓库完成收货：现有采购联动仅在 InTransit/Delivered 时将 Sent 改为 Awaiting，真实入库继续走仓库流程。

## 写入与文件职责

接口相对 `/api/v1`。路由保留既有物流管理、状态更新、删除动作权限，各 handler 另按记录真实 Type 检查购销菜单范围。

| 入口/文件                                                                    | 职责                                                                                                  |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `POST /logistics`                                                            | 新建或携带当前版本保存；轨迹是 JSON 数组，不是 base64 字节串                                          |
| `PATCH /logistics/:id`                                                       | SDRTS `{op,delta,metadata:{id,version}}`；仅编辑真实明细字段，不开放 status、type、version、isDeleted |
| `PATCH /logistics/:id/status`                                                | 携带当前 version、status、location、events 更新状态；采购端已与此方法对齐                             |
| `DELETE /logistics/:id`                                                      | 逻辑删除、版本递增、审计和相应收件解除同事务                                                          |
| `server/handlers/logistics_record_write_http_contract.go`                    | HTTP DTO、差量解码、类型范围、错误映射                                                                |
| `server/services/logistics_command_service.go`                               | 真实写入、行锁、版本校验、单据联动和审计                                                              |
| `server/services/logistics_record_details_patch_service.go`                  | 从锁定的当前记录应用受限明细变化，复用同一写入函数                                                    |
| `server/services/logistics_record_lifecycle_notification_routing_service.go` | 真实事件键、模板数据、可见权限和详情链接，调用共用规则服务                                            |

明细字段为 orderNo、salesOrderId、purchaseOrderId、productId、shipmentId、carrier、trackingNo、lastLocation。表中没有独立联系人/电话字段，编辑表单不再提供不能保存的输入。可选 UUID 外键为空时写 NULL/创建时统一省略，不连续覆盖 GORM Omit 列表。

所有更新与删除递增持久版本，旧版本更新返回409；采购/销售类型不可切换。删除后的记录不能通过保存、明细编辑或状态更新恢复。完整保存改变既有状态、或新建时直接指定非 Pending 状态，也必须具备与专用状态接口相同的 ActionTradingLogisticsStatusUpdate 权限，不能仅靠管理明细权限绕过。只有真实状态变化才生成 STATUS_CHANGED；同状态轨迹更新或承运商修改不伪造状态事件。

## 通知与解除

事件键为 `LOGISTICS_RECORD:{id}:v{persistedVersion}:{action}`。动作包括 CREATED、STATUS_CHANGED、进入 Exception 时的 EXCEPTION；重复事件使用共用收件唯一约束，旧版本提交不产生通知。

业务源仍需显式导入并启用，规则、内容模板和实际接收账号需显式配置；不自动配置正式人员或规则。模板仅提供实际物流字段，不猜测司机或审批经理。使用空目标链接或 `[ActionURL]` 时，后端按真实 Type 选择当前业务记录链接。

| Type     | 收件可见权限 | 动作链接                                          |
| -------- | ------------ | ------------------------------------------------- |
| Shipment | MenuTrading  | `/shipping-management/logistics?logisticsId={id}` |
| Receipt  | MenuPurchase | `/purchase/logistics?logisticsId={id}`            |

两个页面均按 ID 读取目标详情，不依赖目标是否位于列表当前页；详情接口继续校验真实类型与当前权限。撤销对应权限后，消息列表、未读数和状态操作均按共用规则隐藏/拒绝。

通知生成时保存该段的解除条件，后续 STATUS_CHANGED 按原收件的来源、实体、记录 ID 及条件精确解除，允许 Delivered/Canceled 等实际状态解除先前 EXCEPTION 动作生成的通知。规则/段被编辑、停用或删除，或来源停用/删除，均不阻止原消息解除；新增通知仍受当前配置控制。不会重新执行其他动作的命令或申请。删除直接按来源+记录 ID 解除，不生成虚构 Canceled 事件。解除只取消相应未发布任务，不波及其他物流记录。条件快照和状态码受控重命名统一见[消息中心长期契约](architecture/workflow/system-notification-inbox-cross-device-synchronization-and-delivery-contract.md)。

业务事实、收件、刷新任务、执行证据和审计同事务；数据库任一步失败全部回滚。没有物流专用投递器、浏览器扫描器或历史补发。

## 承运商轨迹事务与权限

`DeliveryOrder` 是承运商轨迹主单，`DeliveryTrackingDetail` 是事实明细。它们只有业务单号字符串，没有可靠的 `LogisticsRecord` 外键；不能按运单号或承运商名称猜测关联、通知接收人，或用 Signed 代替人工物流 Delivered / 仓库收货。当前回调只更新已存在的轨迹主单，不创建业务单据。

回调和 17TRACK 实时查询共用 `server/services/delivery_order_tracking_observation_persistence_service.go`。此文件负责标准化轨迹、锁定并重读当前主单、去重、事实时间比较、版本递增以及查询额度的事务落库；`logistics_tracking_query_service.go` 负责受控厂商请求、响应适配和文案状态识别；`logistics_push.go` 负责 HTTP、签名和购销读取范围。两条入口不各自维护轨迹写入算法。

| 约束       | 当前实现                                                                                                                                 |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 原子性     | 轨迹、主单投影和实时查询 quota_used 同事务；任一步失败回滚，回调返回500，不确认成功                                                      |
| 去重       | 同运单、UTC事实时间和正文生成唯一轨迹键，数据库 ON CONFLICT DO NOTHING；时间统一到 PostgreSQL 微秒精度，时区表示不同不生成第二条事实     |
| 乱序       | 先按事实时间排序；以主单 LastEventAt 和已存最新轨迹时间为界，只有严格更新的事实才替换当前投影；迟到轨迹仅保留历史，同时间不覆盖既有投影  |
| 版本       | 新轨迹或新投影使持久版本递增一次；重复推送/重复查询不递增版本；最近查询时间和真实调用额度可以更新                                        |
| 完成状态   | Signed 不被后续在途扫描回退，可转为明确 Returned；Returned 不被普通扫描撤销；SignedAt 使用实际签收轨迹时间，重复/迟到不重写              |
| 文案识别   | 先识别失败、未签收、待签收，再识别明确签收；undelivered 不再匹配 delivered，仓库 received at 不代表员工/客户已签收；未知文案保留当前状态 |
| 无事实时间 | 回调必须提供已识别状态和至少一条有效日期、非空正文的轨迹；未知状态、空轨迹或任一无效轨迹返回400，避免用接收时间伪造业务先后              |
| 时间格式   | 接受 RFC3339 及既有日期格式；无时区日期按服务端本地时区解析，正式厂商联调应使用带时区事实时间                                            |

`LastPushAt` 记录最近观察/查询时间，`LastEventAt` 记录当前轨迹投影的事实时间，二者不能混用。`DeliveryOrder` 已恢复为真正的 AutoMigrate 参数，原来与乱码注释写在同一行导致未迁移；启动迁移会创建缺失主表并增加事实时间列。

接口相对 `/api/v1`：

| 接口                                       | 范围                                                                                            |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `GET /logistics-push/orders`               | 认证账号具备 MenuTrading 或 MenuPurchase；列表按数据库中真实 BizType 过滤，未知类型不开放       |
| `GET /logistics-push/tracking/:trackingNo` | 按已存 BizType 校验购销菜单；`refresh=1` 在权限校验后才允许调用厂商；数据库读取失败返回500      |
| `POST /logistics-push/callback`            | 当前仍在认证且要求销售菜单的路由中，同时校验 Enabled 厂商及签名；不是已经开通的公网厂商回调入口 |

签名仅验证 HMAC-SHA256 / MD5 协议来源；现有载荷没有 timestamp/nonce，不能宣称已实现请求防重放。重复事实通过唯一轨迹键及时间边界保持幂等。公网回调部署、厂商真实协议、主单创建/订阅入口及明确的业务外键仍需单独接通；不能因为有 callback handler 或验证按钮就标注已端到端上线。

承运商轨迹尚未生成正式通知。后续接入必须先建立受约束的业务关联、真实事件键、收件权限及解除条件，再复用本文既有业务事务和共用收件箱；不新增承运商专用收件箱、扫描器或重试器。

## 本地验证

隔离 PostgreSQL schema 覆盖两种类型权限、真实状态与模板、稳定事件重放、同状态不重发、过期版本拒绝、创建/状态写入失败回滚、跨动作解除、删除精确解除和取消、删除审计失败回滚、禁止恢复和受限明细编辑。HTTP 测试使用真实 JSON 数组并检查400/403/404/409，前端测试验证采购详情按 ID 读取与 PATCH 方法。

解除策略专项通过真实物流创建、异常和送达入口，验证规则停用/删除/段修改及来源停用/删除后，原消息仍能在送达事务内解除；失败时业务状态、收件、队列取消和执行日志共同回滚，其他物流记录不受影响。该专项与品质、销售共用 `business_rule_notification_resolution_policy_postgres_integration_test.go`，本次 services、handlers、routes、db 完整回归通过。

测试不向真实人员投递，不修改正式物流或品质标准。生产部署和正式规则配置需要单独验证；承运商 DeliveryOrder 回调通知仍未接入。

承运商专项隔离 PostgreSQL 测试覆盖回调/查询并发、重复及跨时区重放、乱序历史、终态保护、实际签收时间、旧查询快照、主单/额度失败原子回滚、HTTP失败不确认成功、无效事实拒绝、购销列表与详情一致及禁止越权调用厂商。真实 17TRACK 适配函数使用模拟 HTTP transport 验证，不发起外部请求。

前次物流接入的本地 services/handlers/routes 回归通过；品质、物流、收件前端8个文件65项测试通过，TypeScript、ESLint及权限/账号/i18n契约通过。浏览器用仅拦截 GET 详情的样例验证真实空列表上的购销目标打开与关闭，再用真实404验证友好错误及重试；数据库中没有为此创建记录。

本次承运商补齐后的 services/handlers/routes/db 完整回归、全包编译和 Go 构建通过；TypeScript、权限服务3项测试、相关 ESLint、权限目录、账号、动作权限闭环、i18n、文档格式/链接和差异检查通过。动作权限目录补齐已有物流、投递队列、考勤设备和委外检验接口绑定，闭环检查零遗漏。本地后端已切换新构建，启动迁移完成，`/api/v1/health` 返回200，数据库与Redis正常；此结论不表示公网回调或生产通知已部署。
