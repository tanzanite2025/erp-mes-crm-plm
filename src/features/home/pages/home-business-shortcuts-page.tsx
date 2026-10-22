import { useMemo } from 'react'
import { House, LayoutGrid } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { useLanguage } from '@/context/language-provider'
import { getSidebarData } from '@/components/layout/data/sidebar-data'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { HomeBusinessShortcutCategorySection } from '../components/home-business-shortcut-category-section'
import { buildHomeBusinessShortcutCategories } from '../data/build-home-business-shortcut-categories'
import { getHomeShortcutTabs } from '../home-shortcut-tabs'

export function HomeBusinessShortcutsPage() {
  const { t } = useLanguage()
  const user = useAuthStore((state) => state.user)
  const isIdentitySynced = useAuthStore((state) => state.isIdentitySynced)
  const categories = useMemo(
    () =>
      isIdentitySynced
        ? buildHomeBusinessShortcutCategories(
            user,
            getSidebarData(t).navGroups,
            t
          )
        : [],
    [isIdentitySynced, t, user]
  )

  return (
    <ModuleTabbedLayout tabs={getHomeShortcutTabs(t)}>
      <div className='flex flex-col gap-7 px-2 pb-12 md:gap-8 md:px-4'>
        <header className='space-y-2 pt-2'>
          <div className='flex items-center gap-2 text-xs font-medium tracking-widest text-muted-foreground'>
            <House aria-hidden='true' className='size-3.5' />
            {t('home.title')}
          </div>
          <h1 className='text-2xl font-semibold tracking-tight'>
            {t('home.heading')}
          </h1>
          <p className='text-sm leading-relaxed text-muted-foreground'>
            {t('home.description')}
          </p>
        </header>
        {categories.map((category) => (
          <HomeBusinessShortcutCategorySection
            key={category.id}
            category={category}
          />
        ))}
        {isIdentitySynced && categories.length === 0 && (
          <div
            role='status'
            className='rounded-2xl border border-dashed p-8 text-center'
          >
            <LayoutGrid
              aria-hidden='true'
              className='mx-auto mb-3 size-6 text-muted-foreground'
            />
            <p className='text-sm font-medium'>{t('home.emptyTitle')}</p>
            <p className='mt-2 text-sm text-muted-foreground'>
              {t('home.emptyDescription')}
            </p>
          </div>
        )}
      </div>
    </ModuleTabbedLayout>
  )
}
