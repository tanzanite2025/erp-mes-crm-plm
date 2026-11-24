import { Outlet, useLocation } from '@tanstack/react-router'
import { useLanguage } from '@/context/language-provider'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { getProductCodeLinearBarcodeAndQrCodeOperationGuideTabs } from '../product-code-linear-barcode-and-qr-code-operation-guide-tab-config'

export function CodeCenterProductCodeOperationGuideRouteLayout() {
  const { pathname } = useLocation()
  const { t } = useLanguage()
  const isProductCodeOperationGuide =
    pathname ===
    '/code-center/product-code-linear-barcode-and-qr-code-operation-guide'

  if (!isProductCodeOperationGuide) return <Outlet />

  return (
    <ModuleTabbedLayout
      tabs={getProductCodeLinearBarcodeAndQrCodeOperationGuideTabs(t)}
      mainClassName='overflow-hidden pb-0'
      contentClassName='h-full flex-1 overflow-hidden'
    >
      <Outlet />
    </ModuleTabbedLayout>
  )
}
