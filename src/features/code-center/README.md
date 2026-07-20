# 编码中心职责边界

一维码跨 TAB 生命周期以[一维码生命周期契约](../../../docs/architecture/linear-barcode-lifecycle-contract.md)为准。

本 feature 的一维码打印入口负责：

- 选择可打印销售订单行并填写 1 到 200 的预打数量
- 调用后端原子批量签发接口
- 在一个预览窗口生成全部 Code128 标签
- 展示逐码库存、批次、状态和到期时间

本 feature 不得：

- 在前端生成或保留真实流水号
- 直接把库存码改为 `BOUND`、`EXPIRED` 或 `SCRAPPED`
- 在页面轮询或后台扫描整张库存表
