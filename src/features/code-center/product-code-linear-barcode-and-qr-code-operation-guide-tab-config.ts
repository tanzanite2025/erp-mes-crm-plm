import type { TranslationKey } from '@/locales'
import type { TabItem } from '@/components/module-tabs'

export function getProductCodeLinearBarcodeAndQrCodeOperationGuideTabs(
  translate: (key: TranslationKey) => string
): TabItem[] {
  return [
    {
      key: 'product-code-linear-barcode-and-qr-code-operation-guide',
      label: translate('productCodeLinearBarcodeAndQrCodeOperationGuide.title'),
      href: '/code-center/product-code-linear-barcode-and-qr-code-operation-guide',
    },
  ]
}
