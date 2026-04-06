# Locale Overrides

`src/locales/overrides` 用来存放对基础词条的局部覆盖。

这里的内容会在 [`src/locales/index.ts`](C:\Users\P16V\Desktop\纤镀软件开发\XDFC\src\locales\index.ts) 里通过 `deepMerge` 合并到基础字典上，所以 override 只需要声明要覆盖的那一小块，不需要复制整份基础词条。

## 什么时候放到 overrides

- 采购、销售这类历史上已经独立维护过一套文案的模块
- 需要在不打散现有业务分支的前提下，对基础词条做局部重写
- 只改展示文案，不改业务持久化值、接口字段名、错误码

如果是全新的通用词条，优先放到 `src/locales/messages/<locale>/` 下对应的基础模块里，不要先放 override。

## 当前结构

```text
src/locales/overrides/
  purchase/
    en-US/
      index.ts
      tabs.ts
      suppliers.ts
      orders.ts
      logs.ts
      logistics.ts
    zh-CN/
      ...
  sales/
    en-US/
      index.ts
      list.ts
      status.ts
      master.ts
      detail.ts
      dialog.ts
      headerFields.ts
      linesEditor.ts
      footer.ts
      preview.ts
    zh-CN/
      ...
```

规则：

- 每个业务域单独一个目录，例如 `purchase`、`sales`
- 每个语言一个目录，例如 `en-US`、`zh-CN`
- `index.ts` 只做聚合导出
- 具体词条按二级分组拆分，文件名尽量和对象 key 对齐

## 入口约定

根入口文件保持薄封装，不直接堆大对象：

- [`src/locales/purchase.en-US.ts`](C:\Users\P16V\Desktop\纤镀软件开发\XDFC\src\locales\purchase.en-US.ts)
- [`src/locales/purchase.zh-CN.ts`](C:\Users\P16V\Desktop\纤镀软件开发\XDFC\src\locales\purchase.zh-CN.ts)
- [`src/locales/sales.en-US.ts`](C:\Users\P16V\Desktop\纤镀软件开发\XDFC\src\locales\sales.en-US.ts)
- [`src/locales/sales.zh-CN.ts`](C:\Users\P16V\Desktop\纤镀软件开发\XDFC\src\locales\sales.zh-CN.ts)

这些文件只 re-export 对应 override 聚合对象，避免再次退回“大文件手工维护”。

## 新增或修改词条

1. 先确认这是“覆盖基础词条”还是“新增基础词条”。
2. 如果是 override，在对应业务域和语言目录下找到分组文件。
3. 只写需要覆盖的那部分 key，尽量保持对象层级和基础字典一致。
4. 如果当前分组已经明显过大，再继续按下一层拆文件。
5. 修改后运行 `& corepack.cmd pnpm exec tsc -b --pretty false`。

## 维护约定

- `zh-CN` 和 `en-US` 的结构要保持一致，避免一边新增一边漏改。
- 展示文案可以翻译，业务枚举值不要翻译后回写。
- 对后端错误处理优先使用稳定 `code` 映射，不要依赖后端原始中文 `message`。
- 遇到 PowerShell 中文显示异常时，以文件实际 UTF-8 内容和 TypeScript 编译结果为准，不要只因为终端乱码就重写整份文件。
- 优先小步修改已有分片，不要把多个分片重新并回一个文件。

## 一个简单示例

```ts
// src/locales/overrides/purchase/en-US/tabs.ts
export const tabs = {
  title: 'Purchase Management',
  suppliers: 'Suppliers',
} as const
```

```ts
// src/locales/overrides/purchase/en-US/index.ts
import { tabs } from './tabs'

export const purchaseEnUSOverrides = {
  purchase: {
    tabs,
  },
} as const
```
