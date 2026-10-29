import { translate, type TranslationKey } from '@/locales'
import { describe, expect, it } from 'vitest'
import { getAuthenticatedRoutePaths } from '@/features/authz/data/authenticated-route-paths'
import { getRouteDerivedPermissions } from '@/features/authz/data/route-permission-registry'
import { getAccessibleNavGroups } from '@/features/authz/guards/navigation-access'
import { matchesPathPermissionProjection } from '@/features/authz/guards/route-access'
import { buildHomeBusinessShortcutCategories } from '@/features/home/data/build-home-business-shortcut-categories'
import {
  getOrgPersonnelTabs,
  getOrganizationAndAccountOperationGuideTabs,
  ORGANIZATION_AND_ACCOUNT_OPERATION_GUIDE_PATH,
} from '@/features/org-personnel/tabs'
import { resolveRecentVisitLabelKey } from '@/features/recent-visits/recent-visit-labels'
import { getSearchItems } from './data/search-data'
import { getSidebarData } from './data/sidebar-data'
import { resolveActiveSidebarPath } from './sidebar-active-path'
import { createSidebarCategoryPreviews } from './sidebar-category-scrubber-utils'
import { checkIsActive } from './sidebar-nav-utils'

const translateOrganizationAndAccountGuideLabel = (key: TranslationKey) =>
  translate('zh-CN', key)
const organizationAndAccountGuideSidebarGroups = getSidebarData(
  translateOrganizationAndAccountGuideLabel
).navGroups

describe('organization and account guide navigation and access', () => {
  it('exposes the guide independently in personnel, HOME, search and recent visits', () => {
    const reader = {
      permissions: ['tab_personnel_organization_and_account_operation_guide'],
    }
    const accessibleGroups = getAccessibleNavGroups(
      reader,
      organizationAndAccountGuideSidebarGroups
    )
    expect(accessibleGroups.map((group) => group.id)).toEqual([
      'home',
      'org-personnel-group',
    ])
    expect(accessibleGroups[1].children.map((node) => node.id)).toEqual([
      'org-personnel-handbook-group',
    ])
    expect(
      resolveActiveSidebarPath(
        accessibleGroups,
        ORGANIZATION_AND_ACCOUNT_OPERATION_GUIDE_PATH
      )?.nodeIds
    ).toEqual([
      'org-personnel-handbook-group',
      'organization-and-account-operation-guide',
    ])
    const guideOnlyDirectory = createSidebarCategoryPreviews(
      accessibleGroups
    ).find((category) => category.id === 'org-personnel-group')!
    expect(guideOnlyDirectory.directLinks).toEqual([])
    expect(guideOnlyDirectory.sections).toMatchObject([
      {
        title: '组织人事操作手册',
        links: [{ url: ORGANIZATION_AND_ACCOUNT_OPERATION_GUIDE_PATH }],
      },
    ])
    const shortcuts = buildHomeBusinessShortcutCategories(
      reader,
      organizationAndAccountGuideSidebarGroups,
      translateOrganizationAndAccountGuideLabel
    )
    expect(shortcuts).toHaveLength(1)
    expect(shortcuts[0].shortcuts).toMatchObject([
      {
        title: '组织与账号操作指南',
        url: ORGANIZATION_AND_ACCOUNT_OPERATION_GUIDE_PATH,
        description: translateOrganizationAndAccountGuideLabel(
          'orgPersonnel.operationGuide.shortcutDescription'
        ),
      },
    ])
    expect(
      getSearchItems(translateOrganizationAndAccountGuideLabel)
    ).toContainEqual(
      expect.objectContaining({
        title: '组织与账号操作指南',
        href: ORGANIZATION_AND_ACCOUNT_OPERATION_GUIDE_PATH,
      })
    )
    expect(
      resolveRecentVisitLabelKey(ORGANIZATION_AND_ACCOUNT_OPERATION_GUIDE_PATH)
    ).toBe('orgPersonnel.operationGuide.title')
    expect(getAuthenticatedRoutePaths()).toContain(
      ORGANIZATION_AND_ACCOUNT_OPERATION_GUIDE_PATH
    )
    expect(getRouteDerivedPermissions()).toContainEqual(
      expect.objectContaining({
        id: 'tab_personnel_organization_and_account_operation_guide',
      })
    )
    expect(
      matchesPathPermissionProjection(
        reader,
        ORGANIZATION_AND_ACCOUNT_OPERATION_GUIDE_PATH
      )
    ).toBe(true)
    for (const businessTab of getOrgPersonnelTabs(
      translateOrganizationAndAccountGuideLabel
    )) {
      expect(matchesPathPermissionProjection(reader, businessTab.href)).toBe(
        false
      )
    }
  })

  it('preserves personnel management tabs and selects the guide without activating the business entry', () => {
    const personnel = organizationAndAccountGuideSidebarGroups.find(
      (group) => group.id === 'org-personnel-group'
    )!
    const businessGroup = personnel.children.find(
      (node) => node.id === 'org-personnel-management-group'
    )!
    const businessEntry = businessGroup.children!.find(
      (node) => node.id === 'personnel-center'
    )!
    expect(
      checkIsActive(
        ORGANIZATION_AND_ACCOUNT_OPERATION_GUIDE_PATH,
        businessEntry
      )
    ).toBe(false)
    for (const businessTab of getOrgPersonnelTabs(
      translateOrganizationAndAccountGuideLabel
    )) {
      expect(checkIsActive(businessTab.href, businessEntry)).toBe(true)
    }
    expect(
      getOrganizationAndAccountOperationGuideTabs(
        translateOrganizationAndAccountGuideLabel
      ).map((tab) => tab.href)
    ).toEqual([ORGANIZATION_AND_ACCOUNT_OPERATION_GUIDE_PATH])
    expect(
      getOrgPersonnelTabs(translateOrganizationAndAccountGuideLabel)
    ).toHaveLength(4)
    expect(
      matchesPathPermissionProjection(
        { permissions: ['menu_org'] },
        ORGANIZATION_AND_ACCOUNT_OPERATION_GUIDE_PATH
      )
    ).toBe(true)
    expect(
      matchesPathPermissionProjection(
        { permissions: ['tab_personnel_rights'] },
        ORGANIZATION_AND_ACCOUNT_OPERATION_GUIDE_PATH
      )
    ).toBe(false)
  })
})
