import type { TranslationKey } from '@/locales'
import type { TabItem } from '@/components/module-tabs'
import { getApprovalTabs } from '@/features/approval/tabs'
import { getApsSchedulingTabs } from '@/features/aps-scheduling/tab-config'
import { getBasicSettingsTabs } from '@/features/basic-settings/tabs'
import {
  getBusinessAnalysisTabs,
  type BusinessAnalysisDomain,
} from '@/features/business-analysis/tabs'
import {
  getLinearBarcodeTabs,
  getSharedCodeSourceTabs,
} from '@/features/code-center/tabs'
import { getCuttingOperationTabs } from '@/features/cutting-operations/tab-config'
import { getDashboardTabs } from '@/features/dashboard/tabs'
import { engineeringDbTabs } from '@/features/engineering-db/tab-config'
import { getEngineeringReferenceTabs } from '@/features/engineering-reference/tab-config'
import { getEngineeringTabs } from '@/features/engineering/tab-config'
import { getMaintenanceCenterTabs } from '@/features/equipment-maintenance/tabs'
import { getEquipmentToolingTabs } from '@/features/equipment-tooling/tabs'
import { getFinanceSettlementsTabs } from '@/features/finance/settlements-tabs'
import { getFinanceTabs } from '@/features/finance/tabs'
import { getLabExperimentalTabs } from '@/features/labs/experimental/tabs'
import { getLogisticsConfigTabs } from '@/features/logistics-config/tabs'
import { getLogisticsContainerManagementTabs } from '@/features/logistics-container-management/tabs'
import { getLogisticsSettingsTabs } from '@/features/logistics-settings/tabs'
import { getMaterialStaticTabs } from '@/features/material-archive/tab-config'
import { getMessageCenterTabs } from '@/features/message-center/tabs'
import { getMrpTabs } from '@/features/mrp/tabs'
import {
  getOrgPersonnelBranchTabs,
  getOrgPersonnelTabs,
} from '@/features/org-personnel/tabs'
import { getPieceworkTabs } from '@/features/piecework/tab-config'
import { getProductStructureTabs } from '@/features/product-structure/tab-config'
import { getProductionArchitectureTabs } from '@/features/production-architecture/tab-config'
import { getProductionOutsourcingTabs } from '@/features/production-outsourcing/tabs'
import { getProductionQualityTabs } from '@/features/production-quality/tab-config'
import { getPurchaseTabs } from '@/features/purchase/tabs'
import { getQualityTabs } from '@/features/quality/tab-config'
import { getQuoteTabs } from '@/features/quotes/tabs'
import { getRawMaterialsTabs } from '@/features/raw-materials/tabs'
import { getSidebarCommandTabs } from '@/features/sidebar-command-config/tabs'
import { getTerminalConfigTabs } from '@/features/terminal-config/tabs'
import { getToolingFurnacesTabs } from '@/features/tooling-furnaces/tabs'
import { getShippingManagementTabs } from '@/features/trading/shipping-management/tabs'
import { getTradingTabs } from '@/features/trading/tabs'
import { getWarehouseConfigTabs } from '@/features/warehouse-config/tabs'
import { getWarehouseTabs } from '@/features/warehouse/tabs'
import type { NavNode } from './types'

type TranslateFn = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string

type SidebarTabPreviewResolver = (t: TranslateFn) => TabItem[]

const resolveBusinessAnalysisTabs =
  (domain: BusinessAnalysisDomain): SidebarTabPreviewResolver =>
  (t) =>
    getBusinessAnalysisTabs(t, domain)

function getCuttingEngineTabs(t: TranslateFn): TabItem[] {
  return [
    {
      key: 'config',
      label: t('sidebar.items.cuttingEngine'),
      href: '/raw-materials-engine/config',
    },
    {
      key: 'cutting-simulation',
      label: t('rawMaterials.tabs.batchEngine'),
      href: '/raw-materials-engine/cutting-simulation',
    },
  ]
}

function getSystemManagementTabs(t: TranslateFn): TabItem[] {
  return [
    {
      key: 'status',
      label: t('systemManagement.layout.tabs.status'),
      href: '/system-management',
    },
    {
      key: 'ai-capability',
      label: t('systemManagement.layout.tabs.aiCapability'),
      href: '/system-management/ai-capability',
    },
    {
      key: 'audit-engine',
      label: t('systemManagement.layout.tabs.auditEngine'),
      href: '/system-management/audit-engine',
    },
  ]
}

const sidebarTabPreviewResolvers: Record<string, SidebarTabPreviewResolver> = {
  dashboard: getDashboardTabs,
  'purchase-management': getPurchaseTabs,
  'sales-management': getTradingTabs,
  'quote-management': getQuoteTabs,
  'shipping-management': getShippingManagementTabs,
  mrp: getMrpTabs,
  'aps-scheduling': getApsSchedulingTabs,
  piecework: getPieceworkTabs,
  'production-architecture': getProductionArchitectureTabs,
  'production-outsourcing': getProductionOutsourcingTabs,
  'cutting-database': getRawMaterialsTabs,
  'cutting-operations': getCuttingOperationTabs,
  'cutting-engine': getCuttingEngineTabs,
  'production-analysis-center': resolveBusinessAnalysisTabs('production'),
  'quality-analysis-center': resolveBusinessAnalysisTabs('quality'),
  'customer-sales-analysis-center':
    resolveBusinessAnalysisTabs('customerSales'),
  'engineering-database': () => engineeringDbTabs,
  'engineering-reference': getEngineeringReferenceTabs,
  'quality-audit': getQualityTabs,
  'quality-operations': getProductionQualityTabs,
  'product-engineering': getEngineeringTabs,
  'product-structure': getProductStructureTabs,
  'linear-barcode': getLinearBarcodeTabs,
  'shared-code-source': getSharedCodeSourceTabs,
  'warehouse-operations': getWarehouseTabs,
  'material-archive': getMaterialStaticTabs,
  'warehouse-config': getWarehouseConfigTabs,
  'logistics-config': getLogisticsConfigTabs,
  'container-management': getLogisticsContainerManagementTabs,
  'logistics-settings': getLogisticsSettingsTabs,
  'tooling-assets': getEquipmentToolingTabs,
  'furnace-assets': getToolingFurnacesTabs,
  'maintenance-center': getMaintenanceCenterTabs,
  'personnel-center': getOrgPersonnelTabs,
  'attendance-management': getOrgPersonnelBranchTabs,
  'experimental-center': getLabExperimentalTabs,
  'finance-center': getFinanceTabs,
  'finance-settlements': getFinanceSettlementsTabs,
  'approval-center': getApprovalTabs,
  'message-center': getMessageCenterTabs,
  'terminal-config': getTerminalConfigTabs,
  'sidebar-command-config': getSidebarCommandTabs,
  'system-management': getSystemManagementTabs,
  'basic-settings': getBasicSettingsTabs,
}

/**
 * 侧边栏三级域到模块 TAB 的唯一预览映射。
 *
 * 职责边界：
 * - 只把已存在的 feature tab config 暴露给 scrubber hover 浮层。
 * - 不改变 sidebar-data 的三层域结构，不在菜单配置里重复维护 TAB。
 * - 没有模块 TAB 的域返回空数组，浮层仍保留默认域入口。
 */
export function resolveSidebarNodeTabPreviews(
  node: NavNode,
  t: TranslateFn
): TabItem[] {
  return sidebarTabPreviewResolvers[node.id]?.(t) ?? []
}
