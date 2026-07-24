import {
  FilePenLine,
  GitBranchPlus,
  MoreVertical,
  Pencil,
  Plus,
  Power,
  Trash2,
  Workflow,
} from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { LineMindmapToolbarProps } from '../types'

export function LineMindmapToolbar({
  activeLine,
  activeLineIsActive,
  canManageLine,
  canUpdateLine,
  isCheckingPermissions,
  lineOptions,
  resolvedLineId,
  selectedNode,
  title,
  onCreateLevel1,
  onCreateLevel2,
  onCreateLevel3,
  onDeleteLine,
  onEditLine,
  onToggleLine,
  onEditNode,
  onSelectLine,
}: LineMindmapToolbarProps) {
  const { t } = useLanguage()
  const lineActionLabel = activeLineIsActive
    ? '停用当前 L1'
    : '启用当前 L1'

  return (
    <Card className='sticky top-0 z-30 rounded-[20px] border border-dashed border-muted/35 bg-background shadow-sm'>
      <CardContent className='overflow-x-auto p-2'>
        <div className='flex min-w-max items-center gap-1.5 whitespace-nowrap'>
          <span className='shrink-0 text-[10px] font-black tracking-tighter text-foreground uppercase italic'>
            {title}
          </span>
          <span className='text-[8px] font-black tracking-widest text-muted-foreground/55 uppercase'>
            当前 L1
          </span>
          <Select
            value={resolvedLineId || undefined}
            onValueChange={onSelectLine}
          >
            <SelectTrigger className='h-8 w-[200px] shrink-0 rounded-2xl border-none bg-background/80 px-3 text-[9px] font-black shadow-none sm:w-[220px]'>
              <SelectValue placeholder='选择要查看的 L1' />
            </SelectTrigger>
            <SelectContent>
              {lineOptions.map((lineOption) => (
                <SelectItem
                  key={lineOption.id}
                  value={lineOption.id}
                  className='text-[9px] font-black'
                >
                  {lineOption.label} · {lineOption.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type='button'
            variant='outline'
            className='h-8 shrink-0 rounded-full border-dashed px-3 text-[8px] font-black tracking-widest uppercase'
            onClick={onCreateLevel1}
            disabled={isCheckingPermissions || !canManageLine}
            title={
              canManageLine
                ? '新增 L1'
                : t('productionArchitecture.mindmap.actions.noManagePermission')
            }
          >
            <Plus className='size-3.5' /> 新增 L1
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type='button'
                variant='outline'
                size='icon'
                className='size-8 shrink-0 rounded-full border-dashed'
                disabled={isCheckingPermissions || !activeLine}
                title='当前 L1 操作'
              >
                <MoreVertical className='size-3.5' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align='start'
              className='rounded-[20px] border border-dashed border-muted/40 bg-background/95 p-1 shadow-2xl'
            >
              <DropdownMenuItem
                onClick={onEditLine}
                disabled={!canUpdateLine}
                className='cursor-pointer gap-2 rounded-xl px-4 py-3 text-[10px] font-black tracking-widest uppercase'
                title={
                  canUpdateLine
                    ? '编辑 L1'
                    : t(
                        'productionArchitecture.mindmap.actions.noUpdatePermission'
                      )
                }
              >
                <Pencil className='size-3.5 text-cyan-600' />
                编辑 L1
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onToggleLine}
                disabled={!canUpdateLine}
                className='cursor-pointer gap-2 rounded-xl px-4 py-3 text-[10px] font-black tracking-widest uppercase'
                title={
                  canUpdateLine
                    ? lineActionLabel
                    : t(
                        'productionArchitecture.mindmap.actions.noStatusPermission'
                      )
                }
              >
                <Power className='size-3.5 text-emerald-600' />
                {lineActionLabel}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onDeleteLine}
                disabled={!canManageLine}
                className='cursor-pointer gap-2 rounded-xl px-4 py-3 text-[10px] font-black tracking-widest text-rose-600 uppercase focus:text-rose-600'
                title={
                  canManageLine
                    ? '删除当前 L1'
                    : t(
                        'productionArchitecture.mindmap.actions.noManagePermission'
                      )
                }
              >
                <Trash2 className='size-3.5' />
                删除当前 L1
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            type='button'
            className='h-8 shrink-0 rounded-full px-3 text-[8px] font-black tracking-widest uppercase'
            onClick={onCreateLevel2}
            disabled={isCheckingPermissions || !activeLine || !canUpdateLine}
            title={
              canUpdateLine
                ? '新增 L2'
                : t('productionArchitecture.mindmap.actions.noUpdatePermission')
            }
          >
            <GitBranchPlus className='size-3.5' /> 新增 L2
          </Button>
          <Button
            type='button'
            variant='outline'
            className='h-8 shrink-0 rounded-full border-dashed px-3 text-[8px] font-black tracking-widest uppercase'
            onClick={onCreateLevel3}
            disabled={isCheckingPermissions || !activeLine || !canUpdateLine}
            title={
              canUpdateLine
                ? '新增 L3'
                : t('productionArchitecture.mindmap.actions.noUpdatePermission')
            }
          >
            <Workflow className='size-3.5' /> 新增 L3
          </Button>
          <Button
            type='button'
            variant='outline'
            className='h-8 shrink-0 rounded-full border-dashed px-3 text-[8px] font-black tracking-widest uppercase'
            onClick={onEditNode}
            disabled={isCheckingPermissions || !selectedNode || !canUpdateLine}
            title={
              canUpdateLine
                ? t('productionArchitecture.mindmap.actions.editNode')
                : t('productionArchitecture.mindmap.actions.noUpdatePermission')
            }
          >
            <FilePenLine className='size-3.5' />{' '}
            {t('productionArchitecture.mindmap.actions.editNode')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
