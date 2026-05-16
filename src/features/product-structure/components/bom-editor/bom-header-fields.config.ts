/**
 * BOM 表单顶部字段配置层。
 *
 * 设计目标：
 * - 把 BOMFormHeader 中"字段有哪些、各自什么类型、放在哪一列"的决策从渲染层抽出，
 *   渲染器只负责按配置铺设 grid + 渲染 input/select。
 * - 新增字段（例如未来要接入的 customerId、site 等）时，只改本文件，
 *   不动 BOMFormHeader / 表单初始化 / form value 类型。
 *
 * 类型不变量：
 * - 字段必须对应 BOM schema 的某个 key（联合类型在下方收紧）。
 * - select 字段的 items 由 ctx 动态生成（products / statusItems 等）。
 * - 写回 form 前可声明 normalize 函数（例：status / effectiveFrom）。
 *
 * 注意：本文件刻意不做 i18n（不调用 useLanguage），仅声明 i18n key，
 * 由渲染器侧用 useLanguage().t(labelKey) 翻译。这样配置层保持纯。
 */

import type { TFunction } from 'i18next'
import { type BOM } from '../../data/schema'
import { normalizeBOMControlFieldPatch } from '../../utils/bom-control-normalization'

/** 顶部字段允许的字段名（必须是 BOM schema 中的合法 key）。 */
export type BOMHeaderFieldName = Extract<
  keyof BOM,
  'bomNo' | 'productId' | 'bomVersion' | 'bomType' | 'status' | 'effectiveFrom' | 'measuredWeight' | 'measuredWeightUnit'
>

/** 字段渲染上下文。由 BOMFormHeader 在调用时拼装好后传入工厂。 */
export interface BOMHeaderFieldContext {
  /** 是否处于编辑（而非新建）模式。 */
  isEdit: boolean
  /** 当前表单中的 bomType（决定 status 字典等）。 */
  bomType?: BOM['bomType']
  /** i18n 翻译函数（保持配置层与 react 解耦）。 */
  t: TFunction
  /** 产品下拉项（外部已基于 productDisplayLabelMap 计算）。 */
  productItems: ReadonlyArray<{ label: string; value: string }>
  /** 状态下拉项（外部已基于 bomType 计算）。 */
  statusItems: ReadonlyArray<{ label: string; value: string }>
  /** 重量单位下拉项（来源 basic-settings 单位主数据 WEIGHT 类目）。 */
  weightUnitItems: ReadonlyArray<{ label: string; value: string }>
}

/** select / input 共享的基础属性。 */
interface BOMHeaderFieldBase {
  name: BOMHeaderFieldName
  /** i18n key 解析后的 label 文本（已翻译）。 */
  label: string
  /** lg 断点下的列宽（CSS grid template column 片段）。默认为 `minmax(0,1fr)`。 */
  colSpan?: string
  /** 透传到 form control 的额外 className。 */
  className?: string
}

/** 输入框字段。 */
export interface BOMHeaderInputField extends BOMHeaderFieldBase {
  type: 'input'
  inputType?: 'text' | 'date' | 'number'
  readOnly?: boolean
  placeholder?: string
  /**
   * 用于自定义 input 的 displayValue（例：bomType 把 EBOM 翻译成「研发 BOM」）。
   * 不影响表单实际持有的值。
   */
  getDisplayValue?: (rawValue: unknown, ctx: BOMHeaderFieldContext) => string
  /** 写回 form 前的 normalize 函数（例：日期 / 状态规范化）。 */
  transformOnChange?: (nextValue: string) => string
}

/** 选择框字段。 */
export interface BOMHeaderSelectField extends BOMHeaderFieldBase {
  type: 'select'
  placeholder?: string
  /** items 工厂，从 ctx 中按需获取数据。 */
  getItems: (ctx: BOMHeaderFieldContext) => ReadonlyArray<{ label: string; value: string }>
  /** 是否禁用（可基于上下文判断，例：编辑态下 productId 不可改）。 */
  isDisabled?: (ctx: BOMHeaderFieldContext) => boolean
  /** 写回 form 前的 normalize 函数。 */
  transformOnChange?: (nextValue: string) => string
}

export type BOMHeaderField = BOMHeaderInputField | BOMHeaderSelectField

/**
 * 返回当前显示的顶部字段列表。
 *
 * 顺序即渲染顺序，列宽由 colSpan 决定。未来要新增字段（例如 customerId）：
 *   1. 在 BOMHeaderFieldName 加上 schema 中已有的 key
 *   2. 在本数组中插入声明
 *   3. 视情况调整邻近字段的 colSpan
 *
 * 不要在这里调用 react-hook-form 的 watch / setValue，配置层应保持纯。
 */
export function getBOMHeaderFields(ctx: BOMHeaderFieldContext): readonly BOMHeaderField[] {
  return [
    {
      name: 'bomNo',
      label: ctx.t('engineering.bomArchive.form.bomNo'),
      type: 'input',
      readOnly: true,
      placeholder: ctx.isEdit ? undefined : ctx.t('engineering.bomArchive.form.bomNoAutoPlaceholder'),
      className: 'bg-muted/50',
      colSpan: 'minmax(0,1.2fr)',
    },
    {
      name: 'productId',
      label: ctx.t('engineering.bomArchive.form.product'),
      type: 'select',
      placeholder: ctx.t('engineering.bomArchive.form.productPlaceholder'),
      getItems: (c) => c.productItems,
      isDisabled: (c) => c.isEdit,
      colSpan: 'minmax(0,3.4fr)',
    },
    {
      name: 'bomVersion',
      label: ctx.t('engineering.bomArchive.form.version'),
      type: 'input',
      readOnly: true,
      className: 'bg-blue-50/70 font-mono font-bold text-blue-600 text-[11px]!',
      colSpan: 'minmax(0,1fr)',
    },
    {
      name: 'bomType',
      label: ctx.t('engineering.bomArchive.form.bomType'),
      type: 'input',
      readOnly: true,
      className: 'bg-indigo-50/70 font-bold text-indigo-600 text-[11px]!',
      colSpan: 'minmax(0,0.8fr)',
      // 显示成翻译后的"研发 BOM / 生产 BOM"。
      getDisplayValue: (rawValue, c) => {
        const code = typeof rawValue === 'string' && rawValue ? rawValue : 'EBOM'
        return c.t(`engineering.dict.${code}` as any)
      },
    },
    {
      name: 'status',
      label: ctx.t('engineering.bomArchive.form.status'),
      type: 'select',
      getItems: (c) => c.statusItems,
      // 状态当前由系统规则推动（promoteBOMStatus），不允许在表单内手改。
      isDisabled: () => true,
      transformOnChange: (next) => normalizeBOMControlFieldPatch({ status: next }).status as string,
      colSpan: 'minmax(0,1.15fr)',
    },
    {
      name: 'effectiveFrom',
      label: ctx.t('engineering.bomArchive.form.effectiveFrom'),
      type: 'input',
      inputType: 'date',
      transformOnChange: (next) => normalizeBOMControlFieldPatch({ effectiveFrom: next }).effectiveFrom as string,
      colSpan: 'minmax(0,1.75fr)',
    },
    {
      // 方案 B：BOM 是产品最终重量的端到端权威源。
      // 草稿期允许 0；后端在 PromoteBOMStatus → RELEASED 时校验 > 0 + 单位非空。
      name: 'measuredWeight',
      label: ctx.t('engineering.bomArchive.form.measuredWeight'),
      type: 'input',
      inputType: 'number',
      placeholder: ctx.t('engineering.bomArchive.form.measuredWeightPlaceholder'),
      className: 'bg-emerald-50/60 font-mono font-bold text-emerald-700 text-[11px]!',
      colSpan: 'minmax(0,1.2fr)',
    },
    {
      name: 'measuredWeightUnit',
      label: ctx.t('engineering.bomArchive.form.measuredWeightUnit'),
      type: 'select',
      placeholder: ctx.t('engineering.bomArchive.form.measuredWeightUnitPlaceholder'),
      getItems: (c) => c.weightUnitItems,
      colSpan: 'minmax(0,1fr)',
    },
  ]
}

/**
 * 根据字段配置数组生成 lg 断点下的 CSS grid template。
 * 例：`['minmax(0,1.2fr)','minmax(0,3.4fr)']` → `minmax(0,1.2fr)_minmax(0,3.4fr)`
 *
 * Tailwind 通过 grid-cols-[...] 任意值语法消费这个字符串。
 */
export function buildHeaderGridTemplate(fields: readonly BOMHeaderField[]): string {
  return fields
    .map((field) => field.colSpan ?? 'minmax(0,1fr)')
    .join('_')
}
