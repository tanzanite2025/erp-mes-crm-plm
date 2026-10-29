import { Link } from '@tanstack/react-router'
import { ArrowRight, CheckCircle2, Info } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { useLanguage } from '@/context/language-provider'
import { matchesPathPermissionProjection } from '@/features/authz/guards/route-access'
import {
  type AttendanceManagementOperationGuideChapter,
  attendanceManagementOperationGuideReferencePages,
} from '../data/attendance-management-operation-guide-chapter-definitions'
import { LeaveRequestCreationLauncher } from './leave-request-creation-launcher'

export function AttendanceManagementOperationGuideChapterExplanations({
  chapter,
}: {
  chapter: AttendanceManagementOperationGuideChapter
}) {
  const { t } = useLanguage()
  const user = useAuthStore((state) => state.user)
  const accessibleReferenceKeys = chapter.referenceKeys.filter((key) =>
    matchesPathPermissionProjection(
      user,
      attendanceManagementOperationGuideReferencePages[key]
    )
  )

  return (
    <div className='grid min-w-0 items-start gap-5 @5xl:grid-cols-[minmax(0,1fr)_17rem]'>
      <article className='min-w-0 space-y-4'>
        <div className='space-y-2'>
          <h2 className='text-base leading-7 font-semibold'>
            {t(
              `orgPersonnel.attendanceOperationGuide.chapters.${chapter.key}.title`
            )}
          </h2>
          <p className='text-sm leading-7 text-muted-foreground'>
            {t(
              `orgPersonnel.attendanceOperationGuide.chapters.${chapter.key}.description`
            )}
          </p>
          {chapter.key === 'leave' && <LeaveRequestCreationLauncher />}
        </div>
        <section className='space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/35'>
          <h3 className='flex items-start gap-2 text-sm leading-6 font-semibold text-amber-950 dark:text-amber-100'>
            <Info aria-hidden='true' className='mt-1 size-4 shrink-0' />
            {t(
              `orgPersonnel.attendanceOperationGuide.chapters.${chapter.key}.noticeTitle`
            )}
          </h3>
          <p className='text-sm leading-7 text-amber-900 dark:text-amber-200'>
            {t(
              `orgPersonnel.attendanceOperationGuide.chapters.${chapter.key}.noticeDescription`
            )}
          </p>
        </section>

        <section
          aria-label={t('orgPersonnel.attendanceOperationGuide.stepsLabel')}
        >
          <dl className='divide-y rounded-xl border bg-card px-4 sm:px-5'>
            {chapter.topics.map((topic) => (
              <div key={topic} className='space-y-2 py-4'>
                <dt className='text-sm leading-6 font-semibold'>
                  {t(
                    `orgPersonnel.attendanceOperationGuide.topics.${topic}.title`
                  )}
                </dt>
                <dd className='text-sm leading-7 text-muted-foreground'>
                  {t(
                    `orgPersonnel.attendanceOperationGuide.topics.${topic}.description`
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>
        <section className='space-y-2 rounded-xl border border-sky-200 bg-sky-50/60 p-4 dark:border-sky-900 dark:bg-sky-950/25'>
          <h3 className='text-sm leading-6 font-semibold'>
            {t('orgPersonnel.attendanceOperationGuide.exampleLabel')}
          </h3>
          <p className='text-sm leading-7 text-muted-foreground'>
            {t(
              `orgPersonnel.attendanceOperationGuide.chapters.${chapter.key}.example`
            )}
          </p>
        </section>
        <section className='space-y-2 rounded-xl border bg-card p-4'>
          <h3 className='flex items-center gap-2 text-sm leading-6 font-semibold'>
            <CheckCircle2
              aria-hidden='true'
              className='size-4 shrink-0 text-emerald-600'
            />
            {t('orgPersonnel.attendanceOperationGuide.completionLabel')}
          </h3>
          <p className='text-sm leading-7 text-muted-foreground'>
            {t(
              `orgPersonnel.attendanceOperationGuide.chapters.${chapter.key}.completion`
            )}
          </p>
        </section>
      </article>

      {accessibleReferenceKeys.length > 0 && (
        <aside className='min-w-0 space-y-3 rounded-xl border bg-card p-4'>
          <h2 className='text-sm font-semibold'>
            {t('orgPersonnel.attendanceOperationGuide.referenceTitle')}
          </h2>
          <p className='text-xs leading-6 text-muted-foreground'>
            {t('orgPersonnel.attendanceOperationGuide.referenceDescription')}
          </p>
          <ul className='space-y-2'>
            {accessibleReferenceKeys.map((key) => (
              <li key={key}>
                <Link
                  to={attendanceManagementOperationGuideReferencePages[key]}
                  className='flex items-center justify-between gap-2 rounded-full border bg-background px-3 py-2.5 text-sm leading-6 text-sky-700 transition-colors hover:bg-sky-50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:text-sky-300 dark:hover:bg-sky-950/40'
                >
                  {t(`orgPersonnel.attendanceOperationGuide.references.${key}`)}
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
