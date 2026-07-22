import type { Furnace } from './furnace-schema'

export interface FurnaceStats {
  total: number
  idle: number
  running: number
  maintenance: number
  fault: number
}

export function calculateFurnaceStats(furnaces: Furnace[]): FurnaceStats {
  return {
    total: furnaces.length,
    idle: furnaces.filter((furnace) => furnace.status === 'IDLE').length,
    running: furnaces.filter(
      (furnace) => furnace.status === 'HEATING' || furnace.status === 'COOLING'
    ).length,
    maintenance: furnaces.filter((furnace) => furnace.status === 'MAINTENANCE')
      .length,
    fault: furnaces.filter((furnace) => furnace.status === 'FAULT').length,
  }
}
