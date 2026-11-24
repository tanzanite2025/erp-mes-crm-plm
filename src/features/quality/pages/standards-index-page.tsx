'use client'

import { useMemo, useState } from 'react'
import { type NavigateOptions } from '@tanstack/react-router'
import { isForbiddenError } from '@/lib/error-status'
import { useLanguage } from '@/context/language-provider'
import { useIsMobile } from '@/hooks/use-mobile'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { ForbiddenState } from '@/components/forbidden-state'
import type { QualityStandardListSummary } from '../adapters/quality-standard-api-adapter'
import {
  ControlledProtocolDialog,
  type ControlledProtocolDraft,
} from '../components/controlled-protocol-dialog'
import { QualityDefectTypeConfigurationDialog } from '../components/quality-defect-type-configuration-dialog'
import { QualityInspectionStageManagementDialog } from '../components/quality-inspection-stage-management-dialog'
import { QualityStandardEditorDialog } from '../components/quality-standard-editor-dialog'
import { QualityStandardPreviewDialog } from '../components/quality-standard-preview-dialog'
import { QualityStandardsDesktopView } from '../components/quality-standards-desktop-view'
import { QualityStandardsEmpty } from '../components/quality-standards-empty'
import { QualityStandardsHeader } from '../components/quality-standards-header'
import { QualityStandardsMobileView } from '../components/quality-standards-mobile-view'
import { QualityStandardsPagination } from '../components/quality-standards-pagination'
import { QualityStandardsStatusOverview } from '../components/quality-standards-status-overview'
import { useQualityMutations } from '../hooks/use-quality'
import { useQualityStandardsMgmt } from '../hooks/use-quality-standards-mgmt'
import { buildQualityStandardListPresenter } from '../presenters/quality-standard-list-presenter'
import { buildControlledProtocolStandard } from '../services/controlled-protocol-standard-factory'
import type { QualityStandardsListSearchState } from '../types/quality-standards-list'
import { StandardPreviewPage } from './standard-preview-page'

type SearchStateUpdater = (
  prev: QualityStandardsListSearchState
) => Partial<QualityStandardsListSearchState>

interface StandardsIndexPageProps {
  search: Partial<QualityStandardsListSearchState>
  navigate: (options: NavigateOptions) => void
}

function normalizeSearchState(
  search: Partial<QualityStandardsListSearchState>
): QualityStandardsListSearchState {
  return {
    keyword: search.keyword ?? '',
    type: 'ALL',
    status: search.status ?? 'ALL',
    page: search.page ?? 1,
    pageSize: search.pageSize ?? 20,
  }
}

export function StandardsIndexPage({
  search,
  navigate: routeNavigate,
}: StandardsIndexPageProps) {
  const { t, locale } = useLanguage()
  const isMobile = useIsMobile()
  const { saveStandardMutation } = useQualityMutations()
  const [isControlledProtocolDialogOpen, setIsControlledProtocolDialogOpen] =
    useState(false)
  const [isInspectionStageManagementOpen, setIsInspectionStageManagementOpen] =
    useState(false)
  const [isDefectConfigurationOpen, setIsDefectConfigurationOpen] =
    useState(false)
  const [editingStandardId, setEditingStandardId] = useState<string | null>(
    null
  )
  const [selectedStandardId, setSelectedStandardId] = useState<string | null>(
    null
  )
  const [previewStandardId, setPreviewStandardId] = useState<string | null>(
    null
  )
  const [hasUnsavedBasicInformation, setHasUnsavedBasicInformation] =
    useState(false)
  const [pendingStandardSelection, setPendingStandardSelection] = useState<{
    standardId: string
    mode: 'details' | 'rules'
  } | null>(null)
  const normalizedSearch = normalizeSearchState(search)
  const syncSearch = ({
    search: updateSearch,
    replace,
  }: {
    search: SearchStateUpdater
    replace?: boolean
  }) => {
    routeNavigate({
      replace,
      search: (prev) =>
        updateSearch(
          normalizeSearchState(prev as Partial<QualityStandardsListSearchState>)
        ),
    })
  }
  const {
    standards,
    total,
    stats,
    isLoading,
    isFetching,
    refetch,
    hasLoadedStandards,
    error,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    page,
    setPage,
    pageSize,
    setPageSize,
  } = useQualityStandardsMgmt({
    search: normalizedSearch,
    navigate: syncSearch,
  })
  const presentedStandards = useMemo(
    () => buildQualityStandardListPresenter(standards, { t, locale }),
    [locale, standards, t]
  )

  const handleAdd = () => {
    setIsControlledProtocolDialogOpen(true)
  }

  const handleControlledProtocolSubmit = async (
    draft: ControlledProtocolDraft
  ) => {
    try {
      await saveStandardMutation.mutateAsync({
        data: buildControlledProtocolStandard(draft),
        successMessage: t(
          'quality.standards.dialog.controlledProtocol.toastCreated',
          { count: draft.criteria.length }
        ),
      })

      setIsControlledProtocolDialogOpen(false)
    } catch {
      return
    }
  }

  function openStandardInspectionRules(standardId: string) {
    if (hasUnsavedBasicInformation) {
      setPendingStandardSelection({ standardId, mode: 'rules' })
      return
    }
    setEditingStandardId(standardId)
  }

  const handleEdit = (standard: QualityStandardListSummary) =>
    openStandardInspectionRules(standard.id)

  const handleViewPreview = (standard: QualityStandardListSummary) => {
    if (hasUnsavedBasicInformation) {
      setPendingStandardSelection({ standardId: standard.id, mode: 'details' })
      return
    }
    setPreviewStandardId(standard.id)
  }

  function discardBasicInformationAndOpenRequestedStandard() {
    if (!pendingStandardSelection) return
    if (pendingStandardSelection.mode === 'rules') {
      setSelectedStandardId(null)
      setEditingStandardId(pendingStandardSelection.standardId)
    } else {
      setSelectedStandardId(null)
      setPreviewStandardId(pendingStandardSelection.standardId)
    }
    setHasUnsavedBasicInformation(false)
    setPendingStandardSelection(null)
  }

  if (isForbiddenError(error)) {
    return <ForbiddenState />
  }

  if (isLoading && standards.length === 0) {
    return (
      <div className='flex flex-col gap-8'>
        <div className='h-32 animate-pulse rounded-[32px] bg-muted/20' />
        <div className='h-[400px] animate-pulse rounded-[32px] bg-muted/10' />
      </div>
    )
  }

  return (
    <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
      <ConfirmDialog
        open={pendingStandardSelection !== null}
        onOpenChange={(open) => !open && setPendingStandardSelection(null)}
        title={t('quality.standards.workspace.discardChangesTitle')}
        desc={t('quality.standards.workspace.discardChangesDescription')}
        cancelBtnText={t('quality.standards.workspace.keepEditing')}
        confirmText={t('quality.standards.workspace.discardAndClose')}
        handleConfirm={discardBasicInformationAndOpenRequestedStandard}
      />
      {editingStandardId ? (
        <QualityStandardEditorDialog
          key={editingStandardId}
          standardId={editingStandardId}
          onClose={() => setEditingStandardId(null)}
        />
      ) : null}
      {previewStandardId ? (
        <QualityStandardPreviewDialog
          key={previewStandardId}
          standardId={previewStandardId}
          onClose={() => setPreviewStandardId(null)}
          onOpenEditor={(standardId) => {
            setPreviewStandardId(null)
            openStandardInspectionRules(standardId)
          }}
          onEditBasicInformation={(standardId) => {
            setPreviewStandardId(null)
            setSelectedStandardId(standardId)
          }}
          onPreviewStandardChange={setPreviewStandardId}
        />
      ) : null}
      {isInspectionStageManagementOpen ? (
        <QualityInspectionStageManagementDialog
          open={isInspectionStageManagementOpen}
          onOpenChange={setIsInspectionStageManagementOpen}
        />
      ) : null}
      {isDefectConfigurationOpen ? (
        <QualityDefectTypeConfigurationDialog
          open
          onOpenChange={setIsDefectConfigurationOpen}
        />
      ) : null}
      {isControlledProtocolDialogOpen ? (
        <ControlledProtocolDialog
          open={isControlledProtocolDialogOpen}
          onOpenChange={setIsControlledProtocolDialogOpen}
          onSubmit={handleControlledProtocolSubmit}
          isSubmitting={saveStandardMutation.isPending}
          onManageInspectionStages={() =>
            setIsInspectionStageManagementOpen(true)
          }
        />
      ) : null}

      <QualityStandardsHeader
        onConfigureDefectTypes={() => setIsDefectConfigurationOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAdd={handleAdd}
        onManageInspectionStages={() =>
          setIsInspectionStageManagementOpen(true)
        }
        total={hasLoadedStandards ? total : undefined}
        isFetching={isFetching}
      />

      <QualityStandardsStatusOverview
        stats={stats}
        value={statusFilter}
        onChange={setStatusFilter}
        isLoading={isFetching}
      />

      {error ? (
        <div
          role='alert'
          className='space-y-3 rounded-3xl border border-destructive/30 bg-destructive/5 p-5'
        >
          <p className='text-sm'>{t('quality.standards.page.loadFailed')}</p>
          <Button
            variant='outline'
            className='rounded-full'
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            {t('quality.standards.inspectionStages.retry')}
          </Button>
        </div>
      ) : null}

      {standards.length > 0 ? (
        isMobile ? (
          <QualityStandardsMobileView
            standards={presentedStandards}
            onViewDetail={handleViewPreview}
            onEdit={handleEdit}
          />
        ) : (
          <QualityStandardsDesktopView
            standards={presentedStandards}
            onViewDetail={handleViewPreview}
            onEdit={handleEdit}
          />
        )
      ) : !error ? (
        <QualityStandardsEmpty />
      ) : null}

      {hasLoadedStandards ? (
        <QualityStandardsPagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      ) : null}
      {selectedStandardId ? (
        <section className='scroll-mt-6 space-y-4 rounded-3xl border bg-background p-4 sm:p-5'>
          <h2 className='text-lg font-semibold'>
            {t('quality.standards.workspace.editBasicInformation')}
          </h2>
          <StandardPreviewPage
            key={selectedStandardId}
            standardId={selectedStandardId}
            embedded
            allowInlineBasicInformationEditing
            initiallyEditingBasicInformation
            onClose={() => setSelectedStandardId(null)}
            onOpenEditor={openStandardInspectionRules}
            onPreviewStandardChange={setSelectedStandardId}
            onUnsavedBasicInformationChange={setHasUnsavedBasicInformation}
          />
        </section>
      ) : null}
    </div>
  )
}
