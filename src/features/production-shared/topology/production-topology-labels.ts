export const productionTopologyLevelLabels = {
  level1Name: 'L1',
  level2Name: 'L2',
  level3Name: 'L3',
} as const

export function useProductionTopologyLabels() {
  return {
    levels: [
      {
        id: 'production-level-1',
        level: 1,
        name: productionTopologyLevelLabels.level1Name,
      },
      {
        id: 'production-level-2',
        level: 2,
        name: productionTopologyLevelLabels.level2Name,
      },
      {
        id: 'production-level-3',
        level: 3,
        name: productionTopologyLevelLabels.level3Name,
      },
    ],
    ...productionTopologyLevelLabels,
  }
}
