import { useRef } from 'react'
import { Link } from '@tanstack/react-router'
import type { TranslationKey } from '@/locales'
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  CircleHelp,
  ClipboardList,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { matchesPathPermissionProjection } from '@/features/authz/guards/route-access'

type BusinessOperationGuideReferencePage = {
  path:
    | '/purchase/suppliers'
    | '/purchase/orders'
    | '/purchase/logistics'
    | '/materials/all'
    | '/engineering/products'
    | '/engineering/product-creation-guide'
    | '/trading/customers'
    | '/trading/sales-orders'
    | '/trading/sales-returns'
    | '/trading/sales-exchanges'
    | '/quotes/orders'
    | '/warehouse/shipment'
    | '/shipping-management/vehicle-match'
    | '/shipping-management/logistics'
    | '/finance-settlements'
  labelKey: TranslationKey
}

export type BusinessOperationGuideDefinition = {
  titleKey: TranslationKey
  domainLabelKey: TranslationKey
  introductionKey: TranslationKey
  mobileIntroductionKey: TranslationKey
  contentsLabelKey: TranslationKey
  readingAreaLabelKey: TranslationKey
  prerequisiteLabelKey: TranslationKey
  stepsLabelKey: TranslationKey
  resultLabelKey: TranslationKey
  questionLabelKey: TranslationKey
  referenceTitleKey: TranslationKey
  referenceDescriptionKey: TranslationKey
  chapters: readonly {
    key: string
    labelKey: TranslationKey
    shortLabelKey: TranslationKey
    titleKey: TranslationKey
    descriptionKey: TranslationKey
    prerequisiteKey: TranslationKey
    resultKey: TranslationKey
    questionKey: TranslationKey
    answerKey: TranslationKey
    steps: readonly {
      titleKey: TranslationKey
      descriptionKey: TranslationKey
    }[]
    referencePages: readonly BusinessOperationGuideReferencePage[]
  }[]
}

/** Shared reading layout only. Business content and operations remain domain owned. */
export function ChapteredBusinessOperationGuidePage({
  guide,
}: {
  guide: BusinessOperationGuideDefinition
}) {
  const { t } = useLanguage()
  const user = useAuthStore((state) => state.user)
  const readingAreaRef = useRef<HTMLDivElement>(null)

  function resetBusinessOperationGuideChapterReadingPosition() {
    if (readingAreaRef.current) readingAreaRef.current.scrollTop = 0
  }

  return (
    <Tabs
      defaultValue={guide.chapters[0]?.key}
      onValueChange={resetBusinessOperationGuideChapterReadingPosition}
      className='@container mx-2 flex h-full min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden md:mx-4'
    >
      <header className='shrink-0 space-y-2 overflow-hidden rounded-2xl border border-sky-200/70 bg-linear-to-br from-sky-50 via-background to-indigo-50 p-4 sm:space-y-3 sm:p-5 dark:border-sky-900/60 dark:from-sky-950/40 dark:to-indigo-950/30'>
        <p className='flex items-center gap-2 text-xs font-semibold text-sky-700 dark:text-sky-300'>
          <BookOpen aria-hidden='true' className='size-4 shrink-0' />
          {t(guide.domainLabelKey)}
        </p>
        <h1 className='text-xl font-semibold tracking-tight @3xl:text-3xl'>
          {t(guide.titleKey)}
        </h1>
        <p className='max-w-[85ch] text-xs leading-6 text-muted-foreground sm:text-sm sm:leading-7'>
          <span className='sm:hidden'>{t(guide.mobileIntroductionKey)}</span>
          <span className='hidden sm:inline'>{t(guide.introductionKey)}</span>
        </p>
      </header>

      <TabsList
        aria-label={t(guide.contentsLabelKey)}
        className='grid h-auto w-full shrink-0 grid-cols-5 items-stretch gap-1 rounded-none border-b bg-transparent p-0 pb-3 sm:flex sm:flex-wrap sm:justify-start'
      >
        {guide.chapters.map((chapter, index) => (
          <TabsTrigger
            key={chapter.key}
            value={chapter.key}
            aria-label={t(chapter.labelKey)}
            className='h-full min-h-9 min-w-0 flex-none flex-col justify-start gap-1 rounded-lg px-1 py-2 text-[11px] leading-4 font-medium whitespace-normal text-muted-foreground shadow-none transition-colors hover:bg-sky-50 hover:text-sky-800 data-[state=active]:bg-sky-100 data-[state=active]:text-sky-900 data-[state=active]:shadow-none sm:h-auto sm:flex-row sm:justify-center sm:gap-2 sm:px-3 sm:text-sm sm:leading-5 dark:hover:bg-sky-950/40 dark:hover:text-sky-200 dark:data-[state=active]:bg-sky-950 dark:data-[state=active]:text-sky-100'
          >
            <span
              aria-hidden='true'
              className='text-[11px] font-semibold text-sky-600/80 dark:text-sky-400'
            >
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className='min-w-0 wrap-break-word sm:hidden'>
              {t(chapter.shortLabelKey)}
            </span>
            <span className='hidden sm:inline'>{t(chapter.labelKey)}</span>
          </TabsTrigger>
        ))}
      </TabsList>

      <div
        ref={readingAreaRef}
        role='region'
        aria-label={t(guide.readingAreaLabelKey)}
        className='min-h-0 flex-1 overflow-y-auto overscroll-contain pb-6 [scrollbar-gutter:stable]'
      >
        {guide.chapters.map((chapter) => {
          const accessibleReferencePages = chapter.referencePages.filter(
            (reference) => matchesPathPermissionProjection(user, reference.path)
          )
          return (
            <TabsContent
              key={chapter.key}
              value={chapter.key}
              className='m-0 min-w-0'
            >
              <div
                className={cn(
                  'grid min-w-0 items-start gap-5',
                  accessibleReferencePages.length > 0 &&
                    '@5xl:grid-cols-[minmax(0,1fr)_17rem]'
                )}
              >
                <article className='min-w-0 space-y-4'>
                  <div className='space-y-2'>
                    <h2 className='text-base leading-7 font-semibold'>
                      {t(chapter.titleKey)}
                    </h2>
                    <p className='text-sm leading-7 text-muted-foreground'>
                      {t(chapter.descriptionKey)}
                    </p>
                  </div>
                  <section className='space-y-2 rounded-xl border border-sky-200 bg-sky-50/45 p-4 dark:border-sky-900 dark:bg-sky-950/20'>
                    <h3 className='flex items-center gap-2 text-sm font-semibold'>
                      <ClipboardList
                        aria-hidden='true'
                        className='size-4 shrink-0 text-sky-600 dark:text-sky-400'
                      />
                      {t(guide.prerequisiteLabelKey)}
                    </h3>
                    <p className='text-sm leading-7 text-muted-foreground'>
                      {t(chapter.prerequisiteKey)}
                    </p>
                  </section>
                  <section className='space-y-3'>
                    <h3 className='text-sm font-semibold'>
                      {t(guide.stepsLabelKey)}
                    </h3>
                    <ol className='divide-y rounded-xl border bg-card px-4 sm:px-5'>
                      {chapter.steps.map((step, index) => (
                        <li
                          key={step.titleKey}
                          className='flex items-start gap-3 py-4'
                        >
                          <span
                            aria-hidden='true'
                            className='mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-semibold text-sky-800 dark:bg-sky-950 dark:text-sky-200'
                          >
                            {index + 1}
                          </span>
                          <div className='min-w-0 space-y-1'>
                            <h4 className='text-sm leading-6 font-semibold'>
                              {t(step.titleKey)}
                            </h4>
                            <p className='text-sm leading-7 text-muted-foreground'>
                              {t(step.descriptionKey)}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </section>
                  <section className='space-y-2 rounded-xl border bg-card p-4'>
                    <h3 className='flex items-center gap-2 text-sm font-semibold'>
                      <CheckCircle2
                        aria-hidden='true'
                        className='size-4 shrink-0 text-emerald-700 dark:text-emerald-400'
                      />
                      {t(guide.resultLabelKey)}
                    </h3>
                    <p className='text-sm leading-7 text-muted-foreground'>
                      {t(chapter.resultKey)}
                    </p>
                  </section>
                  <section className='space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/35'>
                    <h3 className='flex items-center gap-2 text-sm font-semibold text-amber-950 dark:text-amber-100'>
                      <CircleHelp
                        aria-hidden='true'
                        className='size-4 shrink-0'
                      />
                      {t(guide.questionLabelKey)}
                    </h3>
                    <h4 className='text-sm leading-6 font-semibold text-amber-950 dark:text-amber-100'>
                      {t(chapter.questionKey)}
                    </h4>
                    <p className='text-sm leading-7 text-amber-900 dark:text-amber-200'>
                      {t(chapter.answerKey)}
                    </p>
                  </section>
                </article>
                {accessibleReferencePages.length > 0 && (
                  <aside className='min-w-0 space-y-3 rounded-xl border bg-card p-4'>
                    <h2 className='text-sm font-semibold'>
                      {t(guide.referenceTitleKey)}
                    </h2>
                    <p className='text-xs leading-6 text-muted-foreground'>
                      {t(guide.referenceDescriptionKey)}
                    </p>
                    <ul className='space-y-2'>
                      {accessibleReferencePages.map((reference) => (
                        <li key={reference.path}>
                          <Link
                            {...(reference.path === '/materials/all'
                              ? {
                                  to: '/materials/$category',
                                  params: { category: 'all' },
                                }
                              : { to: reference.path })}
                            className='flex items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2.5 text-sm leading-6 text-sky-700 transition-colors hover:bg-sky-50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:text-sky-300 dark:hover:bg-sky-950/40'
                          >
                            {t(reference.labelKey)}
                            <ArrowRight
                              aria-hidden='true'
                              className='size-4 shrink-0'
                            />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </aside>
                )}
              </div>
            </TabsContent>
          )
        })}
      </div>
    </Tabs>
  )
}
