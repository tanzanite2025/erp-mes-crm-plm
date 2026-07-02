# Locale Messages

`src/locales/messages` 用来存放系统的基础词条。

这里是默认字典的主维护区。大多数新词条、新页面文案、全局组件文案，都应该优先放在这里，而不是直接放到 `overrides`。

## 和 overrides 的分工

- `messages`：基础词条、通用词条、模块默认文案
- `overrides`：对既有基础词条的局部覆盖，通常用于历史独立模块或暂时不适合并回基础字典的场景

判断规则很简单：

- 新增功能文案，优先放 `messages`
- 采购、销售这类已有独立 override 体系的局部重写，放 `overrides`
- 如果只是改一个模块的默认展示词，而且没有“覆盖基础词条”的历史包袱，仍然优先改 `messages`

## 当前结构

```text
src/locales/messages/
  en-US/
    index.ts
    common.ts
    sidebar.ts
    commandMenu.ts
    basicSettings.ts
    trading.ts
    warehouse.ts
    workflowCore.ts
    ...
  zh-CN/
    index.ts
    common.ts
    sidebar.ts
    commandMenu.ts
    basicSettings.ts
    trading.ts
    warehouse.ts
    workflowCore.ts
    ...
```

规则：

- 每个语言一个目录，例如 `en-US`、`zh-CN`
- 每个目录下按顶层业务模块拆文件
- `index.ts` 只做聚合导出
- 文件名尽量和顶层对象 key 对齐

## 入口约定

基础词条的根入口保持薄封装：

- [`src/locales/en-US.ts`](../en-US.ts)
- [`src/locales/zh-CN.ts`](../zh-CN.ts)

这两个文件只 re-export 聚合后的基础消息对象。真正维护内容在对应语言目录和分模块文件里，不再回到单个超大文件里堆对象。

## 新增或修改基础词条

1. 先确认这次是“新增基础词条”还是“覆盖已有词条”。
2. 如果是基础词条，在对应语言目录里找到最接近的模块文件。
3. 如果没有合适模块，再新增一个分模块文件，并同步补到两种语言的 `index.ts` 聚合里。
4. 保持中英结构一致，key 名一致，只改值。
5. 修改后运行 `& corepack.cmd pnpm exec tsc -b --pretty false`。

## 维护约定

- `zh-CN` 和 `en-US` 的对象结构必须一致。
- key 要稳定，避免把展示文案直接当 key。
- 展示文案可以翻译，业务状态值、数据库值、接口字段不要因为多语言而改名。
- 公共按钮、空状态、提示语优先复用已有 `common` 或已有模块词条，避免同义词条散落多处。
- 如果某个模块文件开始明显变大，可以继续按下一层业务域拆分，但要保持聚合入口清晰。
- PowerShell 里看到中文乱码时，以 UTF-8 文件内容和 TypeScript 编译结果为准，不要因为终端显示异常就整文件重写。

## 提交与校验

- 本地 `pre-commit` 采用条件触发：
- 只有 staged 文件命中 locale 词典或 i18n parity 校验脚本时，才运行 `verify:i18n`
- 只有 staged 文件命中 `zh-CN` locale 文件或编码校验脚本时，才运行 `verify:zh-cn-encoding`
- 条件触发逻辑通过 `.githooks/hook-helpers.sh` 复用，后续新增 staged-only 校验时优先走这层 helper
- 这样可以避免普通业务改动被整仓 locale 扫描拖慢，同时仍保留提交前护栏
- CI 端仍会跑完整的 `verify:i18n`，所以本地是轻量前置检查，远端是全量兜底

## 适合放在 messages 的例子

- 全局按钮文案
- 侧边栏和命令菜单文案
- 页面标题、空状态、表单标签、placeholder
- 新模块的默认 tabs、toast、对话框文案

## 不适合直接放在 messages 的例子

- 只对采购或销售历史分支生效的局部覆盖
- 需要通过 `deepMerge` 局部替换的遗留模块文案
- 用户录入的数据内容
- 后端返回的原始错误 message

## 一个简单示例

```ts
// src/locales/messages/en-US/common.ts
export const common = {
  actions: {
    save: 'Save',
    cancel: 'Cancel',
  },
} as const
```

```ts
// src/locales/messages/en-US/index.ts
import { common } from './common'

export const enUSMessages = {
  common,
} as const
```
