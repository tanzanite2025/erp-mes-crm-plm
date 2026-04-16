import type { ProcessModuleItem } from './types'

export const processModuleItems: ProcessModuleItem[] = [
  {
    id: 'PRC-001',
    code: 'CUT-01',
    name: '裁切工序',
    lineName: '1# 产线',
    duration: '12 min',
    status: 'active',
    capacity: '82%',
    note: '适用于标准板材裁切',
  },
  {
    id: 'PRC-002',
    code: 'LAY-02',
    name: '铺层工序',
    lineName: '2# 产线',
    duration: '24 min',
    status: 'idle',
    capacity: '54%',
    note: '当前等待材料回温',
  },
  {
    id: 'PRC-003',
    code: 'CURE-03',
    name: '固化工序',
    lineName: '3# 产线',
    duration: '45 min',
    status: 'blocked',
    capacity: '96%',
    note: '炉位资源冲突',
  },
]
