import { DEFAULT_LOCALE, translate } from '@/locales'
import { describe, expect, it } from 'vitest'
import { AUTHENTICATED_ROUTE_PATHS } from '@/features/authz/data/authenticated-route-catalog'
import { getBasicSettingsTabs } from '@/features/basic-settings/tabs'
import {
  getLinearBarcodeTabs,
  getSharedCodeSourceTabs,
} from '@/features/code-center/tabs'
import { getDashboardTabs } from '@/features/dashboard/tabs'
import { getEquipmentToolingTabs } from '@/features/equipment-tooling/tabs'
import { getEngineeringTabs } from '@/features/engineering/tab-config'
import { getEngineeringReferenceTabs } from '@/features/engineering-reference/tab-config'
import { getFinanceTabs } from '@/features/finance/tabs'
import { getLabExperimentalTabs } from '@/features/labs/experimental/tabs'
import { getLogisticsConfigTabs } from '@/features/logistics-config/tabs'
import { getLogisticsSettingsTabs } from '@/features/logistics-settings/tabs'
import { getMrpTabs } from '@/features/mrp/tabs'
import { getOrgPersonnelBranchTabs, getOrgPersonnelTabs } from '@/features/org-personnel/tabs'
import { getPieceworkTabs } from '@/features/piecework/tab-config'
import { getProductionArchitectureTabs } from '@/features/production-architecture/tab-config'
import { getProductionQualityTabs } from '@/features/production-quality/tab-config'
import { getPurchaseTabs } from '@/features/purchase/tabs'
import { getQualityTabs } from '@/features/quality/tab-config'
import { getRawMaterialsTabs } from '@/features/raw-materials/tabs'
import { getTerminalConfigTabs } from '@/features/terminal-config/tabs'
import { getSalesAnalysisTabs } from '@/features/trading/sales-analysis/tabs'
import { getTradingTabs } from '@/features/trading/tabs'
import { getShippingManagementTabs } from '@/features/trading/shipping-management/tabs'
import { getWarehouseTabs } from '@/features/warehouse/tabs'
import { getWarehouseConfigTabs } from '@/features/warehouse-config/tabs'
import {
  resolveRecentVisitFallbackLabel,
  resolveRecentVisitLabelKey,
} from './recent-visit-labels'

const keyTranslator = (key: string) => key

describe('recent visit labels', () => {
  it('uses leaf tab labels instead of parent module labels', () => {
    expect(resolveRecentVisitLabelKey('/dashboard/overview')).toBe(
      'dashboard.page.tabs.overview'
    )
    expect(resolveRecentVisitFallbackLabel('/dashboard/overview')).toBe(
      translate(DEFAULT_LOCALE, 'dashboard.page.tabs.overview')
    )
  })

  it('localizes material archive static and dynamic tab paths', () => {
    expect(resolveRecentVisitLabelKey('/materials/all')).toBe(
      'materialArchive.layout.tabs.all'
    )
    expect(resolveRecentVisitLabelKey('/materials/assembly')).toBe(
      'materialArchive.layout.tabs.assembly'
    )
    expect(resolveRecentVisitLabelKey('/materials/RAW_MATERIAL')).toBe(
      'materialArchive.form.fallbackCategories.rawMaterial'
    )
  })

  it('localizes purchase module child routes through the shared route label registry', () => {
    expect(resolveRecentVisitLabelKey('/purchase/suppliers')).toBe(
      'purchase.tabs.suppliers'
    )
    expect(resolveRecentVisitFallbackLabel('/purchase/suppliers')).toBe(
      translate(DEFAULT_LOCALE, 'purchase.tabs.suppliers')
    )
    expect(resolveRecentVisitLabelKey('/purchase/orders')).toBe(
      'purchase.tabs.orders'
    )
    expect(resolveRecentVisitLabelKey('/purchase/payables')).toBe(
      'purchase.tabs.payables'
    )
  })

  it('localizes lab experimental routes through the shared route label registry', () => {
    expect(AUTHENTICATED_ROUTE_PATHS).toContain('/labs/experimental/equipment')
    expect(AUTHENTICATED_ROUTE_PATHS).toContain('/labs/experimental/tests')
    expect(AUTHENTICATED_ROUTE_PATHS).toContain('/labs/experimental/reports')
    expect(resolveRecentVisitLabelKey('/labs/experimental/equipment')).toBe(
      'labExperimental.tabs.equipment'
    )
    expect(
      resolveRecentVisitFallbackLabel('/labs/experimental/equipment')
    ).toBe(translate(DEFAULT_LOCALE, 'labExperimental.tabs.equipment'))
    expect(resolveRecentVisitLabelKey('/labs/experimental/tests')).toBe(
      'labExperimental.tabs.tests'
    )
    expect(resolveRecentVisitLabelKey('/labs/experimental/reports')).toBe(
      'labExperimental.tabs.reports'
    )
  })

  it('localizes shipping management child routes through the shared route label registry', () => {
    expect(
      resolveRecentVisitLabelKey('/shipping-management/vehicle-match')
    ).toBe('trading.shippingManagement.tabs.vehicleMatch')
    expect(
      resolveRecentVisitFallbackLabel('/shipping-management/vehicle-match')
    ).toBe(
      translate(DEFAULT_LOCALE, 'trading.shippingManagement.tabs.vehicleMatch')
    )
    expect(
      resolveRecentVisitLabelKey('/shipping-management/vehicle-contacts')
    ).toBe('trading.shippingManagement.tabs.vehicleContacts')
    expect(resolveRecentVisitLabelKey('/shipping-management/logistics')).toBe(
      'trading.shippingManagement.tabs.logistics'
    )
  })

  it('localizes engineering db and system management specialty routes through explicit keys', () => {
    expect(resolveRecentVisitLabelKey('/engineering-db/specs')).toBe(
      'engineering.db.categories.spec'
    )
    expect(resolveRecentVisitLabelKey('/engineering-db/drilling')).toBe(
      'engineering.db.categories.drilling'
    )
    expect(resolveRecentVisitLabelKey('/engineering-db/labeling')).toBe(
      'engineering.db.categories.labeling'
    )
    expect(resolveRecentVisitLabelKey('/engineering-db/engineering-master')).toBe(
      'engineering.masterData.page.title'
    )
    expect(
      resolveRecentVisitLabelKey('/engineering-db/engineering-master/weaving-mode')
    ).toBe('engineering.masterData.tabs.weavingMode')
    expect(resolveRecentVisitLabelKey('/system-management/ai-capability')).toBe(
      'aiAssistant.accessControl.title'
    )
    expect(resolveRecentVisitLabelKey('/system-management/audit-engine')).toBe(
      'systemManagement.layout.tabs.auditEngine'
    )
  })

  it('keeps visible module tab routes aligned with their tab translation keys', () => {
    const tabGroups = [
      getDashboardTabs(keyTranslator),
      getWarehouseTabs(keyTranslator),
      getMrpTabs(keyTranslator),
      getPurchaseTabs(keyTranslator),
      getRawMaterialsTabs(keyTranslator),
      getTradingTabs(keyTranslator),
      getSalesAnalysisTabs(keyTranslator),
      getShippingManagementTabs(keyTranslator),
      getEngineeringTabs(keyTranslator),
      getEngineeringReferenceTabs(keyTranslator),
      getFinanceTabs(keyTranslator),
      getLabExperimentalTabs(keyTranslator),
      getProductionArchitectureTabs(keyTranslator),
      getWarehouseConfigTabs(keyTranslator),
      getLinearBarcodeTabs(keyTranslator),
      getSharedCodeSourceTabs(keyTranslator),
      getLogisticsConfigTabs(keyTranslator),
      getLogisticsSettingsTabs(keyTranslator),
      getEquipmentToolingTabs(keyTranslator),
      getTerminalConfigTabs(keyTranslator),
      getOrgPersonnelTabs(keyTranslator),
      getOrgPersonnelBranchTabs(keyTranslator),
      getPieceworkTabs(keyTranslator),
      getProductionQualityTabs(keyTranslator),
      getQualityTabs(keyTranslator),
      getBasicSettingsTabs(keyTranslator),
    ]

    tabGroups.flat().forEach((tab) => {
      expect(resolveRecentVisitLabelKey(tab.href), tab.href).toBe(tab.label)
    })
  })
})
