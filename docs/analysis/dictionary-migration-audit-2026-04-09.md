# Dictionary Migration Audit Closeout (2026-04-09)

> 状态：历史审计已关闭。
> 关闭日期：2026-07-25
> 当前权威文档：`docs/architecture/master-data-ownership-table.md`

## 关闭原因

这份审计最初用于定位业务模块误用全局字典中心的问题。当前代码已经不再处于当时记录的状态：

- `MATERIAL_CATEGORY` 已收口到 `src/features/material-archive/data/material-category-options.ts`；
- `ORDER_TYPE`、`ORDER_CLASSIFICATION` 已收口到 `src/features/trading/data/sales-order-options.ts`；
- `HOLE_COUNT` 已收口到工程/孔位模块自有数据源；
- 当前扫描未发现业务模块继续直接使用 `DictionaryCoreService.getOptions(...)`、`DictionaryCoreService.getEntries(...)` 或 `xdfc_dictionary_updated`。

因此，原审计里的 P0/P1 调用点不能继续当成当前待办。

## 当前仍有效的长期规则

1. 全局字典中心只保留少数全局例外和历史兼容，不作为业务主数据权威源。
2. 固定业务枚举放在所属模块的 data/options 文件中。
3. 可维护主数据必须由所属业务模块提供读写入口。
4. 新增业务模块不得重新引入 `DictionaryCoreService` 作为跨域数据捷径。
5. 字段归属以 `docs/architecture/master-data-ownership-table.md` 为准。

## 后续如果发现新问题

不要恢复这份旧审计里的路径清单。应重新扫描当前代码，并把新的字段归属补到 `master-data-ownership-table.md`，再按模块边界处理。
