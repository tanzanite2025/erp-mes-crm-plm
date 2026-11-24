import { ChapteredBusinessOperationGuidePage } from '@/components/chaptered-business-operation-guide-page'
import { ProductCodeLinearBarcodeAndQrCodeOperationGuideBusinessEntryActions } from '../components/product-code-linear-barcode-and-qr-code-operation-guide-business-entry-actions'
import { productCodeLinearBarcodeAndQrCodeOperationGuideDefinition } from '../data/product-code-linear-barcode-and-qr-code-operation-guide-chapter-definitions'

export function ProductCodeLinearBarcodeAndQrCodeOperationGuidePage() {
  return (
    <div className='flex min-h-0 flex-1 flex-col gap-3'>
      <ProductCodeLinearBarcodeAndQrCodeOperationGuideBusinessEntryActions />
      <div className='min-h-0 flex-1'>
        <ChapteredBusinessOperationGuidePage
          guide={productCodeLinearBarcodeAndQrCodeOperationGuideDefinition}
        />
      </div>
    </div>
  )
}
