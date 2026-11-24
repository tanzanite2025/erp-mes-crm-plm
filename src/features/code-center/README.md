# 编码中心职责边界

产品编码跨 TAB 生命周期以[产品编码生命周期契约](../../../docs/architecture/linear-barcode-lifecycle-contract.md)为准。

码相关文件按以下职责组织：

| 文件                                                                                                 | 职责                                                                                                |
| ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `src/lib/product-code/product-code-protocol.ts`                                                      | 公共 15 位字段定义、规则预览拼接、标准字段校验和月份编码；不分配真实流水号                          |
| `src/lib/product-code/product-code-parser.ts`                                                        | 公共字段拆分和显示名称解析；`parseProductCodeForDisplay` 保持原有长度检查语义，不能代替后端业务校验 |
| `src/lib/product-code/issued-product-code-inventory-contracts.ts`                                    | 已签发编码记录、签发请求和库存状态类型；不定义生产工序状态                                          |
| `src/lib/product-code/product-code-label-readable-text-formatter.ts`                                 | 只格式化标签可读文字，消水孔、轮向和适应范围不进入两种码图的内容                                    |
| `src/features/basic-settings/data/linear-barcode-protocol.ts`                                        | 协议配置、规则默认值、模拟输入和采集默认值                                                          |
| `src/features/print-mgmt/services/print-record-service.ts`                                           | 既有批次签发、库存查询和批次事务的 API 适配；不再声明公共编码记录类型                               |
| `src/lib/product-code-linear-barcode-and-qr-code-renderer.ts`                                        | 将同一原始编码绘制为 Code128 与 QR 图片                                                             |
| `src/features/code-center/services/product-code-label-print-preview.ts`                              | 打印窗口、标签 HTML 和三种版式                                                                      |
| `src/features/code-center/services/product-code-label-print-quantity-constraints.ts`                 | 产品码标签的打印数量范围和输入校验                                                                  |
| `src/features/code-center/services/product-code-label-print-executor.ts`                             | 新码签发、标签准备及失败批次补偿                                                                    |
| `src/features/code-center/services/reprint-issued-product-code-linear-barcode-and-qr-code-labels.ts` | 从已签发编码准备补打标签及检查补打资格                                                              |

公共协议、解析和记录契约不依赖业务 feature。后续工序或追溯模块可直接引用这些公共文件，并通过已保存的原始 `code` 关联业务记录。库存记录的 `id` 仍是库存记录 ID，不作为新增的全生命周期产品实体 ID。生命周期事件和工序流转由各自业务服务承接，不能添加到码图绘制器、文字格式化器或打印窗口中。

本 feature 的产品编码打印入口负责：

- 选择可打印销售订单行并填写 1 到 200 的预打数量
- 调用后端原子批量签发接口
- 对每个后端签发的 `item.code` 同时绘制 Code128 和 QR Code，在同一行展示；两种图形解码后的字符串完全相同
- 在一个预览窗口切换一维码、二维码或双码标签，切换不再次发号
- 展示逐码库存、批次、状态和到期时间
- 从库存补打已有编码；补打及补打失败均不签发新码、不修改库存、不报废原批次

码图绘制由 `src/lib/product-code-linear-barcode-and-qr-code-renderer.ts` 统一实现；规则模拟和库存表复用同一预览组件，库存码图进入可视区域后才加载。二维码当前只保存与一维码完全相同的原始编码字符串。

新签发流程仍使用原有打印事务和失败报废规则。库存补打通过独立的只读服务复用相同的绘制与打印窗口，允许未过期的可用码及已绑定码，拒绝已失效、已报废或待绑定但已到期的记录。补打的人眼可读文本使用已保存的原始编码，不从当前规则重建历史装饰文字。

单行、整单和失败重试共用签发执行保护，执行期间禁用其他签发入口、订单选择和数量编辑；成功或失败后恢复操作，已生成预览的行不重复签发。

单码标签使用 70 × 30 mm，双码标签使用 90 × 35 mm；预览窗口标明标签尺寸，二维码保持正方形并保留四模块静区。

本 feature 的编码状态入口负责：

- 读取后端 `GET /code-center/linear-barcode/status-contract` 状态契约
- 展示产品编码打印库存状态和生产执行状态分别有哪些
- 说明每个状态的触发方式、数据表来源、是否终态
- 明确生产执行状态是一级状态，`routeStepId/currentProcessStepId` 是该状态下的 L3 二级定位
- 明确状态定义是只读契约边界，不是查询或直接修改某个产品编码当前在哪里

本 feature 不得：

- 在前端生成或保留真实流水号
- 直接把库存码改为 `BOUND`、`EXPIRED` 或 `SCRAPPED`
- 在页面轮询或后台扫描整张库存表
- 用产品编码状态替代产线 L1/L2/L3 定义，或要求先绑定卷材才能继续普通生产
- 在状态定义 TAB 中承载单码实时追踪查询；后续追踪查询应独立放入追溯/执行链路
- 在前端维护完整状态数组作为后端状态机兜底

生产扫码、产品编码生产履历和绑定记录由各自生产/绑定服务承接，不属于本 feature 的状态定义页。生产履历读取生产状态、状态事件、工序操作和生产流转事件；产品绑定记录仍通过绑定查询单独读取，当前没有合并的跨域时间线。产品绑定不是首次生产 `START` 的前置条件，生产开工也不修改产品编码库存状态或打印批次计数。当前链路核验范围和未接入边界见生命周期契约中的[当前已核对的数据链](../../../docs/architecture/linear-barcode-lifecycle-contract.md#当前已核对的数据链2026-11-13)。
