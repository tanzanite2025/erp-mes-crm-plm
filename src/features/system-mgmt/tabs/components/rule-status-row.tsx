import { useEffect, useRef } from 'react'
import { BellRing, Check, ShieldCheck, UserRound } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { type ApprovalUserOption } from '@/features/approval/services/approval-service'
import {
  type BusinessEventSource,
  type BusinessStatus,
} from '../../workflow-core/data/business-event-source-schema'
import { getBusinessEventStatusLabel } from '../../workflow-core/data/business-event-status-catalog'
import { type RuleSegment } from '../../workflow-core/data/notification-rule-schema'
import { type StandardCommand } from '../../workflow-core/data/schema'
import {
  buildStatusPreview,
  defaultApproval,
  getCompletenessToneClass,
  getUserLabel,
  type CompletenessTone,
} from './rule-card-model'
import { RuleTemplatePanel } from './rule-template-panel'

interface RuleStatusRowProps {
  status: BusinessStatus
  segment?: RuleSegment
  completeness: { label: string; tone: CompletenessTone }
  sourceName: string
  sourceCode: string
  actionCode: string
  users: ApprovalUserOption[]
  commands: StandardCommand[]
  resolverOptions: BusinessEventSource['config']['dynamicResolvers']
  showAdvanced: boolean
  onToggle: (enabled: boolean) => void
  onAddNotifyUser: (username: string) => void
  onRemoveNotifyUser: (username: string) => void
  onCommandChange: (commandId: string) => void
  onCreateTemplate: () => void
  onDuplicateTemplate: (template?: StandardCommand) => void
  onDynamicNotifyChange: (resolverCode: string) => void
  onApprovalUserChange: (userId: string) => void
  onApprovalDynamicChange: (resolverCode: string) => void
  autoFocusConfig?: boolean
}

export function RuleStatusRow({
  status,
  segment,
  completeness,
  sourceName,
  sourceCode,
  actionCode,
  users,
  commands,
  resolverOptions,
  showAdvanced,
  onToggle,
  onAddNotifyUser,
  onRemoveNotifyUser,
  onCommandChange,
  onCreateTemplate,
  onDuplicateTemplate,
  onDynamicNotifyChange,
  onApprovalUserChange,
  onApprovalDynamicChange,
  autoFocusConfig = false,
}: RuleStatusRowProps) {
  const notifySelectRef = useRef<HTMLSelectElement | null>(null)
  const hasFocusedConfigRef = useRef(false)
  const enabled = Boolean(segment)
  const statusLabel = getBusinessEventStatusLabel(sourceCode, status.code)
  const approval = segment?.approval ?? defaultApproval
  const selectedUsernames = segment?.assigneeUsernames ?? []
  const selectedCommandId = segment?.commandIds[0] ?? ''
  const selectedCommand = commands.find(
    (command) => command.id === selectedCommandId
  )
  const dynamicNotifyTarget = resolverOptions.find(
    (resolver) => resolver.code === segment?.dynamicTargetField
  )?.label
  const dynamicApprovalTarget = resolverOptions.find(
    (resolver) => resolver.code === approval.dynamicApproverField
  )?.label
  const fixedApprovalTarget = users.find(
    (user) => user.id === approval.approver1Id
  )
  const notifyTargets = [
    ...selectedUsernames,
    ...(dynamicNotifyTarget ? [`动态：${dynamicNotifyTarget}`] : []),
  ]
  const approvalTarget = approval.enabled
    ? fixedApprovalTarget
      ? getUserLabel(fixedApprovalTarget)
      : dynamicApprovalTarget
        ? `动态：${dynamicApprovalTarget}`
        : approval.approver1Id
          ? `账号 ${approval.approver1Id}`
          : ''
    : ''
  const previewText = buildStatusPreview({
    sourceName,
    statusLabel,
    enabled,
    notifyTargets,
    commandTitle: selectedCommand?.title,
    approvalTarget: approvalTarget || undefined,
  })

  useEffect(() => {
    if (!autoFocusConfig || !enabled || hasFocusedConfigRef.current) return

    const frame = window.requestAnimationFrame(() => {
      notifySelectRef.current?.focus({ preventScroll: true })
      notifySelectRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
      hasFocusedConfigRef.current = true
    })

    return () => window.cancelAnimationFrame(frame)
  }, [autoFocusConfig, enabled])

  return (
    <div
      className={cn(
        'rounded-2xl border p-4 transition-all',
        completeness.tone === 'warning'
          ? 'border-amber-300 bg-amber-50/60 shadow-sm shadow-amber-100'
          : enabled
            ? 'border-primary/20 bg-background shadow-sm'
            : 'border-muted/30 bg-muted/10'
      )}
    >
      <div className='grid grid-cols-1 gap-4 xl:grid-cols-[220px_1fr_1fr] xl:items-start'>
        <div className='flex items-start gap-3'>
          <Switch
            checked={enabled}
            onCheckedChange={onToggle}
            className='mt-1 data-[state=checked]:bg-primary'
          />
          <div className='min-w-0'>
            <div className='flex flex-wrap items-center gap-2'>
              <span className='text-sm font-black'>{statusLabel}</span>
              <Badge
                variant='outline'
                className='rounded-full font-mono text-[10px]'
              >
                {status.code}
              </Badge>
            </div>
            <p className='mt-1 text-[11px] font-bold text-muted-foreground'>
              进入「{statusLabel}」时触发
            </p>
          </div>
        </div>

        <div className='flex flex-col gap-2'>
          <div className='flex items-center gap-2 text-xs font-black'>
            <BellRing className='size-4 text-blue-600' />
            通知给谁
          </div>
          <div className='flex flex-wrap gap-2'>
            {selectedUsernames.map((username) => (
              <Badge
                key={username}
                variant='secondary'
                className='h-8 gap-1 rounded-full px-3 text-[11px] font-black'
              >
                <UserRound className='size-3.5' />
                {username}
                <button
                  type='button'
                  className='ml-1 text-muted-foreground hover:text-destructive'
                  onClick={() => onRemoveNotifyUser(username)}
                >
                  x
                </button>
              </Badge>
            ))}
            {selectedUsernames.length === 0 && (
              <span className='h-8 rounded-full bg-muted/40 px-3 py-2 text-[10px] font-bold text-muted-foreground'>
                未指定账号
              </span>
            )}
          </div>
          <select
            ref={notifySelectRef}
            disabled={!enabled}
            value=''
            onChange={(event) => onAddNotifyUser(event.target.value)}
            className='h-10 rounded-2xl border border-input bg-background px-3 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50'
          >
            <option value=''>添加通知账号</option>
            {users
              .filter((user) => !selectedUsernames.includes(user.username))
              .map((user) => (
                <option key={user.id} value={user.username}>
                  {getUserLabel(user)}
                </option>
              ))}
          </select>
        </div>

        <div className='flex flex-col gap-2'>
          <div className='flex items-center gap-2 text-xs font-black'>
            <ShieldCheck className='size-4 text-emerald-600' />
            是否需要审批
          </div>
          <select
            disabled={!enabled}
            value={approval.enabled ? approval.approver1Id : ''}
            onChange={(event) => onApprovalUserChange(event.target.value)}
            className='h-10 rounded-2xl border border-input bg-background px-3 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50'
          >
            <option value=''>不创建审批</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {getUserLabel(user)}
              </option>
            ))}
          </select>
          {approval.enabled && (
            <p className='flex items-center gap-1.5 text-[10px] font-bold text-emerald-700'>
              <Check className='size-3.5' />
              命中后会创建审批申请
            </p>
          )}
        </div>
      </div>

      {enabled ? (
        <RuleTemplatePanel
          commands={commands}
          selectedCommandId={selectedCommandId}
          selectedCommand={selectedCommand}
          sourceCode={sourceCode}
          actionCode={actionCode}
          statusCode={status.code}
          onCommandChange={onCommandChange}
          onCreateTemplate={onCreateTemplate}
          onDuplicateTemplate={onDuplicateTemplate}
        />
      ) : null}

      {enabled ? (
        <div
          className={cn(
            'mt-4 grid grid-cols-1 gap-3 border-t border-dashed border-muted/30 pt-4 md:grid-cols-3',
            !showAdvanced && 'hidden'
          )}
        >
          <label className='flex flex-col gap-1 text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
            动态通知对象
            <select
              value={segment?.dynamicTargetField ?? ''}
              onChange={(event) => onDynamicNotifyChange(event.target.value)}
              className='h-10 rounded-2xl border border-input bg-background px-3 text-xs font-bold normal-case tracking-normal text-foreground'
            >
              <option value=''>不使用动态对象</option>
              {resolverOptions.map((resolver) => (
                <option key={resolver.code} value={resolver.code}>
                  {resolver.label}
                </option>
              ))}
            </select>
          </label>

          <label className='flex flex-col gap-1 text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
            动态审批人
            <select
              value={approval.dynamicApproverField ?? ''}
              onChange={(event) => onApprovalDynamicChange(event.target.value)}
              className='h-10 rounded-2xl border border-input bg-background px-3 text-xs font-bold normal-case tracking-normal text-foreground'
            >
              <option value=''>不使用动态审批人</option>
              {resolverOptions.map((resolver) => (
                <option key={resolver.code} value={resolver.code}>
                  {resolver.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      <div
        className={cn(
          'mt-4 rounded-2xl border px-4 py-3 text-[12px] font-bold leading-relaxed',
          enabled
            ? 'border-primary/15 bg-primary/5 text-foreground'
            : 'border-muted/30 bg-muted/20 text-muted-foreground'
        )}
      >
        <div className='flex flex-col gap-2 md:flex-row md:items-center'>
          <Badge
            variant='outline'
            className={cn(
              'w-fit shrink-0 rounded-full px-3 py-1 text-[10px] font-black',
              getCompletenessToneClass(completeness.tone)
            )}
          >
            {completeness.label}
          </Badge>
          <span>{previewText}</span>
        </div>
      </div>
    </div>
  )
}
