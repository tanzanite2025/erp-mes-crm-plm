import { type Mold, type Furnace } from '../data/schema'
import { useAssets } from './use-assets'

export interface DashboardStats {
  moldStats: {
    total: number
    idle: number
    inUse: number
    maintenance: number
    fault: number
    overdue: number
  }
  furnaceStats: {
    total: number
    idle: number
    running: number
    maintenance: number
    fault: number
  }
  totalStats: {
    total: number
    inUse: number
    idle: number
    fault: number
    maintenance: number
  }
  molds: Mold[]
  furnaces: Furnace[]
}

/**
 * 资产看板核心数据统计 Hook
 * 封装过滤、计算逻辑，为 UI 组件提供响应式计算结果
 */
export function useDashboardStats(): DashboardStats {
  const { molds, furnaces, loans } = useAssets()

  // 模具状态统计
  const moldStats = {
    total: molds.length,
    idle: molds.filter((m) => m.status === 'IDLE').length,
    inUse: molds.filter((m) => m.status === 'IN_USE').length,
    maintenance: molds.filter(
      (m) => m.status === 'CHECKING' || m.status === 'MAINTENANCE'
    ).length,
    fault: molds.filter((m) => m.status === 'RETIRED').length,
    overdue: ((loans as any[]) || []).filter((l) => l.status === 'OVERDUE')
      .length,
  }

  // 炉台状态统计
  const furnaceStats = {
    total: furnaces.length,
    idle: furnaces.filter((f) => f.status === 'IDLE').length,
    running: furnaces.filter(
      (f) => f.status === 'HEATING' || f.status === 'COOLING'
    ).length,
    maintenance: furnaces.filter((f) => f.status === 'MAINTENANCE').length,
    fault: furnaces.filter((f) => f.status === 'FAULT').length,
  }

  // 汇总统计
  const totalStats = {
    total: moldStats.total + furnaceStats.total,
    inUse: moldStats.inUse + furnaceStats.running,
    idle: moldStats.idle + furnaceStats.idle,
    fault: moldStats.fault + furnaceStats.fault,
    maintenance: moldStats.maintenance + furnaceStats.maintenance,
  }

  return {
    moldStats,
    furnaceStats,
    totalStats,
    molds,
    furnaces,
  }
}
