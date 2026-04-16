import type { ProcessModuleConfig } from './config'

export const processModuleApsConfig: ProcessModuleConfig = {
  title: '公共工序模块',
  subtitle: 'REUSABLE PROCESS LAYER FOR APS AND LINE MANAGEMENT',
  cards: [
    {
      id: 'PRC-001',
      code: 'CUT-01',
      name: '裁切工序',
      status: 'active',
      badges: [{ label: 'APS_排产核心', tone: 'text-cyan-600' }],
      sections: [
        {
          title: '基础信息',
          fields: [
            { key: 'line', label: '产线', value: '1# 产线', tone: 'accent', width: 'md' },
            { key: 'duration', label: '时长', value: '12 min', tone: 'muted', width: 'sm' },
          ],
        },
        {
          title: '排产指标',
          fields: [
            { key: 'capacity', label: '排产负载', value: '82%', tone: 'accent', width: 'sm' },
            { key: 'note', label: '说明', value: '适用于标准板材裁切', tone: 'muted', width: 'lg' },
          ],
        },
      ],
    },
    {
      id: 'PRC-002',
      code: 'LAY-02',
      name: '铺层工序',
      status: 'idle',
      badges: [{ label: 'APS_等待中', tone: 'text-amber-600' }],
      sections: [
        {
          title: '基础信息',
          fields: [
            { key: 'line', label: '产线', value: '2# 产线', tone: 'accent', width: 'md' },
            { key: 'duration', label: '时长', value: '24 min', tone: 'muted', width: 'sm' },
          ],
        },
        {
          title: '排产指标',
          fields: [
            { key: 'capacity', label: '排产负载', value: '54%', tone: 'accent', width: 'sm' },
            { key: 'note', label: '说明', value: '当前等待材料回温', tone: 'muted', width: 'lg' },
          ],
        },
      ],
    },
    {
      id: 'PRC-003',
      code: 'CURE-03',
      name: '固化工序',
      status: 'blocked',
      badges: [{ label: 'APS_冲突', tone: 'text-rose-600' }],
      sections: [
        {
          title: '基础信息',
          fields: [
            { key: 'line', label: '产线', value: '3# 产线', tone: 'accent', width: 'md' },
            { key: 'duration', label: '时长', value: '45 min', tone: 'muted', width: 'sm' },
          ],
        },
        {
          title: '排产指标',
          fields: [
            { key: 'capacity', label: '排产负载', value: '96%', tone: 'danger', width: 'sm' },
            { key: 'note', label: '说明', value: '炉位资源冲突', tone: 'danger', width: 'lg' },
          ],
        },
      ],
    },
  ],
}
