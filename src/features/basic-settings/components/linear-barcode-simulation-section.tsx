import { useMemo, type Dispatch, type SetStateAction } from 'react'
import { Barcode, ChevronRight, Database, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { DMPreview } from './dm-preview'
import type { Product } from '@/features/engineering/data/schema'

type AppearanceMapping = Record<string, { label?: string }>

interface LinearBarcodeSimulationSectionProps {
  mockInputs: {
    year: string
    month: string
    day: string
    model: string
    appearance: string
    holePrefix: 'R' | 'D'
    holes: string
    serial: string
    isDrainHole: boolean
    wheelType: string
    scopeCode: string
  }
  setMockInputs: Dispatch<
    SetStateAction<{
      year: string
      month: string
      day: string
      model: string
      appearance: string
      holePrefix: 'R' | 'D'
      holes: string
      serial: string
      isDrainHole: boolean
      wheelType: string
      scopeCode: string
    }>
  >
  assembledCode: string
  parsedResult: {
    display: {
      fullDescription: string
      scannableText: string
    }
  }
  products: Product[]
  appearanceMapping: AppearanceMapping | null
  monthOptions: Array<{ label: string; value: string }>
  dayOptions: Array<{ label: string; value: string }>
  onRequestNextSerial: () => Promise<void>
  sequenceRuleKey: string
}

const HOLE_OPTIONS = ['14', '16', '18', '20', '21', '24', '28', '32']
const YEAR_OPTIONS = ['25', '26', '27']

export function LinearBarcodeSimulationSection({
  mockInputs,
  setMockInputs,
  assembledCode,
  parsedResult,
  products,
  appearanceMapping,
  monthOptions,
  dayOptions,
  onRequestNextSerial,
  sequenceRuleKey,
}: LinearBarcodeSimulationSectionProps) {
  const { t } = useLanguage()

  const filteredProducts = useMemo(() => {
    return products.filter((product) => product.status !== 'Archived')
  }, [products])

  return (
    <div
      className={cn(
        'rounded-[2rem] border p-4 md:p-8 lg:p-10 shadow-2xl relative overflow-hidden transition-all duration-500',
        'bg-white border-slate-200 shadow-slate-200/50',
        'dark:bg-slate-950 dark:border-white/5 dark:shadow-none',
      )}
    >
      <div className='absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(circle_at_70%_30%,_var(--tw-gradient-stops))] from-blue-500/30 via-transparent to-transparent' />

      <div className='relative z-10 space-y-8'>
        <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6'>
          <div className='space-y-1.5 min-w-0 flex-1 w-full'>
            <div className='text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2 text-blue-600/60 dark:text-blue-400/60'>
              <ShieldCheck className='size-3.5' /> {t('basicSettings.linearBarcode.simulation.title')} <span>(Code128)</span>
            </div>
            <h3 className='text-lg lg:text-2xl font-black tracking-tight leading-tight whitespace-normal break-words text-slate-900 dark:text-white'>
              {parsedResult.display.fullDescription}
            </h3>
            <p className='text-[10px] font-bold text-muted-foreground/30 uppercase tracking-[0.2em] italic'>
              {t('basicSettings.linearBarcode.simulation.subtitle')}
            </p>
          </div>
          <div className='flex flex-col items-start sm:items-end gap-3 shrink-0 w-full sm:w-auto p-4 rounded-2xl bg-blue-500/5 sm:bg-transparent border border-blue-500/10 sm:border-none'>
            <div className='flex items-center gap-2 w-full justify-between sm:justify-end'>
              <span className='text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest'>
                {t('basicSettings.linearBarcode.simulation.codeLabel')}:
              </span>
              <Badge
                variant='outline'
                className='h-8 px-4 rounded-lg border-2 font-mono text-sm tracking-widest font-black bg-blue-500/5 border-blue-500/20 text-blue-600 dark:text-blue-400/80'
              >
                {assembledCode}
              </Badge>
            </div>
          </div>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-12 gap-8'>
          <div
            className={cn(
              'lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-5 p-6 rounded-3xl transition-colors',
              'bg-slate-50 border-slate-200',
              'dark:bg-white/[0.02] dark:border-white/5',
            )}
          >
            <div className='space-y-2'>
              <label className='text-[9px] font-black uppercase text-muted-foreground/40 tracking-widest ml-1'>
                {t('basicSettings.linearBarcode.simulation.form.year')}
              </label>
              <Select value={mockInputs.year} onValueChange={(value) => setMockInputs((prev) => ({ ...prev, year: value }))}>
                <SelectTrigger className='w-full bg-background/50 border-input rounded-xl !h-11 !py-0 font-bold'>
                  <SelectValue placeholder={t('basicSettings.linearBarcode.simulation.form.placeholders.year')} />
                </SelectTrigger>
                <SelectContent className='bg-popover border-input'>
                  {YEAR_OPTIONS.map((year) => (
                    <SelectItem key={year} value={year}>
                      20{year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <label className='text-[9px] font-black uppercase text-muted-foreground/40 tracking-widest ml-1'>
                {t('basicSettings.linearBarcode.simulation.form.month')}
              </label>
              <Select value={mockInputs.month} onValueChange={(value) => setMockInputs((prev) => ({ ...prev, month: value }))}>
                <SelectTrigger className='w-full bg-background/50 border-input rounded-xl !h-11 !py-0 font-bold'>
                  <SelectValue placeholder={t('basicSettings.linearBarcode.simulation.form.placeholders.month')} />
                </SelectTrigger>
                <SelectContent className='bg-popover border-input'>
                  {monthOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <label className='text-[9px] font-black uppercase text-muted-foreground/40 tracking-widest ml-1'>
                {t('basicSettings.linearBarcode.simulation.form.day')}
              </label>
              <Select value={mockInputs.day} onValueChange={(value) => setMockInputs((prev) => ({ ...prev, day: value }))}>
                <SelectTrigger className='w-full bg-background/50 border-input rounded-xl !h-11 !py-0 font-bold'>
                  <SelectValue placeholder={t('basicSettings.linearBarcode.simulation.form.placeholders.day')} />
                </SelectTrigger>
                <SelectContent className='bg-popover border-input max-h-72'>
                  {dayOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <label className='text-[9px] font-black uppercase text-muted-foreground/40 tracking-widest ml-1'>
                {t('basicSettings.linearBarcode.simulation.form.model')}
              </label>
              <Select value={mockInputs.model} onValueChange={(value) => setMockInputs((prev) => ({ ...prev, model: value }))}>
                <SelectTrigger className='w-full bg-background/50 border-input rounded-xl !h-11 !py-0 font-bold'>
                  <SelectValue placeholder={t('basicSettings.linearBarcode.simulation.form.placeholders.model')} />
                </SelectTrigger>
                <SelectContent className='bg-popover border-input'>
                  {filteredProducts.map((product) => (
                    <SelectItem key={product.id} value={product.modelCode}>
                      {product.modelCode} - {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <label className='text-[9px] font-black uppercase text-muted-foreground/40 tracking-widest ml-1'>
                {t('basicSettings.linearBarcode.simulation.form.appearance')}
              </label>
              <Select value={mockInputs.appearance} onValueChange={(value) => setMockInputs((prev) => ({ ...prev, appearance: value }))}>
                <SelectTrigger className='w-full bg-background/50 border-input rounded-xl !h-11 !py-0 font-bold'>
                  <SelectValue placeholder={t('basicSettings.linearBarcode.simulation.form.placeholders.appearance')} />
                </SelectTrigger>
                <SelectContent className='bg-popover border-input'>
                  {appearanceMapping &&
                    Object.entries(appearanceMapping).map(([key, value]) => (
                      <SelectItem key={key} value={key}>
                        {key} - {value.label || t('basicSettings.linearBarcode.simulation.form.undefinedAppearance')}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <label className='text-[9px] font-black uppercase text-muted-foreground/40 tracking-widest ml-1'>
                {t('basicSettings.linearBarcode.simulation.form.holePrefix')}
              </label>
              <div className='flex p-1 border rounded-xl !h-11 items-center transition-colors bg-white border-slate-200 dark:bg-white/[0.02] dark:border-white/10'>
                {[
                  { label: t('basicSettings.linearBarcode.simulation.form.holePrefixOptions.R'), value: 'R' },
                  { label: t('basicSettings.linearBarcode.simulation.form.holePrefixOptions.D'), value: 'D' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type='button'
                    onClick={() => setMockInputs((prev) => ({ ...prev, holePrefix: option.value as 'R' | 'D' }))}
                    className={cn(
                      'flex-1 h-full px-1 text-[9px] font-black rounded-lg transition-all',
                      mockInputs.holePrefix === option.value
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300',
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className='space-y-2'>
              <label className='text-[9px] font-black uppercase text-muted-foreground/40 tracking-widest ml-1'>
                {t('basicSettings.linearBarcode.simulation.form.holes')}
              </label>
              <Select value={mockInputs.holes} onValueChange={(value) => setMockInputs((prev) => ({ ...prev, holes: value }))}>
                <SelectTrigger className='w-full bg-background/50 border-input rounded-xl !h-11 !py-0 font-bold'>
                  <SelectValue placeholder={t('basicSettings.linearBarcode.simulation.form.placeholders.holes')} />
                </SelectTrigger>
                <SelectContent className='bg-popover border-input'>
                  {HOLE_OPTIONS.map((holes) => (
                    <SelectItem key={holes} value={holes}>
                      {mockInputs.holePrefix}
                      {holes}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2 col-span-1 sm:col-span-2'>
              <label className='text-[9px] font-black uppercase text-muted-foreground/40 tracking-widest ml-1 flex justify-between items-center'>
                <span>{t('basicSettings.linearBarcode.simulation.form.serial')}</span>
                <span className='text-teal-600 dark:text-teal-500/60 font-mono'>{sequenceRuleKey}</span>
              </label>
              <div className='flex gap-2'>
                <div
                  className={cn(
                    'flex-1 border rounded-xl h-11 flex items-center px-4 font-mono font-black tracking-widest shadow-inner transition-colors',
                    'bg-white border-slate-200 text-blue-600',
                    'dark:bg-white/[0.03] dark:border-white/10 dark:text-blue-400',
                  )}
                >
                  {mockInputs.serial || t('basicSettings.linearBarcode.simulation.form.notIssued')}
                </div>
                <Button
                  type='button'
                  variant='secondary'
                  className='h-11 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-600/20'
                  onClick={() => void onRequestNextSerial()}
                >
                  {t('basicSettings.linearBarcode.simulation.form.requestSerial')}
                </Button>
              </div>
            </div>

            <div className='col-span-1 sm:col-span-2 md:col-span-3 pt-6 mt-2 border-t border-slate-200 dark:border-white/5 grid grid-cols-1 md:grid-cols-3 gap-6'>
              <div className='space-y-3'>
                <label className='text-[9px] font-black uppercase text-muted-foreground/40 tracking-widest ml-1 flex items-center gap-2'>
                  <ShieldCheck className='size-3 text-blue-600 dark:text-blue-400' /> {t('basicSettings.linearBarcode.simulation.form.specialPrefix')}
                </label>
                <div className='flex items-center gap-3 p-2.5 rounded-xl border !h-11 transition-colors bg-white border-slate-200 dark:bg-white/[0.02] dark:border-white/10'>
                  <span className='text-[10px] font-bold text-muted-foreground uppercase'>{t('basicSettings.linearBarcode.simulation.form.enableHPrefix')}</span>
                  <div
                    onClick={() => setMockInputs((prev) => ({ ...prev, isDrainHole: !prev.isDrainHole }))}
                    className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors duration-300 ${mockInputs.isDrainHole ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-800'}`}
                  >
                    <div className={`absolute top-1 size-4 rounded-full bg-white shadow-sm transition-all duration-300 ${mockInputs.isDrainHole ? 'left-7' : 'left-1'}`} />
                  </div>
                </div>
              </div>

              <div className='space-y-3'>
                <label className='text-[9px] font-black uppercase text-muted-foreground/40 tracking-widest ml-1 flex items-center gap-2'>
                  <ChevronRight className='size-3 text-blue-600 dark:text-blue-400' /> {t('basicSettings.linearBarcode.simulation.form.suffixWheel')}
                </label>
                <div className='flex p-1 border rounded-xl !h-11 items-center transition-colors bg-white border-slate-200 dark:bg-white/[0.02] dark:border-white/10'>
                  {[
                    { label: t('basicSettings.linearBarcode.simulation.form.wheelOptions.F'), value: 'F' },
                    { label: t('basicSettings.linearBarcode.simulation.form.wheelOptions.R'), value: 'R' },
                    { label: t('basicSettings.linearBarcode.simulation.form.wheelOptions.H'), value: 'H' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type='button'
                      onClick={() => setMockInputs((prev) => ({ ...prev, wheelType: option.value }))}
                      className={cn(
                        'flex-1 h-full px-1 text-[9px] font-black rounded-lg transition-all',
                        mockInputs.wheelType === option.value
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300',
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className='space-y-3'>
                <label className='text-[9px] font-black uppercase text-muted-foreground/40 tracking-widest ml-1 flex items-center gap-2'>
                  <Database className='size-3 text-blue-600 dark:text-blue-400' /> {t('basicSettings.linearBarcode.simulation.form.suffixScope')}
                </label>
                <Input
                  className='!h-11 border-slate-200 dark:bg-white/[0.02] dark:border-white/10 rounded-xl font-black text-blue-600 dark:text-blue-400 placeholder:text-slate-300 dark:placeholder:text-slate-700'
                  placeholder={t('basicSettings.linearBarcode.simulation.form.scopePlaceholder')}
                  value={mockInputs.scopeCode}
                  onChange={(event) =>
                    setMockInputs((prev) => ({ ...prev, scopeCode: event.target.value.toUpperCase() }))
                  }
                />
              </div>
            </div>
          </div>

          <div className='lg:col-span-4 flex flex-col items-center justify-center space-y-8'>
            <div className='relative group/dm'>
              <DMPreview
                code={assembledCode}
                shortCode={assembledCode}
                type='code128'
                isDrainHole={mockInputs.isDrainHole}
                wheelType={mockInputs.wheelType}
                scopeCode={mockInputs.scopeCode}
              />
              <div className='absolute -inset-6 bg-blue-500/20 blur-3xl opacity-30 transition-opacity pointer-events-none' />
              <div className='absolute top-0 left-0 w-full h-1 bg-blue-400/40 blur-md animate-[scanMove_4s_infinite] pointer-events-none' />
            </div>

            <div className='w-full space-y-4'>
              <div className='p-5 rounded-2xl border space-y-3 transition-colors bg-slate-50 border-slate-200 dark:bg-white/[0.04] dark:border-white/10'>
                <div className='flex items-center gap-2 mb-2'>
                  <ShieldCheck className='size-3.5 text-blue-600 dark:text-blue-400' />
                  <span className='text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest'>
                    {t('basicSettings.linearBarcode.simulation.validator.title')}
                  </span>
                </div>
                <div className='text-sm font-black text-slate-900 dark:text-white/90 leading-relaxed'>
                  {parsedResult.display.fullDescription}
                </div>
                <div className='flex gap-1 items-center text-[10px] text-muted-foreground/60 font-medium'>
                  <ChevronRight className='size-3' />
                  {t('basicSettings.linearBarcode.simulation.validator.description')}
                </div>
              </div>

              <div className='p-4 rounded-xl bg-orange-500/5 border border-orange-500/10 space-y-2'>
                <h5 className='text-[10px] font-black text-orange-600 dark:text-orange-400/80 uppercase tracking-widest flex items-center gap-1.5'>
                  <Barcode className='size-3' /> {t('basicSettings.linearBarcode.simulation.sequenceRule.title')}
                </h5>
                <p className='text-[9px] leading-relaxed text-orange-800/60 dark:text-orange-200/50 font-medium italic'>
                  {t('basicSettings.linearBarcode.simulation.sequenceRule.description', { key: sequenceRuleKey })}{' '}
                  <code className='bg-orange-100 dark:bg-white/5 px-1 rounded text-orange-700 dark:text-orange-300'>{sequenceRuleKey}</code>
                  {'; '}
                  {t('basicSettings.linearBarcode.simulation.sequenceRule.patternHint')}{' '}
                  <code className='bg-orange-100 dark:bg-white/5 px-1 rounded text-orange-700 dark:text-orange-300'>{'{SEQ}'}</code>
                  {' / '}
                  <code className='bg-orange-100 dark:bg-white/5 px-1 rounded text-orange-700 dark:text-orange-300'>padding=4</code>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
