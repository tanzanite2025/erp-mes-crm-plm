import { Settings2 } from 'lucide-react'
import { IndustrialHeader } from '@/components/uds/industrial-header'

interface ProductAttributesHeaderProps {
  locale: string
}

export function ProductAttributesHeader({
  locale,
}: ProductAttributesHeaderProps) {
  const isZh = locale === 'zh-CN'

  return (
    <IndustrialHeader
      icon={Settings2}
      title={isZh ? '产品属性配置' : 'Product Attributes'}
      description={
        isZh
          ? '维护产品属性分类与分类项，界面展示使用你配置的中英文名称。'
          : 'Manage product attribute categories and options with localized display names.'
      }
      gradient
    />
  )
}
