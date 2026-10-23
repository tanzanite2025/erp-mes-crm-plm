import { useId, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'

interface BOMEditorProductInformationAndRecipeLayoutProps {
  productInformation: ReactNode
  recipeDetails: ReactNode
}

/** Layout and scroll ownership only; receives rendered regions without form state or business callbacks. */
export function BOMEditorProductInformationAndRecipeLayout({
  productInformation,
  recipeDetails,
}: BOMEditorProductInformationAndRecipeLayoutProps) {
  const { locale } = useLanguage()
  const isZh = locale.startsWith('zh')
  const panelId = useId()
  const [activeMobileStep, setActiveMobileStep] = useState<
    'product-information' | 'recipe-details'
  >('product-information')
  const mobileSteps = [
    {
      value: 'product-information' as const,
      number: 1,
      label: isZh ? '基本信息' : 'Basic information',
    },
    {
      value: 'recipe-details' as const,
      number: 2,
      label: isZh ? '配方明细' : 'Recipe details',
    },
  ]
  return (
    <div className='flex min-h-0 flex-1 flex-col gap-2.5 px-3 pb-3 sm:px-4 sm:pb-4'>
      <nav
        aria-label={isZh ? 'BOM 编辑步骤' : 'BOM editing steps'}
        className='shrink-0 lg:hidden'
      >
        <ol className='grid grid-cols-2 gap-1.5 rounded-2xl border border-border/50 bg-muted/30 p-1'>
          {mobileSteps.map((step) => (
            <li key={step.value} className='min-w-0'>
              <button
                type='button'
                aria-label={
                  isZh
                    ? `步骤 ${step.number}：${step.label}`
                    : `Step ${step.number}: ${step.label}`
                }
                aria-current={
                  activeMobileStep === step.value ? 'step' : undefined
                }
                aria-controls={`${panelId}-${step.value}`}
                onClick={() => setActiveMobileStep(step.value)}
                className={cn(
                  'flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-2 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                  activeMobileStep === step.value
                    ? 'bg-background text-blue-600 shadow-sm dark:text-blue-400'
                    : 'text-muted-foreground hover:bg-background/60 hover:text-foreground'
                )}
              >
                <span
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                    activeMobileStep === step.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {step.number}
                </span>
                <span>{step.label}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>
      {/* Keep both regions mounted so step changes preserve version-weight drafts and recipe state. */}
      <div className='grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)] gap-3 overflow-hidden lg:grid-cols-[296px_minmax(0,1fr)] xl:grid-cols-[304px_minmax(0,1fr)] 2xl:grid-cols-[320px_minmax(0,1fr)]'>
        <aside
          id={`${panelId}-product-information`}
          aria-label={isZh ? '产品与 BOM 信息' : 'Product and BOM information'}
          className={cn(
            'custom-scrollbar min-h-0 min-w-0 overflow-y-auto rounded-2xl border border-dashed border-border/60 bg-muted/10 p-3',
            activeMobileStep !== 'product-information' && 'hidden lg:block'
          )}
        >
          <h3 className='mb-3 text-sm font-bold'>
            {isZh ? '产品与 BOM 信息' : 'Product and BOM information'}
          </h3>
          {productInformation}
        </aside>
        <section
          id={`${panelId}-recipe-details`}
          aria-label={isZh ? 'BOM 配方明细' : 'BOM recipe details'}
          className={cn(
            'flex min-h-0 min-w-0 flex-col overflow-hidden',
            activeMobileStep !== 'recipe-details' && 'hidden lg:flex'
          )}
        >
          {recipeDetails}
        </section>
      </div>
    </div>
  )
}
