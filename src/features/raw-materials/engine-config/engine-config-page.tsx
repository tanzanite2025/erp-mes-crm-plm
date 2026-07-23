import { useState } from 'react'
import { Sliders, Check, RotateCcw, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { SUPPORTED_CUT_ANGLE_OPTIONS } from '../utils/cut-orientation'
import { CuttingEnginePhysicalConstraintsPanel } from './components/cutting-engine-physical-constraints-panel'
import {
  DEFAULT_CUTTING_ENGINE_CONFIG,
  normalizeCuttingEngineConfig,
  type CuttingEngineConfig,
  type CuttingEngineAngleMixMode,
  type CuttingEngineDirectionStrategy,
  type CuttingEngineMixingStrategy,
  type CuttingEngineMustFulfillMode,
  type CuttingEngineOrderStrategy,
} from './types'
import { useCuttingEngineConfigStore } from './use-cutting-engine-config-store'

export function CuttingEngineConfigPage() {
  const { t } = useLanguage()
  const config = useCuttingEngineConfigStore((state) => state.config)
  const saveConfig = useCuttingEngineConfigStore((state) => state.saveConfig)
  const resetConfig = useCuttingEngineConfigStore((state) => state.resetConfig)

  // 规则与约束边界
  const [splitPenalty, setSplitPenalty] = useState(config.splitPenaltyWeight)
  const [mustFulfillPenalty, setMustFulfillPenalty] = useState(
    config.mustFulfillPenaltyWeight
  )
  const [directionSwitchPenalty, setDirectionSwitchPenalty] = useState(
    config.directionSwitchPenaltyWeight
  )
  const [sameDirectionPreferred, setSameDirectionPreferred] = useState(
    config.sameDirectionPreferred
  )
  const [angleMixMode, setAngleMixMode] = useState<CuttingEngineAngleMixMode>(
    config.angleMixMode
  )
  const [mustFulfillMode, setMustFulfillMode] =
    useState<CuttingEngineMustFulfillMode>(config.ruleStrategy.mustFulfillMode)
  const [mixingStrategy, setMixingStrategy] =
    useState<CuttingEngineMixingStrategy>(config.ruleStrategy.mixingStrategy)
  const [orderStrategy, setOrderStrategy] =
    useState<CuttingEngineOrderStrategy>(config.ruleStrategy.orderStrategy)
  const [directionStrategy, setDirectionStrategy] =
    useState<CuttingEngineDirectionStrategy>(
      config.ruleStrategy.directionStrategy
    )

  // 3. 物理与几何约束状态
  const [knifeGap, setKnifeGap] = useState(config.knifeGapMm)
  const [edgeTrim, setEdgeTrim] = useState(config.edgeTrimMm)
  const [maxSolveDurationSeconds, setMaxSolveDurationSeconds] = useState(
    config.maxSolveDurationSeconds
  )
  const [minSupportedLength, setMinSupportedLength] = useState(
    config.minSupportedLengthMm
  )
  const [maxSupportedLength, setMaxSupportedLength] = useState(
    config.maxSupportedLengthMm
  )
  const [fixedDecisionLength, setFixedDecisionLength] = useState(
    config.fixedDecisionLengthMm
  )

  const applyConfigToForm = (nextConfig: CuttingEngineConfig) => {
    setSplitPenalty(nextConfig.splitPenaltyWeight)
    setMustFulfillPenalty(nextConfig.mustFulfillPenaltyWeight)
    setDirectionSwitchPenalty(nextConfig.directionSwitchPenaltyWeight)
    setSameDirectionPreferred(nextConfig.sameDirectionPreferred)
    setAngleMixMode(nextConfig.angleMixMode)
    setMustFulfillMode(nextConfig.ruleStrategy.mustFulfillMode)
    setMixingStrategy(nextConfig.ruleStrategy.mixingStrategy)
    setOrderStrategy(nextConfig.ruleStrategy.orderStrategy)
    setDirectionStrategy(nextConfig.ruleStrategy.directionStrategy)
    setKnifeGap(nextConfig.knifeGapMm)
    setEdgeTrim(nextConfig.edgeTrimMm)
    setMaxSolveDurationSeconds(nextConfig.maxSolveDurationSeconds)
    setMinSupportedLength(nextConfig.minSupportedLengthMm)
    setMaxSupportedLength(nextConfig.maxSupportedLengthMm)
    setFixedDecisionLength(nextConfig.fixedDecisionLengthMm)
  }

  const angleMixModeLabels: Record<CuttingEngineAngleMixMode, string> = {
    allow: t(
      'rawMaterials.engineConfig.constraints.directionRules.angleMixMode.options.allow'
    ),
    'prefer-same-angle': t(
      'rawMaterials.engineConfig.constraints.directionRules.angleMixMode.options.prefer-same-angle'
    ),
    'strict-same-angle': t(
      'rawMaterials.engineConfig.constraints.directionRules.angleMixMode.options.strict-same-angle'
    ),
  }

  const renderStrategySelector = <T extends string>(
    value: T,
    options: Array<{ value: T; label: string; description: string }>,
    onChange: (value: T) => void
  ) => (
    <div className='grid gap-2 sm:grid-cols-3'>
      {options.map((option) => (
        <button
          key={option.value}
          type='button'
          onClick={() => onChange(option.value)}
          className={`rounded-2xl border px-3 py-2 text-left transition-all ${
            value === option.value
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-dashed border-border/50 bg-muted/20 text-muted-foreground hover:bg-muted/40'
          }`}
        >
          <span className='block text-[10px] font-black tracking-widest uppercase'>
            {option.label}
          </span>
          <span className='mt-1 block text-[8px] font-black tracking-widest uppercase opacity-60'>
            {option.description}
          </span>
        </button>
      ))}
    </div>
  )

  const resolveDirectionStrategyFromDetails = (
    nextAngleMixMode: CuttingEngineAngleMixMode,
    nextSameDirectionPreferred: boolean
  ): CuttingEngineDirectionStrategy => {
    if (nextAngleMixMode === 'strict-same-angle') return 'sameDirectionRequired'
    if (nextAngleMixMode === 'allow' && !nextSameDirectionPreferred)
      return 'allowSwitch'
    return 'sameDirectionPreferred'
  }

  const handleDirectionStrategyChange = (
    value: CuttingEngineDirectionStrategy
  ) => {
    setDirectionStrategy(value)
    if (value === 'sameDirectionRequired') {
      setSameDirectionPreferred(true)
      setAngleMixMode('strict-same-angle')
      return
    }
    if (value === 'allowSwitch') {
      setSameDirectionPreferred(false)
      setAngleMixMode('allow')
      return
    }
    setSameDirectionPreferred(true)
    setAngleMixMode('prefer-same-angle')
  }

  const handleAngleMixModeChange = (value: CuttingEngineAngleMixMode) => {
    const nextSameDirectionPreferred =
      value === 'allow' ? sameDirectionPreferred : true
    setAngleMixMode(value)
    setSameDirectionPreferred(nextSameDirectionPreferred)
    setDirectionStrategy(
      resolveDirectionStrategyFromDetails(value, nextSameDirectionPreferred)
    )
  }

  const handleSameDirectionPreferredChange = () => {
    const nextSameDirectionPreferred = !sameDirectionPreferred
    const nextAngleMixMode = nextSameDirectionPreferred ? angleMixMode : 'allow'
    setSameDirectionPreferred(nextSameDirectionPreferred)
    setAngleMixMode(nextAngleMixMode)
    setDirectionStrategy(
      resolveDirectionStrategyFromDetails(
        nextAngleMixMode,
        nextSameDirectionPreferred
      )
    )
  }

  const handlePhysicalConstraintChange = (
    key: keyof Pick<
      CuttingEngineConfig,
      'knifeGapMm' | 'edgeTrimMm' | 'maxSolveDurationSeconds'
    >,
    value: string
  ) => {
    if (key === 'knifeGapMm') {
      setKnifeGap(value)
      return
    }
    if (key === 'edgeTrimMm') {
      setEdgeTrim(value)
      return
    }
    setMaxSolveDurationSeconds(value)
  }

  // 预设模式切换逻辑 - 自动填充工业推荐配置
  // 保存操作
  const handleSave = () => {
    const normalizedConfig = normalizeCuttingEngineConfig({
      splitPenaltyWeight: splitPenalty,
      mustFulfillPenaltyWeight: mustFulfillPenalty,
      directionSwitchPenaltyWeight: directionSwitchPenalty,
      sameDirectionPreferred,
      angleMixMode,
      ruleStrategy: {
        mustFulfillMode,
        mixingStrategy,
        orderStrategy,
        directionStrategy,
      },
      knifeGapMm: knifeGap,
      edgeTrimMm: edgeTrim,
      maxSolveDurationSeconds,
      minSupportedLengthMm: minSupportedLength,
      maxSupportedLengthMm: maxSupportedLength,
      fixedDecisionLengthMm: fixedDecisionLength,
    })

    saveConfig(normalizedConfig)
    applyConfigToForm(normalizedConfig)
    toast.success(t('rawMaterials.engineConfig.toasts.saveSuccess'))
  }

  // 恢复默认
  const handleReset = () => {
    applyConfigToForm(DEFAULT_CUTTING_ENGINE_CONFIG)
    resetConfig()
    toast.info(t('rawMaterials.engineConfig.toasts.reset'))
  }

  return (
    <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
      {/* 页头 */}
      <IndustrialHeader
        icon={Sliders}
        title={t('rawMaterials.engineConfig.hero.title')}
        description={t('rawMaterials.engineConfig.hero.description')}
        gradient
      />

      {/* 主版面 */}
      <div className='grid gap-6 lg:grid-cols-3'>
        {/* 左列：规则边界与核心约束 */}
        <div className='flex flex-col gap-6 lg:col-span-2'>
          {/* 约束惩罚边界 */}
          <section className='relative flex flex-col gap-4 rounded-[24px] border border-dashed border-border/60 bg-muted/5 p-5'>
            <div className='pointer-events-none absolute inset-0 rounded-[24px] bg-linear-to-br from-primary/5 via-transparent' />
            <div>
              <h4 className='text-sm font-black tracking-tighter text-foreground/90 uppercase italic'>
                {t('rawMaterials.engineConfig.weights.title')}
              </h4>
              <p className='mt-1 text-[9px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                {t('rawMaterials.engineConfig.weights.description')}
              </p>
            </div>

            <div className='mt-2 grid gap-4 sm:grid-cols-2'>
              {/* 物理分切惩罚 */}
              <div className='flex flex-col gap-1.5'>
                <label className='flex justify-between text-[10px] font-black tracking-widest text-muted-foreground/80 uppercase'>
                  <span>
                    {t('rawMaterials.engineConfig.weights.splitPenalty')}
                  </span>
                  <span className='font-mono text-primary'>{splitPenalty}</span>
                </label>
                <div className='flex items-center gap-3'>
                  <input
                    type='range'
                    min='0'
                    max='50'
                    value={splitPenalty}
                    onChange={(e) => setSplitPenalty(e.target.value)}
                    className='h-1 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary'
                  />
                  <Input
                    type='number'
                    value={splitPenalty}
                    onChange={(e) => setSplitPenalty(e.target.value)}
                    className='h-9 w-14 rounded-lg border-none bg-background text-center font-mono text-xs'
                  />
                </div>
              </div>

              <div className='flex flex-col gap-1.5'>
                <label className='flex justify-between text-[10px] font-black tracking-widest text-muted-foreground/80 uppercase'>
                  <span>
                    {t('rawMaterials.engineConfig.weights.mustFulfillPenalty')}
                  </span>
                  <span className='font-mono text-primary'>
                    {mustFulfillPenalty}
                  </span>
                </label>
                <div className='flex items-center gap-3'>
                  <input
                    type='range'
                    min='0'
                    max='10000'
                    step='100'
                    value={mustFulfillPenalty}
                    onChange={(e) => setMustFulfillPenalty(e.target.value)}
                    className='h-1 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary'
                  />
                  <Input
                    type='number'
                    value={mustFulfillPenalty}
                    onChange={(e) => setMustFulfillPenalty(e.target.value)}
                    className='h-9 w-20 rounded-lg border-none bg-background text-center font-mono text-xs'
                  />
                </div>
              </div>
            </div>
          </section>

          <section className='relative flex flex-col gap-4 rounded-[24px] border border-dashed border-border/60 bg-muted/5 p-5'>
            <div className='pointer-events-none absolute inset-0 rounded-[24px] bg-linear-to-br from-primary/5 via-transparent' />
            <div>
              <h4 className='text-sm font-black tracking-tighter text-foreground/90 uppercase italic'>
                {t('rawMaterials.engineConfig.constraints.ruleStrategy.title')}
              </h4>
              <p className='mt-1 text-[9px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                {t(
                  'rawMaterials.engineConfig.constraints.ruleStrategy.description'
                )}
              </p>
            </div>

            <div className='grid gap-4'>
              <div className='grid gap-2'>
                <span className='text-[10px] font-black tracking-widest text-muted-foreground/80 uppercase'>
                  {t(
                    'rawMaterials.engineConfig.constraints.ruleStrategy.mustFulfillMode.label'
                  )}
                </span>
                {renderStrategySelector<CuttingEngineMustFulfillMode>(
                  mustFulfillMode,
                  [
                    {
                      value: 'strict',
                      label: t(
                        'rawMaterials.engineConfig.constraints.ruleStrategy.mustFulfillMode.options.strict.label'
                      ),
                      description: t(
                        'rawMaterials.engineConfig.constraints.ruleStrategy.mustFulfillMode.options.strict.description'
                      ),
                    },
                    {
                      value: 'soft-penalty',
                      label: t(
                        'rawMaterials.engineConfig.constraints.ruleStrategy.mustFulfillMode.options.soft-penalty.label'
                      ),
                      description: t(
                        'rawMaterials.engineConfig.constraints.ruleStrategy.mustFulfillMode.options.soft-penalty.description'
                      ),
                    },
                    {
                      value: 'ignore',
                      label: t(
                        'rawMaterials.engineConfig.constraints.ruleStrategy.mustFulfillMode.options.ignore.label'
                      ),
                      description: t(
                        'rawMaterials.engineConfig.constraints.ruleStrategy.mustFulfillMode.options.ignore.description'
                      ),
                    },
                  ],
                  setMustFulfillMode
                )}
              </div>

              <div className='grid gap-2'>
                <span className='text-[10px] font-black tracking-widest text-muted-foreground/80 uppercase'>
                  {t(
                    'rawMaterials.engineConfig.constraints.ruleStrategy.mixingStrategy.label'
                  )}
                </span>
                {renderStrategySelector<CuttingEngineMixingStrategy>(
                  mixingStrategy,
                  [
                    {
                      value: 'allow',
                      label: t(
                        'rawMaterials.engineConfig.constraints.ruleStrategy.mixingStrategy.options.allow.label'
                      ),
                      description: t(
                        'rawMaterials.engineConfig.constraints.ruleStrategy.mixingStrategy.options.allow.description'
                      ),
                    },
                    {
                      value: 'sameGroupOnly',
                      label: t(
                        'rawMaterials.engineConfig.constraints.ruleStrategy.mixingStrategy.options.sameGroupOnly.label'
                      ),
                      description: t(
                        'rawMaterials.engineConfig.constraints.ruleStrategy.mixingStrategy.options.sameGroupOnly.description'
                      ),
                    },
                    {
                      value: 'strictNoMix',
                      label: t(
                        'rawMaterials.engineConfig.constraints.ruleStrategy.mixingStrategy.options.strictNoMix.label'
                      ),
                      description: t(
                        'rawMaterials.engineConfig.constraints.ruleStrategy.mixingStrategy.options.strictNoMix.description'
                      ),
                    },
                  ],
                  setMixingStrategy
                )}
              </div>

              <div className='grid gap-2'>
                <span className='text-[10px] font-black tracking-widest text-muted-foreground/80 uppercase'>
                  {t(
                    'rawMaterials.engineConfig.constraints.ruleStrategy.orderStrategy.label'
                  )}
                </span>
                {renderStrategySelector<CuttingEngineOrderStrategy>(
                  orderStrategy,
                  [
                    {
                      value: 'respectOrder',
                      label: t(
                        'rawMaterials.engineConfig.constraints.ruleStrategy.orderStrategy.options.respectOrder.label'
                      ),
                      description: t(
                        'rawMaterials.engineConfig.constraints.ruleStrategy.orderStrategy.options.respectOrder.description'
                      ),
                    },
                    {
                      value: 'softPenalty',
                      label: t(
                        'rawMaterials.engineConfig.constraints.ruleStrategy.orderStrategy.options.softPenalty.label'
                      ),
                      description: t(
                        'rawMaterials.engineConfig.constraints.ruleStrategy.orderStrategy.options.softPenalty.description'
                      ),
                    },
                    {
                      value: 'ignore',
                      label: t(
                        'rawMaterials.engineConfig.constraints.ruleStrategy.orderStrategy.options.ignore.label'
                      ),
                      description: t(
                        'rawMaterials.engineConfig.constraints.ruleStrategy.orderStrategy.options.ignore.description'
                      ),
                    },
                  ],
                  setOrderStrategy
                )}
              </div>

              <div className='grid gap-3 rounded-[20px] border border-dashed border-primary/15 bg-background/70 p-3'>
                <div className='grid gap-2'>
                  <span className='text-[10px] font-black tracking-widest text-muted-foreground/80 uppercase'>
                    {t(
                      'rawMaterials.engineConfig.constraints.ruleStrategy.directionStrategy.label'
                    )}
                  </span>
                  {renderStrategySelector<CuttingEngineDirectionStrategy>(
                    directionStrategy,
                    [
                      {
                        value: 'sameDirectionPreferred',
                        label: t(
                          'rawMaterials.engineConfig.constraints.ruleStrategy.directionStrategy.options.sameDirectionPreferred.label'
                        ),
                        description: t(
                          'rawMaterials.engineConfig.constraints.ruleStrategy.directionStrategy.options.sameDirectionPreferred.description'
                        ),
                      },
                      {
                        value: 'sameDirectionRequired',
                        label: t(
                          'rawMaterials.engineConfig.constraints.ruleStrategy.directionStrategy.options.sameDirectionRequired.label'
                        ),
                        description: t(
                          'rawMaterials.engineConfig.constraints.ruleStrategy.directionStrategy.options.sameDirectionRequired.description'
                        ),
                      },
                      {
                        value: 'allowSwitch',
                        label: t(
                          'rawMaterials.engineConfig.constraints.ruleStrategy.directionStrategy.options.allowSwitch.label'
                        ),
                        description: t(
                          'rawMaterials.engineConfig.constraints.ruleStrategy.directionStrategy.options.allowSwitch.description'
                        ),
                      },
                    ],
                    handleDirectionStrategyChange
                  )}
                </div>

                <div className='grid gap-2'>
                  <span className='text-[10px] font-black tracking-widest text-muted-foreground/80 uppercase'>
                    {t(
                      'rawMaterials.engineConfig.constraints.directionRules.angleMixMode.label'
                    )}
                  </span>
                  <div className='grid gap-2 sm:grid-cols-3'>
                    {(
                      [
                        'allow',
                        'prefer-same-angle',
                        'strict-same-angle',
                      ] as const
                    ).map((mode) => (
                      <button
                        key={mode}
                        type='button'
                        onClick={() => handleAngleMixModeChange(mode)}
                        className={`rounded-2xl border px-3 py-2 text-left transition-all ${
                          angleMixMode === mode
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-dashed border-border/50 bg-muted/20 text-muted-foreground hover:bg-muted/40'
                        }`}
                      >
                        <span className='block text-[10px] font-black tracking-widest uppercase'>
                          {angleMixModeLabels[mode]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className='grid gap-3 md:grid-cols-[1fr_160px]'>
                  <div className='flex items-center justify-between gap-4 rounded-2xl bg-muted/20 px-3 py-2'>
                    <div className='flex flex-col'>
                      <span className='text-[10px] font-black tracking-widest text-muted-foreground/80 uppercase'>
                        {t(
                          'rawMaterials.engineConfig.constraints.directionRules.sameDirectionPreferred.label'
                        )}
                      </span>
                      <span className='mt-0.5 font-mono text-[8px] text-muted-foreground/60'>
                        {t(
                          'rawMaterials.engineConfig.constraints.directionRules.sameDirectionPreferred.hint'
                        )}
                      </span>
                    </div>
                    <button
                      type='button'
                      onClick={handleSameDirectionPreferredChange}
                      className={`h-8 rounded-full px-4 text-[10px] font-black tracking-widest uppercase ${
                        sameDirectionPreferred
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {sameDirectionPreferred ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  <div className='flex items-center justify-between gap-3 rounded-2xl bg-muted/20 px-3 py-2'>
                    <div className='flex flex-col'>
                      <span className='text-[10px] font-black tracking-widest text-muted-foreground/80 uppercase'>
                        {t(
                          'rawMaterials.engineConfig.constraints.directionRules.directionSwitchPenalty.label'
                        )}
                      </span>
                      <span className='mt-0.5 font-mono text-[8px] text-muted-foreground/60'>
                        {t(
                          'rawMaterials.engineConfig.constraints.directionRules.directionSwitchPenalty.hint'
                        )}
                      </span>
                    </div>
                    <Input
                      type='number'
                      value={directionSwitchPenalty}
                      onChange={(e) =>
                        setDirectionSwitchPenalty(e.target.value)
                      }
                      className='h-10 w-16 rounded-lg border-none bg-background pr-3 text-right font-mono text-xs'
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* 右列：物理公差与系统全局约束 */}
        <div className='flex flex-col gap-6'>
          <section className='relative flex flex-col gap-5 rounded-[24px] border border-dashed border-border/60 bg-muted/5 p-5'>
            <div className='pointer-events-none absolute inset-0 rounded-[24px] bg-linear-to-br from-primary/5 via-transparent' />

            <div>
              <h4 className='text-sm font-black tracking-tighter text-foreground/90 uppercase italic'>
                {t('rawMaterials.engineConfig.constraints.title')}
              </h4>
              <p className='mt-1 text-[9px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                {t('rawMaterials.engineConfig.constraints.description')}
              </p>
            </div>

            <div className='relative rounded-[20px] border border-dashed border-primary/15 bg-background/70 p-3'>
              <div>
                <h5 className='text-[10px] font-black tracking-widest text-foreground/80 uppercase'>
                  {t('rawMaterials.engineConfig.constraints.lengthRules.title')}
                </h5>
                <p className='mt-1 text-[8px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                  {t(
                    'rawMaterials.engineConfig.constraints.lengthRules.description'
                  )}
                </p>
              </div>

              <div className='mt-3 flex flex-col gap-4'>
                <div className='flex items-center justify-between gap-4'>
                  <div className='flex flex-col'>
                    <span className='text-[10px] font-black tracking-widest text-muted-foreground/80 uppercase'>
                      {t(
                        'rawMaterials.engineConfig.constraints.lengthRules.minSupportedLength.label'
                      )}
                    </span>
                    <span className='mt-0.5 font-mono text-[8px] text-muted-foreground/60'>
                      {t(
                        'rawMaterials.engineConfig.constraints.lengthRules.minSupportedLength.hint'
                      )}
                    </span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Input
                      type='text'
                      value={minSupportedLength}
                      onChange={(e) => setMinSupportedLength(e.target.value)}
                      className='h-10 w-24 rounded-lg border-none bg-background pr-3 text-right font-mono text-xs'
                    />
                    <span className='text-[10px] font-black text-muted-foreground/50'>
                      {t('rawMaterials.engineConfig.constraints.units.mm')}
                    </span>
                  </div>
                </div>

                <div className='flex items-center justify-between gap-4'>
                  <div className='flex flex-col'>
                    <span className='text-[10px] font-black tracking-widest text-muted-foreground/80 uppercase'>
                      {t(
                        'rawMaterials.engineConfig.constraints.lengthRules.maxSupportedLength.label'
                      )}
                    </span>
                    <span className='mt-0.5 font-mono text-[8px] text-muted-foreground/60'>
                      {t(
                        'rawMaterials.engineConfig.constraints.lengthRules.maxSupportedLength.hint'
                      )}
                    </span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Input
                      type='text'
                      value={maxSupportedLength}
                      onChange={(e) => setMaxSupportedLength(e.target.value)}
                      className='h-10 w-24 rounded-lg border-none bg-background pr-3 text-right font-mono text-xs'
                    />
                    <span className='text-[10px] font-black text-muted-foreground/50'>
                      {t('rawMaterials.engineConfig.constraints.units.mm')}
                    </span>
                  </div>
                </div>

                <div className='flex items-center justify-between gap-4'>
                  <div className='flex flex-col'>
                    <span className='text-[10px] font-black tracking-widest text-muted-foreground/80 uppercase'>
                      {t(
                        'rawMaterials.engineConfig.constraints.lengthRules.fixedDecisionLength.label'
                      )}
                    </span>
                    <span className='mt-0.5 font-mono text-[8px] text-muted-foreground/60'>
                      {t(
                        'rawMaterials.engineConfig.constraints.lengthRules.fixedDecisionLength.hint'
                      )}
                    </span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Input
                      type='text'
                      value={fixedDecisionLength}
                      onChange={(e) => setFixedDecisionLength(e.target.value)}
                      className='h-10 w-24 rounded-lg border-none bg-background pr-3 text-right font-mono text-xs'
                    />
                    <span className='text-[10px] font-black text-muted-foreground/50'>
                      {t('rawMaterials.engineConfig.constraints.units.mm')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className='relative rounded-[20px] border border-dashed border-primary/15 bg-background/70 p-3'>
              <div>
                <h5 className='text-[10px] font-black tracking-widest text-foreground/80 uppercase'>
                  {t('rawMaterials.engineConfig.constraints.angleRules.title')}
                </h5>
                <p className='mt-1 text-[8px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                  {t(
                    'rawMaterials.engineConfig.constraints.angleRules.description'
                  )}
                </p>
              </div>

              <div className='mt-3 grid gap-2'>
                <div className='flex flex-wrap gap-2'>
                  {SUPPORTED_CUT_ANGLE_OPTIONS.map((option) => (
                    <span
                      key={option.value}
                      className='inline-flex h-8 items-center rounded-full bg-primary/10 px-3 font-mono text-[10px] font-black text-primary'
                    >
                      {option.label}
                    </span>
                  ))}
                </div>
                <p className='text-[8px] leading-relaxed font-black tracking-widest text-muted-foreground/60 uppercase'>
                  {t('rawMaterials.engineConfig.constraints.angleRules.hint')}
                </p>
              </div>
            </div>

            {/* 物理参数输入框 */}
            <CuttingEnginePhysicalConstraintsPanel
              values={{
                knifeGapMm: knifeGap,
                edgeTrimMm: edgeTrim,
                maxSolveDurationSeconds,
              }}
              onChange={handlePhysicalConstraintChange}
              className='mt-2 flex flex-col gap-4'
            />
          </section>
        </div>
      </div>

      {/* 危险提示与保存动作栏 */}
      <div className='flex flex-col justify-between gap-4 rounded-[24px] border border-amber-500/20 bg-amber-500/5 p-4 md:flex-row md:items-center'>
        <div className='flex items-start gap-3'>
          <AlertTriangle className='mt-0.5 size-5 shrink-0 text-amber-600' />
          <div>
            <span className='block text-[10px] font-black tracking-widest text-amber-700 uppercase'>
              {t('rawMaterials.engineConfig.security.title')}
            </span>
            <p className='mt-1 max-w-3xl text-[9px] leading-relaxed font-black tracking-widest text-amber-600/70 uppercase'>
              {t('rawMaterials.engineConfig.security.description')}
            </p>
          </div>
        </div>

        <div className='flex shrink-0 gap-3 self-end md:self-auto'>
          {/* 恢复默认按钮 */}
          <Button
            variant='outline'
            onClick={handleReset}
            className='flex h-11 gap-2 rounded-full border-slate-300 px-6 text-[10px] font-black tracking-widest uppercase hover:bg-slate-100/50'
          >
            <RotateCcw className='size-3.5' />
            {t('rawMaterials.engineConfig.actions.reset')}
          </Button>

          {/* 保存配置按钮 */}
          <Button
            onClick={handleSave}
            className='flex h-11 gap-2 rounded-full bg-primary px-8 text-[10px] font-black tracking-widest text-primary-foreground uppercase shadow-sm hover:bg-primary/90'
          >
            <Check className='size-3.5' />
            {t('rawMaterials.engineConfig.actions.save')}
          </Button>
        </div>
      </div>
    </div>
  )
}
