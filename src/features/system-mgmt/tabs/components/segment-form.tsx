import { useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  ApprovalService,
  type ApprovalUserOption,
} from '@/features/approval/services/approval-service'
import { useRoles } from '@/features/system-mgmt/hooks/use-roles'
import {
  type BusinessEventSource,
  getEventSourceStatusOptions,
} from '../../workflow-core/data/business-event-source-schema'
import { type RuleSegment } from '../../workflow-core/data/notification-rule-schema'
import { CommandBinding } from './command-binding'

interface SegmentFormProps {
  segment: RuleSegment
  eventSource: BusinessEventSource
  onChange: (updates: Partial<RuleSegment>) => void
}

const defaultApproval: NonNullable<RuleSegment['approval']> = {
  enabled: false,
  module: 'Trading',
  action: 'ORDER_REVIEW',
  approver1Id: '',
  approver2Id: '',
  dynamicApproverField: null,
  reasonTemplate:
    '业务规则「[RuleName] / [SegmentTitle]」已命中，请审批单据 [OrderNo]。',
}

function toNullableValue(value: string) {
  return value.trim() || null
}

export function SegmentForm({
  segment,
  eventSource,
  onChange,
}: SegmentFormProps) {
  const { roles } = useRoles()
  const [users, setUsers] = useState<ApprovalUserOption[]>([])
  const approval = segment.approval ?? defaultApproval
  const statusOptions = getEventSourceStatusOptions(eventSource)
  const resolverOptions = eventSource.config.dynamicResolvers

  useEffect(() => {
    let cancelled = false

    void ApprovalService.fetchUserOptions()
      .then((data) => {
        if (!cancelled) setUsers(data)
      })
      .catch(() => {
        if (!cancelled) setUsers([])
      })

    return () => {
      cancelled = true
    }
  }, [])

  const toggleStatus = (value: string) => {
    const has = segment.targetStatuses.includes(value)
    onChange({
      targetStatuses: has
        ? segment.targetStatuses.filter((status) => status !== value)
        : [...segment.targetStatuses, value],
    })
  }

  const toggleResolveStatus = (value: string) => {
    const current = segment.resolveOnStatuses ?? []
    const has = current.includes(value)
    onChange({
      resolveOnStatuses: has
        ? current.filter((status) => status !== value)
        : [...current, value],
    })
  }

  const toggleRole = (id: string) => {
    const has = segment.assigneeRoles.includes(id)
    onChange({
      assigneeRoles: has
        ? segment.assigneeRoles.filter((roleId) => roleId !== id)
        : [...segment.assigneeRoles, id],
    })
  }

  const updateApproval = (
    updates: Partial<NonNullable<RuleSegment['approval']>>
  ) => {
    onChange({ approval: { ...approval, ...updates } })
  }

  return (
    <div className='flex animate-in flex-col gap-4 py-2 text-[11px] duration-300 fade-in'>
      <div className='flex flex-col gap-1.5'>
        <label className='text-[9px] font-black tracking-widest text-muted-foreground uppercase'>
          触发状态（匹配任一即可，空 = 全部）
        </label>
        <div className='flex flex-wrap gap-1.5 rounded-xl border border-muted/20 bg-muted/20 p-2'>
          {statusOptions.map((option) => {
            const selected = segment.targetStatuses.includes(option.value)
            return (
              <Badge
                key={option.value}
                variant={selected ? 'default' : 'outline'}
                className={cn(
                  'cursor-pointer px-2 py-0.5 text-[10px] transition-all',
                  selected
                    ? 'border-primary bg-primary'
                    : 'bg-transparent text-muted-foreground hover:bg-muted'
                )}
                onClick={() => toggleStatus(option.value)}
              >
                {option.label}
              </Badge>
            )
          })}
        </div>
      </div>

      <div className='flex flex-col gap-1.5'>
        <label className='text-[9px] font-black tracking-widest text-muted-foreground uppercase'>
          自动归档状态（进入这些状态后通知自动消失）
        </label>
        <div className='flex flex-wrap gap-1.5 rounded-xl border border-muted/20 bg-muted/20 p-2'>
          {statusOptions.map((option) => {
            const selected = (segment.resolveOnStatuses ?? []).includes(
              option.value
            )
            return (
              <Badge
                key={option.value}
                variant={selected ? 'secondary' : 'outline'}
                className={cn(
                  'cursor-pointer px-2 py-0.5 text-[10px] transition-all',
                  selected
                    ? 'border-emerald-300 bg-emerald-100 text-emerald-700'
                    : 'bg-transparent text-muted-foreground hover:bg-muted'
                )}
                onClick={() => toggleResolveStatus(option.value)}
              >
                {option.label}
              </Badge>
            )
          })}
        </div>
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        <div className='flex flex-col gap-1.5'>
          <label className='text-[9px] font-black tracking-widest text-muted-foreground uppercase'>
            接收角色（静态指定）
          </label>
          <div className='flex min-h-[42px] flex-wrap gap-1.5 rounded-xl border border-muted/20 bg-muted/20 p-2'>
            {roles.map((role) => {
              const selected = segment.assigneeRoles.includes(role.id)
              return (
                <Badge
                  key={role.id}
                  variant={selected ? 'default' : 'outline'}
                  className={cn(
                    'cursor-pointer px-2 py-0.5 text-[10px] transition-all',
                    selected
                      ? 'border-blue-600 bg-blue-600'
                      : 'bg-transparent text-muted-foreground hover:bg-muted'
                  )}
                  onClick={() => toggleRole(role.id)}
                >
                  {role.label}
                </Badge>
              )
            })}
          </div>
        </div>

        <div className='flex flex-col gap-1.5'>
          <label className='text-[9px] font-black tracking-widest text-muted-foreground uppercase'>
            动态接收人（来自业务字段）
          </label>
          <select
            value={segment.dynamicRoleField ?? ''}
            onChange={(event) =>
              onChange({
                dynamicRoleField: toNullableValue(event.target.value),
              })
            }
            className='w-full appearance-none rounded-xl border border-muted/20 bg-muted/40 px-3 py-2 text-[11px] font-bold ring-primary outline-none focus:ring-1'
          >
            <option value=''>不使用动态接收人</option>
            {resolverOptions.map((resolver) => (
              <option key={resolver.code} value={resolver.code}>
                {resolver.label} ({resolver.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className='flex flex-col gap-3 rounded-[26px] border border-dashed border-primary/15 bg-primary/5 p-4'>
        <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
          <label className='flex items-center gap-2 text-[9px] font-black tracking-widest text-primary uppercase'>
            <ShieldCheck className='size-3.5' />
            审批动作（分支命中后是否创建审批）
          </label>
          <select
            value={approval.enabled ? 'approval' : 'none'}
            onChange={(event) =>
              updateApproval({ enabled: event.target.value === 'approval' })
            }
            className='h-8 rounded-full border border-primary/10 bg-background px-3 text-[10px] font-black ring-primary outline-none focus:ring-1'
          >
            <option value='none'>只通知，不创建审批</option>
            <option value='approval'>创建审批申请</option>
          </select>
        </div>

        {approval.enabled && (
          <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
            <ApprovalInput
              label='审批模块标识'
              value={approval.module}
              onChange={(value) => updateApproval({ module: value })}
              placeholder='例如 Trading / Inventory'
            />
            <ApprovalInput
              label='审批动作标识'
              value={approval.action}
              onChange={(value) => updateApproval({ action: value })}
              placeholder='例如 ORDER_REVIEW / DELETE'
            />

            <ApprovalSelect
              label='一级审批人（固定账号）'
              value={approval.approver1Id}
              onChange={(value) => updateApproval({ approver1Id: value })}
              placeholder='不固定，使用动态审批人或后端规则'
              users={users}
            />
            <ApprovalSelect
              label='二级审批人（可选）'
              value={approval.approver2Id}
              onChange={(value) => updateApproval({ approver2Id: value })}
              placeholder='无二审'
              users={users}
            />

            <div className='flex flex-col gap-1.5'>
              <label className='text-[9px] font-black tracking-widest text-muted-foreground uppercase'>
                动态审批人来源
              </label>
              <select
                value={approval.dynamicApproverField ?? ''}
                onChange={(event) =>
                  updateApproval({
                    dynamicApproverField: toNullableValue(event.target.value),
                  })
                }
                className='w-full rounded-xl border border-muted/20 bg-background px-3 py-2 text-[11px] font-bold ring-primary outline-none focus:ring-1'
              >
                <option value=''>不使用动态审批人</option>
                {resolverOptions.map((resolver) => (
                  <option key={resolver.code} value={resolver.code}>
                    {resolver.label} ({resolver.code})
                  </option>
                ))}
              </select>
            </div>

            <ApprovalInput
              label='申请理由模板'
              value={approval.reasonTemplate}
              onChange={(value) => updateApproval({ reasonTemplate: value })}
              placeholder='支持 [OrderNo] / [RuleName] / [SegmentTitle]'
            />
          </div>
        )}
      </div>

      <div className='flex flex-col gap-1.5'>
        <label className='text-[9px] font-black tracking-widest text-muted-foreground uppercase'>
          绑定通知指令（多选，支持名称/内容搜索）
        </label>
        <div className='rounded-[30px] border-2 border-muted/20 bg-muted/20 p-4'>
          <CommandBinding
            selectedIds={segment.commandIds}
            onChange={(ids) => onChange({ commandIds: ids })}
          />
        </div>
      </div>
    </div>
  )
}

function ApprovalInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <div className='flex flex-col gap-1.5'>
      <label className='text-[9px] font-black tracking-widest text-muted-foreground uppercase'>
        {label}
      </label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className='w-full rounded-xl border border-muted/20 bg-background px-3 py-2 text-[11px] font-bold ring-primary outline-none focus:ring-1'
        placeholder={placeholder}
      />
    </div>
  )
}

function ApprovalSelect({
  label,
  value,
  onChange,
  placeholder,
  users,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  users: ApprovalUserOption[]
}) {
  return (
    <div className='flex flex-col gap-1.5'>
      <label className='text-[9px] font-black tracking-widest text-muted-foreground uppercase'>
        {label}
      </label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className='w-full rounded-xl border border-muted/20 bg-background px-3 py-2 text-[11px] font-bold ring-primary outline-none focus:ring-1'
      >
        <option value=''>{placeholder}</option>
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.username}
          </option>
        ))}
      </select>
    </div>
  )
}
