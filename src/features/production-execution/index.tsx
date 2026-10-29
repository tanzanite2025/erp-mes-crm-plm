import { useAuthStore } from '@/stores/auth-store'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProductionExecutionBarcodeReviewAndExplicitOperationWorkspace } from './production-execution-barcode-review-and-explicit-operation-workspace'

export function ProductionExecution() {
  const actorId = useAuthStore((state) => state.user?.id ?? '')
  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
      <Header fixed className='z-50 border-b-0 shadow-none' />
      <Main fixed className='overflow-y-auto pb-5'>
        <ProductionExecutionBarcodeReviewAndExplicitOperationWorkspace
          key={actorId}
        />
      </Main>
    </div>
  )
}
