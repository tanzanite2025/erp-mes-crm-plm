'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Barcode, Loader2, RotateCcw, Save, Settings2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { createLogger } from '@/lib/logger'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { canOpenRouteEntryNonBlocking } from '@/features/authz/guards/route-entry-access'
import { linearBarcodeProtocolService } from '@/features/basic-settings/services/linear-barcode-protocol-service'
import { numberingService } from '@/features/basic-settings/services/numbering-service'
import { HoleCodeSourceActionDialog } from '@/features/code-center/components/hole-code-source-action-dialog'
import { useActiveHoleCodeSource } from '@/features/code-center/hooks/use-hole-code-source'
import { useGetProducts } from '@/features/engineering/hooks/use-products'
import { AppearanceActionDialog } from '../components/appearance-action-dialog'
import { BarcodeRuleConfigDialog } from '../components/barcode-rule-config-dialog'
import { BarcodeRulesTable } from '../components/barcode-rules-table'
import { LinearBarcodeSimulationSection } from '../components/linear-barcode-simulation-section'
import {
  createDefaultLinearBarcodeProtocolConfig,
  DAY_OPTIONS,
  type LinearBarcodeProtocolConfig,
  type LinearBarcodeMockInputs,
} from '../data/linear-barcode-protocol'
import { type BarcodeRuleSegment } from '../data/linear-barcode-rules-config'
import { useAppearanceMapping } from '../hooks/use-appearance-mapping'
import { BASIC_SETTINGS_LINEAR_BARCODE_QUERY_KEY } from '../query-keys'
import { parseLinearBarcodeCode } from '../utils/linear-barcode-parser'

const logger = createLogger('LinearBarcodeMgmt')

export function LinearBarcodeMgmt() {
  const { t, locale } = useLanguage()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const canOpenSharedNumberingEngine = canOpenRouteEntryNonBlocking(
    user,
    '/code-center/shared-code-source/numbering-engine'
  )

  // --- 本地逻辑状态 (编辑态) ---
  const [rules, setRules] = useState<BarcodeRuleSegment[] | null>(null)
  const [mockInputs, setMockInputs] = useState<LinearBarcodeMockInputs | null>(
    null
  )

  // --- UI 状态 ---
  const [selectedSegment, setSelectedSegment] = useState<BarcodeRuleSegment | null>(
    null
  )
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false)
  const [isAppearanceDialogOpen, setIsAppearanceDialogOpen] = useState(false)
  const [isHoleCodeSourceDialogOpen, setIsHoleCodeSourceDialogOpen] =
    useState(false)
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [isConfigSaving, setIsConfigSaving] = useState(false)

  // --- 数据拉取 (服务端真相) ---
  const { data: products = [] } = useGetProducts()
  const { data: appearanceMapping = null } = useAppearanceMapping()
  const {
    activePrefixes: holePrefixSources,
    activeCounts: holeCountSources,
    combinationLabelMap,
  } = useActiveHoleCodeSource()
  const { data: protocolConfig, isLoading: isConfigLoading } = useQuery({
    queryKey: BASIC_SETTINGS_LINEAR_BARCODE_QUERY_KEY,
    queryFn: () => linearBarcodeProtocolService.getConfig(),
  })

  // --- 水合逻辑：仅在 protocolConfig 加载完成后初始化本地状态一次 ---
  useEffect(() => {
    if (protocolConfig && !rules && !mockInputs) {
      setRules(protocolConfig.rules)
      setMockInputs(protocolConfig.mockInput)
    }
  }, [protocolConfig, rules, mockInputs])

  // --- 衍生状态 ---
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

  const assembledCode = useMemo(() => {
    if (!mockInputs) return ''
    const { year, month, day, model, appearance, holePrefix, holes, serial } =
      mockInputs
    return `${year}${month}${day}${model}${appearance}${holePrefix}${holes}${serial}`.toUpperCase()
  }, [mockInputs])

  const parsedResult = useMemo(
    () =>
      parseLinearBarcodeCode(assembledCode, {
        appearanceMapping: appearanceMapping || undefined,
        products,
        holeCodeCombinationLabels: combinationLabelMap,
      }),
    [appearanceMapping, assembledCode, combinationLabelMap, products]
  )

  const statusBadgeLabel = isConfigLoading
    ? t('basicSettings.linearBarcode.page.badges.loading')
    : isConfigSaving
      ? t('basicSettings.linearBarcode.page.badges.saving')
      : t('basicSettings.linearBarcode.page.badges.synced')

  const resetConfirmationText = t(
    'basicSettings.linearBarcode.resetDialog.verifyTarget'
  )

  // --- 交互 Handler ---
  const handleEditLogic = (segment: BarcodeRuleSegment) => {
    if (segment.id === 'appearance') {
      setIsAppearanceDialogOpen(true)
      return
    }
    if (segment.id === 'holePrefix' || segment.id === 'holes') {
      setIsHoleCodeSourceDialogOpen(true)
      return
    }
    setSelectedSegment(segment)
    setIsConfigDialogOpen(true)
  }

  const handleSaveRule = (segmentId: string, newData: unknown) => {
    if (!rules) return
    const nextRules = rules.map((segment) => {
      if (segment.id !== segmentId) return segment
      if (Array.isArray(newData)) {
        return {
          ...segment,
          examples: newData.map(
            (item: { key: string; value: string }) =>
              `${item.key}=${item.value}`
          ),
        }
      }
      return { ...segment, description: String(newData) }
    })
    setRules(nextRules)
  }

  const requestNextSerial = useCallback(async () => {
    const sequenceRuleKey = protocolConfig?.sequenceRuleKey
    if (!sequenceRuleKey) {
      toast.error(t('basicSettings.linearBarcode.toasts.requestSerialFailed'))
      return
    }

    try {
      const nextSerial = await numberingService.generateNumber(sequenceRuleKey)
      if (!/^\d{4}$/.test(nextSerial)) {
        throw new Error(
          t('basicSettings.linearBarcode.toasts.invalidSerialFormat', {
            key: sequenceRuleKey,
          })
        )
      }

      setMockInputs((prev) => (prev ? { ...prev, serial: nextSerial } : null))
      toast.success(
        t('basicSettings.linearBarcode.toasts.requestSerialSuccess', {
          serial: nextSerial,
        })
      )
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t('basicSettings.linearBarcode.toasts.requestSerialFailed')
      toast.error(message)
    }
  }, [protocolConfig?.sequenceRuleKey, t])

  const handleSaveProtocol = useCallback(
    async (
      targetRules: BarcodeRuleSegment[] | null = rules,
      targetMockInputs: LinearBarcodeMockInputs | null = mockInputs
    ) => {
      if (!protocolConfig || !targetRules || !targetMockInputs) {
        toast.error(t('basicSettings.linearBarcode.toasts.saveFailed'))
        return
      }

      setIsConfigSaving(true)
      try {
        const payload: LinearBarcodeProtocolConfig = {
          ...protocolConfig,
          rules: targetRules,
          mockInput: targetMockInputs,
        }
        const saved = await linearBarcodeProtocolService.updateConfig(payload)
        queryClient.setQueryData(BASIC_SETTINGS_LINEAR_BARCODE_QUERY_KEY, saved)
        setRules(saved.rules)
        setMockInputs(saved.mockInput)
        toast.success(t('basicSettings.linearBarcode.toasts.saveSuccess'))
      } catch (error) {
        logger.error('Failed to save protocol config', error)
        toast.error(t('basicSettings.linearBarcode.toasts.saveFailed'))
      } finally {
        setIsConfigSaving(false)
      }
    },
    [protocolConfig, rules, mockInputs, queryClient, t]
  )

  const handleResetToDefaults = async () => {
    if (confirmText !== resetConfirmationText) return
    const defaults = createDefaultLinearBarcodeProtocolConfig()
    await handleSaveProtocol(defaults.rules, defaults.mockInput)
    setConfirmText('')
    setIsResetDialogOpen(false)
  }

  // --- 渲染逻辑 (严格 Loading 分支) ---
  if (isConfigLoading || !protocolConfig || !rules || !mockInputs) {
    return (
      <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
        <div className='flex flex-col gap-1 rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-4 md:p-6'>
          <div className='flex items-center gap-2 text-primary'>
            <div className='size-5 animate-pulse rounded-lg bg-primary/20' />
            <div className='h-8 w-48 animate-pulse rounded-lg bg-muted' />
          </div>
          <div className='mt-1 h-3 w-32 animate-pulse rounded bg-muted/40' />
        </div>
        <div className='flex h-[400px] w-full items-center justify-center rounded-[24px] border border-dashed border-muted/30 bg-muted/10'>
          <div className='flex flex-col items-center gap-3'>
            <Loader2 className='size-10 animate-spin text-primary' />
            <p className='text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase italic'>
              {t('basicSettings.linearBarcode.page.badges.loading')}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
      <div className='flex flex-col gap-1 rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-4 md:p-6'>
        <div className='flex items-center gap-2 text-primary'>
          <Barcode className='size-4' />
          <h3 className='text-lg font-black tracking-tighter uppercase italic'>
            {t('basicSettings.linearBarcode.page.title')}
          </h3>
        </div>
        <p className='text-[9px] font-black tracking-widest text-muted-foreground uppercase opacity-60'>
          {t('basicSettings.linearBarcode.page.subtitle')}
        </p>
      </div>

      <div className='flex flex-col items-start justify-between gap-4 rounded-[24px] border border-dashed border-muted/50 bg-muted/5 p-4 sm:flex-row sm:items-center md:p-6'>
        <div className='flex flex-wrap items-center gap-3'>
          <Badge className='h-6 rounded-full border-none bg-emerald-500/10 px-4 text-[9px] font-black tracking-widest text-emerald-600 uppercase italic'>
            {t('basicSettings.linearBarcode.page.badges.active')}
          </Badge>
          <Badge className='h-6 rounded-full border-none bg-slate-500/10 px-4 text-[9px] font-black tracking-widest text-slate-600 uppercase italic'>
            {statusBadgeLabel}
          </Badge>
        </div>

        <div className='flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row'>
          <Button
            className='h-11 w-full rounded-full px-8 text-[10px] font-black tracking-widest uppercase sm:w-auto'
            onClick={() => void handleSaveProtocol()}
            disabled={isConfigSaving}
          >
            <Save className='mr-2 size-4' />
            {isConfigSaving
              ? t('basicSettings.linearBarcode.page.actions.saving')
              : t('basicSettings.linearBarcode.page.actions.save')}
          </Button>
          {canOpenSharedNumberingEngine && (
            <Button
              variant='ghost'
              className='h-11 w-full rounded-full px-8 text-[10px] font-black tracking-widest uppercase sm:w-auto'
              onClick={() =>
                navigate({ to: '/code-center/shared-code-source/numbering-engine' })
              }
            >
              <Settings2 className='mr-2 size-4' />
              {t('codeCenter.sharedCodeSource.tabs.numberingEngine')}
            </Button>
          )}
          <Button
            variant='ghost'
            className='h-11 w-full rounded-full px-8 text-[10px] font-black tracking-widest uppercase hover:text-rose-600 sm:w-auto'
            onClick={() => setIsResetDialogOpen(true)}
          >
            <RotateCcw className='mr-2 size-4' />
            {t('basicSettings.linearBarcode.page.actions.reset')}
          </Button>
        </div>
      </div>

      <BarcodeRulesTable
        rules={rules}
        appearanceMapping={appearanceMapping}
        onEdit={handleEditLogic}
        translationPrefix='basicSettings.linearBarcode'
        lengthLabel={locale === 'zh-CN' ? '位' : 'CHAR'}
        readOnlySegmentIds={['appearance', 'holePrefix', 'holes']}
        segmentPreviewValues={{
          holePrefix: holePrefixSources.map(
            (item) => `${item.code}=${item.label || item.code}`
          ),
          holes: holeCountSources.map(
            (item) => `${item.value}=${item.label || item.value}`
          ),
        }}
      />

      <LinearBarcodeSimulationSection
        mockInputs={mockInputs}
        setMockInputs={(updater) => {
          setMockInputs((prev) =>
            typeof updater === 'function' ? updater(prev!) : updater
          )
        }}
        assembledCode={assembledCode}
        parsedResult={parsedResult}
        products={products}
        appearanceMapping={
          appearanceMapping as Record<string, { label?: string }> | null
        }
        holePrefixSources={holePrefixSources}
        holeCountSources={holeCountSources}
        monthOptions={monthOptions}
        dayOptions={DAY_OPTIONS}
        onRequestNextSerial={requestNextSerial}
        sequenceRuleKey={protocolConfig.sequenceRuleKey}
      />

      <BarcodeRuleConfigDialog
        open={isConfigDialogOpen}
        onOpenChange={setIsConfigDialogOpen}
        segment={selectedSegment}
        onSave={handleSaveRule}
        translationPrefix='basicSettings.linearBarcode'
        protocolLabel='LINEAR-CODE128-STABLE'
      />

      <AppearanceActionDialog
        open={isAppearanceDialogOpen}
        onOpenChange={setIsAppearanceDialogOpen}
      />
      <HoleCodeSourceActionDialog
        open={isHoleCodeSourceDialogOpen}
        onOpenChange={setIsHoleCodeSourceDialogOpen}
      />

      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent className='max-w-2xl overflow-hidden rounded-[32px]'>
          <DialogHeader className='p-8'>
            <div className='mb-4 flex size-14 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-500'>
              <RotateCcw className='size-7' />
            </div>
            <DialogTitle className='text-xl font-black uppercase italic'>
              {t('basicSettings.linearBarcode.resetDialog.title')}
            </DialogTitle>
            <DialogDescription className='text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
              {t('basicSettings.linearBarcode.resetDialog.description')}
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 p-8'>
            <div className='rounded-2xl border border-dashed border-muted/50 bg-muted/50 p-6 text-center select-none'>
              <span className='text-[11px] font-black tracking-[0.4em] text-slate-400'>
                {resetConfirmationText}
              </span>
            </div>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={t(
                'basicSettings.linearBarcode.resetDialog.placeholder'
              )}
              className='h-12 rounded-2xl text-center font-black'
            />
          </div>

          <DialogFooter className='flex gap-4 p-8'>
            <Button
              variant='ghost'
              className='flex-1 rounded-full'
              onClick={() => setIsResetDialogOpen(false)}
            >
              {t('common.actions.cancel')}
            </Button>
            <Button
              className='flex-1 rounded-full bg-rose-600 hover:bg-rose-700'
              disabled={confirmText !== resetConfirmationText || isConfigSaving}
              onClick={handleResetToDefaults}
            >
              {t('basicSettings.linearBarcode.resetDialog.commit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
