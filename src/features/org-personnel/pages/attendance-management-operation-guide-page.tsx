import { useRef } from 'react'
import { BookOpen } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AttendanceManagementOperationGuideChapterExplanations } from '../components/attendance-management-operation-guide-chapter-explanations'
import { attendanceManagementOperationGuideChapters } from '../data/attendance-management-operation-guide-chapter-definitions'

export function AttendanceManagementOperationGuidePage() {
  const { t } = useLanguage()
  const readingAreaRef = useRef<HTMLDivElement>(null)

  function resetAttendanceManagementGuideChapterReadingPosition() {
    if (readingAreaRef.current) readingAreaRef.current.scrollTop = 0
  }

  return (
    <Tabs
      defaultValue='overview'
      onValueChange={resetAttendanceManagementGuideChapterReadingPosition}
      className='@container mx-2 flex h-full min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden md:mx-4'
    >
      <header className='shrink-0 space-y-2 overflow-hidden rounded-2xl border border-sky-200/70 bg-linear-to-br from-sky-50 via-background to-indigo-50 p-4 sm:space-y-3 sm:p-5 dark:border-sky-900/60 dark:from-sky-950/40 dark:to-indigo-950/30'>
        <p className='flex items-center gap-2 text-xs font-semibold text-sky-700 dark:text-sky-300'>
          <BookOpen aria-hidden='true' className='size-4 shrink-0' />
          {t('orgPersonnel.attendanceOperationGuide.domainLabel')}
        </p>
        <h1 className='text-xl font-semibold tracking-tight @3xl:text-3xl'>
          {t('orgPersonnel.attendanceOperationGuide.title')}
        </h1>
        <p className='max-w-[85ch] text-xs leading-6 text-muted-foreground sm:text-sm sm:leading-7'>
          <span className='sm:hidden'>
            {t('orgPersonnel.attendanceOperationGuide.mobileIntroduction')}
          </span>
          <span className='hidden sm:inline'>
            {t('orgPersonnel.attendanceOperationGuide.introduction')}
          </span>
        </p>
      </header>

      <TabsList
        aria-label={t('orgPersonnel.attendanceOperationGuide.contentsLabel')}
        className='grid h-auto w-full shrink-0 grid-cols-3 items-stretch gap-1 rounded-none border-b bg-transparent p-0 pb-3 sm:flex sm:flex-wrap sm:justify-start'
      >
        {attendanceManagementOperationGuideChapters.map((chapter, index) => (
          <TabsTrigger
            key={chapter.key}
            value={chapter.key}
            aria-label={t(
              `orgPersonnel.attendanceOperationGuide.chapters.${chapter.key}.label`
            )}
            className='h-full min-h-9 min-w-0 flex-none flex-col justify-start gap-1 rounded-full px-1 py-2 text-[11px] leading-4 font-medium whitespace-normal text-muted-foreground shadow-none transition-colors hover:bg-sky-50 hover:text-sky-800 data-[state=active]:bg-sky-100 data-[state=active]:text-sky-900 data-[state=active]:shadow-none sm:h-auto sm:flex-row sm:justify-center sm:gap-2 sm:px-3 sm:text-sm sm:leading-5 dark:hover:bg-sky-950/40 dark:hover:text-sky-200 dark:data-[state=active]:bg-sky-950 dark:data-[state=active]:text-sky-100'
          >
            <span
              aria-hidden='true'
              className='text-[11px] font-semibold text-sky-600/80 dark:text-sky-400'
            >
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className='min-w-0 wrap-break-word sm:hidden'>
              {t(
                `orgPersonnel.attendanceOperationGuide.chapters.${chapter.key}.shortLabel`
              )}
            </span>
            <span className='hidden sm:inline'>
              {t(
                `orgPersonnel.attendanceOperationGuide.chapters.${chapter.key}.label`
              )}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>

      <div
        ref={readingAreaRef}
        role='region'
        aria-label={t('orgPersonnel.attendanceOperationGuide.readingAreaLabel')}
        className='min-h-0 flex-1 overflow-y-auto overscroll-contain pb-6 [scrollbar-gutter:stable]'
      >
        {attendanceManagementOperationGuideChapters.map((chapter) => (
          <TabsContent
            key={chapter.key}
            value={chapter.key}
            className='m-0 min-w-0'
          >
            <AttendanceManagementOperationGuideChapterExplanations
              chapter={chapter}
            />
          </TabsContent>
        ))}
      </div>
    </Tabs>
  )
}
