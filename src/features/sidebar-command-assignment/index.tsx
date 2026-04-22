import { ListChecks, Save, UserRound } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { IndustrialActionBar } from '@/components/uds/industrial-action-bar'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { AssignmentAccountList } from './components/assignment-account-list'
import { AssignmentBatchPanel } from './components/assignment-batch-panel'
import { AssignmentCategoryGrid } from './components/assignment-category-grid'
import { AssignmentCommandGrid } from './components/assignment-command-grid'
import { AssignmentEffectivePreview } from './components/assignment-effective-preview'
import { AssignmentSummary } from './components/assignment-summary'
import { PrivateToolsPanel } from './components/private-tools-panel'
import { SidebarCommandShell } from './components/sidebar-command-shell'
import { useSidebarCommandAssignmentViewModel } from './hooks/use-sidebar-command-assignment'

export function SidebarCommandAssignmentPage() {
  const { t } = useLanguage()
  const {
    query,
    setQuery,
    usersQuery,
    assignmentQuery,
    accounts,
    filteredAccounts,
    selectedAccount,
    selectedAccountId,
    hasSelectedAccount,
    assignableCommands,
    assignableCategories,
    selectedCodeSet,
    selectedCategorySet,
    effectivePreviewCommands,
    directCommandCount,
    assignedCount,
    assignedCategoryCount,
    targetUserIds,
    selectedTargetCount,
    batchMode,
    setBatchMode,
    saveMutation,
    batchMutation,
    copyMutation,
    selectAccount,
    toggleCommand,
    toggleCategory,
    selectAllCommands,
    clearCommands,
    toggleTarget,
    selectFilteredTargets,
    clearTargets,
  } = useSidebarCommandAssignmentViewModel()

  return (
    <SidebarCommandShell>
      <IndustrialHeader
        icon={ListChecks}
        title={t('sidebarCommandAssignment.assignment.title')}
        description={t('sidebarCommandAssignment.assignment.description')}
        gradient
        statusBadge={
          <div className='flex w-fit shrink-0 items-center gap-4 rounded-full border border-primary/10 bg-primary/5 px-4 py-1'>
            <span className='text-[10px] font-black tracking-widest text-primary/60 uppercase italic'>
              {selectedTargetCount} TARGETS
            </span>
            <div className='size-1.5 animate-pulse rounded-full bg-emerald-500' />
          </div>
        }
      />

      <IndustrialActionBar
        searchPlaceholder={t(
          'sidebarCommandAssignment.assignment.searchPlaceholder'
        )}
        searchValue={query}
        onSearchChange={setQuery}
        leftContent={
          <div className='flex min-w-fit items-center gap-2 rounded-full border border-dashed border-muted/50 bg-background/60 px-4 py-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase shadow-sm'>
            <UserRound className='size-3.5' />
            {usersQuery.isLoading
              ? t('sidebarCommandAssignment.assignment.syncingAccounts')
              : t('sidebarCommandAssignment.assignment.accountCount', {
                  count: accounts.length,
                })}
          </div>
        }
        rightContent={
          <>
            <Button
              variant='outline'
              className='h-11 rounded-full border-dashed px-5 text-[10px] font-black tracking-widest'
              disabled={filteredAccounts.length === 0}
              onClick={selectFilteredTargets}
            >
              {t('sidebarCommandAssignment.assignment.selectCurrentList')}
            </Button>
            <Button
              variant='outline'
              className='h-11 rounded-full border-dashed px-5 text-[10px] font-black tracking-widest'
              disabled={selectedTargetCount === 0}
              onClick={clearTargets}
            >
              {t('sidebarCommandAssignment.assignment.clearTargets')}
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !hasSelectedAccount}
              className='h-11 rounded-full px-8 text-[10px] font-black tracking-widest shadow-lg shadow-primary/10 active:scale-95'
            >
              <Save className='size-4' />
              {saveMutation.isPending
                ? t('sidebarCommandAssignment.assignment.savePending')
                : t('sidebarCommandAssignment.assignment.save')}
            </Button>
          </>
        }
      />

      <section className='grid min-h-[660px] gap-6 xl:grid-cols-[380px_minmax(0,1fr)]'>
        <AssignmentAccountList
          accounts={accounts}
          filteredAccounts={filteredAccounts}
          selectedAccountId={selectedAccountId}
          targetUserIds={targetUserIds}
          assignedCount={assignedCount}
          isLoading={usersQuery.isLoading}
          onSelectAccount={selectAccount}
          onToggleTarget={toggleTarget}
        />

        <div className='flex min-w-0 flex-col gap-5'>
          <AssignmentSummary
            selectedAccount={selectedAccount}
            hasSelectedAccount={hasSelectedAccount}
            assignedCount={assignedCount}
            assignedCategoryCount={assignedCategoryCount}
            directCommandCount={directCommandCount}
            assignableCount={assignableCommands.length}
            selectedTargetCount={selectedTargetCount}
            isFetchingAssignment={assignmentQuery.isFetching}
            onSelectAll={selectAllCommands}
            onClear={clearCommands}
          />

          <AssignmentCategoryGrid
            categories={assignableCategories}
            selectedCategorySet={selectedCategorySet}
            hasSelectedAccount={hasSelectedAccount}
            onToggleCategory={toggleCategory}
          />

          <AssignmentCommandGrid
            commands={assignableCommands}
            selectedCodeSet={selectedCodeSet}
            hasSelectedAccount={hasSelectedAccount}
            onToggleCommand={toggleCommand}
          />

          <AssignmentEffectivePreview commands={effectivePreviewCommands} />

          <AssignmentBatchPanel
            batchMode={batchMode}
            selectedTargetCount={selectedTargetCount}
            hasSelectedAccount={hasSelectedAccount}
            isBatchPending={batchMutation.isPending}
            isCopyPending={copyMutation.isPending}
            onBatchModeChange={setBatchMode}
            onApplyBatch={() => batchMutation.mutate()}
            onCopyCurrent={() => copyMutation.mutate()}
          />

          <PrivateToolsPanel />
        </div>
      </section>
    </SidebarCommandShell>
  )
}
