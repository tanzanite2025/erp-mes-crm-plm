import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import type {
  SidebarCategoryDomainLink,
  SidebarCategoryPreview,
} from './sidebar-category-scrubber-utils'

type DesktopSidebarSecondaryNavigationProps = {
  category: SidebarCategoryPreview
  pathname: string
}

export function DesktopSidebarSecondaryNavigation({
  category,
  pathname,
}: DesktopSidebarSecondaryNavigationProps) {
  const { t } = useLanguage()
  // AppSidebar keys this component by category: every category starts expanded.
  const [collapsedModuleIds, setCollapsedModuleIds] = useState<Set<string>>(
    () => new Set()
  )
  const allEntries = [
    ...category.directLinks,
    ...category.sections.flatMap((section) => section.links),
  ].flatMap((link) => (link.tabs.length ? link.tabs : [link]))
  const activeEntryUrl = allEntries
    .filter(
      (entry) =>
        pathname === entry.url ||
        (entry.url !== '/' && pathname.startsWith(entry.url + '/'))
    )
    .sort((left, right) => right.url.length - left.url.length)[0]?.url

  function toggleSidebarModuleExpansion(moduleId: string) {
    setCollapsedModuleIds((currentCollapsedModuleIds) => {
      const nextCollapsedModuleIds = new Set(currentCollapsedModuleIds)
      if (nextCollapsedModuleIds.has(moduleId)) {
        nextCollapsedModuleIds.delete(moduleId)
      } else {
        nextCollapsedModuleIds.add(moduleId)
      }
      return nextCollapsedModuleIds
    })
  }

  const directoryLinkProps = {
    categoryId: category.id,
    activeEntryUrl,
    collapsedModuleIds,
    onToggleModule: toggleSidebarModuleExpansion,
  }

  return (
    <nav
      id='desktop-sidebar-secondary-navigation'
      aria-label={category.title}
      className='desktop-sidebar-secondary-navigation'
    >
      <div
        className='desktop-sidebar-directory-scroll'
        data-sidebar-secondary-viewport
      >
        <div className='desktop-sidebar-directory-content p-3'>
          <DesktopSidebarDirectoryLinks
            links={category.directLinks}
            {...directoryLinkProps}
          />
          {category.sections.map((section) => (
            <section key={section.id} aria-label={section.title}>
              <h2 className='mb-2 px-2 text-xs font-semibold text-muted-foreground'>
                {section.title}
              </h2>
              <DesktopSidebarDirectoryLinks
                links={section.links}
                {...directoryLinkProps}
              />
            </section>
          ))}
          {!category.directLinks.length && !category.sections.length ? (
            <p
              role='status'
              className='px-2 py-6 text-sm text-muted-foreground'
            >
              {t('sidebar.navigation.noAvailableEntries')}
            </p>
          ) : null}
        </div>
      </div>
    </nav>
  )
}

function DesktopSidebarDirectoryLinks({
  links,
  categoryId,
  activeEntryUrl,
  collapsedModuleIds,
  onToggleModule,
}: {
  links: SidebarCategoryDomainLink[]
  categoryId: string
  activeEntryUrl?: string
  collapsedModuleIds: ReadonlySet<string>
  onToggleModule: (moduleId: string) => void
}) {
  if (!links.length) return null
  return (
    <ul className='desktop-sidebar-directory-modules'>
      {links.map((link) => {
        const isExpanded = !collapsedModuleIds.has(link.id)
        const containsCurrentPage = link.tabs.some(
          (tab) => tab.url === activeEntryUrl
        )
        const panelId = `desktop-sidebar-module-${categoryId}-${link.id}`
        const moduleContents = (
          <>
            {link.icon ? (
              <link.icon className='size-4 shrink-0' aria-hidden='true' />
            ) : null}
            <span className='min-w-0 flex-1 break-words'>{link.title}</span>
            {link.badge ? (
              <span className='shrink-0 text-xs'>{link.badge}</span>
            ) : null}
          </>
        )
        return (
          <li key={link.id}>
            {link.tabs.length ? (
              <>
                <button
                  type='button'
                  className='desktop-sidebar-directory-link font-semibold'
                  aria-expanded={isExpanded}
                  aria-controls={panelId}
                  data-sidebar-active-path={containsCurrentPage}
                  onClick={() => onToggleModule(link.id)}
                >
                  {moduleContents}
                  {containsCurrentPage ? (
                    <span
                      className='desktop-sidebar-current-category-marker'
                      aria-hidden='true'
                    />
                  ) : null}
                  <ChevronRight
                    className={`size-4 shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
                    aria-hidden='true'
                  />
                </button>
                <ul
                  id={panelId}
                  hidden={!isExpanded}
                  className='desktop-sidebar-directory-entries'
                >
                  {link.tabs.map((tab) => (
                    <li key={tab.id}>
                      <Link
                        to={tab.url}
                        className='desktop-sidebar-directory-link'
                        aria-current={
                          tab.url === activeEntryUrl ? 'page' : undefined
                        }
                      >
                        {tab.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <Link
                to={link.url}
                className='desktop-sidebar-directory-link'
                aria-current={link.url === activeEntryUrl ? 'page' : undefined}
              >
                {moduleContents}
              </Link>
            )}
          </li>
        )
      })}
    </ul>
  )
}
