import { type BusinessStatus } from './business-event-source-types'
import { getBusinessEventStatusLabel } from './business-event-status-catalog'

export type BusinessEventStatusAuthorityLevel =
  | 'authoritative'
  | 'derived'
  | 'compatibility_only'

export interface BusinessEventStatusFieldContract {
  field:
    | 'id'
    | 'order'
    | 'code'
    | 'label'
    | 'phase'
    | 'isTerminal'
    | 'defaultResolve'
  authority: BusinessEventStatusAuthorityLevel
  owner: 'frontend_editor' | 'frontend_catalog' | 'backend_compatibility'
  notes: string
}

export const BUSINESS_EVENT_STATUS_FIELD_CONTRACT: BusinessEventStatusFieldContract[] =
  [
    {
      field: 'id',
      authority: 'authoritative',
      owner: 'frontend_editor',
      notes: '状态项稳定标识，用于 persisted status rename 与顺序调整。',
    },
    {
      field: 'order',
      authority: 'authoritative',
      owner: 'frontend_editor',
      notes: '状态展示顺序与事务提交顺序由前端编辑层直接维护。',
    },
    {
      field: 'code',
      authority: 'authoritative',
      owner: 'frontend_editor',
      notes: '当前状态编辑与 rename 主语义字段。',
    },
    {
      field: 'label',
      authority: 'derived',
      owner: 'frontend_catalog',
      notes:
        '当前前端主链路通过状态 catalog 派生展示标签，而不是由编辑器直接维护。',
    },
    {
      field: 'phase',
      authority: 'compatibility_only',
      owner: 'backend_compatibility',
      notes: '仍存在于后端通用 DTO 中，但当前前端主链路不以其作为权威输入。',
    },
    {
      field: 'isTerminal',
      authority: 'compatibility_only',
      owner: 'backend_compatibility',
      notes: '仍存在于后端通用 DTO 中，当前前端主链路不直接编辑。',
    },
    {
      field: 'defaultResolve',
      authority: 'derived',
      owner: 'frontend_catalog',
      notes: '当前主要由状态 catalog 或后端兼容配置推导。',
    },
  ]

export function toBusinessEventStatusAuthoritativeSnapshot(
  status: Pick<BusinessStatus, 'id' | 'order' | 'code'>,
  fallbackOrder: number
) {
  return {
    id: status.id,
    order: status.order ?? fallbackOrder,
    code: status.code,
  }
}

export function getBusinessEventStatusDerivedLabel(
  sourceCode: string | undefined,
  status: Pick<BusinessStatus, 'code'>
) {
  return getBusinessEventStatusLabel(sourceCode, status.code)
}
