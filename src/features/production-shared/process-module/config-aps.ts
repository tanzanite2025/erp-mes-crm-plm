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
            { key: 'priority', label: '优先级', value: 'P1', tone: 'accent', width: 'sm' },
            { key: 'window', label: '排产窗口', value: '08:00 - 10:30', tone: 'muted', width: 'lg' },
          ],
        },
        {
          title: '排产树',
          tree: [
            {
              key: 'aps-001-job',
              label: '工单批次 SO-260417-001',
              meta: '主批次 · 已锁定',
              status: 'normal',
              children: [
                {
                  key: 'aps-001-prc-1',
                  label: '裁切',
                  meta: '12 min · 已排入',
                  status: 'normal',
                  children: [
                    { key: 'aps-001-step-1', label: '上料', meta: '准备完成', status: 'normal' },
                    { key: 'aps-001-step-2', label: '定位裁切', meta: '执行中', status: 'normal' },
                  ],
                },
                {
                  key: 'aps-001-prc-2',
                  label: '整形',
                  meta: '18 min · 待切换',
                  status: 'warning',
                  children: [
                    { key: 'aps-001-step-3', label: '转运', meta: '等待设备', status: 'warning' },
                    { key: 'aps-001-step-4', label: '整形校准', meta: '待开始', status: 'warning' },
                  ],
                },
              ],
            },
            {
              key: 'aps-001-job-2',
              label: '工单批次 SO-260417-008',
              meta: '待排入 · 材料到位',
              status: 'warning',
              children: [
                {
                  key: 'aps-001-prc-3',
                  label: '铺层前置',
                  meta: '24 min · 可排产',
                  status: 'warning',
                  children: [
                    { key: 'aps-001-step-5', label: '展开', meta: '待开始', status: 'warning' },
                    { key: 'aps-001-step-6', label: '铺底', meta: '待开始', status: 'warning' },
                  ],
                },
                {
                  key: 'aps-001-prc-4',
                  label: '固化准备',
                  meta: '45 min · 资源待确认',
                  status: 'danger',
                  children: [
                    { key: 'aps-001-step-7', label: '炉位预约', meta: '冲突', status: 'danger' },
                    { key: 'aps-001-step-8', label: '升温校验', meta: '待处理', status: 'warning' },
                  ],
                },
              ],
            },
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
            { key: 'priority', label: '优先级', value: 'P2', tone: 'accent', width: 'sm' },
            { key: 'window', label: '排产窗口', value: '10:30 - 13:00', tone: 'muted', width: 'lg' },
          ],
        },
        {
          title: '排产树',
          tree: [
            {
              key: 'aps-002-job',
              label: '工单批次 SO-260417-002',
              meta: '等待材料 · 未锁定',
              status: 'warning',
              children: [
                {
                  key: 'aps-002-prc-1',
                  label: '铺层',
                  meta: '24 min · 材料回温',
                  status: 'warning',
                  children: [
                    { key: 'aps-002-step-1', label: '材料回温', meta: '30 min', status: 'warning' },
                    { key: 'aps-002-step-2', label: '表面检查', meta: '待开始', status: 'warning' },
                  ],
                },
                {
                  key: 'aps-002-prc-2',
                  label: '压实',
                  meta: '18 min · 待排入',
                  status: 'warning',
                  children: [
                    { key: 'aps-002-step-3', label: '压机预约', meta: '未锁定', status: 'warning' },
                  ],
                },
              ],
            },
            {
              key: 'aps-002-job-2',
              label: '工单批次 SO-260417-006',
              meta: '待确认 · 可插单',
              status: 'normal',
              children: [
                {
                  key: 'aps-002-prc-3',
                  label: '铺层',
                  meta: '24 min · 已预留',
                  status: 'normal',
                  children: [
                    { key: 'aps-002-step-4', label: '预裁', meta: '完成', status: 'normal' },
                    { key: 'aps-002-step-5', label: '铺层定位', meta: '待开始', status: 'normal' },
                  ],
                },
              ],
            },
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
            { key: 'priority', label: '优先级', value: 'P1', tone: 'danger', width: 'sm' },
            { key: 'window', label: '排产窗口', value: '13:00 - 16:00', tone: 'muted', width: 'lg' },
          ],
        },
        {
          title: '排产树',
          tree: [
            {
              key: 'aps-003-job',
              label: '工单批次 SO-260417-003',
              meta: '资源冲突 · 等待决策',
              status: 'danger',
              children: [
                {
                  key: 'aps-003-prc-1',
                  label: '固化',
                  meta: '45 min · 炉位冲突',
                  status: 'danger',
                  children: [
                    { key: 'aps-003-step-1', label: '炉位预约', meta: '冲突', status: 'danger' },
                    { key: 'aps-003-step-2', label: '升温', meta: '待处理', status: 'warning' },
                  ],
                },
                {
                  key: 'aps-003-prc-2',
                  label: '脱模',
                  meta: '15 min · 被阻塞',
                  status: 'blocked',
                  children: [
                    { key: 'aps-003-step-3', label: '冷却', meta: '排队中', status: 'warning' },
                    { key: 'aps-003-step-4', label: '脱模检查', meta: '未开始', status: 'blocked' },
                  ],
                },
              ],
            },
            {
              key: 'aps-003-job-2',
              label: '工单批次 SO-260417-011',
              meta: '插单候选 · 需重排',
              status: 'warning',
              children: [
                {
                  key: 'aps-003-prc-3',
                  label: '固化准备',
                  meta: '30 min · 排队中',
                  status: 'warning',
                  children: [
                    { key: 'aps-003-step-5', label: '预热', meta: '待开始', status: 'warning' },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
