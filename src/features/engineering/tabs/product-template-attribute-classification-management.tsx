import { useLanguage } from '@/context/language-provider'
import { ProductTemplateAttributeClassificationHeader } from '../components/product-attributes/product-template-attribute-classification-header'
import { ProductTemplateAttributeClassificationManagementPanel } from '../components/product-attributes/product-template-attribute-classification-management-panel'

export function ProductTemplateAttributeClassificationManagement() {
  const { locale } = useLanguage()

  return (
    <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
      <ProductTemplateAttributeClassificationHeader locale={locale} />
      <ProductTemplateAttributeClassificationManagementPanel />
    </div>
  )
}
