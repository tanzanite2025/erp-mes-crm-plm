import { useMemo, useState } from 'react'
import { CheckCheck, Search, ShieldCheck, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatPermissionLabel } from '@/features/authz/utils/permission-tree-utils'
import {
  filterAiPermissionGroups,
  type AiPermissionGroup,
} from '../../utils/ai-permission-groups'

interface AiRoutePermissionsCardProps {
  permissionGroups: AiPermissionGroup[]
  selectedPermissionIds: string[]
  onTogglePermissions: (permissionIds: string[]) => void
  className?: string
}

export function AiRoutePermissionsCard({
  permissionGroups,
  selectedPermissionIds,
  onTogglePermissions,
  className,
}: AiRoutePermissionsCardProps) {
  const { t } = useLanguage()
  const [searchQuery, setSearchQuery] = useState('')

  const visiblePermissionGroups = useMemo(
    () => filterAiPermissionGroups(permissionGroups, searchQuery),
    [permissionGroups, searchQuery]
  )
  const selectedPermissionIdSet = useMemo(
    () =>
      new Set(
        selectedPermissionIds.map((permissionId) =>
          permissionId.trim().toLowerCase()
        )
      ),
    [selectedPermissionIds]
  )
  const routePermissionCount = useMemo(
    () =>
      permissionGroups.reduce(
        (count, group) => count + group.permissionIds.length,
        0
      ),
    [permissionGroups]
  )
  const selectedPermissionCount = useMemo(
    () =>
      permissionGroups.reduce(
        (count, group) =>
          count +
          group.permissionIds.filter((permissionId) =>
            selectedPermissionIdSet.has(permissionId.toLowerCase())
          ).length,
        0
      ),
    [permissionGroups, selectedPermissionIdSet]
  )

  return (
    <Card
      className={cn(
        'gap-0 overflow-hidden rounded-2xl border-2 border-dashed border-slate-100 bg-slate-50/30 py-0 shadow-none md:rounded-[28px]',
        className
      )}
    >
      <CardHeader className='gap-1 border-b border-dashed border-slate-100 !px-4 !py-3'>
        <CardTitle className='text-[11px] font-black tracking-tight uppercase italic md:text-sm'>
          {t('aiAssistant.accessControl.permissions.title')}
        </CardTitle>
        <CardDescription className='text-[8px] leading-none font-bold tracking-widest text-slate-400 uppercase md:text-[9px]'>
          {t('aiAssistant.accessControl.permissions.description')}
        </CardDescription>
      </CardHeader>

      <CardContent className='space-y-3 !p-4'>
        <div className='flex flex-col gap-3 rounded-2xl border border-dashed border-slate-200 bg-white p-2.5 sm:flex-row sm:items-center sm:justify-between'>
          <div className='relative min-w-0 flex-1 sm:max-w-md'>
            <Search className='pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400' />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t(
                'aiAssistant.accessControl.permissions.searchPlaceholder'
              )}
              aria-label={t(
                'aiAssistant.accessControl.permissions.searchPlaceholder'
              )}
              className='h-9 rounded-xl border-slate-200 bg-slate-50 pr-10 pl-9 text-xs'
            />
            {searchQuery ? (
              <Button
                type='button'
                variant='ghost'
                size='icon'
                className='absolute top-1/2 right-1 size-7 -translate-y-1/2 rounded-lg text-slate-400'
                onClick={() => setSearchQuery('')}
                aria-label={t(
                  'aiAssistant.accessControl.permissions.clearSearch'
                )}
              >
                <X className='size-3.5' />
              </Button>
            ) : null}
          </div>
          <p className='shrink-0 text-[10px] font-black tracking-widest text-slate-500 uppercase'>
            {t('aiAssistant.accessControl.permissions.selectedSummary', {
              selected: selectedPermissionCount,
              total: routePermissionCount,
            })}
          </p>
        </div>

        {visiblePermissionGroups.length > 0 ? (
          <Accordion
            key={searchQuery.trim().toLowerCase() || 'all'}
            type='single'
            defaultValue={
              searchQuery.trim() ? visiblePermissionGroups[0]?.id : undefined
            }
            className='space-y-3'
          >
            {visiblePermissionGroups.map((group) => {
              const selectedCount = group.permissionIds.filter((permissionId) =>
                selectedPermissionIdSet.has(permissionId.toLowerCase())
              ).length
              const allSelected =
                group.permissionIds.length > 0 &&
                selectedCount === group.permissionIds.length

              return (
                <AccordionItem
                  key={group.id}
                  value={group.id}
                  className='overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-none'
                >
                  <div className='flex items-stretch'>
                    <AccordionTrigger className='min-w-0 px-3 py-3 hover:bg-slate-50 sm:px-4'>
                      <div className='flex min-w-0 flex-1 items-center gap-3 text-left'>
                        <div
                          className={cn(
                            'flex size-9 shrink-0 items-center justify-center rounded-xl',
                            selectedCount > 0
                              ? 'bg-indigo-100 text-indigo-600'
                              : 'bg-slate-100 text-slate-400'
                          )}
                        >
                          <ShieldCheck className='size-4' />
                        </div>
                        <div className='min-w-0 flex-1'>
                          <p className='truncate text-xs font-black text-slate-700'>
                            {formatPermissionLabel(group.module.label)}
                          </p>
                          <p className='mt-0.5 text-[9px] font-bold tracking-wider text-slate-400 uppercase'>
                            {t(
                              'aiAssistant.accessControl.permissions.groupSummary',
                              {
                                selected: selectedCount,
                                total: group.permissionIds.length,
                              }
                            )}
                          </p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <div className='flex shrink-0 items-center pr-3 sm:pr-4'>
                      <Button
                        type='button'
                        variant={allSelected ? 'ghost' : 'outline'}
                        size='sm'
                        className='h-8 rounded-lg px-2 text-[9px] font-black tracking-wider uppercase sm:px-3 sm:text-[10px]'
                        onClick={() => onTogglePermissions(group.permissionIds)}
                      >
                        {allSelected ? (
                          <X className='mr-1 size-3.5' />
                        ) : (
                          <CheckCheck className='mr-1 size-3.5' />
                        )}
                        {allSelected
                          ? t(
                              'aiAssistant.accessControl.permissions.clearGroup'
                            )
                          : t(
                              'aiAssistant.accessControl.permissions.selectGroup'
                            )}
                      </Button>
                    </div>
                  </div>

                  <AccordionContent className='border-t border-dashed border-slate-100 bg-slate-50/40 p-3 sm:p-4'>
                    <div className='grid grid-cols-1 gap-2 xl:grid-cols-2'>
                      {group.permissions.map((permission) => {
                        const checkboxId = `ai-permission-${permission.id}`
                        const selected = selectedPermissionIdSet.has(
                          permission.id.toLowerCase()
                        )

                        return (
                          <div
                            key={permission.id}
                            className={cn(
                              'flex min-w-0 items-center gap-3 rounded-xl border p-3 transition-colors',
                              selected
                                ? 'border-indigo-200 bg-indigo-50/70'
                                : 'border-slate-200 bg-white hover:border-indigo-200'
                            )}
                          >
                            <Checkbox
                              id={checkboxId}
                              checked={selected}
                              onCheckedChange={() =>
                                onTogglePermissions([permission.id])
                              }
                              className='border-indigo-300 data-[state=checked]:border-indigo-600 data-[state=checked]:bg-indigo-600'
                            />
                            <Label
                              htmlFor={checkboxId}
                              className='min-w-0 flex-1 cursor-pointer'
                            >
                              <span className='block truncate text-[11px] font-bold text-slate-700'>
                                {formatPermissionLabel(permission.label)}
                              </span>
                              <span className='mt-0.5 block truncate text-[9px] font-medium text-slate-400'>
                                {permission.path || permission.desc}
                              </span>
                            </Label>
                          </div>
                        )
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        ) : (
          <div className='flex min-h-32 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-4 text-center text-xs font-bold text-slate-400'>
            {t('aiAssistant.accessControl.permissions.empty')}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
