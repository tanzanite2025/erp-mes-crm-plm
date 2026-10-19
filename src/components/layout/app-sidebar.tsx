import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from '@tanstack/react-router'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { useLayout } from '@/context/layout-provider'
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  DEFAULT_ENTERPRISE_LOGO_URL,
  EnterpriseService,
} from '@/features/basic-settings/services/enterprise-service'
import { DesktopSidebarSecondaryNavigation } from './desktop-sidebar-secondary-navigation'
import { NavGroup } from './nav-group'
import { SidebarBrand } from './sidebar-brand'
import { useSidebarNavigationModel } from './sidebar-navigation-model'
import { useSidebarActiveCenter } from './use-sidebar-active-center'
import { useSidebarCategorySelection } from './use-sidebar-category-selection'

export function AppSidebar() {
  const { collapsible, variant } = useLayout()
  const { t } = useLanguage()
  const pathname = useLocation({ select: (location) => location.pathname })
  const { isMobile, openMobile, state, secondaryOpen, setSecondaryOpen } =
    useSidebar()
  const {
    sidebarData: localizedSidebarData,
    renderedNavGroups,
    categoryDirectories,
  } = useSidebarNavigationModel()
  const [brand, setBrand] = useState({
    name: localizedSidebarData.teams[0].name,
    plan: localizedSidebarData.teams[0].plan,
    logoUrl: DEFAULT_ENTERPRISE_LOGO_URL,
  })
  const { activePath, selectedCategoryId, selectSidebarCategory } =
    useSidebarCategorySelection(renderedNavGroups, pathname)
  const navViewportRef = useRef<HTMLDivElement>(null)

  /**
   * 品牌信息加载：对接后端 EnterpriseService，移除 StorageService 依赖。
   */
  const defaultPlan = localizedSidebarData.teams[0].plan
  const defaultName = localizedSidebarData.teams[0].name
  const loadBrand = useCallback(async () => {
    const config = await EnterpriseService.getConfig().catch(() => null)

    // 如果 config 为空（请求失败），则不更新
    if (!config) {
      return
    }

    setTimeout(() => {
      setBrand({
        name: config.name ?? defaultName,
        plan: config.plan ?? defaultPlan,
        logoUrl: config.logoUrl ?? DEFAULT_ENTERPRISE_LOGO_URL,
      })
    }, 0)
  }, [defaultPlan, defaultName])

  useEffect(() => {
    void loadBrand()

    // 监听企业信息更新事件 (由 EnterpriseMgmt 触发)
    const handleSync = () => {
      void loadBrand()
    }

    window.addEventListener('xdfc_enterprise_config_updated', handleSync)
    return () => {
      window.removeEventListener('xdfc_enterprise_config_updated', handleSync)
    }
  }, [loadBrand])

  const activeTeam = {
    ...localizedSidebarData.teams[0],
    name: brand.name,
    plan: brand.plan,
    logoUrl: brand.logoUrl,
  }

  const sidebarIsVisible = isMobile
    ? openMobile
    : collapsible === 'none' || state === 'expanded'
  const selectedCategory = categoryDirectories.find(
    (category) => category.id === selectedCategoryId
  )

  function activateDesktopSidebarCategory(categoryId: string) {
    selectSidebarCategory(categoryId)
    setSecondaryOpen(true)
  }

  useSidebarActiveCenter({
    viewportRef: navViewportRef,
    activePathKey: activePath?.key,
    enabled: sidebarIsVisible,
  })

  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <div className='sidebar-navigation-columns'>
        <div className='sidebar-primary-navigation'>
          <SidebarHeader className='shrink-0'>
            <SidebarBrand team={activeTeam} />
          </SidebarHeader>
          <SidebarContent className='min-h-0 overflow-hidden'>
            <div
              ref={navViewportRef}
              data-sidebar-nav-viewport
              className='min-h-0 flex-1 overflow-x-hidden overflow-y-auto [overflow-anchor:none] [scrollbar-width:thin]'
            >
              <nav
                aria-label={t('sidebar.navigation.categories')}
                className='sidebar-primary-category-list flex w-full flex-col py-1'
              >
                {renderedNavGroups.map((props) => (
                  <NavGroup
                    key={props.id}
                    {...props}
                    onDesktopCategoryActivate={activateDesktopSidebarCategory}
                    selectedCategoryId={
                      secondaryOpen ? selectedCategoryId : null
                    }
                  />
                ))}
              </nav>
            </div>
          </SidebarContent>
          {!isMobile && selectedCategory ? (
            <div className='shrink-0 border-t border-sidebar-border p-2'>
              <button
                type='button'
                className='desktop-sidebar-secondary-toggle'
                aria-expanded={secondaryOpen}
                aria-controls={
                  secondaryOpen
                    ? 'desktop-sidebar-secondary-navigation'
                    : undefined
                }
                onClick={() => setSecondaryOpen(!secondaryOpen)}
              >
                {secondaryOpen ? (
                  <PanelLeftClose className='size-4 shrink-0' />
                ) : (
                  <PanelLeftOpen className='size-4 shrink-0' />
                )}
                <span>
                  {t(
                    secondaryOpen
                      ? 'sidebar.navigation.collapseDirectory'
                      : 'sidebar.navigation.expandDirectory'
                  )}
                </span>
              </button>
            </div>
          ) : null}
        </div>
        {!isMobile && secondaryOpen ? (
          selectedCategory ? (
            <DesktopSidebarSecondaryNavigation
              key={selectedCategory.id}
              category={selectedCategory}
              pathname={pathname}
            />
          ) : (
            <div className='desktop-sidebar-secondary-navigation p-4 text-sm text-muted-foreground'>
              {t('sidebar.navigation.noAvailableEntries')}
            </div>
          )
        ) : null}
      </div>
    </Sidebar>
  )
}
