import { useRef } from 'react'
import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  BookOpen,
  Box,
  GitBranch,
  Image,
  Layers,
  LayoutTemplate,
  ListChecks,
  MapPin,
  Search,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { matchesPathPermissionProjection } from '@/features/authz/guards/route-access'
import { ProductAndBOMResponsibilityGuideWithBusinessEntryActions } from '@/features/product-structure/components/bom-creation-guide/product-and-bom-responsibility-guide-with-business-entry-actions'
import { ProductCreationOperationGuideLauncher } from '../components/product-creation-guide/product-creation-operation-guide-launcher'
import { productCreationOperationGuideStepKeys } from '../data/product-creation-operation-guide-step-definitions'

const productCreationHandbookReferenceTopics = [
  {
    key: 'template',
    icon: LayoutTemplate,
    href: '/engineering/templates',
    pageLabelKey: 'engineering.tabs.templates',
  },
  {
    key: 'attributes',
    icon: Layers,
    href: '/engineering/templates',
    pageLabelKey: 'engineering.tabs.templates',
  },
  {
    key: 'appearance',
    icon: Image,
    href: '/engineering/product-appearance',
    pageLabelKey: 'engineering.tabs.productAppearance',
  },
] as const

const productCreationHandbookProductRecordSections = [
  { key: 'identity', icon: Box },
  { key: 'specifications', icon: ListChecks },
  { key: 'supportingInformation', icon: Image },
  { key: 'bom', icon: Layers },
] as const
const productCreationHandbookDisplayMappings = [
  'classification',
  'productCard',
  'namePreview',
  'productAttributes',
  'bomAttributes',
] as const
const productCreationHandbookContents = [
  'productRecord',
  'classification',
  'workflow',
  'displayMapping',
  'references',
] as const

export function ProductCreationOperationGuidePage() {
  const { t } = useLanguage()
  const user = useAuthStore((state) => state.user)
  const readingAreaRef = useRef<HTMLDivElement>(null)
  const canAccessProducts = matchesPathPermissionProjection(
    user,
    '/engineering/products'
  )

  function resetProductCreationHandbookChapterReadingPosition() {
    if (readingAreaRef.current) readingAreaRef.current.scrollTop = 0
  }

  return (
    <Tabs
      defaultValue='productRecord'
      onValueChange={resetProductCreationHandbookChapterReadingPosition}
      className='@container mx-2 flex h-full min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden md:mx-4'
    >
      <header className='shrink-0 overflow-hidden rounded-2xl border border-sky-200/70 bg-linear-to-br from-sky-50 via-background to-indigo-50 p-3 sm:p-5 dark:border-sky-900/60 dark:from-sky-950/40 dark:to-indigo-950/30'>
        <div className='flex flex-col items-start justify-between gap-3 @3xl:flex-row @3xl:items-center'>
          <div className='max-w-3xl min-w-0 space-y-2'>
            <p className='flex items-center gap-2 text-xs font-semibold tracking-wide text-sky-700 dark:text-sky-300'>
              <BookOpen aria-hidden='true' className='size-4' />
              {t('engineering.productCreationGuide.domainLabel')}
            </p>
            <h1 className='text-xl font-semibold tracking-tight @3xl:text-3xl'>
              {t('engineering.productCreationGuide.title')}
            </h1>
            <p className='max-w-[66ch] text-xs leading-6 text-muted-foreground sm:text-sm sm:leading-7'>
              {t(
                'engineering.productCreationGuide.handbook.readingIntroduction'
              )}
            </p>
          </div>
          <div className='w-full space-y-2 @3xl:w-auto @3xl:shrink-0'>
            <div className='flex flex-wrap items-center gap-2'>
              <ProductCreationOperationGuideLauncher className='inline-flex min-h-9 min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-sky-700 px-2 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-sky-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 @sm:flex-none @sm:px-5 @sm:text-sm dark:bg-sky-500 dark:text-sky-950 dark:hover:bg-sky-400'>
                {t('engineering.productCreationGuide.openWizard')}
                <ArrowRight
                  aria-hidden='true'
                  className='hidden size-4 shrink-0 @sm:block'
                />
              </ProductCreationOperationGuideLauncher>
              {canAccessProducts && (
                <Button
                  asChild
                  variant='outline'
                  className='h-auto min-h-9 min-w-0 flex-1 rounded-full border-sky-200 bg-background/80 px-2 py-2 text-xs whitespace-normal text-sky-800 @sm:flex-none @sm:px-5 @sm:text-sm dark:border-sky-800 dark:text-sky-200'
                >
                  <Link to='/engineering/products'>
                    <Search
                      aria-hidden='true'
                      className='hidden size-4 @sm:block'
                    />
                    {t(
                      'engineering.productCreationGuide.handbook.viewExistingProducts'
                    )}
                  </Link>
                </Button>
              )}
            </div>
            {canAccessProducts && (
              <p className='hidden text-xs leading-5 text-muted-foreground sm:block'>
                {t(
                  'engineering.productCreationGuide.handbook.existingProductsHint'
                )}
              </p>
            )}
          </div>
        </div>
      </header>

      <TabsList
        aria-label={t(
          'engineering.productCreationGuide.handbook.contentsLabel'
        )}
        className='grid h-auto w-full shrink-0 grid-cols-5 items-stretch gap-1 rounded-none border-b bg-transparent p-0 pb-3 sm:flex sm:flex-wrap sm:justify-start'
      >
        {productCreationHandbookContents.map((sectionKey, index) => (
          <TabsTrigger
            key={sectionKey}
            value={sectionKey}
            aria-label={t(
              `engineering.productCreationGuide.handbook.sections.${sectionKey}`
            )}
            className='h-full min-h-9 min-w-0 flex-none flex-col justify-start gap-1 rounded-lg px-1 py-2 text-[11px] leading-4 font-medium whitespace-normal text-muted-foreground shadow-none transition-colors hover:bg-sky-50 hover:text-sky-800 data-[state=active]:bg-sky-100 data-[state=active]:text-sky-900 data-[state=active]:shadow-none sm:h-auto sm:flex-row sm:justify-center sm:gap-2 sm:px-3 sm:text-sm sm:leading-5 dark:hover:bg-sky-950/40 dark:hover:text-sky-200 dark:data-[state=active]:border-transparent dark:data-[state=active]:bg-sky-950 dark:data-[state=active]:text-sky-100'
          >
            <span
              aria-hidden='true'
              className='text-[11px] font-semibold text-sky-600/80 dark:text-sky-400'
            >
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className='min-w-0 wrap-break-word sm:hidden'>
              {t(
                `engineering.productCreationGuide.handbook.shortSectionLabels.${sectionKey}`
              )}
            </span>
            <span className='hidden sm:inline'>
              {t(
                `engineering.productCreationGuide.handbook.sections.${sectionKey}`
              )}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>

      <div
        ref={readingAreaRef}
        role='region'
        aria-label={t(
          'engineering.productCreationGuide.handbook.readingAreaLabel'
        )}
        className='min-h-0 flex-1 overflow-y-auto overscroll-contain pb-16 [scrollbar-gutter:stable]'
      >
        <TabsContent value='productRecord' className='m-0 min-w-0'>
          <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
            <h2
              id='product-creation-handbook-product-record-title'
              className='flex items-center gap-3 text-base font-semibold'
            >
              <span
                aria-hidden='true'
                className='text-xs font-semibold text-sky-600 dark:text-sky-400'
              >
                01
              </span>
              {t(
                'engineering.productCreationGuide.handbook.productRecordTitle'
              )}
            </h2>
            {canAccessProducts && (
              <Button
                asChild
                variant='link'
                size='sm'
                className='h-auto p-0 text-sky-700 dark:text-sky-300'
              >
                <Link to='/engineering/products'>
                  {t('engineering.productCreationGuide.handbook.viewPage', {
                    page: t('engineering.tabs.products'),
                  })}
                  <ArrowRight aria-hidden='true' className='size-3.5' />
                </Link>
              </Button>
            )}
          </div>
          <p className='mb-4 text-sm leading-7 text-muted-foreground'>
            {t('engineering.productCreationGuide.handbook.introduction')}
          </p>
          <div className='mb-5'>
            <ProductAndBOMResponsibilityGuideWithBusinessEntryActions />
          </div>
          <dl className='grid gap-3 @xl:grid-cols-2'>
            {productCreationHandbookProductRecordSections.map((section) => (
              <div key={section.key} className='rounded-xl border bg-card p-4'>
                <dt className='mb-2 flex items-center gap-2 text-sm font-semibold'>
                  <section.icon
                    aria-hidden='true'
                    className='size-4 shrink-0 text-sky-600 dark:text-sky-400'
                  />
                  {t(
                    `engineering.productCreationGuide.handbook.productRecord.${section.key}.title`
                  )}
                </dt>
                <dd className='text-sm leading-7 text-muted-foreground'>
                  {t(
                    `engineering.productCreationGuide.handbook.productRecord.${section.key}.description`
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </TabsContent>

        <TabsContent value='classification' className='m-0 min-w-0'>
          <h2
            id='product-creation-handbook-classification-title'
            className='mb-4 flex items-center gap-3 text-base font-semibold'
          >
            <span
              aria-hidden='true'
              className='text-xs font-semibold text-sky-600 dark:text-sky-400'
            >
              02
            </span>
            {t(
              'engineering.productCreationGuide.handbook.classificationExample.title'
            )}
          </h2>
          <div className='space-y-4 rounded-xl border bg-card p-4 sm:p-5'>
            <ol className='flex flex-wrap gap-2 text-xs leading-6 text-muted-foreground'>
              {(['levelOne', 'levelTwo', 'levelThree'] as const).map(
                (levelKey, index) => (
                  <li
                    key={levelKey}
                    className='flex min-w-0 items-center gap-2'
                  >
                    {index > 0 && (
                      <ArrowRight
                        aria-hidden='true'
                        className='size-3 shrink-0'
                      />
                    )}
                    <span
                      className={
                        index === 2
                          ? 'rounded-md bg-sky-100 px-2.5 py-1 font-semibold text-sky-800 dark:bg-sky-950 dark:text-sky-200'
                          : 'rounded-md bg-muted/50 px-2.5 py-1'
                      }
                    >
                      {t(
                        `engineering.productCreationGuide.handbook.classificationExample.${levelKey}`
                      )}
                    </span>
                  </li>
                )
              )}
            </ol>
            <div className='space-y-3 border-l-2 border-sky-200 pl-4 dark:border-sky-900'>
              <p className='flex items-center gap-2 text-xs font-medium text-muted-foreground'>
                <GitBranch
                  aria-hidden='true'
                  className='size-3.5 shrink-0 text-sky-600 dark:text-sky-400'
                />
                {t(
                  'engineering.productCreationGuide.handbook.classificationExample.productsLabel'
                )}
              </p>
              <ul className='grid gap-2 @sm:grid-cols-2'>
                {(['discBrake', 'rimBrake'] as const).map((exampleKey) => (
                  <li
                    key={exampleKey}
                    className='flex items-center gap-3 rounded-xl border border-sky-200/80 bg-sky-50/70 p-3 text-sm font-semibold text-sky-950 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100'
                  >
                    <Box
                      aria-hidden='true'
                      className='size-5 shrink-0 text-sky-600 dark:text-sky-400'
                    />
                    {t(
                      `engineering.productCreationGuide.handbook.classificationExample.${exampleKey}`
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <p className='text-sm leading-7 text-muted-foreground'>
              {t(
                'engineering.productCreationGuide.handbook.classificationExample.description'
              )}
            </p>
          </div>
        </TabsContent>

        <TabsContent
          value='workflow'
          className='m-0 min-w-0 rounded-2xl border border-sky-200/70 bg-sky-50/45 p-4 sm:p-5 dark:border-sky-900/60 dark:bg-sky-950/20'
        >
          <p className='mb-3 text-xs font-semibold text-sky-700 dark:text-sky-300'>
            <span aria-hidden='true' className='mr-2'>
              03
            </span>
            {t('engineering.productCreationGuide.handbook.sections.workflow')}
          </p>
          <h2
            id='product-creation-handbook-wizard-title'
            className='text-base leading-7 font-semibold'
          >
            {t('engineering.productCreationGuide.handbook.workflowTitle')}
          </h2>
          <ol className='mt-5 grid gap-5 @2xl:grid-cols-2'>
            {productCreationOperationGuideStepKeys.map((stepKey, index) => (
              <li key={stepKey} className='flex items-start gap-3'>
                <span className='flex size-7 shrink-0 items-center justify-center rounded-full border border-sky-200 bg-background text-xs font-semibold text-sky-700 dark:border-sky-800 dark:text-sky-300'>
                  {index + 1}
                </span>
                <div className='min-w-0 space-y-1.5'>
                  <p className='text-sm font-semibold'>
                    {t(
                      `engineering.productCreationGuide.stepLabels.${stepKey}`
                    )}
                  </p>
                  <p className='text-xs leading-6 text-muted-foreground'>
                    {t(
                      `engineering.productCreationGuide.handbook.workflowSteps.${stepKey}`
                    )}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <p className='mt-5 border-t border-sky-200/70 pt-4 text-xs leading-6 text-muted-foreground dark:border-sky-900/60'>
            {t('engineering.productCreationGuide.handbook.workflowHint')}
          </p>
        </TabsContent>

        <TabsContent value='displayMapping' className='m-0 min-w-0'>
          <h2
            id='product-creation-handbook-display-mapping-title'
            className='flex items-center gap-3 text-base font-semibold'
          >
            <span
              aria-hidden='true'
              className='text-xs font-semibold text-sky-600 dark:text-sky-400'
            >
              04
            </span>
            {t(
              'engineering.productCreationGuide.handbook.displayMapping.title'
            )}
          </h2>
          <p className='mt-2 text-sm leading-7 text-muted-foreground'>
            {t(
              'engineering.productCreationGuide.handbook.displayMapping.description'
            )}
          </p>
          <dl className='mt-4 divide-y rounded-xl border bg-card px-4 sm:px-5'>
            {productCreationHandbookDisplayMappings.map((mappingKey) => (
              <div
                key={mappingKey}
                className='grid gap-2.5 py-4 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,3fr)] @3xl:gap-5'
              >
                <dt className='text-sm leading-7 font-semibold'>
                  {t(
                    `engineering.productCreationGuide.handbook.displayMapping.rows.${mappingKey}.display`
                  )}
                </dt>
                <dd className='min-w-0 space-y-3 text-sm leading-7 text-muted-foreground'>
                  <p>
                    {t(
                      `engineering.productCreationGuide.handbook.displayMapping.rows.${mappingKey}.meaning`
                    )}
                  </p>
                  <div className='rounded-lg bg-muted/45 px-3 py-2.5'>
                    <p className='mb-1 flex items-center gap-1.5 text-xs font-medium text-foreground'>
                      <MapPin
                        aria-hidden='true'
                        className='size-3.5 shrink-0 text-sky-600 dark:text-sky-400'
                      />
                      {t(
                        'engineering.productCreationGuide.handbook.displayMapping.columns.location'
                      )}
                    </p>
                    <p className='text-xs leading-6'>
                      {t(
                        `engineering.productCreationGuide.handbook.displayMapping.rows.${mappingKey}.location`
                      )}
                    </p>
                  </div>
                </dd>
              </div>
            ))}
          </dl>
          <p className='mt-3 rounded-lg border-l-2 border-sky-300 bg-sky-50/60 px-4 py-3 text-xs leading-6 text-muted-foreground dark:border-sky-700 dark:bg-sky-950/25'>
            {t(
              'engineering.productCreationGuide.handbook.displayMapping.unboundHint'
            )}
          </p>
        </TabsContent>

        <TabsContent value='references' className='m-0 min-w-0'>
          <h2
            id='product-creation-handbook-references-title'
            className='mb-4 flex items-center gap-3 text-base font-semibold'
          >
            <span
              aria-hidden='true'
              className='text-xs font-semibold text-sky-600 dark:text-sky-400'
            >
              05
            </span>
            {t('engineering.productCreationGuide.handbook.referenceTitle')}
          </h2>
          <div className='divide-y rounded-xl border bg-card px-4 sm:px-5'>
            {productCreationHandbookReferenceTopics.map((topic) => (
              <section
                key={topic.key}
                aria-labelledby={`product-creation-handbook-${topic.key}-title`}
                className='min-w-0 py-4'
              >
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <h3
                    id={`product-creation-handbook-${topic.key}-title`}
                    className='flex items-center gap-2 text-sm font-semibold'
                  >
                    <topic.icon
                      aria-hidden='true'
                      className='size-4 shrink-0 text-sky-600 dark:text-sky-400'
                    />
                    {t(
                      `engineering.productCreationGuide.handbook.topics.${topic.key}.title`
                    )}
                  </h3>
                  {matchesPathPermissionProjection(user, topic.href) && (
                    <Button
                      asChild
                      variant='link'
                      size='sm'
                      className='h-auto p-0 text-xs text-sky-700 dark:text-sky-300'
                    >
                      <Link to={topic.href}>
                        {t(
                          'engineering.productCreationGuide.handbook.viewPage',
                          { page: t(topic.pageLabelKey) }
                        )}
                        <ArrowRight aria-hidden='true' className='size-3.5' />
                      </Link>
                    </Button>
                  )}
                </div>
                <p className='mt-2 text-sm leading-7 text-muted-foreground'>
                  {t(
                    `engineering.productCreationGuide.handbook.topics.${topic.key}.description`
                  )}
                </p>
                <ul className='mt-2 grid list-disc gap-2 pl-4 text-xs leading-6 text-muted-foreground @3xl:grid-cols-2 @3xl:gap-5'>
                  {(['first', 'second'] as const).map((itemKey) => (
                    <li key={itemKey}>
                      {t(
                        `engineering.productCreationGuide.handbook.topics.${topic.key}.${itemKey}`
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </TabsContent>
      </div>
    </Tabs>
  )
}
