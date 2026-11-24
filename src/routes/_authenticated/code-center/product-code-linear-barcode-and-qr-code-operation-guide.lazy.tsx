import { createLazyFileRoute } from '@tanstack/react-router'
import { ProductCodeLinearBarcodeAndQrCodeOperationGuidePage } from '@/features/code-center/pages/product-code-linear-barcode-and-qr-code-operation-guide-page'

export const Route = createLazyFileRoute(
  '/_authenticated/code-center/product-code-linear-barcode-and-qr-code-operation-guide'
)({ component: ProductCodeLinearBarcodeAndQrCodeOperationGuidePage })
