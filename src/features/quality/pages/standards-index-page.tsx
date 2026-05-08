'use client'

import { useMemo, useState } from 'react'
import { useNavigate, type NavigateOptions } from '@tanstack/react-router'
import { toast } from 'sonner'
import { isForbiddenError } from '@/lib/error-status'
import { useIsMobile } from '@/hooks/use-mobile'
import { ForbiddenState } from '@/components/forbidden-state'
import { useLanguage } from '@/context/language-provider'
import {
  ControlledProtocolDialog,
  type ControlledProtocolDraft,
} from '../components/controlled-protocol-dialog'
import { QualityStandardsDesktopView } from '../components/quality-standards-desktop-view'
import { QualityStandardsEmpty } from '../components/quality-standards-empty'
import { QualityStandardsHeader } from '../components/quality-standards-header'
import { QualityStandardsMobileView } from '../components/quality-standards-mobile-view'
import { QualityStandardsPagination } from '../components/quality-standards-pagination'
import { QualityStandardsStatusOverview } from '../components/quality-standards-status-overview'
import type { Standard } from '../data/schema'
import { useQualityStandardsMgmt } from '../hooks/use-quality-standards-mgmt'
import { buildQualityStandardListPresenter } from '../presenters/quality-standard-list-presenter'
import type { QualityStandardsListSearchState } from '../types/quality-standards-list'

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
    type: search.type ?? 'ALL',
    status: search.status ?? 'ALL',
    page: search.page ?? 1,
    pageSize: search.pageSize ?? 20,
  }
}

export function StandardsIndexPage({
  search,
  navigate: routeNavigate,
}: StandardsIndexPageProps) {
  const navigate = useNavigate()
  const { t, locale } = useLanguage()
  const isMobile = useIsMobile()
  const [isControlledProtocolDialogOpen, setIsControlledProtocolDialogOpen] =
    useState(false)
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
    error,
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
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

  const handleControlledProtocolSubmit = (draft: ControlledProtocolDraft) => {
    toast.success(
      t('quality.standards.dialog.controlledProtocol.toastDraftReady', {
        count: draft.selections.length,
      })
    )
    setIsControlledProtocolDialogOpen(false)
  }

  const handleEdit = (standard: Standard) => {
    navigate({
      to: '/quality/standards/$standardId/edit',
      params: { standardId: standard.id },
    })
  }

  const handleViewPreview = (standard: Standard) => {
    navigate({
      to: '/quality/standards/$standardId/preview',
      params: { standardId: standard.id },
    })
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
      {isControlledProtocolDialogOpen ? (
        <ControlledProtocolDialog
          open={isControlledProtocolDialogOpen}
          onOpenChange={setIsControlledProtocolDialogOpen}
          onSubmit={handleControlledProtocolSubmit}
        />
      ) : null}

      <QualityStandardsHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAdd={handleAdd}
        total={total}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        isFetching={isFetching}
      />

      <QualityStandardsStatusOverview
        stats={stats}
        value={statusFilter}
        onChange={setStatusFilter}
        isLoading={isFetching}
      />

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
      ) : (
        <QualityStandardsEmpty />
      )}

      <QualityStandardsPagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  )
}
