// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuditEngineStatsResponse } from '../types'
import { AuditEngineTab } from './audit-engine-tab'

interface AuditEngineQueryState {
  data?: AuditEngineStatsResponse
  isLoading: boolean
  isError: boolean
  isFetching: boolean
  refetch: ReturnType<typeof vi.fn>
}

const queryMock = vi.hoisted(() => ({
  current: null as unknown as AuditEngineQueryState,
}))

vi.mock('../hooks/use-audit-engine-stats', () => ({
  useAuditEngineStats: () => queryMock.current,
}))

vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}))

const stats: AuditEngineStatsResponse = {
  hotWindowDays: 30,
  unmappedLogEntities: [],
  unmappedLogEntityCount: 0,
  modules: [
    {
      id: 'engineering',
      targetEntityCount: 2,
      integratedEntityCount: 1,
      activeEntityCount: 1,
      integrationCoverage: 50,
      activityCoverage: 50,
      connected: false,
      status: 'ALERT',
      integratedEntities: ['product'],
      activeEntities: ['product'],
      missingIntegrationEntities: ['change-order'],
    },
  ],
}

describe('AuditEngineTab', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    queryMock.current = {
      data: stats,
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    }
  })

  it('keeps cached module cards visible when a background refresh fails', () => {
    queryMock.current.isError = true

    render(<AuditEngineTab />)

    expect(
      screen.getByText('systemManagement.auditEngine.refreshFailed')
    ).not.toBeNull()
    expect(
      screen.getByText('systemManagement.auditEngine.modules.engineering')
    ).not.toBeNull()
    expect(
      screen.queryByText('systemManagement.auditEngine.loadFailed')
    ).toBeNull()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'systemManagement.auditEngine.retry',
      })
    )
    expect(queryMock.current.refetch).toHaveBeenCalledOnce()
  })

  it('shows the full error state when no cached data exists', () => {
    queryMock.current.data = undefined
    queryMock.current.isError = true

    render(<AuditEngineTab />)

    expect(
      screen.getByText('systemManagement.auditEngine.loadFailed')
    ).not.toBeNull()
    expect(
      screen.queryByText('systemManagement.auditEngine.refreshFailed')
    ).toBeNull()
    expect(
      screen.queryByText('systemManagement.auditEngine.modules.engineering')
    ).toBeNull()
  })

  it('uses the no-data status for a successful empty module directory', () => {
    queryMock.current.data = { ...stats, modules: [] }

    render(<AuditEngineTab />)

    expect(
      screen.getByText('systemManagement.auditEngine.status.noData')
    ).not.toBeNull()
    expect(
      screen.getByText('systemManagement.auditEngine.noModules')
    ).not.toBeNull()
  })
})
