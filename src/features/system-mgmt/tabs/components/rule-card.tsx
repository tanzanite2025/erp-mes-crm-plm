import { useEffect, useMemo, useState } from 'react'
import {
  BellRing,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  ApprovalService,
  type ApprovalUserOption,
} from '@/features/approval/services/approval-service'
import { DEFAULT_SALES_ORDER_EVENT_SOURCE } from '../../workflow-core/data/business-event-source-templates/sales-order'
import {
  type BusinessEventSource,
  type BusinessStatus,
} from '../../workflow-core/data/business-event-source-schema'
import {
  type NotificationRule,
  type RuleSegment,
} from '../../workflow-core/data/notification-rule-schema'
import { type StandardCommand } from '../../workflow-core/data/schema'
import { CommandForm } from '../../workflow-core/components/command-mgmt/command-form'
import { useCommands } from '../../workflow-core/hooks/use-commands'
import {
  createStatusSegment,
  defaultApproval,
  getSegmentCompleteness,
  getStatusActionCode,
  normalizeSegment,
} from './rule-card-model'
import { RuleStatusRow } from './rule-status-row'

interface RuleCardProps {
  rule: NotificationRule
  onUpdate: (id: string, updates: Partial<NotificationRule>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onToggle: (id: string) => Promise<void>
  eventSources: BusinessEventSource[]
  autoExpand?: boolean
}

type StatusFilter = 'all' | 'incomplete'

export function RuleCard({
  rule,
  onUpdate,
  onDelete,
  onToggle,
  eventSources,
  autoExpand = false,
}: RuleCardProps) {
  const [users, setUsers] = useState<ApprovalUserOption[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [isExpanded, setIsExpanded] = useState(autoExpand)
  const [templateDialog, setTemplateDialog] = useState<{
    status: BusinessStatus
    initialData?: StandardCommand
  } | null>(null)
  const { commands, addCommand } = useCommands()

  const currentSource =
    eventSources.find(
      (source) => source.code === (rule.sourceCode || 'SALES_ORDER')
    ) ??
    eventSources[0] ??
    DEFAULT_SALES_ORDER_EVENT_SOURCE
  const currentActionCode = rule.actionCode || getStatusActionCode(currentSource)

  const statusRows = useMemo(
    () =>
      currentSource.config.statuses.map((status) => {
        const segment = rule.segments.find((item) =>
          item.targetStatuses.includes(status.code)
        )
        const normalizedSegment = segment ? normalizeSegment(segment) : undefined
        const completeness = getSegmentCompleteness({
          segment: normalizedSegment,
          commands,
          resolverOptions: currentSource.config.dynamicResolvers,
        })

        return {
          status,
          segment: normalizedSegment,
          completeness,
        }
      }),
    [commands, currentSource, rule.segments]
  )

  const visibleStatusRows = useMemo(
    () =>
      statusFilter === 'incomplete'
        ? statusRows.filter((row) => row.completeness.tone === 'warning')
        : statusRows,
    [statusFilter, statusRows]
  )
  const autoFocusStatusCode =
    rule.segments[0]?.targetStatuses[0] ?? visibleStatusRows[0]?.status.code

  const configuredCount = statusRows.filter((row) => row.segment).length
  const approvalCount = statusRows.filter(
    (row) => row.segment?.approval?.enabled
  ).length
  const notifyCount = statusRows.filter((row) => {
    const segment = row.segment
    if (!segment) return false
    return (
      segment.commandIds.length > 0 ||
      (segment.assigneeUsernames ?? []).length > 0 ||
      Boolean(segment.dynamicRoleField)
    )
  }).length

  const completenessSummary = useMemo(
    () =>
      statusRows.reduce(
        (summary, row) => {
          if (row.completeness.tone === 'ready') {
            summary.ready += 1
          } else if (row.completeness.tone === 'warning') {
            summary.incomplete += 1
          } else {
            summary.disabled += 1
          }
          return summary
        },
        { ready: 0, incomplete: 0, disabled: 0 }
      ),
    [statusRows]
  )

  const collapsedSummary = useMemo(() => {
    const fragments = [
      `已配置 ${configuredCount} 个状态`,
      `通知 ${notifyCount} 个状态`,
      `审批 ${approvalCount} 个状态`,
    ]

    if (completenessSummary.incomplete > 0) {
      fragments.push(`${completenessSummary.incomplete} 个待补全`)
    }

    return fragments.join(' / ')
  }, [
    approvalCount,
    completenessSummary.incomplete,
    configuredCount,
    notifyCount,
  ])

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

  useEffect(() => {
    if (autoExpand) {
      setIsExpanded(true)
    }
  }, [autoExpand])

  const updateSegments = async (nextSegments: RuleSegment[]) => {
    await onUpdate(rule.id, { segments: nextSegments })
  }

  const ensureStatusSegment = (status: BusinessStatus) => {
    const existing = rule.segments.find((segment) =>
      segment.targetStatuses.includes(status.code)
    )

    return existing
      ? normalizeSegment(existing)
      : createStatusSegment(status, currentSource)
  }

  const patchStatusSegment = async (
    status: BusinessStatus,
    patch: Partial<RuleSegment>
  ) => {
    const segment = ensureStatusSegment(status)
    const exists = rule.segments.some((item) => item.id === segment.id)
    const nextSegment = normalizeSegment({ ...segment, ...patch })
    const nextSegments = exists
      ? rule.segments.map((item) =>
          item.id === segment.id ? nextSegment : item
        )
      : [...rule.segments, nextSegment]

    await updateSegments(nextSegments)
  }

  const toggleStatus = async (status: BusinessStatus, enabled: boolean) => {
    if (enabled) {
      await patchStatusSegment(status, {})
      return
    }

    const nextSegments = rule.segments.filter(
      (segment) => !segment.targetStatuses.includes(status.code)
    )
    await updateSegments(nextSegments)
  }

  const setNotifyUser = async (
    status: BusinessStatus,
    segment: RuleSegment | undefined,
    username: string
  ) => {
    if (!username) return
    const currentUsers = segment?.assigneeUsernames ?? []
    if (currentUsers.includes(username)) return

    await patchStatusSegment(status, {
      assigneeUsernames: [...currentUsers, username],
    })
  }

  const removeNotifyUser = async (
    status: BusinessStatus,
    segment: RuleSegment,
    username: string
  ) => {
    await patchStatusSegment(status, {
      assigneeUsernames: (segment.assigneeUsernames ?? []).filter(
        (item) => item !== username
      ),
    })
  }

  const updateApproval = async (
    status: BusinessStatus,
    segment: RuleSegment | undefined,
    patch: Partial<NonNullable<RuleSegment['approval']>>
  ) => {
    await patchStatusSegment(status, {
      approval: {
        ...defaultApproval,
        ...(segment?.approval ?? {}),
        module: currentSource.module,
        action:
          segment?.approval?.action ??
          `${currentSource.code}_${status.code}_APPROVAL`,
        ...patch,
      },
    })
  }

  const handleSourceChange = async (sourceCode: string) => {
    const nextSource =
      eventSources.find((source) => source.code === sourceCode) ?? currentSource
    await onUpdate(rule.id, {
      sourceCode: nextSource.code,
      entity: nextSource.entity,
      actionCode: getStatusActionCode(nextSource),
      segments: [],
    })
  }

  const openCreateTemplate = (status: BusinessStatus) => {
    setTemplateDialog({ status })
  }

  const openDuplicateTemplate = (
    status: BusinessStatus,
    template?: StandardCommand
  ) => {
    if (!template) return
    setTemplateDialog({
      status,
      initialData: {
        ...template,
        id: `draft-${template.id}`,
        title: `${template.title} 副本`,
      },
    })
  }

  return (
    <section
      className={cn(
        'overflow-hidden rounded-3xl border shadow-sm transition-all',
        rule.enabled
          ? 'border-muted/40 bg-card'
          : 'border-muted/20 bg-muted/5 opacity-70'
      )}
    >
      <div className='flex flex-col gap-4 border-b border-muted/20 px-6 py-5 lg:flex-row lg:items-center lg:justify-between'>
        <div className='flex min-w-0 flex-1 items-center gap-4'>
          <Switch
            checked={rule.enabled}
            onCheckedChange={() => onToggle(rule.id)}
            className='data-[state=checked]:bg-primary'
          />
          <div className='min-w-0 flex-1'>
            <div className='flex flex-wrap items-center gap-2'>
              <h3 className='text-sm font-bold leading-5 tracking-normal text-foreground'>
                {currentSource.name} 状态通知与审批
              </h3>
              <Badge
                variant='outline'
                className='rounded-full font-mono text-[10px]'
              >
                {currentSource.code}
              </Badge>
              <Badge className='rounded-full bg-primary/10 text-[10px] text-primary hover:bg-primary/10'>
                已配置 {configuredCount} 个状态
              </Badge>
              <div
                className='flex flex-wrap items-center gap-1.5'
                aria-label='配置完整度筛选'
              >
                <span className='rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black text-emerald-700'>
                  {completenessSummary.ready} 可运行
                </span>
                <button
                  type='button'
                  disabled={
                    completenessSummary.incomplete === 0 &&
                    statusFilter !== 'incomplete'
                  }
                  onClick={() =>
                    setStatusFilter((value) =>
                      value === 'incomplete' ? 'all' : 'incomplete'
                    )
                  }
                  className={cn(
                    'rounded-full border px-3 py-1 text-[10px] font-black transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                    statusFilter === 'incomplete'
                      ? 'border-amber-400 bg-amber-100 text-amber-800 shadow-sm'
                      : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                  )}
                >
                  {completenessSummary.incomplete} 待补全
                </button>
                <span className='rounded-full border border-muted/40 bg-muted/30 px-3 py-1 text-[10px] font-black text-muted-foreground'>
                  {completenessSummary.disabled} 未启用
                </span>
              </div>
            </div>
            <p className='mt-1 text-xs font-bold text-muted-foreground'>
              {isExpanded
                ? '直接按业务状态配置：进入某个状态时通知谁、是否创建审批、由谁审批。'
                : collapsedSummary}
            </p>
          </div>
        </div>

        <div className='flex flex-wrap items-center gap-2'>
          {isExpanded ? (
            <>
              <select
                value={currentSource.code}
                onChange={(event) => void handleSourceChange(event.target.value)}
                className='h-10 rounded-2xl border border-input bg-background px-3 text-xs font-black'
              >
                {eventSources.map((source) => (
                  <option key={source.code} value={source.code}>
                    {source.name}
                  </option>
                ))}
              </select>
              <select
                value={currentActionCode}
                onChange={(event) =>
                  void onUpdate(rule.id, { actionCode: event.target.value })
                }
                className='h-10 rounded-2xl border border-input bg-background px-3 text-xs font-black'
              >
                {currentSource.config.actions.map((action) => (
                  <option key={action.code} value={action.code}>
                    {action.name}
                  </option>
                ))}
              </select>
              <Button
                variant='outline'
                size='sm'
                className='h-10 rounded-2xl text-xs font-black'
                onClick={() => setShowAdvanced((value) => !value)}
              >
                {showAdvanced ? (
                  <ChevronUp className='size-4' />
                ) : (
                  <ChevronDown className='size-4' />
                )}
                高级项
              </Button>
            </>
          ) : null}
          <Button
            variant='outline'
            size='sm'
            className='h-10 rounded-2xl text-xs font-black'
            onClick={() => setIsExpanded((value) => !value)}
          >
            {isExpanded ? (
              <ChevronUp className='size-4' />
            ) : (
              <ChevronDown className='size-4' />
            )}
            {isExpanded ? '收起' : '展开'}
          </Button>
          <Button
            variant='ghost'
            size='icon'
            className='size-10 rounded-2xl text-muted-foreground hover:bg-destructive/5 hover:text-destructive'
            onClick={() => onDelete(rule.id)}
          >
            <Trash2 className='size-4' />
          </Button>
        </div>
      </div>

      {isExpanded ? (
        <>
          <div className='grid grid-cols-1 gap-3 p-4'>
            {statusFilter === 'incomplete' ? (
              <div className='flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] font-bold text-amber-800'>
                <span>
                  当前只显示 {completenessSummary.incomplete} 个待补全状态。
                </span>
                <button
                  type='button'
                  className='rounded-full border border-amber-300 bg-background px-3 py-1 text-[11px] font-black text-amber-800 hover:bg-amber-100'
                  onClick={() => setStatusFilter('all')}
                >
                  显示全部
                </button>
              </div>
            ) : null}

            {visibleStatusRows.map(({ status, segment, completeness }) => (
              <RuleStatusRow
                key={status.code}
                status={status}
                segment={segment}
                completeness={completeness}
                sourceName={currentSource.name}
                users={users}
                commands={commands}
                resolverOptions={currentSource.config.dynamicResolvers}
                showAdvanced={showAdvanced}
                onToggle={(enabled) => void toggleStatus(status, enabled)}
                onAddNotifyUser={(username) =>
                  void setNotifyUser(status, segment, username)
                }
                onRemoveNotifyUser={(username) => {
                  if (segment) void removeNotifyUser(status, segment, username)
                }}
                onCommandChange={(commandId) =>
                  void patchStatusSegment(status, {
                    commandIds: commandId ? [commandId] : [],
                  })
                }
                onCreateTemplate={() => openCreateTemplate(status)}
                onDuplicateTemplate={(template) =>
                  openDuplicateTemplate(status, template)
                }
                onDynamicNotifyChange={(resolverCode) =>
                  void patchStatusSegment(status, {
                    dynamicRoleField: resolverCode || null,
                  })
                }
                onApprovalUserChange={(approver1Id) =>
                  void updateApproval(status, segment, {
                    enabled: Boolean(approver1Id),
                    approver1Id,
                  })
                }
                onApprovalDynamicChange={(resolverCode) =>
                  void updateApproval(status, segment, {
                    enabled: Boolean(
                      resolverCode || segment?.approval?.approver1Id
                    ),
                    dynamicApproverField: resolverCode || null,
                  })
                }
                autoFocusConfig={
                  autoExpand && status.code === autoFocusStatusCode
                }
              />
            ))}

            {statusFilter === 'incomplete' &&
            visibleStatusRows.length === 0 ? (
              <div className='rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-8 text-center text-[12px] font-black text-emerald-700'>
                当前没有待补全状态。
              </div>
            ) : null}
          </div>

          <div className='flex flex-wrap items-center gap-2 border-t border-muted/20 bg-muted/10 px-6 py-3 text-[11px] font-bold text-muted-foreground'>
            <span className='flex items-center gap-1.5'>
              <BellRing className='size-3.5' /> 通知 {notifyCount} 个状态
            </span>
            <span className='flex items-center gap-1.5'>
              <ShieldCheck className='size-3.5' /> 审批 {approvalCount} 个状态
            </span>
          </div>
        </>
      ) : (
        <div className='flex flex-wrap items-center gap-2 border-t border-muted/20 bg-muted/10 px-6 py-3 text-[11px] font-bold text-muted-foreground'>
          <span className='flex items-center gap-1.5'>
            <BellRing className='size-3.5' /> 通知 {notifyCount} 个状态
          </span>
          <span className='flex items-center gap-1.5'>
            <ShieldCheck className='size-3.5' /> 审批 {approvalCount} 个状态
          </span>
          <span className='rounded-full border border-muted/40 bg-background px-3 py-1 text-[10px] font-black text-muted-foreground'>
            展开后查看具体状态配置
          </span>
        </div>
      )}

      <CommandForm
        open={Boolean(templateDialog)}
        onOpenChange={(open) => {
          if (!open) setTemplateDialog(null)
        }}
        initialData={templateDialog?.initialData}
        onSave={(data) => {
          void (async () => {
            const created = await addCommand(data)
            if (created && templateDialog) {
              await patchStatusSegment(templateDialog.status, {
                commandIds: [created.id],
              })
            }
            setTemplateDialog(null)
          })()
        }}
      />
    </section>
  )
}
