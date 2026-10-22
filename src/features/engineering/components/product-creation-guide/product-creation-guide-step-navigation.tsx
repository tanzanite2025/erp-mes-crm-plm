import { Check, ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import type { ProductCreationOperationGuideStep } from '../../data/build-product-creation-operation-guide-steps'
import type {
  ProductCreationGuideProgress,
  ProductCreationOperationGuideStepKey,
} from '../../data/product-creation-operation-guide-progress'

export function ProductCreationGuideStepNavigation({
  steps,
  activeStepKey,
  progress,
  verifiedRecordCompletion,
  isBusy,
  onSelectStep,
}: {
  steps: ProductCreationOperationGuideStep[]
  activeStepKey: ProductCreationOperationGuideStepKey
  progress: ProductCreationGuideProgress
  verifiedRecordCompletion?: Partial<
    Record<ProductCreationOperationGuideStepKey, boolean>
  >
  isBusy: boolean
  onSelectStep: (key: ProductCreationOperationGuideStepKey) => void
}) {
  const { t } = useLanguage()
  const activeStepIndex = steps.findIndex((step) => step.key === activeStepKey)
  return (
    <div className='shrink-0 border-b bg-muted/20 px-4 py-3 sm:px-5'>
      <div className='mb-3 flex items-center gap-2 pr-8'>
        {activeStepIndex > 0 && (
          <Button
            type='button'
            size='icon'
            variant='ghost'
            className='size-6 rounded-full'
            disabled={isBusy}
            aria-label={t('engineering.productCreationGuide.previousStep')}
            onClick={() => onSelectStep(steps[activeStepIndex - 1].key)}
          >
            <ChevronLeft className='size-4' />
          </Button>
        )}
        <p className='text-sm font-semibold'>
          {t('engineering.productCreationGuide.title')}
        </p>
        <span className='ml-auto text-xs text-muted-foreground'>
          {activeStepIndex + 1} / {steps.length}
        </span>
      </div>
      <nav aria-label={t('engineering.productCreationGuide.stepNavigation')}>
        <ol className='grid grid-cols-4 gap-1 sm:gap-3'>
          {steps.map((step, index) => {
            const completed =
              verifiedRecordCompletion?.[step.key] ??
              Boolean(progress.completedSteps[step.key])
            const reachable = steps
              .slice(0, index)
              .every((previous) => progress.completedSteps[previous.key])
            const active = step.key === activeStepKey
            return (
              <li key={step.key}>
                <button
                  type='button'
                  aria-current={active ? 'step' : undefined}
                  aria-label={`${t(`engineering.productCreationGuide.stepLabels.${step.key}`)}${completed ? ` · ${t('engineering.productCreationGuide.completed')}` : ''}`}
                  disabled={isBusy || !reachable}
                  onClick={() => onSelectStep(step.key)}
                  className={cn(
                    'flex h-full w-full flex-col items-center gap-1.5 rounded-full px-1 py-2 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40 sm:flex-row sm:gap-2 sm:px-2',
                    active
                      ? 'bg-primary/8 text-primary'
                      : 'text-muted-foreground hover:bg-muted'
                  )}
                >
                  <span
                    className={cn(
                      'flex size-6 shrink-0 items-center justify-center rounded-full border text-xs',
                      active &&
                        'border-primary bg-primary text-primary-foreground',
                      completed &&
                        !active &&
                        'border-primary/20 bg-primary/10 text-primary'
                    )}
                  >
                    {completed && !active ? (
                      <Check aria-hidden='true' className='size-3.5' />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span>
                    {t(
                      `engineering.productCreationGuide.stepLabels.${step.key}`
                    )}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </nav>
    </div>
  )
}
