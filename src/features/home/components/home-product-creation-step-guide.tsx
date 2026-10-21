import { Link } from '@tanstack/react-router'
import { ArrowUpRight, Route } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { HomeProductCreationGuideStep } from '../data/build-home-product-creation-guide-steps'

export function HomeProductCreationStepGuide({
  steps,
}: {
  steps: HomeProductCreationGuideStep[]
}) {
  const { t } = useLanguage()
  if (!steps.some((step) => step.canAccess)) return null

  return (
    <section
      aria-labelledby='home-product-creation-guide-title'
      className='space-y-4'
    >
      <div className='space-y-2'>
        <h2
          id='home-product-creation-guide-title'
          className='flex items-center gap-2 text-lg font-semibold'
        >
          <Route aria-hidden='true' className='size-5 text-primary' />
          {t('home.productCreationGuide.title')}
        </h2>
        <p className='text-sm leading-relaxed text-muted-foreground'>
          {t('home.productCreationGuide.description')}
        </p>
        <p className='rounded-xl bg-primary/5 px-3 py-2 text-xs leading-relaxed text-muted-foreground'>
          {t('home.productCreationGuide.reuseHint')}
        </p>
      </div>
      <ol className='space-y-3'>
        {steps.map((step) => (
          <li
            key={step.key}
            className='relative flex gap-3 sm:gap-4 last:[&>div:first-child]:after:hidden'
          >
            <div className='relative flex w-7 shrink-0 justify-center pt-3.5 after:absolute after:top-12 after:-bottom-3 after:left-1/2 after:w-px after:bg-border sm:w-8'>
              <span className='relative z-10 flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary sm:size-8'>
                <span className='sr-only'>
                  {t('home.productCreationGuide.stepNumber', {
                    number: step.number,
                  })}
                </span>
                <span aria-hidden='true'>{step.number}</span>
              </span>
            </div>
            <article className='min-w-0 flex-1 space-y-3 rounded-2xl border border-border/70 bg-card p-3.5 sm:p-4'>
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <div className='flex flex-wrap items-center gap-2'>
                  <h3 className='text-sm font-semibold'>{step.title}</h3>
                  <Badge
                    variant='secondary'
                    className='text-[10px] font-normal'
                  >
                    {t(
                      step.stage === 'configuration'
                        ? 'home.productCreationGuide.reusableConfiguration'
                        : step.stage === 'product'
                          ? 'home.productCreationGuide.productCreated'
                          : 'home.productCreationGuide.optionalNext'
                    )}
                  </Badge>
                </div>
                {step.canAccess ? (
                  <Button
                    asChild
                    variant='outline'
                    size='sm'
                    className='h-8 gap-1.5 rounded-lg text-xs'
                  >
                    <Link to={step.href}>
                      {t('home.productCreationGuide.openPage', {
                        page: step.pageLabel,
                      })}
                      <ArrowUpRight aria-hidden='true' className='size-3.5' />
                    </Link>
                  </Button>
                ) : (
                  <span className='text-xs text-muted-foreground'>
                    {step.pageLabel} ·{' '}
                    {t('home.productCreationGuide.accessRequired')}
                  </span>
                )}
              </div>
              <p className='text-sm leading-relaxed'>{step.action}</p>
              <dl className='grid gap-3 text-xs leading-relaxed md:grid-cols-2'>
                <div>
                  <dt className='mb-1 font-medium text-muted-foreground'>
                    {t('home.productCreationGuide.fieldsLabel')}
                  </dt>
                  <dd>{step.fields}</dd>
                </div>
                <div>
                  <dt className='mb-1 font-medium text-muted-foreground'>
                    {t('home.productCreationGuide.resultLabel')}
                  </dt>
                  <dd>{step.result}</dd>
                </div>
              </dl>
            </article>
          </li>
        ))}
      </ol>
    </section>
  )
}
