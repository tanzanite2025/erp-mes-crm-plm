import { Link } from '@tanstack/react-router'
import { ArrowRight, Info } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { useLanguage } from '@/context/language-provider'
import { matchesPathPermissionProjection } from '@/features/authz/guards/route-access'
import {
  type ProductionMaterialCreationOperationGuideChapter,
  productionMaterialCreationOperationGuideConversionFieldKeys,
  productionMaterialCreationOperationGuideGloveExampleKeys,
  productionMaterialCreationOperationGuideMaterialFieldKeys,
  productionMaterialCreationOperationGuideReferencePages,
} from '../data/production-material-creation-operation-guide-chapter-definitions'

/** Explanations and permitted links; business forms and writes remain in their original pages. */
export function ProductionMaterialCreationOperationGuideChapterExplanations({
  chapter,
}: {
  chapter: ProductionMaterialCreationOperationGuideChapter
}) {
  const { t } = useLanguage()
  const user = useAuthStore((state) => state.user)
  const accessibleReferenceKeys = chapter.referenceKeys.filter((key) =>
    matchesPathPermissionProjection(
      user,
      productionMaterialCreationOperationGuideReferencePages[key]
    )
  )

  return (
    <div className='grid min-w-0 items-start gap-5 @5xl:grid-cols-[minmax(0,1fr)_17rem]'>
      <article className='min-w-0 space-y-4'>
        <div className='space-y-2'>
          <h2 className='text-base leading-7 font-semibold'>
            {t(`materialArchive.operationGuide.chapters.${chapter.key}.title`)}
          </h2>
          <p className='text-sm leading-7 text-muted-foreground'>
            {t(
              `materialArchive.operationGuide.chapters.${chapter.key}.description`
            )}
          </p>
        </div>
        <section className='space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/35'>
          <h3 className='flex items-start gap-2 text-sm leading-6 font-semibold text-amber-950 dark:text-amber-100'>
            <Info aria-hidden='true' className='mt-1 size-4 shrink-0' />
            {t(
              `materialArchive.operationGuide.chapters.${chapter.key}.noticeTitle`
            )}
          </h3>
          <p className='text-sm leading-7 text-amber-900 dark:text-amber-200'>
            {t(
              `materialArchive.operationGuide.chapters.${chapter.key}.noticeDescription`
            )}
          </p>
        </section>
        <ProductionMaterialCreationOperationGuideExampleTable
          chapterKey={chapter.key}
        />
        <dl className='divide-y rounded-xl border bg-card px-4 sm:px-5'>
          {chapter.topics.map((topic) => (
            <div key={topic} className='space-y-2 py-4'>
              <dt className='text-sm leading-6 font-semibold'>
                {t(`materialArchive.operationGuide.topics.${topic}.title`)}
              </dt>
              <dd className='text-sm leading-7 text-muted-foreground'>
                {t(
                  `materialArchive.operationGuide.topics.${topic}.description`
                )}
              </dd>
            </div>
          ))}
        </dl>
      </article>
      {accessibleReferenceKeys.length > 0 && (
        <aside className='min-w-0 space-y-3 rounded-xl border bg-card p-4'>
          <h2 className='text-sm font-semibold'>
            {t('materialArchive.operationGuide.referenceTitle')}
          </h2>
          <p className='text-xs leading-6 text-muted-foreground'>
            {t('materialArchive.operationGuide.referenceDescription')}
          </p>
          <ul className='space-y-2'>
            {accessibleReferenceKeys.map((key) => (
              <li key={key}>
                <Link
                  {...(key === 'materials'
                    ? {
                        to: '/materials/$category',
                        params: { category: 'all' },
                      }
                    : {
                        to: productionMaterialCreationOperationGuideReferencePages[
                          key
                        ],
                      })}
                  className='flex items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2.5 text-sm leading-6 text-sky-700 transition-colors hover:bg-sky-50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:text-sky-300 dark:hover:bg-sky-950/40'
                >
                  {t(`materialArchive.operationGuide.references.${key}`)}
                  <ArrowRight aria-hidden='true' className='size-4 shrink-0' />
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </div>
  )
}

function ProductionMaterialCreationOperationGuideExampleTable({
  chapterKey,
}: {
  chapterKey: ProductionMaterialCreationOperationGuideChapter['key']
}) {
  const { t } = useLanguage()
  const fieldHeaderKeys = ['field', 'value', 'explanation'] as const
  const exampleHeaderKeys = ['step', 'value', 'explanation'] as const
  const table =
    chapterKey === 'record'
      ? {
          title: t('materialArchive.operationGuide.materialFields.title'),
          headers: fieldHeaderKeys.map((key) =>
            t(`materialArchive.operationGuide.materialFields.headers.${key}`)
          ),
          rows: productionMaterialCreationOperationGuideMaterialFieldKeys.map(
            (key) => ({
              key,
              field: t(
                `materialArchive.operationGuide.materialFields.${key}.field`
              ),
              value: t(
                `materialArchive.operationGuide.materialFields.${key}.value`
              ),
              explanation: t(
                `materialArchive.operationGuide.materialFields.${key}.explanation`
              ),
            })
          ),
        }
      : chapterKey === 'conversion'
        ? {
            title: t('materialArchive.operationGuide.conversionFields.title'),
            headers: fieldHeaderKeys.map((key) =>
              t(
                `materialArchive.operationGuide.conversionFields.headers.${key}`
              )
            ),
            rows: productionMaterialCreationOperationGuideConversionFieldKeys.map(
              (key) => ({
                key,
                field: t(
                  `materialArchive.operationGuide.conversionFields.${key}.field`
                ),
                value: t(
                  `materialArchive.operationGuide.conversionFields.${key}.value`
                ),
                explanation: t(
                  `materialArchive.operationGuide.conversionFields.${key}.explanation`
                ),
              })
            ),
          }
        : chapterKey === 'gloveExample'
          ? {
              title: t('materialArchive.operationGuide.gloveExample.title'),
              headers: exampleHeaderKeys.map((key) =>
                t(`materialArchive.operationGuide.gloveExample.headers.${key}`)
              ),
              rows: productionMaterialCreationOperationGuideGloveExampleKeys.map(
                (key) => ({
                  key,
                  field: t(
                    `materialArchive.operationGuide.gloveExample.${key}.field`
                  ),
                  value: t(
                    `materialArchive.operationGuide.gloveExample.${key}.value`
                  ),
                  explanation: t(
                    `materialArchive.operationGuide.gloveExample.${key}.explanation`
                  ),
                })
              ),
            }
          : null
  if (!table) return null

  return (
    <div className='overflow-hidden rounded-xl border bg-card'>
      <table className='w-full table-fixed text-left text-xs leading-6 sm:text-sm'>
        <caption className='border-b bg-sky-50/60 px-4 py-3 text-left text-sm font-semibold dark:bg-sky-950/30'>
          {table.title}
        </caption>
        <thead className='bg-muted/40'>
          <tr>
            {table.headers.map((header, index) => (
              <th
                key={header}
                scope='col'
                className={`px-3 py-2 align-top font-semibold ${index === 0 ? 'w-[24%]' : index === 1 ? 'w-[32%]' : ''}`}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className='divide-y'>
          {table.rows.map((row) => (
            <tr key={row.key}>
              <th
                scope='row'
                className='px-3 py-3 align-top font-medium wrap-break-word'
              >
                {row.field}
              </th>
              <td className='px-3 py-3 align-top font-medium wrap-break-word text-sky-800 dark:text-sky-200'>
                {row.value}
              </td>
              <td className='px-3 py-3 align-top wrap-break-word text-muted-foreground'>
                {row.explanation}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
