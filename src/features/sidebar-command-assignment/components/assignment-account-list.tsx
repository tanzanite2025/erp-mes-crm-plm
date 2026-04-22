import { UserRound } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import type { SidebarCommandAccount } from '../types'

type AssignmentAccountListProps = {
  accounts: SidebarCommandAccount[]
  filteredAccounts: SidebarCommandAccount[]
  selectedAccountId: string
  targetUserIds: string[]
  assignedCount: number
  isLoading: boolean
  onSelectAccount: (accountId: string) => void
  onToggleTarget: (userId: string, checked: boolean) => void
}

export function AssignmentAccountList({
  accounts,
  filteredAccounts,
  selectedAccountId,
  targetUserIds,
  assignedCount,
  isLoading,
  onSelectAccount,
  onToggleTarget,
}: AssignmentAccountListProps) {
  const { t } = useLanguage()

  return (
    <div className='flex min-h-0 flex-col rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-5 shadow-inner'>
      <div className='mb-5 flex items-center justify-between gap-3'>
        <div>
          <h2 className='text-sm font-black tracking-tighter italic'>
            {t('sidebarCommandAssignment.accountList.title')}
          </h2>
          <p className='mt-1 text-[9px] font-black tracking-widest text-muted-foreground/60 uppercase'>
            {isLoading
              ? t('sidebarCommandAssignment.accountList.syncing')
              : t('sidebarCommandAssignment.accountList.available', {
                  count: accounts.length,
                })}
          </p>
        </div>
        <UserRound className='size-5 text-muted-foreground' />
      </div>

      <div className='min-h-0 flex-1 space-y-2 overflow-y-auto pr-1'>
        {filteredAccounts.map((account) => {
          const isActive = account.id === selectedAccountId
          const isTarget = targetUserIds.includes(account.id)

          return (
            <div
              key={account.id}
              className={cn(
                'flex w-full items-center gap-3 rounded-[20px] border px-3 py-3 transition-colors',
                isActive
                  ? 'border-primary/30 bg-primary/10 text-foreground shadow-sm'
                  : 'border-transparent bg-background/70 hover:border-muted/60 hover:bg-background'
              )}
            >
              <Checkbox
                checked={isTarget}
                onCheckedChange={(checked) =>
                  onToggleTarget(account.id, checked === true)
                }
                aria-label={t(
                  'sidebarCommandAssignment.accountList.targetAria',
                  { name: account.name }
                )}
              />
              <button
                type='button'
                onClick={() => onSelectAccount(account.id)}
                className='min-w-0 flex-1 text-left'
              >
                <span className='block truncate text-sm font-black tracking-tight'>
                  {account.name}
                </span>
                <span className='mt-1 block truncate text-[10px] font-black tracking-widest text-muted-foreground/55 uppercase'>
                  {account.username} / {account.role}
                </span>
              </button>
              {isActive ? <Badge className='shrink-0'>{assignedCount}</Badge> : null}
            </div>
          )
        })}

        {filteredAccounts.length === 0 ? (
          <div className='rounded-[24px] border border-dashed border-muted/50 bg-background/60 px-4 py-10 text-center text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
            {isLoading
              ? t('sidebarCommandAssignment.accountList.loading')
              : t('sidebarCommandAssignment.accountList.empty')}
          </div>
        ) : null}
      </div>
    </div>
  )
}
