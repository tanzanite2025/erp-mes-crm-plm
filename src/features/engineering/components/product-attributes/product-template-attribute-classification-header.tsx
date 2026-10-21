import { Settings2 } from 'lucide-react'
import { IndustrialHeader } from '@/components/uds/industrial-header'

interface ProductTemplateAttributeClassificationHeaderProps {
  locale: string
}

export function ProductTemplateAttributeClassificationHeader({
  locale,
}: ProductTemplateAttributeClassificationHeaderProps) {
  const isZh = locale === 'zh-CN'

  return (
    <IndustrialHeader
      icon={Settings2}
      title={
        isZh ? '产品模板属性分类' : 'Product Template Attribute Categories'
      }
      description={
        isZh
          ? '一级属性分类如“材质”，二级属性分类如“碳纤维、铝合金”；产品分类在产品分类树中维护。'
          : 'Define template attributes at level 1 (e.g. Material) and their options at level 2 (e.g. Carbon Fiber, Aluminum Alloy). Product categories are managed in the product category tree.'
      }
      gradient
    />
  )
}
