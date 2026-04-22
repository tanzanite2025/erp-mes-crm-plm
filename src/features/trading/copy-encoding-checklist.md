# 交易模块文案 / 编码巡检清单

这份清单只管两类问题：

- 可见文案是不是稳定、自然、可读
- 文件编码是不是统一，是否混入乱码或 mojibake

## 适用范围

- `src/features/trading/**/*.tsx`
- `src/features/trading/**/*.ts`
- 尤其优先看：弹窗、表格表头、按钮、空态、错误提示、筛选项、占位符

## 每次改动前后都过一遍

1. 先看“用户能看到”的文案
   - 标题、按钮、表头、空态、toast、错误提示是否是正常中文
   - 同一概念是否前后一致，比如“台账编号 / 单据编号 / 编号”不要混着叫
   - 危险动作和确认动作文案要直接，不要含糊

2. 再看“容易漏掉”的文案位置
   - `placeholder`
   - `Label`
   - `SelectItem`
   - `DialogDescription`
   - 表格空态
   - 加载态 / 失败态
   - hook / config 里的默认兜底文案

3. 确认编码是 UTF-8
   - PowerShell 读文件时优先用 `Get-Content -Encoding UTF8`
   - 不要用终端默认编码判断文件是否乱码
   - 看到 `鏈€`、`鍙拌处`、`鎼滅储`、`甯佺`、`鐘舵€?`、`�` 这一类，优先怀疑 mojibake

4. 改完后跑快速扫描
   - `rg -n --glob "*.ts" --glob "*.tsx" --glob "!*.test.ts" --glob "!*.test.tsx" "鏈€|鍙拌处|鎼滅储|甯佺|鐘舵€|纭|閫夋嫨|姝ｅ湪|璇疯緭鍏|鏈寚瀹|闄嶅簭|鍗囧簭|�" src/features/trading`

5. 跑护栏测试
   - `pnpm exec vitest run src/features/trading/copy-encoding-guard.test.ts`

## 当前约定

- 用户可见中文统一直接写在组件或明确的 config 中
- 默认兜底文案也要当成可见文案来维护
- 任何一次交易模块 UI 改动，都要至少过：
  - 一次乱码扫描
  - 一次相关组件测试

## 本轮已收掉的残留

- `ledger-search-dialog.tsx` 可见文案乱码
- `use-purchase-return-view-model.ts` 中的默认供应商兜底文案乱码
