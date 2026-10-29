import { translate, type TranslationKey } from '@/locales'
import { describe, expect, it } from 'vitest'
import { getAuthenticatedRoutePaths } from '@/features/authz/data/authenticated-route-paths'
import { getRouteDerivedPermissions } from '@/features/authz/data/route-permission-registry'
import { getAccessibleNavGroups } from '@/features/authz/guards/navigation-access'
import { matchesPathPermissionProjection } from '@/features/authz/guards/route-access'
import { buildHomeBusinessShortcutCategories } from '@/features/home/data/build-home-business-shortcut-categories'
import {
  ATTENDANCE_MANAGEMENT_OPERATION_GUIDE_PATH,
  getAttendanceManagementOperationGuideTabs,
  getOrgPersonnelBranchTabs,
  ORGANIZATION_AND_ACCOUNT_OPERATION_GUIDE_PATH,
} from '@/features/org-personnel/tabs'
import { resolveRecentVisitLabelKey } from '@/features/recent-visits/recent-visit-labels'
import { getSearchItems } from './data/search-data'
import { getSidebarData } from './data/sidebar-data'
import { resolveActiveSidebarPath } from './sidebar-active-path'
import { checkIsActive } from './sidebar-nav-utils'

const translateAttendanceGuideLabel = (key: TranslationKey) =>
  translate('zh-CN', key)
const attendanceGuideSidebarGroups = getSidebarData(
  translateAttendanceGuideLabel
).navGroups

describe('attendance guide navigation and permission registration', () => {
  it('places both guides in the handbook and activates only the attendance guide', () => {
    const personnelGroup = attendanceGuideSidebarGroups.find(
      (group) => group.id === 'org-personnel-group'
    )!
    const handbookGroup = personnelGroup.children.find(
      (node) => node.id === 'org-personnel-handbook-group'
    )!
    expect(handbookGroup.children!.map((node) => node.url)).toEqual([
      ORGANIZATION_AND_ACCOUNT_OPERATION_GUIDE_PATH,
      ATTENDANCE_MANAGEMENT_OPERATION_GUIDE_PATH,
    ])
    expect(
      resolveActiveSidebarPath(
        attendanceGuideSidebarGroups,
        ATTENDANCE_MANAGEMENT_OPERATION_GUIDE_PATH
      )?.nodeIds
    ).toEqual([
      'org-personnel-handbook-group',
      'attendance-management-operation-guide',
    ])
    const managementGroup = personnelGroup.children.find(
      (node) => node.id === 'org-personnel-management-group'
    )!
    for (const businessEntry of managementGroup.children!) {
      expect(
        checkIsActive(ATTENDANCE_MANAGEMENT_OPERATION_GUIDE_PATH, businessEntry)
      ).toBe(false)
    }
    expect(
      getAttendanceManagementOperationGuideTabs(
        translateAttendanceGuideLabel
      ).map((tab) => tab.href)
    ).toEqual([ATTENDANCE_MANAGEMENT_OPERATION_GUIDE_PATH])
    expect(
      getOrgPersonnelBranchTabs(translateAttendanceGuideLabel).map(
        (tab) => tab.href
      )
    ).toEqual([
      '/attendance-management/leave',
      '/attendance-management/hall-of-fame',
      '/attendance-management/devices',
    ])
  })

  it('allows independent handbook access in sidebar, HOME, search and recent visits without granting business tabs', () => {
    const reader = {
      permissions: ['tab_personnel_attendance_management_operation_guide'],
    }
    const accessibleGroups = getAccessibleNavGroups(
      reader,
      attendanceGuideSidebarGroups
    )
    expect(accessibleGroups.map((group) => group.id)).toEqual([
      'home',
      'org-personnel-group',
    ])
    expect(accessibleGroups[1].children).toMatchObject([
      {
        id: 'org-personnel-handbook-group',
        children: [{ url: ATTENDANCE_MANAGEMENT_OPERATION_GUIDE_PATH }],
      },
    ])
    expect(
      buildHomeBusinessShortcutCategories(
        reader,
        attendanceGuideSidebarGroups,
        translateAttendanceGuideLabel
      )
    ).toMatchObject([
      {
        shortcuts: [
          {
            title: '出勤管理操作指南',
            url: ATTENDANCE_MANAGEMENT_OPERATION_GUIDE_PATH,
            description: translateAttendanceGuideLabel(
              'orgPersonnel.attendanceOperationGuide.shortcutDescription'
            ),
          },
        ],
      },
    ])
    expect(getSearchItems(translateAttendanceGuideLabel)).toContainEqual(
      expect.objectContaining({
        title: '出勤管理操作指南',
        href: ATTENDANCE_MANAGEMENT_OPERATION_GUIDE_PATH,
      })
    )
    expect(
      resolveRecentVisitLabelKey(ATTENDANCE_MANAGEMENT_OPERATION_GUIDE_PATH)
    ).toBe('orgPersonnel.attendanceOperationGuide.title')
    expect(getAuthenticatedRoutePaths()).toContain(
      ATTENDANCE_MANAGEMENT_OPERATION_GUIDE_PATH
    )
    expect(getRouteDerivedPermissions()).toContainEqual(
      expect.objectContaining({
        id: 'tab_personnel_attendance_management_operation_guide',
      })
    )
    expect(
      matchesPathPermissionProjection(
        reader,
        ATTENDANCE_MANAGEMENT_OPERATION_GUIDE_PATH
      )
    ).toBe(true)
    for (const businessTab of getOrgPersonnelBranchTabs(
      translateAttendanceGuideLabel
    )) {
      expect(matchesPathPermissionProjection(reader, businessTab.href)).toBe(
        false
      )
    }
    expect(
      matchesPathPermissionProjection(
        reader,
        ORGANIZATION_AND_ACCOUNT_OPERATION_GUIDE_PATH
      )
    ).toBe(false)
    expect(
      matchesPathPermissionProjection(
        { permissions: ['menu_org'] },
        ATTENDANCE_MANAGEMENT_OPERATION_GUIDE_PATH
      )
    ).toBe(true)
  })
})
