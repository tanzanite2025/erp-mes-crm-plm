import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import type { Permission } from '@/features/authz/data/permission-schema'
import type {
  PermissionPageNode,
  PermissionTreeNode,
} from '@/features/authz/utils/permission-tree-types'
import { formatPermissionLabel } from '@/features/authz/utils/permission-tree-utils'
import {
  collectModulePermissionIDs,
  collectPagePermissionIDs,
} from '../utils/user-permission-tree'

type UserPermissionTreeProps = {
  columns: PermissionTreeNode[][]
  visibleTreeCount: number
  isLoading: boolean
  expandedModuleIDs: string[]
  effectivePermissionIDSet: ReadonlySet<string>
  inheritedPermissionIDSet: ReadonlySet<string>
  onToggleModule: (moduleID: string) => void
  onTogglePermissionIDs: (permissionIDs: string[]) => void
}

type PermissionLeafRowProps = {
  permission: Permission
  kind: 'tab' | 'action'
  emphasized?: boolean
  effectivePermissionIDSet: ReadonlySet<string>
  inheritedPermissionIDSet: ReadonlySet<string>
  onTogglePermissionIDs: (permissionIDs: string[]) => void
}

function PermissionLeafRow({
  permission,
  kind,
  emphasized = false,
  effectivePermissionIDSet,
  inheritedPermissionIDSet,
  onTogglePermissionIDs,
}: PermissionLeafRowProps) {
  const { t } = useLanguage()
  const permissionID = permission.id.toLowerCase()
  const inherited = inheritedPermissionIDSet.has(permissionID)

  return (
    <div
      className={
        emphasized
          ? 'flex items-start justify-between gap-2 rounded-lg border border-dashed border-muted/30 p-2.5'
          : 'flex items-start justify-between gap-2 py-1 pl-3'
      }
    >
      <div className='min-w-0'>
        <div
          className={
            emphasized
              ? 'text-[10px] leading-tight font-black sm:text-sm'
              : 'text-[10px] leading-tight sm:text-sm'
          }
        >
          {t(`users.permissionAssignments.tree.${kind}`)} /{' '}
          {formatPermissionLabel(permission.label)}
          {inherited
            ? ` / ${t('users.permissionAssignments.tree.inherited')}`
            : ''}
        </div>
        <div className='text-[9px] leading-snug text-muted-foreground sm:text-xs'>
          {permission.path || permission.desc}
        </div>
      </div>
      <Checkbox
        checked={effectivePermissionIDSet.has(permissionID)}
        disabled={inherited}
        onCheckedChange={() => onTogglePermissionIDs([permission.id])}
      />
    </div>
  )
}

type PermissionPageProps = {
  pageNode: PermissionPageNode
  effectivePermissionIDSet: ReadonlySet<string>
  inheritedPermissionIDSet: ReadonlySet<string>
  onTogglePermissionIDs: (permissionIDs: string[]) => void
}

function PermissionPage({
  pageNode,
  effectivePermissionIDSet,
  inheritedPermissionIDSet,
  onTogglePermissionIDs,
}: PermissionPageProps) {
  const { t } = useLanguage()
  const pagePermissionIDs = collectPagePermissionIDs(pageNode)
  const pageChecked = pagePermissionIDs.every((permissionID) =>
    effectivePermissionIDSet.has(permissionID.toLowerCase())
  )
  const pageAssignablePermissionIDs = pagePermissionIDs.filter(
    (permissionID) => !inheritedPermissionIDSet.has(permissionID.toLowerCase())
  )

  return (
    <div className='space-y-1.5 rounded-lg border border-dashed border-muted/30 p-2.5'>
      <div className='flex items-start justify-between gap-2'>
        <div className='min-w-0'>
          <div className='text-[10px] leading-tight font-black sm:text-sm'>
            {t('users.permissionAssignments.tree.page')} /{' '}
            {formatPermissionLabel(pageNode.page.label)}
          </div>
          <div className='text-[9px] leading-snug text-muted-foreground sm:text-xs'>
            {pageNode.page.path || pageNode.page.desc}
          </div>
        </div>
        <Checkbox
          checked={pageChecked}
          disabled={pageAssignablePermissionIDs.length === 0}
          onCheckedChange={() =>
            onTogglePermissionIDs(pageAssignablePermissionIDs)
          }
        />
      </div>
      {pageNode.tabs.map((tab) => (
        <PermissionLeafRow
          key={tab.id}
          permission={tab}
          kind='tab'
          effectivePermissionIDSet={effectivePermissionIDSet}
          inheritedPermissionIDSet={inheritedPermissionIDSet}
          onTogglePermissionIDs={onTogglePermissionIDs}
        />
      ))}
    </div>
  )
}

type PermissionModuleProps = {
  node: PermissionTreeNode
  expanded: boolean
  effectivePermissionIDSet: ReadonlySet<string>
  inheritedPermissionIDSet: ReadonlySet<string>
  onToggleModule: (moduleID: string) => void
  onTogglePermissionIDs: (permissionIDs: string[]) => void
}

function PermissionModule({
  node,
  expanded,
  effectivePermissionIDSet,
  inheritedPermissionIDSet,
  onToggleModule,
  onTogglePermissionIDs,
}: PermissionModuleProps) {
  const { t } = useLanguage()
  const modulePermissionIDs = collectModulePermissionIDs(node)
  const moduleChecked = modulePermissionIDs.every((permissionID) =>
    effectivePermissionIDSet.has(permissionID.toLowerCase())
  )
  const moduleAssignablePermissionIDs = modulePermissionIDs.filter(
    (permissionID) => !inheritedPermissionIDSet.has(permissionID.toLowerCase())
  )

  return (
    <div className='rounded-xl border border-dashed border-muted/30 bg-background p-2.5 sm:p-3'>
      <div className='flex items-start justify-between gap-2'>
        <div className='min-w-0 space-y-0.5'>
          <div className='text-[11px] leading-tight font-black tracking-tight sm:text-sm'>
            {formatPermissionLabel(node.module.label)}
          </div>
          <div className='text-[9px] leading-snug text-muted-foreground sm:text-xs'>
            {node.module.desc}
          </div>
        </div>
        <div className='flex shrink-0 items-center gap-2'>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            className='h-7 rounded-full px-2 text-[9px] font-black tracking-[0.12em] uppercase sm:text-[10px]'
            onClick={() => onToggleModule(node.module.id)}
          >
            {expanded
              ? t('users.permissionAssignments.actions.collapse')
              : t('users.permissionAssignments.actions.expand')}
          </Button>
          <Checkbox
            checked={moduleChecked}
            disabled={moduleAssignablePermissionIDs.length === 0}
            onCheckedChange={() =>
              onTogglePermissionIDs(moduleAssignablePermissionIDs)
            }
          />
        </div>
      </div>

      {expanded ? (
        <div className='mt-3 space-y-2'>
          {node.pages.map((pageNode) => (
            <PermissionPage
              key={pageNode.page.id}
              pageNode={pageNode}
              effectivePermissionIDSet={effectivePermissionIDSet}
              inheritedPermissionIDSet={inheritedPermissionIDSet}
              onTogglePermissionIDs={onTogglePermissionIDs}
            />
          ))}
          {node.directTabs.map((tab) => (
            <PermissionLeafRow
              key={tab.id}
              permission={tab}
              kind='tab'
              emphasized
              effectivePermissionIDSet={effectivePermissionIDSet}
              inheritedPermissionIDSet={inheritedPermissionIDSet}
              onTogglePermissionIDs={onTogglePermissionIDs}
            />
          ))}
          {node.directActions.map((action) => (
            <PermissionLeafRow
              key={action.id}
              permission={action}
              kind='action'
              emphasized
              effectivePermissionIDSet={effectivePermissionIDSet}
              inheritedPermissionIDSet={inheritedPermissionIDSet}
              onTogglePermissionIDs={onTogglePermissionIDs}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function UserPermissionTree({
  columns,
  visibleTreeCount,
  isLoading,
  expandedModuleIDs,
  effectivePermissionIDSet,
  inheritedPermissionIDSet,
  onToggleModule,
  onTogglePermissionIDs,
}: UserPermissionTreeProps) {
  const { t } = useLanguage()

  return (
    <div className='space-y-2 rounded-2xl border border-dashed border-muted/40 bg-muted/10 p-2.5 sm:p-3 xl:flex xl:min-h-0 xl:flex-1 xl:flex-col'>
      <div className='shrink-0 text-[10px] font-black tracking-[0.12em] text-muted-foreground/60 uppercase sm:tracking-widest'>
        {t('users.permissionAssignments.tree.title')}
      </div>
      {isLoading ? (
        <div className='py-6 text-center text-[10px] font-black tracking-[0.12em] text-muted-foreground/45 uppercase'>
          {t('users.permissionAssignments.loading')}
        </div>
      ) : visibleTreeCount === 0 ? (
        <div className='py-6 text-center text-[10px] font-black tracking-[0.12em] text-muted-foreground/45 uppercase'>
          {t('users.permissionAssignments.tree.empty')}
        </div>
      ) : (
        <div className='grid gap-2 xl:min-h-0 xl:flex-1 xl:grid-cols-3 xl:items-start xl:overflow-y-auto xl:pr-1'>
          {columns.map((columnNodes, columnIndex) => (
            <div key={columnIndex} className='space-y-2'>
              {columnNodes.map((node) => (
                <PermissionModule
                  key={node.module.id}
                  node={node}
                  expanded={expandedModuleIDs.includes(node.module.id)}
                  effectivePermissionIDSet={effectivePermissionIDSet}
                  inheritedPermissionIDSet={inheritedPermissionIDSet}
                  onToggleModule={onToggleModule}
                  onTogglePermissionIDs={onTogglePermissionIDs}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
