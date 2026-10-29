import { useRef } from 'react'
import { Link } from '@tanstack/react-router'
import type { TranslationKey } from '@/locales'
import { ArrowRight, BookOpen, CheckCircle2, Info } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { useLanguage } from '@/context/language-provider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { matchesPathPermissionProjection } from '@/features/authz/guards/route-access'
import {
  productionOutsourcingOperationGuideDefinitions,
  productionOutsourcingOperationGuideReferencePaths,
  productionOutsourcingOperationGuideStepKeys,
  type ProductionOutsourcingOperationGuideKind,
} from '../data/production-outsourcing-operation-guide-chapter-definitions'

export function OutsourceTaskAndPartnerOperationGuidePage() {
  return (
    <ProductionOutsourcingOperationGuideReadingPage guide='tasksAndPartners' />
  )
}

export function OutsourceSendReturnInspectionScanningGuidePage() {
  return (
    <ProductionOutsourcingOperationGuideReadingPage guide='sendReturnInspection' />
  )
}

function ProductionOutsourcingOperationGuideReadingPage({
  guide,
}: {
  guide: ProductionOutsourcingOperationGuideKind
}) {
  const { t } = useLanguage()
  const user = useAuthStore((state) => state.user)
  const readingAreaRef = useRef<HTMLDivElement>(null)
  const definition = productionOutsourcingOperationGuideDefinitions[guide]

  function translateSelectedOutsourcingGuideContent(suffix: string) {
    return t(
      `productionOutsourcing.operationGuides.${guide}.${suffix}` as TranslationKey
    )
  }

  function resetOutsourcingGuideSelectedChapterReadingPosition() {
    if (readingAreaRef.current) readingAreaRef.current.scrollTop = 0
  }

  return (
    <Tabs
      key={guide}
      defaultValue='preparation'
      onValueChange={resetOutsourcingGuideSelectedChapterReadingPosition}
      className='@container flex h-full min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden'
    >
      <header className='shrink-0 space-y-2 rounded-2xl border border-sky-200/70 bg-linear-to-br from-sky-50 via-background to-indigo-50 p-4 sm:p-5 dark:border-sky-900/60 dark:from-sky-950/40 dark:to-indigo-950/30'>
        <p className='flex items-center gap-2 text-xs font-semibold text-sky-700 dark:text-sky-300'>
          <BookOpen aria-hidden='true' className='size-4 shrink-0' />
          {t('productionOutsourcing.operationGuides.domainLabel')}
        </p>
        <h1 className='text-xl font-semibold tracking-tight @3xl:text-3xl'>
          {translateSelectedOutsourcingGuideContent('title')}
        </h1>
        <p className='text-xs leading-6 text-muted-foreground sm:text-sm'>
          <span className='sm:hidden'>
            {translateSelectedOutsourcingGuideContent('mobileIntroduction')}
          </span>
          <span className='hidden sm:inline'>
            {translateSelectedOutsourcingGuideContent('introduction')}
          </span>
        </p>
      </header>
      <TabsList
        aria-label={t('productionOutsourcing.operationGuides.contentsLabel')}
        className='flex h-auto w-full shrink-0 items-stretch gap-1 rounded-none border-b bg-transparent p-0 pb-3'
      >
        {definition.chapters.map((chapter, index) => (
          <TabsTrigger
            key={chapter.key}
            value={chapter.key}
            aria-label={translateSelectedOutsourcingGuideContent(
              `chapters.${chapter.key}.label`
            )}
            className='h-auto min-h-10 min-w-0 flex-1 flex-col gap-1 rounded-lg px-1 py-2 text-[11px] leading-4 whitespace-normal text-muted-foreground shadow-none data-[state=active]:bg-sky-100 data-[state=active]:text-sky-900 sm:flex-none sm:flex-row sm:gap-2 sm:px-3 sm:text-sm dark:data-[state=active]:bg-sky-950 dark:data-[state=active]:text-sky-100'
          >
            <span
              aria-hidden='true'
              className='text-xs text-sky-600 dark:text-sky-400'
            >
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className='sm:hidden'>
              {translateSelectedOutsourcingGuideContent(
                `chapters.${chapter.key}.shortLabel`
              )}
            </span>
            <span className='hidden sm:inline'>
              {translateSelectedOutsourcingGuideContent(
                `chapters.${chapter.key}.label`
              )}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>
      <div
        ref={readingAreaRef}
        role='region'
        aria-label={t('productionOutsourcing.operationGuides.readingAreaLabel')}
        className='min-h-0 flex-1 overflow-y-auto overscroll-contain pb-6 [scrollbar-gutter:stable]'
      >
        {definition.chapters.map((chapter) => {
          const chapterPrefix = `chapters.${chapter.key}`
          const accessibleReferences = chapter.references.filter((reference) =>
            matchesPathPermissionProjection(
              user,
              productionOutsourcingOperationGuideReferencePaths[reference]
            )
          )
          return (
            <TabsContent
              key={chapter.key}
              value={chapter.key}
              className='m-0 min-w-0'
            >
              <article className='w-full min-w-0 space-y-4'>
                <h2 className='text-base leading-7 font-semibold'>
                  {translateSelectedOutsourcingGuideContent(
                    `${chapterPrefix}.title`
                  )}
                </h2>
                <p className='text-sm leading-7 text-muted-foreground'>
                  {translateSelectedOutsourcingGuideContent(
                    `${chapterPrefix}.description`
                  )}
                </p>
                <p className='flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-7 text-amber-950 dark:border-amber-800 dark:bg-amber-950/35 dark:text-amber-100'>
                  <Info aria-hidden='true' className='mt-1.5 size-4 shrink-0' />
                  {translateSelectedOutsourcingGuideContent(
                    `${chapterPrefix}.notice`
                  )}
                </p>
                <ol
                  aria-label={t(
                    'productionOutsourcing.operationGuides.stepsLabel'
                  )}
                  className='divide-y rounded-xl border bg-card px-4 sm:px-5'
                >
                  {productionOutsourcingOperationGuideStepKeys.map(
                    (step, index) => (
                      <li key={step} className='flex items-start gap-3 py-4'>
                        <span
                          aria-hidden='true'
                          className='flex size-6 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-semibold text-sky-800 dark:bg-sky-950 dark:text-sky-200'
                        >
                          {index + 1}
                        </span>
                        <div className='min-w-0 space-y-1'>
                          <h3 className='text-sm leading-6 font-semibold'>
                            {translateSelectedOutsourcingGuideContent(
                              `${chapterPrefix}.steps.${step}.title`
                            )}
                          </h3>
                          <p className='text-sm leading-7 text-muted-foreground'>
                            {translateSelectedOutsourcingGuideContent(
                              `${chapterPrefix}.steps.${step}.description`
                            )}
                          </p>
                        </div>
                      </li>
                    )
                  )}
                </ol>
                <section className='space-y-2 rounded-xl border border-sky-200 bg-sky-50/60 p-4 dark:border-sky-900 dark:bg-sky-950/25'>
                  <h3 className='text-sm font-semibold'>
                    {t('productionOutsourcing.operationGuides.exampleLabel')}
                  </h3>
                  <p className='text-sm leading-7 text-muted-foreground'>
                    {translateSelectedOutsourcingGuideContent(
                      `${chapterPrefix}.example`
                    )}
                  </p>
                </section>
                <p className='flex items-start gap-2 rounded-xl border bg-card p-4 text-sm leading-7'>
                  <CheckCircle2
                    aria-hidden='true'
                    className='mt-1.5 size-4 shrink-0 text-emerald-600'
                  />
                  {translateSelectedOutsourcingGuideContent(
                    `${chapterPrefix}.completion`
                  )}
                </p>
                {accessibleReferences.length > 0 && (
                  <nav
                    aria-label={t(
                      'productionOutsourcing.operationGuides.referenceLabel'
                    )}
                    className='flex flex-wrap gap-2'
                  >
                    {accessibleReferences.map((reference) => (
                      <Link
                        key={reference}
                        to={
                          productionOutsourcingOperationGuideReferencePaths[
                            reference
                          ]
                        }
                        className='flex items-center gap-2 rounded-lg border bg-card px-3 py-2.5 text-sm text-sky-700 focus-visible:ring-2 focus-visible:ring-ring dark:text-sky-300'
                      >
                        {t(
                          `productionOutsourcing.operationGuides.references.${reference}`
                        )}
                        <ArrowRight
                          aria-hidden='true'
                          className='size-4 shrink-0'
                        />
                      </Link>
                    ))}
                  </nav>
                )}
              </article>
            </TabsContent>
          )
        })}
      </div>
    </Tabs>
  )
}
