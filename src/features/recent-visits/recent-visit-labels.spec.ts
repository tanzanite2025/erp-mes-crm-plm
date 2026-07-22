import { DEFAULT_LOCALE, translate } from '@/locales'
import { describe, expect, it } from 'vitest'
import { AUTHENTICATED_ROUTE_PATHS } from '@/features/authz/data/authenticated-route-catalog'
import {
  resolveRecentVisitCanonicalLabelKey,
  resolveRecentVisitLabelKey,
} from './recent-visit-labels'
import { shouldTrackRecentVisit } from './recent-visits-store'

const RECENT_VISIT_REDIRECT_AND_INTERNAL_PATHS = [
  '/personal-workbench',
  '/personal-workbench/capture',
  '/approval/routing',
  '/system-management/routing',
  '/personnel/leave',
  '/personnel/stats',
  '/quotes/wholesale',
  '/quotes/retail',
  '/trading/quotes',
  '/basic-settings/permission-tree-smoke',
]

function collectTrackedRoutesWithoutSpecificRecentVisitLabels() {
  return AUTHENTICATED_ROUTE_PATHS.filter((path) =>
    shouldTrackRecentVisit(path)
  ).filter((path) => !resolveRecentVisitCanonicalLabelKey(path))
}

describe('recent visit route labels', () => {
  it('keeps every tracked authenticated route backed by a specific translation key', () => {
    expect(collectTrackedRoutesWithoutSpecificRecentVisitLabels()).toEqual([])
  })

  it('does not track redirect-only and internal utility routes', () => {
    expect(
      RECENT_VISIT_REDIRECT_AND_INTERNAL_PATHS.filter(shouldTrackRecentVisit)
    ).toEqual([])
  })

  it('resolves dynamic pages from their route shape instead of falling back to English slugs', () => {
    const editorLabelKey = resolveRecentVisitLabelKey(
      '/quality/standards/STD-2601/edit'
    )
    const previewLabelKey = resolveRecentVisitLabelKey(
      '/quality/standards/STD-2601/preview'
    )

    expect(editorLabelKey).toBe('quality.standards.workspace.editorEditTitle')
    expect(previewLabelKey).toBe('quality.standards.workspace.previewTitle')
    expect(
      editorLabelKey ? translate(DEFAULT_LOCALE, editorLabelKey) : ''
    ).toBe('编辑品质标准工作台')
    expect(
      previewLabelKey ? translate(DEFAULT_LOCALE, previewLabelKey) : ''
    ).toBe('品质标准预览页')
  })
})
