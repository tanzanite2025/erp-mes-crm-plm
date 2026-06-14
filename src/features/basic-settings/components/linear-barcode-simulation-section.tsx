import { useMemo, type Dispatch, type SetStateAction } from 'react'
import { Barcode, ChevronRight, Database, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
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
import type {
  HoleCodeCountItem,
  HoleCodePrefixItem,
} from '@/features/code-center/data/hole-code-source'
import type { Product } from '@/features/engineering/data/schema'
import { BarcodePreview } from './barcode-preview'

type AppearanceMapping = Record<string, { label?: string }>

interface LinearBarcodeSimulationSectionProps {
  mockInputs: {
    year: string
    month: string
    day: string
    model: string
    appearance: string
    holePrefix: string
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
      holePrefix: string
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
  holePrefixSources: HoleCodePrefixItem[]
  holeCountSources: HoleCodeCountItem[]
  monthOptions: Array<{ label: string; value: string }>
  dayOptions: Array<{ label: string; value: string }>
  onRequestNextSerial: () => Promise<void>
  sequenceRuleKey: string
}

const YEAR_OPTIONS = ['25', '26', '27']

export function LinearBarcodeSimulationSection({
  mockInputs,
  setMockInputs,
  assembledCode,
  parsedResult,
  products,
  appearanceMapping,
  holePrefixSources,
  holeCountSources,
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
        'relative overflow-hidden rounded-4xl border p-4 shadow-2xl transition-all duration-500 md:p-8 lg:p-10',
        'border-slate-200 bg-white shadow-slate-200/50',
        'dark:border-white/5 dark:bg-slate-950 dark:shadow-none'
      )}
    >
      <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,var(--tw-gradient-stops))] from-blue-500/30 via-transparent to-transparent opacity-10' />

      <div className='relative z-10 space-y-8'>
        <div className='flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center'>
          <div className='w-full min-w-0 flex-1 space-y-1.5'>
            <div className='flex items-center gap-2 text-[10px] font-black tracking-[0.3em] text-blue-600/60 uppercase dark:text-blue-400/60'>
              <ShieldCheck className='size-3.5' />{' '}
              {t('basicSettings.linearBarcode.simulation.title')}{' '}
              <span>(Code128)</span>
            </div>
            <h3 className='text-lg leading-tight font-black tracking-tight wrap-break-word whitespace-normal text-slate-900 lg:text-2xl dark:text-white'>
              {parsedResult.display.fullDescription}
            </h3>
            <p className='text-[10px] font-bold tracking-[0.2em] text-muted-foreground/30 uppercase italic'>
              {t('basicSettings.linearBarcode.simulation.subtitle')}
            </p>
          </div>
          <div className='flex w-full shrink-0 flex-col items-start gap-3 rounded-2xl border border-blue-500/10 bg-blue-500/5 p-4 sm:w-auto sm:items-end sm:border-none sm:bg-transparent'>
            <div className='flex w-full items-center justify-between gap-2 sm:justify-end'>
              <span className='text-[9px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                {t('basicSettings.linearBarcode.simulation.codeLabel')}:
              </span>
              <Badge
                variant='outline'
                className='h-8 rounded-lg border-2 border-blue-500/20 bg-blue-500/5 px-4 font-mono text-sm font-black tracking-widest text-blue-600 dark:text-blue-400/80'
              >
                {assembledCode}
              </Badge>
            </div>
          </div>
        </div>

        <div className='grid grid-cols-1 gap-8 lg:grid-cols-12'>
          <div
            className={cn(
              'grid grid-cols-1 gap-x-4 gap-y-5 rounded-3xl p-6 transition-colors sm:grid-cols-2 md:grid-cols-3 lg:col-span-7',
              'border-slate-200 bg-slate-50',
              'dark:border-white/5 dark:bg-white/2'
            )}
          >
            <div className='space-y-2'>
              <label className='ml-1 text-[9px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                {t('basicSettings.linearBarcode.simulation.form.year')}
              </label>
              <Select
                value={mockInputs.year}
                onValueChange={(value) =>
                  setMockInputs((prev) => ({ ...prev, year: value }))
                }
              >
                <SelectTrigger className='h-11! w-full rounded-xl border-input bg-background/50 py-0! font-bold'>
                  <SelectValue
                    placeholder={t(
                      'basicSettings.linearBarcode.simulation.form.placeholders.year'
                    )}
                  />
                </SelectTrigger>
                <SelectContent className='border-input bg-popover'>
                  {YEAR_OPTIONS.map((year) => (
                    <SelectItem key={year} value={year}>
                      20{year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <label className='ml-1 text-[9px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                {t('basicSettings.linearBarcode.simulation.form.month')}
              </label>
              <Select
                value={mockInputs.month}
                onValueChange={(value) =>
                  setMockInputs((prev) => ({ ...prev, month: value }))
                }
              >
                <SelectTrigger className='h-11! w-full rounded-xl border-input bg-background/50 py-0! font-bold'>
                  <SelectValue
                    placeholder={t(
                      'basicSettings.linearBarcode.simulation.form.placeholders.month'
                    )}
                  />
                </SelectTrigger>
                <SelectContent className='border-input bg-popover'>
                  {monthOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <label className='ml-1 text-[9px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                {t('basicSettings.linearBarcode.simulation.form.day')}
              </label>
              <Select
                value={mockInputs.day}
                onValueChange={(value) =>
                  setMockInputs((prev) => ({ ...prev, day: value }))
                }
              >
                <SelectTrigger className='h-11! w-full rounded-xl border-input bg-background/50 py-0! font-bold'>
                  <SelectValue
                    placeholder={t(
                      'basicSettings.linearBarcode.simulation.form.placeholders.day'
                    )}
                  />
                </SelectTrigger>
                <SelectContent className='max-h-72 border-input bg-popover'>
                  {dayOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <label className='ml-1 text-[9px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                {t('basicSettings.linearBarcode.simulation.form.model')}
              </label>
              <Select
                value={mockInputs.model}
                onValueChange={(value) =>
                  setMockInputs((prev) => ({ ...prev, model: value }))
                }
              >
                <SelectTrigger className='h-11! w-full rounded-xl border-input bg-background/50 py-0! font-bold'>
                  <SelectValue
                    placeholder={t(
                      'basicSettings.linearBarcode.simulation.form.placeholders.model'
                    )}
                  />
                </SelectTrigger>
                <SelectContent className='border-input bg-popover'>
                  {filteredProducts.map((product) => (
                    <SelectItem key={product.id} value={product.modelCode}>
                      {product.modelCode} - {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <label className='ml-1 text-[9px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                {t('basicSettings.linearBarcode.simulation.form.appearance')}
              </label>
              <Select
                value={mockInputs.appearance}
                onValueChange={(value) =>
                  setMockInputs((prev) => ({ ...prev, appearance: value }))
                }
              >
                <SelectTrigger className='h-11! w-full rounded-xl border-input bg-background/50 py-0! font-bold'>
                  <SelectValue
                    placeholder={t(
                      'basicSettings.linearBarcode.simulation.form.placeholders.appearance'
                    )}
                  />
                </SelectTrigger>
                <SelectContent className='border-input bg-popover'>
                  {appearanceMapping &&
                    Object.entries(appearanceMapping).map(([key, value]) => (
                      <SelectItem key={key} value={key}>
                        {key} -{' '}
                        {value.label ||
                          t(
                            'basicSettings.linearBarcode.simulation.form.undefinedAppearance'
                          )}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <label className='ml-1 text-[9px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                {t('basicSettings.linearBarcode.simulation.form.holePrefix')}
              </label>
              <div className='flex h-11! items-center rounded-xl border border-slate-200 bg-white p-1 transition-colors dark:border-white/10 dark:bg-white/2'>
                {holePrefixSources.map((option) => (
                  <button
                    key={option.id}
                    type='button'
                    onClick={() =>
                      setMockInputs((prev) => ({
                        ...prev,
                        holePrefix: option.code,
                      }))
                    }
                    className={cn(
                      'h-full flex-1 rounded-lg px-1 text-[9px] font-black transition-all',
                      mockInputs.holePrefix === option.code
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
                    )}
                  >
                    {option.label || option.code}
                  </button>
                ))}
              </div>
            </div>

            <div className='space-y-2'>
              <label className='ml-1 text-[9px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                {t('basicSettings.linearBarcode.simulation.form.holes')}
              </label>
              <Select
                value={mockInputs.holes}
                onValueChange={(value) =>
                  setMockInputs((prev) => ({ ...prev, holes: value }))
                }
              >
                <SelectTrigger className='h-11! w-full rounded-xl border-input bg-background/50 py-0! font-bold'>
                  <SelectValue
                    placeholder={t(
                      'basicSettings.linearBarcode.simulation.form.placeholders.holes'
                    )}
                  />
                </SelectTrigger>
                <SelectContent className='border-input bg-popover'>
                  {holeCountSources.map((item) => (
                    <SelectItem key={item.id} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='col-span-1 space-y-2 sm:col-span-2'>
              <label className='ml-1 flex items-center justify-between text-[9px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                <span>
                  {t('basicSettings.linearBarcode.simulation.form.serial')}
                </span>
                <span className='font-mono text-teal-600 dark:text-teal-500/60'>
                  {sequenceRuleKey}
                </span>
              </label>
              <div className='flex gap-2'>
                <div
                  className={cn(
                    'flex h-11 flex-1 items-center rounded-xl border px-4 font-mono font-black tracking-widest shadow-inner transition-colors',
                    'border-slate-200 bg-white text-blue-600',
                    'dark:border-white/10 dark:bg-white/3 dark:text-blue-400'
                  )}
                >
                  {mockInputs.serial ||
                    t('basicSettings.linearBarcode.simulation.form.notIssued')}
                </div>
                <Button
                  type='button'
                  variant='secondary'
                  className='h-11 rounded-xl bg-blue-600 px-4 text-[10px] font-black tracking-widest text-white uppercase shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-500 active:scale-95'
                  onClick={() => void onRequestNextSerial()}
                >
                  {t(
                    'basicSettings.linearBarcode.simulation.form.requestSerial'
                  )}
                </Button>
              </div>
            </div>

            <div className='col-span-1 mt-2 grid grid-cols-1 gap-6 border-t border-slate-200 pt-6 sm:col-span-2 md:col-span-3 md:grid-cols-3 dark:border-white/5'>
              <div className='space-y-3'>
                <label className='ml-1 flex items-center gap-2 text-[9px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                  <ShieldCheck className='size-3 text-blue-600 dark:text-blue-400' />{' '}
                  {t(
                    'basicSettings.linearBarcode.simulation.form.specialPrefix'
                  )}
                </label>
                <div className='flex h-11! items-center gap-3 rounded-xl border border-slate-200 bg-white p-2.5 transition-colors dark:border-white/10 dark:bg-white/2'>
                  <span className='text-[10px] font-bold text-muted-foreground uppercase'>
                    {t(
                      'basicSettings.linearBarcode.simulation.form.enableHPrefix'
                    )}
                  </span>
                  <div
                    onClick={() =>
                      setMockInputs((prev) => ({
                        ...prev,
                        isDrainHole: !prev.isDrainHole,
                      }))
                    }
                    className={`relative h-6 w-12 cursor-pointer rounded-full transition-colors duration-300 ${mockInputs.isDrainHole ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-800'}`}
                  >
                    <div
                      className={`absolute top-1 size-4 rounded-full bg-white shadow-sm transition-all duration-300 ${mockInputs.isDrainHole ? 'left-7' : 'left-1'}`}
                    />
                  </div>
                </div>
              </div>

              <div className='space-y-3'>
                <label className='ml-1 flex items-center gap-2 text-[9px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                  <ChevronRight className='size-3 text-blue-600 dark:text-blue-400' />{' '}
                  {t('basicSettings.linearBarcode.simulation.form.suffixWheel')}
                </label>
                <div className='flex h-11! items-center rounded-xl border border-slate-200 bg-white p-1 transition-colors dark:border-white/10 dark:bg-white/2'>
                  {[
                    {
                      label: t(
                        'basicSettings.linearBarcode.simulation.form.wheelOptions.F'
                      ),
                      value: 'F',
                    },
                    {
                      label: t(
                        'basicSettings.linearBarcode.simulation.form.wheelOptions.R'
                      ),
                      value: 'R',
                    },
                    {
                      label: t(
                        'basicSettings.linearBarcode.simulation.form.wheelOptions.H'
                      ),
                      value: 'H',
                    },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type='button'
                      onClick={() =>
                        setMockInputs((prev) => ({
                          ...prev,
                          wheelType: option.value,
                        }))
                      }
                      className={cn(
                        'h-full flex-1 rounded-lg px-1 text-[9px] font-black transition-all',
                        mockInputs.wheelType === option.value
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className='space-y-3'>
                <label className='ml-1 flex items-center gap-2 text-[9px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                  <Database className='size-3 text-blue-600 dark:text-blue-400' />{' '}
                  {t('basicSettings.linearBarcode.simulation.form.suffixScope')}
                </label>
                <Input
                  className='h-11! rounded-xl border-slate-200 font-black text-blue-600 placeholder:text-slate-300 dark:border-white/10 dark:bg-white/2 dark:text-blue-400 dark:placeholder:text-slate-700'
                  placeholder={t(
                    'basicSettings.linearBarcode.simulation.form.scopePlaceholder'
                  )}
                  value={mockInputs.scopeCode}
                  onChange={(event) =>
                    setMockInputs((prev) => ({
                      ...prev,
                      scopeCode: event.target.value.toUpperCase(),
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <div className='flex flex-col items-stretch justify-center space-y-8 lg:col-span-5'>
            <div className='group/dm relative w-full'>
              <BarcodePreview
                code={assembledCode}
                shortCode={assembledCode}
                type='code128'
                isDrainHole={mockInputs.isDrainHole}
                wheelType={mockInputs.wheelType}
                scopeCode={mockInputs.scopeCode}
                headerLabel={t(
                  'basicSettings.linearBarcode.simulation.codeLabel'
                )}
                statusLabel={t(
                  'basicSettings.linearBarcode.page.badges.active'
                )}
              />
              <div className='pointer-events-none absolute -inset-6 bg-blue-500/20 opacity-30 blur-3xl transition-opacity' />
              <div className='pointer-events-none absolute top-0 left-0 h-1 w-full animate-[scanMove_4s_infinite] bg-blue-400/40 blur-md' />
            </div>

            <div className='w-full space-y-4'>
              <div className='space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-5 transition-colors dark:border-white/10 dark:bg-white/4'>
                <div className='mb-2 flex items-center gap-2'>
                  <ShieldCheck className='size-3.5 text-blue-600 dark:text-blue-400' />
                  <span className='text-[9px] font-black tracking-widest text-blue-600 uppercase dark:text-blue-400'>
                    {t(
                      'basicSettings.linearBarcode.simulation.validator.title'
                    )}
                  </span>
                </div>
                <div className='text-sm leading-relaxed font-black text-slate-900 dark:text-white/90'>
                  {parsedResult.display.fullDescription}
                </div>
                <div className='flex items-center gap-1 text-[10px] font-medium text-muted-foreground/60'>
                  <ChevronRight className='size-3' />
                  {t(
                    'basicSettings.linearBarcode.simulation.validator.description'
                  )}
                </div>
              </div>

              <div className='space-y-2 rounded-xl border border-orange-500/10 bg-orange-500/5 p-4'>
                <h5 className='flex items-center gap-1.5 text-[10px] font-black tracking-widest text-orange-600 uppercase dark:text-orange-400/80'>
                  <Barcode className='size-3' />{' '}
                  {t(
                    'basicSettings.linearBarcode.simulation.sequenceRule.title'
                  )}
                </h5>
                <p className='text-[9px] leading-relaxed font-medium text-orange-800/60 italic dark:text-orange-200/50'>
                  {t(
                    'basicSettings.linearBarcode.simulation.sequenceRule.description',
                    { key: sequenceRuleKey }
                  )}{' '}
                  <code className='rounded bg-orange-100 px-1 text-orange-700 dark:bg-white/5 dark:text-orange-300'>
                    {sequenceRuleKey}
                  </code>
                  {'; '}
                  {t(
                    'basicSettings.linearBarcode.simulation.sequenceRule.patternHint'
                  )}{' '}
                  <code className='rounded bg-orange-100 px-1 text-orange-700 dark:bg-white/5 dark:text-orange-300'>
                    {'{SEQ}'}
                  </code>
                  {' / '}
                  <code className='rounded bg-orange-100 px-1 text-orange-700 dark:bg-white/5 dark:text-orange-300'>
                    padding=4
                  </code>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
