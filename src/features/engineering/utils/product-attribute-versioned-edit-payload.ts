import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'

export function buildProductAttributeVersionedEditPayload<
  T extends { id?: string; version?: number },
>(
  next: T,
  current: T | undefined,
  editableFields: readonly (keyof T)[],
  intent: string
): DeltaPayload {
  if (
    !current?.id ||
    current.id !== next.id ||
    !Number.isSafeInteger(current.version) ||
    (current.version ?? 0) < 1
  ) {
    throw new Error(
      '编辑产品模板属性分类时缺少原始数据或有效版本，请刷新后重新打开。'
    )
  }

  const delta: DeltaSet = {}
  for (const field of editableFields) {
    if (next[field] !== undefined && next[field] !== current[field]) {
      delta[String(field)] = { o: current[field] ?? null, n: next[field] }
    }
  }
  return {
    op: 'PATCH',
    delta,
    metadata: { id: current.id, version: current.version, intent },
  }
}
