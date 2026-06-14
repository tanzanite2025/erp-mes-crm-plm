import { ArrowRightLeft, Check, ChevronsUpDown, Settings2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { type MaterialOption } from '../data/schema'
import {
  buildPackagingRuleRelation,
  type PackagingRuleDraft,
} from '../utils/packaging-rule-draft'

interface MaterialAssemblyRuleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isComboboxOpen: boolean
  onComboboxOpenChange: (open: boolean) => void
  editingRule: PackagingRuleDraft | null
  selectedMaterial: MaterialOption | null
  materialOptions: MaterialOption[]
  onSelectMaterial: (material: MaterialOption) => void
  onPackUnitChange: (value: string) => void
  onFactorChange: (value: string) => void
  onToggleDirection: () => void
  onCancel: () => void
  onConfirm: () => void
  isSubmitting: boolean
}

/** Renders the packaging rule editor dialog for the material assembly manager. */
export function MaterialAssemblyRuleDialog({
  open,
  onOpenChange,
  isComboboxOpen,
  onComboboxOpenChange,
  editingRule,
  selectedMaterial,
  materialOptions,
  onSelectMaterial,
  onPackUnitChange,
  onFactorChange,
  onToggleDirection,
  onCancel,
  onConfirm,
  isSubmitting,
}: MaterialAssemblyRuleDialogProps) {
  const { t } = useLanguage()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='overflow-hidden rounded-[32px] border-none bg-background p-0 shadow-2xl sm:max-w-[550px]'>
        <div className='pointer-events-none absolute inset-0 bg-linear-to-br from-primary/5 via-transparent' />
        <div className='relative max-h-[90vh] overflow-y-auto p-8'>
          <DialogHeader className='mb-8'>
            <DialogTitle className='flex items-center gap-2 text-lg font-black tracking-tighter text-primary italic'>
              <Settings2 className='size-5' />
              {t('materialArchive.assemblyManager.dialog.title')}
            </DialogTitle>
            <DialogDescription className='text-[9px] font-black tracking-widest text-muted-foreground/60 opacity-60'>
              {t('materialArchive.assemblyManager.dialog.description')}
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-8'>
            <div className='space-y-4'>
              <Label className='mb-2 block text-[10px] font-black tracking-widest text-muted-foreground/60'>
                {t('materialArchive.assemblyManager.dialog.materialLabel')}
              </Label>
              <Popover
                open={isComboboxOpen}
                onOpenChange={onComboboxOpenChange}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant='outline'
                    role='combobox'
                    className='h-12 w-full justify-between rounded-2xl border-none bg-muted/50 px-5 font-bold shadow-sm transition-all hover:bg-muted/70'
                  >
                    <span className='truncate'>
                      {selectedMaterial
                        ? `${selectedMaterial.name} (${selectedMaterial.code})`
                        : t(
                            'materialArchive.assemblyManager.dialog.materialPlaceholder'
                          )}
                    </span>
                    <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className='w-[486px] overflow-hidden rounded-2xl border-none p-0 shadow-2xl'
                  align='start'
                >
                  <Command className='rounded-2xl'>
                    <CommandInput
                      placeholder={t(
                        'materialArchive.assemblyManager.dialog.searchMaterialsPlaceholder'
                      )}
                      className='h-12 border-none'
                    />
                    <CommandList className='max-h-[300px]'>
                      <CommandEmpty>
                        {t(
                          'materialArchive.assemblyManager.dialog.noMaterialFound'
                        )}
                      </CommandEmpty>
                      <CommandGroup>
                        {materialOptions.slice(0, 50).map((material) => (
                          <CommandItem
                            key={material.id}
                            value={`${material.name} ${material.code} ${material.spec || ''}`}
                            onSelect={() => onSelectMaterial(material)}
                            className='flex cursor-pointer items-center justify-between px-5 py-4 transition-colors hover:bg-muted/50'
                          >
                            <div className='flex flex-col gap-1'>
                              <div className='flex items-center gap-2'>
                                <span className='text-sm font-bold tracking-tight'>
                                  {material.name}
                                </span>
                                {material.spec ? (
                                  <Badge
                                    variant='outline'
                                    className='h-4 rounded-full border-none bg-muted/20 px-2 text-[8px] font-black tracking-widest text-muted-foreground'
                                  >
                                    {material.spec}
                                  </Badge>
                                ) : null}
                              </div>
                              <span className='text-[10px] font-black tracking-widest text-muted-foreground/40'>
                                {t(
                                  'materialArchive.assemblyManager.dialog.materialMeta',
                                  {
                                    code: material.code,
                                    unit: material.uom,
                                  }
                                )}
                              </span>
                            </div>
                            <Check
                              className={cn(
                                'h-4 w-4 text-primary transition-opacity',
                                editingRule?.materialId === material.id
                                  ? 'opacity-100'
                                  : 'opacity-0'
                              )}
                            />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className='space-y-4'>
              <Label className='block pl-1 text-[10px] font-black tracking-widest text-muted-foreground/60'>
                {t('materialArchive.assemblyManager.dialog.packagingLabel')}
              </Label>
              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label
                    htmlFor='packUnit'
                    className='block pl-1 text-[8px] font-black tracking-widest text-primary/60'
                  >
                    {t('materialArchive.assemblyManager.dialog.packUnitLabel')}
                  </Label>
                  <Input
                    id='packUnit'
                    placeholder={t(
                      'materialArchive.assemblyManager.dialog.packUnitPlaceholder'
                    )}
                    className='h-12 rounded-2xl border-none bg-muted/50 font-bold shadow-sm'
                    value={editingRule?.packUnit || ''}
                    onChange={(event) => onPackUnitChange(event.target.value)}
                  />
                </div>
                <div className='space-y-2'>
                  <Label
                    htmlFor='baseUnit'
                    className='block pl-1 text-[8px] font-black tracking-widest text-muted-foreground/60'
                  >
                    {t('materialArchive.assemblyManager.dialog.baseUnitLabel')}
                  </Label>
                  <Input
                    id='baseUnit'
                    readOnly
                    disabled
                    className='h-12 rounded-2xl border-none bg-muted/20 font-mono font-black text-primary/30 italic'
                    value={editingRule?.baseUnit || ''}
                  />
                </div>
              </div>
            </div>

            <div className='space-y-4'>
              <div className='flex items-center justify-between'>
                <Label
                  htmlFor='factor'
                  className='block text-[10px] font-black tracking-widest text-muted-foreground/60'
                >
                  {t('materialArchive.assemblyManager.dialog.factorLabel')}
                </Label>
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  className='h-7 rounded-full border border-dashed border-primary/20 px-4 text-[10px] font-black tracking-widest transition-all hover:bg-primary/10 hover:text-primary'
                  onClick={onToggleDirection}
                >
                  <ArrowRightLeft className='size-3' />
                  {t('materialArchive.assemblyManager.dialog.switchDirection')}
                </Button>
              </div>
              <div className='flex flex-col gap-6'>
                <div className='flex items-center gap-4'>
                  <div className='relative flex-1'>
                    <Input
                      id='factor'
                      type='number'
                      step='any'
                      className='h-16 rounded-[24px] border-none bg-muted/50 text-center font-mono text-2xl font-black shadow-inner focus-visible:ring-primary'
                      value={editingRule?.conversionFactor ?? 1}
                      onChange={(event) => onFactorChange(event.target.value)}
                    />
                  </div>
                  <div className='relative flex-[1.5] overflow-hidden rounded-[24px] border border-dashed border-primary/10 bg-primary/5 p-5 shadow-inner'>
                    <div className='flex flex-col items-center justify-center'>
                      <span className='mb-3 text-[10px] font-black tracking-widest text-muted-foreground/50'>
                        {t(
                          'materialArchive.assemblyManager.dialog.previewTitle'
                        )}
                      </span>
                      <div className='flex items-center gap-4'>
                        {editingRule?.direction !== 'reverse' ? (
                          <>
                            <span className='text-xl font-black tracking-tighter text-primary'>
                              1 {editingRule?.packUnit || '?'}
                            </span>
                            <span className='text-xs font-black text-muted-foreground/30'>
                              =
                            </span>
                            <span className='text-xl font-black tracking-tighter'>
                              {editingRule?.conversionFactor || '?'}{' '}
                              {editingRule?.baseUnit || '?'}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className='text-xl font-black tracking-tighter text-primary'>
                              1 {editingRule?.baseUnit || '?'}
                            </span>
                            <span className='text-xs font-black text-muted-foreground/30'>
                              =
                            </span>
                            <span className='text-xl font-black tracking-tighter'>
                              {editingRule?.conversionFactor || '?'}{' '}
                              {editingRule?.packUnit || '?'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className='rounded-2xl border border-dashed border-rose-500/10 bg-rose-500/5 p-4'>
                  <p className='flex items-center gap-2 text-[10px] font-black tracking-widest text-rose-600'>
                    <span className='size-2 animate-pulse rounded-full bg-rose-500' />
                    {t(
                      'materialArchive.assemblyManager.dialog.verificationRequired'
                    )}
                  </p>
                  <p className='mt-2 ml-4 text-[10px] font-bold text-muted-foreground'>
                    {t(
                      'materialArchive.assemblyManager.dialog.currentRelation',
                      {
                        relation: buildPackagingRuleRelation(editingRule),
                      }
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className='flex items-center justify-between gap-4 bg-transparent p-8 pt-0'>
          <Button
            type='button'
            variant='ghost'
            className='h-12 flex-1 rounded-full text-[10px] font-black tracking-widest hover:bg-muted'
            onClick={onCancel}
          >
            {t('materialArchive.assemblyManager.dialog.cancel')}
          </Button>
          <Button
            type='button'
            disabled={isSubmitting}
            className='h-12 flex-1 rounded-full bg-primary text-[10px] font-black tracking-widest text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 active:scale-95'
            onClick={onConfirm}
          >
            {t('materialArchive.assemblyManager.dialog.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
