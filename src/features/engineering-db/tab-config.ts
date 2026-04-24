import type { TabItem } from '@/components/module-tabs'

export const engineeringDbTabs: TabItem[] = [
  { key: 'overview', label: '全量汇总', href: '/engineering-db' },
  { key: 'specs', label: '技术规范', href: '/engineering-db/specs' },
  { key: 'drilling', label: '打孔方案', href: '/engineering-db/drilling' },
  { key: 'cutting-plan', label: '裁纱方案', href: '/engineering-db/cutting-plan' },
  {
    key: 'engineering-master',
    label: '工程主数据',
    href: '/engineering-db/engineering-master',
  },
  { key: 'labeling', label: '贴标图档', href: '/engineering-db/labeling' },
]
