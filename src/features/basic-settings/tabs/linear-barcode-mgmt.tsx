'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Barcode, RotateCcw, Save, Settings2 } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { canOpenRouteEntryNonBlocking } from '@/features/authz/guards/route-entry-access'
import { ForbiddenState } from '@/components/forbidden-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLanguage } from '@/context/language-provider'
import { isForbiddenError } from '@/lib/error-status'
import { createLogger } from '@/lib/logger'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { useGetProducts } from '@/features/engineering/hooks/use-products'
import { linearBarcodeProtocolService } from '@/features/basic-settings/services/linear-barcode-protocol-service'
import { numberingService } from '@/features/basic-settings/services/numbering-service'
import { DMRuleConfigDialog } from '../components/dm-rule-config-dialog'
import { AppearanceActionDialog, type AppearanceMapping } from '../components/appearance-action-dialog'
import { DMRulesTable } from '../components/dm-rules-table'
import { LinearBarcodeSimulationSection } from '../components/linear-barcode-simulation-section'
import { useAppearanceMapping } from '../hooks/use-appearance-mapping'
import { parseLinearBarcodeCode } from '../utils/linear-barcode-parser'
import { type DMRuleSegment } from '../data/linear-barcode-rules-config'
import {
  createDefaultLinearBarcodeMockInputs,
  createDefaultLinearBarcodeProtocolConfig,
  DAY_OPTIONS,
  type LinearBarcodeMockInputs,
  type LinearBarcodeProtocolConfig,
} from '../data/linear-barcode-protocol'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const logger = createLogger('LinearBarcodeMgmt')

export function LinearBarcodeMgmt() {
  const { t, locale } = useLanguage()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const canOpenSequences = canOpenRouteEntryNonBlocking(user, '/basic-settings/sequences')
  const [protocolConfig, setProtocolConfig] = useState<LinearBarcodeProtocolConfig>(createDefaultLinearBarcodeProtocolConfig)
  const [rules, setRules] = useState<DMRuleSegment[]>(createDefaultLinearBarcodeProtocolConfig().rules)
  const [selectedSegment, setSelectedSegment] = useState<DMRuleSegment | null>(null)
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false)
  const [isAppearanceDialogOpen, setIsAppearanceDialogOpen] = useState(false)
  const { data: products = [] } = useGetProducts()
  const { data: appearanceMapping = null } = useAppearanceMapping()
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [mockInputs, setMockInputs] = useState<LinearBarcodeMockInputs>(createDefaultLinearBarcodeMockInputs)
  const [isConfigLoading, setIsConfigLoading] = useState(false)
  const [isConfigSaving, setIsConfigSaving] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const monthOptions = useMemo(() => {
    const monthUnit = t('common.units.month')
    return [
      { label: `1${monthUnit}`, value: '1' },
      { label: `2${monthUnit}`, value: '2' },
      { label: `3${monthUnit}`, value: '3' },
      { label: `4${monthUnit}`, value: '4' },
      { label: `5${monthUnit}`, value: '5' },
      { label: `6${monthUnit}`, value: '6' },
      { label: `7${monthUnit}`, value: '7' },
      { label: `8${monthUnit}`, value: '8' },
      { label: `9${monthUnit}`, value: '9' },
      { label: `10${monthUnit} (0)`, value: '0' },
      { label: `11${monthUnit} (N)`, value: 'N' },
      { label: `12${monthUnit} (D)`, value: 'D' },
    ]
  }, [t])

  const resetConfirmationText = t('basicSettings.linearBarcode.resetDialog.verifyTarget')

  const statusBadgeLabel = isConfigLoading
    ? t('basicSettings.linearBarcode.page.badges.loading')
    : isConfigSaving
      ? t('basicSettings.linearBarcode.page.badges.saving')
      : t('basicSettings.linearBarcode.page.badges.synced')

  const loadProtocolConfig = useCallback(async () => {
    setIsConfigLoading(true)
    try {
      setError(null)
      const config = await linearBarcodeProtocolService.getConfig()
      setProtocolConfig(config)
      setRules(config.rules)
      setMockInputs(config.mockInput)
    } catch (loadError) {
      setError(loadError)
      logger.error('Failed to load protocol config', loadError)
      const fallback = createDefaultLinearBarcodeProtocolConfig()
      setProtocolConfig(fallback)
      setRules(fallback.rules)
      setMockInputs(fallback.mockInput)
    } finally {
      setIsConfigLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadProtocolConfig()
  }, [loadProtocolConfig])

  useEffect(() => {
    if (!products.length) return
    const matched = products.some((product) => product.modelCode === mockInputs.model)
    if (!matched) {
      setMockInputs((prev) => ({ ...prev, model: products[0]?.modelCode || '01' }))
    }
  }, [mockInputs.model, products])

  const assembledCode = useMemo(() => {
    const { year, month, day, model, appearance, holePrefix, holes, serial } = mockInputs
    return `${year}${month}${day}${model}${appearance}${holePrefix}${holes}${serial}`.toUpperCase()
  }, [mockInputs])

  const parsedResult = useMemo(
    () =>
      parseLinearBarcodeCode(assembledCode, {
        appearanceMapping: appearanceMapping || undefined,
        products,
      }),
    [appearanceMapping, assembledCode, products],
  )

  const handleEditLogic = (segment: DMRuleSegment) => {
    if (segment.id === 'appearance') {
      setIsAppearanceDialogOpen(true)
      return
    }

    setSelectedSegment(segment)
    setIsConfigDialogOpen(true)
  }

  const handleSaveRule = (segmentId: string, newData: unknown) => {
    setRules((prev) =>
      prev.map((segment) => {
        if (segment.id !== segmentId) return segment
        if (Array.isArray(newData)) {
          return {
            ...segment,
            examples: newData.map((item: { key: string; value: string }) => `${item.key}=${item.value}`),
          }
        }
        return { ...segment, description: String(newData) }
      }),
    )
  }

  const requestNextSerial = useCallback(async () => {
    try {
      const nextSerial = await numberingService.generateNumber(protocolConfig.sequenceRuleKey)

      if (!/^\d{4}$/.test(nextSerial)) {
        throw new Error(
          t('basicSettings.linearBarcode.toasts.invalidSerialFormat', {
            key: protocolConfig.sequenceRuleKey,
          }),
        )
      }

      setMockInputs((prev) => ({ ...prev, serial: nextSerial }))
      toast.success(t('basicSettings.linearBarcode.toasts.requestSerialSuccess', { serial: nextSerial }))
    } catch (error) {
      const message = error instanceof Error ? error.message : t('basicSettings.linearBarcode.toasts.requestSerialFailed')

      if (message.includes('RuleKey') || message.includes('规则定义')) {
        toast.error(
          t('basicSettings.linearBarcode.toasts.sequenceRuleMissing', {
            key: protocolConfig.sequenceRuleKey,
          }),
        )
        return
      }

      toast.error(message)
    }
  }, [protocolConfig.sequenceRuleKey, t])

  const handleSaveProtocol = useCallback(
    async (nextRules: DMRuleSegment[] = rules, nextMockInputs: LinearBarcodeMockInputs = mockInputs) => {
      setIsConfigSaving(true)
      try {
        const nextConfig: LinearBarcodeProtocolConfig = {
          ...protocolConfig,
          rules: nextRules,
          mockInput: nextMockInputs,
        }
        const saved = await linearBarcodeProtocolService.updateConfig(nextConfig)
        setProtocolConfig(saved)
        setRules(saved.rules)
        setMockInputs(saved.mockInput)
        toast.success(t('basicSettings.linearBarcode.toasts.saveSuccess'))
        return saved
      } catch (error) {
        logger.error('Failed to save protocol config', error)
        toast.error(t('basicSettings.linearBarcode.toasts.saveFailed'))
        throw error
      } finally {
        setIsConfigSaving(false)
      }
    },
    [mockInputs, protocolConfig, rules, t],
  )

  const handleResetRules = async () => {
    if (confirmText !== resetConfirmationText) return

    const defaults = createDefaultLinearBarcodeProtocolConfig()

    try {
      await handleSaveProtocol(defaults.rules, defaults.mockInput)
      setConfirmText('')
      setIsResetDialogOpen(false)
      toast.success(t('basicSettings.linearBarcode.toasts.resetSuccess'))
    } catch {
      // Keep current edits when backend persistence fails.
    }
  }

  if (isForbiddenError(error)) {
    return <ForbiddenState />
  }

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <style
        dangerouslySetInnerHTML={{
          __html: `
                @keyframes scanMove {
                    0%, 100% { top: 0%; opacity: 0; }
                    20%, 80% { opacity: 1; }
                    50% { top: 100%; }
                }
            `,
        }}
      />

      <div className='flex flex-col gap-1 bg-muted/5 p-4 md:p-6 rounded-[32px] border border-dashed border-muted/50'>
        <div className='flex items-center gap-2 text-primary'>
          <Barcode className='size-4 text-primary' />
          <h3 className='text-lg font-black tracking-tighter italic uppercase'>{t('basicSettings.linearBarcode.page.title')}</h3>
        </div>
        <p className='text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60'>
          {t('basicSettings.linearBarcode.page.subtitle')}
        </p>
      </div>

      <div className='flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-muted/5 p-4 md:p-6 rounded-[24px] border border-dashed border-muted/50'>
        <div className='flex flex-wrap gap-3 items-center'>
          <Badge className='bg-emerald-500/10 text-emerald-600 border-none font-black text-[9px] px-4 h-6 tracking-widest uppercase rounded-full italic'>
            {t('basicSettings.linearBarcode.page.badges.active')}
          </Badge>
          <Badge className='bg-slate-500/10 text-slate-600 border-none font-black text-[9px] px-4 h-6 tracking-widest uppercase rounded-full italic'>
            {statusBadgeLabel}
          </Badge>
          <div className='w-px h-3 bg-muted-foreground/20 mx-2' />
          <span className='text-[10px] font-black text-muted-foreground/40 uppercase tracking-tight italic'>
            {t('basicSettings.linearBarcode.page.badges.payload')}
          </span>
        </div>

        <div className='flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0'>
          <Button
            className='w-full sm:w-auto rounded-full h-11 px-8 font-black text-[10px] uppercase tracking-widest'
            onClick={() => void handleSaveProtocol()}
            disabled={isConfigLoading || isConfigSaving}
          >
            <Save className='size-4 mr-2' />
            {isConfigSaving ? t('basicSettings.linearBarcode.page.actions.saving') : t('basicSettings.linearBarcode.page.actions.save')}
          </Button>
          {canOpenSequences ? (
            <Button
              variant='ghost'
              className='w-full sm:w-auto rounded-full h-11 px-8 font-black text-[10px] uppercase tracking-widest hover:bg-blue-500/5 hover:text-blue-600 transition-all'
              onClick={() => navigate({ to: '/basic-settings/sequences' })}
            >
              <Settings2 className='size-4 mr-2' /> {t('basicSettings.linearBarcode.page.actions.numberingRule')}
            </Button>
          ) : null}
          <Button
            variant='ghost'
            className='w-full sm:w-auto rounded-full h-11 px-8 font-black text-[10px] uppercase tracking-widest hover:bg-rose-500/5 hover:text-rose-600 transition-all'
            onClick={() => setIsResetDialogOpen(true)}
            disabled={isConfigSaving}
          >
            <RotateCcw className='size-4 mr-2' /> {t('basicSettings.linearBarcode.page.actions.reset')}
          </Button>
        </div>
      </div>

      <DMRulesTable
        rules={rules}
        appearanceMapping={appearanceMapping}
        onEdit={handleEditLogic}
        translationPrefix='basicSettings.linearBarcode'
        lengthLabel={locale === 'zh-CN' ? '位' : 'CHAR'}
      />

      <LinearBarcodeSimulationSection
        mockInputs={mockInputs}
        setMockInputs={setMockInputs}
        assembledCode={assembledCode}
        parsedResult={parsedResult}
        products={products}
        appearanceMapping={appearanceMapping as Record<string, { label?: string }> | null}
        monthOptions={monthOptions}
        dayOptions={DAY_OPTIONS}
        onRequestNextSerial={requestNextSerial}
        sequenceRuleKey={protocolConfig.sequenceRuleKey}
      />

      <div className='bg-background/40 p-6 lg:p-8 rounded-4xl border border-white/5 flex items-start gap-6'>
        <div className='p-4 bg-primary/10 rounded-2xl'>
          <Barcode className='size-6 text-primary' />
        </div>
        <div className='space-y-2'>
          <h4 className='text-sm font-black uppercase tracking-tight'>{t('basicSettings.linearBarcode.footer.title')}</h4>
          <p className='text-xs leading-relaxed text-muted-foreground/60 font-medium max-w-[820px]'>
            {t('basicSettings.linearBarcode.footer.description', { key: protocolConfig.sequenceRuleKey })}
          </p>
        </div>
      </div>

      <DMRuleConfigDialog
        open={isConfigDialogOpen}
        onOpenChange={setIsConfigDialogOpen}
        segment={selectedSegment}
        onSave={handleSaveRule}
        translationPrefix='basicSettings.linearBarcode'
        protocolLabel='LINEAR-CODE128-STABLE'
      />

      <AppearanceActionDialog open={isAppearanceDialogOpen} onOpenChange={setIsAppearanceDialogOpen} />

      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent className='max-w-2xl bg-background border-border p-0 rounded-4xl overflow-hidden shadow-2xl'>
          <div className='absolute inset-0 bg-linear-to-b from-rose-500/5 via-transparent to-transparent pointer-events-none' />
          <div className='relative p-8'>
            <DialogHeader className='mb-6'>
              <div className='size-14 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 mb-4 border border-rose-500/20 shadow-inner'>
                <RotateCcw className='size-7 animate-spin-reverse opacity-80' />
              </div>
              <DialogTitle className='text-xl font-black tracking-tighter uppercase italic'>{t('basicSettings.linearBarcode.resetDialog.title')}</DialogTitle>
              <DialogDescription className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mt-1 leading-relaxed'>
                {t('basicSettings.linearBarcode.resetDialog.description')}
              </DialogDescription>
            </DialogHeader>

            <div className='space-y-4'>
              <p className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 italic pl-1'>
                {t('basicSettings.linearBarcode.resetDialog.verifyPrompt')}
              </p>
              <div className='p-6 bg-muted/50 rounded-2xl border border-dashed border-muted/50 text-center select-none shadow-inner'>
                <span className='text-[11px] font-black tracking-[0.4em] text-slate-400'>{resetConfirmationText}</span>
              </div>
              <Input
                value={confirmText}
                onChange={(event) => setConfirmText(event.target.value)}
                placeholder={t('basicSettings.linearBarcode.resetDialog.placeholder')}
                className='h-12 rounded-2xl bg-muted/50 border-none font-black text-center text-sm focus:ring-1 focus:ring-rose-500/20 transition-all flex items-center px-4'
              />
            </div>
          </div>

          <DialogFooter className='p-8 pt-0 bg-transparent flex items-center justify-between gap-4'>
            <Button
              variant='ghost'
              className='flex-1 rounded-full h-11 font-black text-[10px] uppercase tracking-widest transition-colors hover:bg-muted'
              onClick={() => {
                setIsResetDialogOpen(false)
                setConfirmText('')
              }}
            >
              {t('basicSettings.linearBarcode.resetDialog.discard')}
            </Button>
            <Button
              className={cn(
                'flex-1 rounded-full h-11 px-8 font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 gap-2',
                confirmText === resetConfirmationText
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xl shadow-rose-500/20'
                  : 'bg-muted text-muted-foreground/20 cursor-not-allowed grayscale',
              )}
              onClick={handleResetRules}
              disabled={confirmText !== resetConfirmationText || isConfigSaving}
            >
              {t('basicSettings.linearBarcode.resetDialog.commit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

