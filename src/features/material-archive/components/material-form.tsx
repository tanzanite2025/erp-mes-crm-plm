import { useEffect, useState } from 'react'
import type { Control, UseFormReturn } from 'react-hook-form'
import { Box, Settings2, Sparkles } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { UnitActionDialog } from '../../basic-settings/components/unit-action-dialog'
import { dictionaryService } from '../../basic-settings/services/dictionary-service'
import { unitService, type Unit } from '../../basic-settings/services/unit-service'
import { type Material } from '../data/schema'

interface MaterialFormProps {
  form: UseFormReturn<Material>
  selectedCategory: string
}

export function MaterialForm({ form, selectedCategory }: MaterialFormProps) {
  const { t } = useLanguage()
  const [isUnitMgmtOpen, setIsUnitMgmtOpen] = useState(false)
  const [units, setUnits] = useState<Unit[]>([])
  const categoryOptions = dictionaryService.getOptions('MATERIAL_CATEGORY')

  useEffect(() => {
    const loadUnits = async () => {
      const data = await unitService.getUnits()
      setUnits(data)
    }

    void loadUnits()
  }, [])

  useEffect(() => {
    const handleUpdate = async () => {
      const data = await unitService.getUnits()
      setUnits(data)
    }

    window.addEventListener('xdfc_units_updated', handleUpdate)
    return () => window.removeEventListener('xdfc_units_updated', handleUpdate)
  }, [])


  const renderOptions = categoryOptions

  return (
    <div className='space-y-6'>
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        <FormField
          control={form.control}
          name='category'
          render={({ field }) => (
            <FormItem>
              <FormLabel className='mb-3 block pl-1 text-[10px] font-black tracking-widest text-muted-foreground/50 decoration-primary/30'>
                {t('materialArchive.form.categoryLabel')} <span className='text-destructive'>*</span>
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className='h-12 rounded-2xl border-none bg-muted/50 shadow-sm focus:ring-1 focus:ring-primary/20'>
                    <SelectValue placeholder={t('materialArchive.form.categoryPlaceholder')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className='rounded-2xl border-none shadow-2xl'>
                  {renderOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} className='rounded-xl'>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='code'
          render={({ field }) => (
            <FormItem>
              <FormLabel className='mb-3 block pl-1 text-[10px] font-black tracking-widest text-muted-foreground/30'>
                {t('materialArchive.form.codeLabel')}
              </FormLabel>
              <FormControl>
                <div className='flex h-12 cursor-default select-none items-center gap-3 rounded-2xl border border-dashed border-primary/20 bg-primary/5 px-4 font-mono text-xs font-black text-primary/80'>
                  <Sparkles className='size-3.5 animate-pulse text-primary' />
                  <span className='tracking-tight'>
                    {field.value || t('materialArchive.form.generatedCodePlaceholder')}
                  </span>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name='name'
        render={({ field }) => (
          <FormItem>
            <FormLabel className='mb-3 block pl-1 text-[10px] font-black tracking-widest text-muted-foreground/50 opacity-70'>
              {t('materialArchive.form.nameLabel')} <span className='text-destructive'>*</span>
            </FormLabel>
            <FormControl>
              <Input
                placeholder={t('materialArchive.form.namePlaceholder')}
                className='h-12 rounded-2xl border-none bg-muted/50 font-bold shadow-sm placeholder:text-muted-foreground/30'
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name='spec'
        render={({ field }) => (
          <FormItem>
            <FormLabel className='mb-3 block pl-1 text-[10px] font-black tracking-widest text-muted-foreground/50'>
              {t('materialArchive.form.specLabel')}
            </FormLabel>
            <FormControl>
              <Input
                placeholder={t('materialArchive.form.specPlaceholder')}
                className='h-12 rounded-2xl border-none bg-muted/50 font-mono text-sm shadow-sm'
                {...field}
                value={field.value || ''}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {selectedCategory === 'PACKAGING' && (
        <div className='relative space-y-4 overflow-hidden rounded-[24px] border border-dashed border-primary/10 bg-muted/5 p-6 shadow-inner'>
          <div className='pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent' />
          <div className='mb-4 flex items-center gap-2 text-[10px] font-black tracking-widest text-primary/80'>
            <Box className='size-3.5' />
            {t('materialArchive.form.dimensionsTitle')}
          </div>
          <Tabs defaultValue='internal' className='w-full'>
            <TabsList className='mb-6 grid h-10 w-full grid-cols-2 rounded-full border border-dashed border-muted/50 bg-muted/30 p-1'>
              <TabsTrigger
                value='internal'
                className='rounded-full text-[10px] font-black tracking-widest data-[state=active]:bg-card data-[state=active]:shadow-sm'
              >
                {t('materialArchive.form.internalTab')}
              </TabsTrigger>
              <TabsTrigger
                value='external'
                className='rounded-full text-[10px] font-black tracking-widest data-[state=active]:bg-card data-[state=active]:shadow-sm'
              >
                {t('materialArchive.form.externalTab')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value='internal' className='pt-4'>
              <DimensionInputs prefix='internalDimensions' control={form.control} />
            </TabsContent>
            <TabsContent value='external' className='pt-4'>
              <DimensionInputs prefix='externalDimensions' control={form.control} />
            </TabsContent>
          </Tabs>
        </div>
      )}

      <FormField
        control={form.control}
        name='uom'
        render={({ field }) => (
          <FormItem>
            <div className='mb-2 flex items-center justify-between'>
              <FormLabel className='block pl-1 text-[10px] font-black tracking-widest text-muted-foreground/50'>
                {t('materialArchive.form.uomLabel')} <span className='text-destructive'>*</span>
              </FormLabel>
              <Button
                type='button'
                variant='ghost'
                size='sm'
                className='h-7 rounded-full px-3 text-[10px] font-black tracking-widest text-primary/60 hover:bg-primary/5'
                onClick={() => setIsUnitMgmtOpen(true)}
              >
                <Settings2 className='size-3' />
                {t('materialArchive.form.unitSettings')}
              </Button>
            </div>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger className='h-12 rounded-2xl border-none bg-muted/50 shadow-sm'>
                  <SelectValue placeholder={t('materialArchive.form.uomPlaceholder')} />
                </SelectTrigger>
              </FormControl>
              <SelectContent className='rounded-2xl border-none shadow-2xl'>
                {units.map((unit) => (
                  <SelectItem key={unit.id} value={unit.code} className='rounded-xl'>
                    <div className='flex w-full items-center justify-between gap-8'>
                      <span className='font-bold'>{unit.name}</span>
                      <span className='font-mono text-[10px] text-muted-foreground/40 uppercase'>
                        {unit.code}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name='description'
        render={({ field }) => (
          <FormItem>
            <FormLabel className='mb-2 block text-[10px] font-black tracking-widest text-muted-foreground/60'>
              {t('materialArchive.form.descriptionLabel')}
            </FormLabel>
            <FormControl>
              <Textarea
                placeholder={t('materialArchive.form.descriptionPlaceholder')}
                className='min-h-[100px] rounded-2xl border-none bg-muted/50 p-4 text-sm shadow-sm'
                {...field}
              />
            </FormControl>
          </FormItem>
        )}
      />

      <UnitActionDialog
        open={isUnitMgmtOpen}
        onOpenChange={setIsUnitMgmtOpen}
        onSaveSuccess={async () => {
          const data = await unitService.getUnits()
          setUnits(data)
        }}
      />
    </div>
  )
}

function DimensionInputs({
  control,
  prefix,
}: {
  prefix: 'internalDimensions' | 'externalDimensions'
  control: Control<Material>
}) {
  const { t } = useLanguage()

  return (
    <div className='grid grid-cols-3 gap-4'>
      <FormField
        control={control}
        name={`${prefix}.length`}
        render={({ field }) => (
          <FormItem>
            <FormLabel className='text-[9px] font-black tracking-widest text-muted-foreground/40'>
              {t('materialArchive.form.length')}
            </FormLabel>
            <FormControl>
              <Input
                type='number'
                className='h-10 rounded-xl border-none bg-muted/20 font-mono text-xs'
                {...field}
                value={field.value || 0}
                onChange={(event) => field.onChange(Number(event.target.value))}
              />
            </FormControl>
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name={`${prefix}.width`}
        render={({ field }) => (
          <FormItem>
            <FormLabel className='text-[9px] font-black tracking-widest text-muted-foreground/40'>
              {t('materialArchive.form.width')}
            </FormLabel>
            <FormControl>
              <Input
                type='number'
                className='h-10 rounded-xl border-none bg-muted/20 font-mono text-xs'
                {...field}
                value={field.value || 0}
                onChange={(event) => field.onChange(Number(event.target.value))}
              />
            </FormControl>
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name={`${prefix}.height`}
        render={({ field }) => (
          <FormItem>
            <FormLabel className='text-[9px] font-black tracking-widest text-muted-foreground/40'>
              {t('materialArchive.form.height')}
            </FormLabel>
            <FormControl>
              <Input
                type='number'
                className='h-10 rounded-xl border-none bg-muted/20 font-mono text-xs'
                {...field}
                value={field.value || 0}
                onChange={(event) => field.onChange(Number(event.target.value))}
              />
            </FormControl>
          </FormItem>
        )}
      />
    </div>
  )
}
