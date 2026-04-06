import React from 'react'
import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useLanguage } from '@/context/language-provider'
import type {
  PermissionLabelFormatter,
  PermissionTreeNode,
  UserRightsPermission,
  UserRightsRole,
} from './user-rights-types'

type UserRightsMobileTreeProps = {
  selectedRoleId: string
  currentRole?: UserRightsRole
  isMobileSuperRole: boolean
  permissionTree: PermissionTreeNode[]
  rootActionPermissions: UserRightsPermission[]
  expandedModuleIds: string[]
  formatPermissionLabel: PermissionLabelFormatter
  onApplyPermissionTreeToggle: (roleId: string, permissionId: string) => void
  onToggleModuleExpanded: (moduleId: string) => void
  onExpandAll: () => void
  onCollapseAll: () => void
}

export function UserRightsMobileTree({
  selectedRoleId,
  currentRole,
  isMobileSuperRole,
  permissionTree,
  rootActionPermissions,
  expandedModuleIds,
  formatPermissionLabel,
  onApplyPermissionTreeToggle,
  onToggleModuleExpanded,
  onExpandAll,
  onCollapseAll,
}: UserRightsMobileTreeProps) {
  const { t } = useLanguage()

  return (
    <div className='md:hidden flex flex-col gap-4'>
      <div className='space-y-1 bg-muted/5 rounded-[24px] border border-dashed border-muted/50 p-1'>
        <div className='flex items-center gap-2 px-4 py-2 border-b border-dashed border-muted/30 mb-1'>
          <div className='size-1 rounded-full bg-primary animate-pulse' />
          <div className='flex min-w-0 flex-1 items-center justify-between gap-2'>
            <span className='text-[9px] font-black tracking-widest text-muted-foreground/50'>
              {t('systemManagement.userRights.sections.accessTree')}
            </span>
            <div className='flex items-center gap-1'>
              <Button
                type='button'
                variant='ghost'
                size='sm'
                onClick={onExpandAll}
                className='h-7 rounded-full px-2.5 text-[9px] font-black tracking-widest'
              >
                {t('systemManagement.userRights.actions.expand')}
              </Button>
              <Button
                type='button'
                variant='ghost'
                size='sm'
                onClick={onCollapseAll}
                className='h-7 rounded-full px-2.5 text-[9px] font-black tracking-widest'
              >
                {t('systemManagement.userRights.actions.collapse')}
              </Button>
            </div>
          </div>
        </div>

        <div className='divide-y divide-dashed divide-muted/30'>
          {permissionTree.map(({ module, pages, directTabs, directActions, childNodeCount }) => {
            const expanded = expandedModuleIds.includes(module.id)

            return (
              <div key={module.id} className='py-1'>
                <div
                  className={`flex items-center justify-between py-2 px-4 transition-all ${
                    currentRole?.permissions.includes(module.id) ? 'text-primary' : 'text-foreground'
                  }`}
                >
                  <div className='flex min-w-0 flex-1 items-start gap-1.5 pr-3'>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      onClick={() => onToggleModuleExpanded(module.id)}
                      className='mt-0.5 size-7 shrink-0 rounded-full'
                      aria-label={`${expanded
                        ? t('systemManagement.userRights.actions.collapse')
                        : t('systemManagement.userRights.actions.expand')}${formatPermissionLabel(module.label)}`}
                    >
                      <ChevronRight
                        className={`size-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
                      />
                    </Button>
                    <div className='min-w-0 flex-1'>
                      <div className='text-[10px] font-black tracking-tighter leading-none'>
                        {t('systemManagement.userRights.kinds.module')} /{' '}
                        {formatPermissionLabel(module.label)}
                      </div>
                      <div className='text-[8px] text-muted-foreground/50 mt-0.5 leading-none font-medium'>
                        {module.path || module.desc}
                      </div>
                      <div className='text-[8px] text-muted-foreground/45 mt-1 leading-none font-bold tracking-wide'>
                        {expanded
                          ? t('systemManagement.userRights.status.expanded', {
                              count: childNodeCount,
                            })
                          : t('systemManagement.userRights.status.collapsedShort', {
                              count: childNodeCount,
                            })}
                      </div>
                    </div>
                  </div>
                  <Checkbox
                    checked={currentRole?.permissions.includes(module.id)}
                    disabled={isMobileSuperRole}
                    onCheckedChange={() =>
                      !isMobileSuperRole && onApplyPermissionTreeToggle(selectedRoleId, module.id)
                    }
                    className='size-3.5 rounded-[4px] border-muted-foreground/20'
                  />
                </div>

                {expanded &&
                  pages.map(({ page, tabs }) => (
                    <React.Fragment key={page.id}>
                      <div
                        onClick={() => !isMobileSuperRole && onApplyPermissionTreeToggle(selectedRoleId, page.id)}
                        className={`flex items-center justify-between py-2 px-6 transition-all active:bg-primary/5 ${
                          currentRole?.permissions.includes(page.id) ? 'text-primary' : 'text-foreground'
                        }`}
                      >
                        <div className='flex-1 pr-6 flex flex-col justify-center'>
                          <div className='text-[10px] font-bold tracking-tighter leading-none'>
                            {t('systemManagement.userRights.kinds.page')} /{' '}
                            {formatPermissionLabel(page.label)}
                          </div>
                          <div className='text-[8px] text-muted-foreground/50 mt-0.5 leading-none font-medium truncate max-w-[220px]'>
                            {page.path || page.desc}
                          </div>
                        </div>
                        <Checkbox
                          checked={currentRole?.permissions.includes(page.id)}
                          disabled={isMobileSuperRole}
                          onCheckedChange={() =>
                            !isMobileSuperRole && onApplyPermissionTreeToggle(selectedRoleId, page.id)
                          }
                          className='size-3.5 rounded-[4px] border-muted-foreground/20'
                        />
                      </div>

                      {tabs.map((tab) => (
                        <div
                          key={tab.id}
                          onClick={() => !isMobileSuperRole && onApplyPermissionTreeToggle(selectedRoleId, tab.id)}
                          className={`flex items-center justify-between py-2 px-8 transition-all active:bg-primary/5 ${
                            currentRole?.permissions.includes(tab.id) ? 'text-primary' : 'text-foreground'
                          }`}
                        >
                          <div className='flex-1 pr-6 flex flex-col justify-center'>
                            <div className='text-[10px] font-semibold tracking-tighter leading-none'>
                              {t('systemManagement.userRights.kinds.tab')} /{' '}
                              {formatPermissionLabel(tab.label)}
                            </div>
                            <div className='text-[8px] text-muted-foreground/50 mt-0.5 leading-none font-medium truncate max-w-[210px]'>
                              {tab.path || tab.desc}
                            </div>
                          </div>
                          <Checkbox
                            checked={currentRole?.permissions.includes(tab.id)}
                            disabled={isMobileSuperRole}
                            onCheckedChange={() =>
                              !isMobileSuperRole && onApplyPermissionTreeToggle(selectedRoleId, tab.id)
                            }
                            className='size-3.5 rounded-[4px] border-muted-foreground/20'
                          />
                        </div>
                      ))}
                    </React.Fragment>
                  ))}

                {expanded &&
                  directTabs.map((tab) => (
                    <div
                      key={tab.id}
                      onClick={() => !isMobileSuperRole && onApplyPermissionTreeToggle(selectedRoleId, tab.id)}
                      className={`flex items-center justify-between py-2 px-6 transition-all active:bg-primary/5 ${
                        currentRole?.permissions.includes(tab.id) ? 'text-primary' : 'text-foreground'
                      }`}
                    >
                      <div className='flex-1 pr-6 flex flex-col justify-center'>
                        <div className='text-[10px] font-semibold tracking-tighter leading-none'>
                          {t('systemManagement.userRights.kinds.tab')} /{' '}
                          {formatPermissionLabel(tab.label)}
                        </div>
                        <div className='text-[8px] text-muted-foreground/50 mt-0.5 leading-none font-medium truncate max-w-[220px]'>
                          {tab.path || tab.desc}
                        </div>
                      </div>
                      <Checkbox
                        checked={currentRole?.permissions.includes(tab.id)}
                        disabled={isMobileSuperRole}
                        onCheckedChange={() =>
                          !isMobileSuperRole && onApplyPermissionTreeToggle(selectedRoleId, tab.id)
                        }
                        className='size-3.5 rounded-[4px] border-muted-foreground/20'
                      />
                    </div>
                  ))}

                {expanded &&
                  directActions.map((action) => (
                    <div
                      key={action.id}
                      onClick={() => !isMobileSuperRole && onApplyPermissionTreeToggle(selectedRoleId, action.id)}
                      className={`flex items-center justify-between py-2 px-6 transition-all active:bg-primary/5 ${
                        currentRole?.permissions.includes(action.id) ? 'text-primary' : 'text-foreground'
                      }`}
                    >
                      <div className='flex-1 pr-6 flex flex-col justify-center'>
                        <div className='text-[10px] font-semibold tracking-tighter leading-none'>
                          {t('systemManagement.userRights.kinds.action')} /{' '}
                          {formatPermissionLabel(action.label)}
                        </div>
                        <div className='text-[8px] text-muted-foreground/50 mt-0.5 leading-none font-medium truncate max-w-[220px]'>
                          {action.desc}
                        </div>
                      </div>
                      <Checkbox
                        checked={currentRole?.permissions.includes(action.id)}
                        disabled={isMobileSuperRole}
                        onCheckedChange={() =>
                          !isMobileSuperRole && onApplyPermissionTreeToggle(selectedRoleId, action.id)
                        }
                        className='size-3.5 rounded-[4px] border-muted-foreground/20'
                      />
                    </div>
                  ))}
              </div>
            )
          })}
        </div>
      </div>

      {rootActionPermissions.length > 0 && (
        <div className='space-y-1 bg-muted/5 rounded-[24px] border border-dashed border-muted/50 p-1'>
          <div className='flex items-center gap-2 px-4 py-2 border-b border-dashed border-muted/30 mb-1'>
            <div className='size-1 rounded-full bg-primary animate-pulse' />
            <span className='text-[9px] font-black tracking-widest text-muted-foreground/50'>
              {t('systemManagement.userRights.sections.moduleActions')}
            </span>
          </div>
          <div className='divide-y divide-dashed divide-muted/30'>
            {rootActionPermissions.map((perm) => (
              <div
                key={perm.id}
                onClick={() => !isMobileSuperRole && onApplyPermissionTreeToggle(selectedRoleId, perm.id)}
                className={`flex items-center justify-between py-1.5 px-4 transition-all active:bg-primary/5 ${
                  currentRole?.permissions.includes(perm.id) ? 'text-primary' : 'text-foreground'
                }`}
              >
                <div className='flex-1 pr-6 flex flex-col justify-center'>
                  <div className='text-[10px] font-black italic tracking-tighter leading-none'>
                    {perm.label}
                  </div>
                  <div className='text-[8px] text-muted-foreground/50 mt-0.5 leading-none font-medium truncate max-w-[220px]'>
                    {perm.desc}
                  </div>
                </div>
                <Checkbox
                  checked={currentRole?.permissions.includes(perm.id)}
                  disabled={isMobileSuperRole}
                  onCheckedChange={() =>
                    !isMobileSuperRole && onApplyPermissionTreeToggle(selectedRoleId, perm.id)
                  }
                  className='size-3.5 rounded-[4px] border-muted-foreground/20'
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
