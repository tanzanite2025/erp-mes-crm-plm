import { useState } from 'react'
import { Sliders, Check, RotateCcw, AlertTriangle } from 'lucide-react'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLanguage } from '@/context/language-provider'
import { toast } from 'sonner'

type ObjectivePreset = 'yield-first' | 'stability-first'

export function CuttingEngineConfigPage() {
  const { t } = useLanguage()

  // 1. 求解预设配置
  const [objectivePreset, setObjectivePreset] = useState<ObjectivePreset>('yield-first')

  // 2. 权重配置状态
  const [utilizationWeight, setUtilizationWeight] = useState('55')
  const [stabilityWeight, setStabilityWeight] = useState('10')
  const [splitPenalty, setSplitPenalty] = useState('6')

  // 3. 物理与几何约束状态
  const [knifeGap, setKnifeGap] = useState('2.0')
  const [edgeTrim, setEdgeTrim] = useState('10.0')
  const [timeout, setTimeoutSec] = useState('30')
  const [, setTolerance] = useState('0.5')
  const [minSupportedLength, setMinSupportedLength] = useState('80.0')
  const [maxSupportedLength, setMaxSupportedLength] = useState('1200.0')
  const [fixedDecisionLength, setFixedDecisionLength] = useState('91.0')
  
  // 5. 保存状态
  const [isSaving, setIsSaving] = useState(false)

  const getObjectivePresetLabel = (value: ObjectivePreset) => {
    if (value === 'yield-first') return t('rawMaterials.engineConfig.preset.options.yieldFirst.label')
    return t('rawMaterials.engineConfig.preset.options.stabilityFirst.label')
  }

  // 预设模式切换逻辑 - 自动填充工业推荐配置
  const handlePresetChange = (value: ObjectivePreset) => {
    setObjectivePreset(value)
    if (value === 'yield-first') {
      setUtilizationWeight('70')
      setStabilityWeight('15')
      setSplitPenalty('8')
    } else {
      setUtilizationWeight('45')
      setStabilityWeight('45')
      setSplitPenalty('5')
    }
    toast.info(t('rawMaterials.engineConfig.toasts.presetChanged', {
      preset: getObjectivePresetLabel(value),
    }))
  }

  // 保存操作
  const handleSave = () => {
    setIsSaving(true)
    setTimeout(() => {
      setIsSaving(false)
      toast.success(t('rawMaterials.engineConfig.toasts.saveSuccess'))
    }, 1200)
  }

  // 恢复默认
  const handleReset = () => {
    setObjectivePreset('yield-first')
    setUtilizationWeight('55')
    setStabilityWeight('10')
    setSplitPenalty('6')
    setKnifeGap('2.0')
    setEdgeTrim('10.0')
    setTimeoutSec('30')
    setTolerance('0.5')
    setMinSupportedLength('80.0')
    setMaxSupportedLength('1200.0')
    setFixedDecisionLength('91.0')
    toast.info(t('rawMaterials.engineConfig.toasts.reset'))
  }

  const tabs = [
    {
      key: 'engine-tuning',
      label: t('rawMaterials.engineConfig.tab'),
      href: '/raw-materials-engine/config',
    },
  ]

  return (
    <ModuleTabbedLayout tabs={tabs}>
      <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
        {/* 页头 */}
        <IndustrialHeader
          icon={Sliders}
          title={t('rawMaterials.engineConfig.hero.title')}
          description={t('rawMaterials.engineConfig.hero.description')}
          gradient
        />

        {/* 主版面 */}
        <div className='grid gap-6 lg:grid-cols-3'>
          
          {/* 左列：算法预设与核心打分权重 */}
          <div className='lg:col-span-2 flex flex-col gap-6'>
            
            {/* 求解预设卡片 */}
            <section className='relative rounded-[24px] border border-dashed border-border/60 bg-muted/5 p-5 flex flex-col gap-4'>
              <div className='absolute inset-0 bg-linear-to-br from-primary/5 via-transparent pointer-events-none rounded-[24px]' />
              <div>
                <h4 className='text-sm font-black tracking-tighter italic text-foreground/90 uppercase'>
                  {t('rawMaterials.engineConfig.preset.title')}
                </h4>
                <p className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mt-1'>
                  {t('rawMaterials.engineConfig.preset.description')}
                </p>
              </div>

              <div className='grid gap-3 sm:grid-cols-2 mt-1'>
                {([
                  {
                    id: 'yield-first',
                    label: t('rawMaterials.engineConfig.preset.options.yieldFirst.label'),
                    desc: t('rawMaterials.engineConfig.preset.options.yieldFirst.description'),
                  },
                  {
                    id: 'stability-first',
                    label: t('rawMaterials.engineConfig.preset.options.stabilityFirst.label'),
                    desc: t('rawMaterials.engineConfig.preset.options.stabilityFirst.description'),
                  },
                ] as const).map((item) => (
                  <button
                    key={item.id}
                    type='button'
                    onClick={() => handlePresetChange(item.id)}
                    className={`flex flex-col text-left p-4 rounded-2xl border transition-all ${
                      objectivePreset === item.id
                        ? 'border-primary bg-primary/5 shadow-inner'
                        : 'border-border/40 bg-background hover:bg-muted/30'
                    }`}
                  >
                    <span className='text-xs font-black tracking-tight'>{item.label}</span>
                    <span className='text-[9px] font-semibold text-muted-foreground/80 mt-1.5 leading-relaxed'>
                      {item.desc}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {/* 打分权重调节卡片 */}
            <section className='relative rounded-[24px] border border-dashed border-border/60 bg-muted/5 p-5 flex flex-col gap-4'>
              <div className='absolute inset-0 bg-linear-to-br from-primary/5 via-transparent pointer-events-none rounded-[24px]' />
              <div>
                <h4 className='text-sm font-black tracking-tighter italic text-foreground/90 uppercase'>
                  {t('rawMaterials.engineConfig.weights.title')}
                </h4>
                <p className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mt-1'>
                  {t('rawMaterials.engineConfig.weights.description')}
                </p>
              </div>

              <div className='grid gap-4 sm:grid-cols-2 mt-2'>
                {/* 利用率权重 */}
                <div className='flex flex-col gap-1.5'>
                  <label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 flex justify-between'>
                    <span>{t('rawMaterials.engineConfig.weights.utilization')}</span>
                    <span className='font-mono text-primary'>{utilizationWeight}%</span>
                  </label>
                  <div className='flex gap-3 items-center'>
                    <input
                      type='range'
                      min='0'
                      max='100'
                      value={utilizationWeight}
                      onChange={(e) => setUtilizationWeight(e.target.value)}
                      className='h-1 w-full bg-muted rounded-lg appearance-none cursor-pointer accent-primary'
                    />
                    <Input
                      type='number'
                      value={utilizationWeight}
                      onChange={(e) => setUtilizationWeight(e.target.value)}
                      className='h-9 w-14 rounded-lg bg-background text-center text-xs font-mono border-none'
                    />
                  </div>
                </div>

                {/* 稳定性权重 */}
                <div className='flex flex-col gap-1.5'>
                  <label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 flex justify-between'>
                    <span>{t('rawMaterials.engineConfig.weights.stability')}</span>
                    <span className='font-mono text-primary'>{stabilityWeight}%</span>
                  </label>
                  <div className='flex gap-3 items-center'>
                    <input
                      type='range'
                      min='0'
                      max='100'
                      value={stabilityWeight}
                      onChange={(e) => setStabilityWeight(e.target.value)}
                      className='h-1 w-full bg-muted rounded-lg appearance-none cursor-pointer accent-primary'
                    />
                    <Input
                      type='number'
                      value={stabilityWeight}
                      onChange={(e) => setStabilityWeight(e.target.value)}
                      className='h-9 w-14 rounded-lg bg-background text-center text-xs font-mono border-none'
                    />
                  </div>
                </div>

                {/* 物理分切惩罚 */}
                <div className='flex flex-col gap-1.5'>
                  <label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 flex justify-between'>
                    <span>{t('rawMaterials.engineConfig.weights.splitPenalty')}</span>
                    <span className='font-mono text-primary'>{splitPenalty}</span>
                  </label>
                  <div className='flex gap-3 items-center'>
                    <input
                      type='range'
                      min='0'
                      max='50'
                      value={splitPenalty}
                      onChange={(e) => setSplitPenalty(e.target.value)}
                      className='h-1 w-full bg-muted rounded-lg appearance-none cursor-pointer accent-primary'
                    />
                    <Input
                      type='number'
                      value={splitPenalty}
                      onChange={(e) => setSplitPenalty(e.target.value)}
                      className='h-9 w-14 rounded-lg bg-background text-center text-xs font-mono border-none'
                    />
                  </div>
                </div>

              </div>
            </section>
          </div>

          {/* 右列：物理公差与系统全局约束 */}
          <div className='flex flex-col gap-6'>
            <section className='relative rounded-[24px] border border-dashed border-border/60 bg-muted/5 p-5 flex flex-col gap-5'>
              <div className='absolute inset-0 bg-linear-to-br from-primary/5 via-transparent pointer-events-none rounded-[24px]' />
              
              <div>
                <h4 className='text-sm font-black tracking-tighter italic text-foreground/90 uppercase'>
                  {t('rawMaterials.engineConfig.constraints.title')}
                </h4>
                <p className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mt-1'>
                  {t('rawMaterials.engineConfig.constraints.description')}
                </p>
              </div>

              <div className='relative rounded-[20px] border border-dashed border-primary/15 bg-background/70 p-3'>
                <div>
                  <h5 className='text-[10px] font-black uppercase tracking-widest text-foreground/80'>
                    {t('rawMaterials.engineConfig.constraints.lengthRules.title')}
                  </h5>
                  <p className='mt-1 text-[8px] font-black uppercase tracking-widest text-muted-foreground/60'>
                    {t('rawMaterials.engineConfig.constraints.lengthRules.description')}
                  </p>
                </div>

                <div className='mt-3 flex flex-col gap-4'>
                  <div className='flex items-center justify-between gap-4'>
                    <div className='flex flex-col'>
                      <span className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/80'>
                        {t('rawMaterials.engineConfig.constraints.lengthRules.minSupportedLength.label')}
                      </span>
                      <span className='mt-0.5 text-[8px] font-mono text-muted-foreground/60'>
                        {t('rawMaterials.engineConfig.constraints.lengthRules.minSupportedLength.hint')}
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
                      <span className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/80'>
                        {t('rawMaterials.engineConfig.constraints.lengthRules.maxSupportedLength.label')}
                      </span>
                      <span className='mt-0.5 text-[8px] font-mono text-muted-foreground/60'>
                        {t('rawMaterials.engineConfig.constraints.lengthRules.maxSupportedLength.hint')}
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
                      <span className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/80'>
                        {t('rawMaterials.engineConfig.constraints.lengthRules.fixedDecisionLength.label')}
                      </span>
                      <span className='mt-0.5 text-[8px] font-mono text-muted-foreground/60'>
                        {t('rawMaterials.engineConfig.constraints.lengthRules.fixedDecisionLength.hint')}
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

              {/* 物理参数输入框 */}
              <div className='flex flex-col gap-4 mt-2'>
                <div className='flex items-center justify-between gap-4'>
                  <div className='flex flex-col'>
                    <span className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/80'>
                      {t('rawMaterials.engineConfig.constraints.knifeGap.label')}
                    </span>
                    <span className='text-[8px] font-mono text-muted-foreground/60 mt-0.5'>
                      {t('rawMaterials.engineConfig.constraints.knifeGap.hint')}
                    </span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Input
                      type='text'
                      value={knifeGap}
                      onChange={(e) => setKnifeGap(e.target.value)}
                      className='h-10 w-24 rounded-lg bg-background text-right pr-3 text-xs font-mono border-none'
                    />
                    <span className='text-[10px] font-black text-muted-foreground/50'>
                      {t('rawMaterials.engineConfig.constraints.units.mm')}
                    </span>
                  </div>
                </div>

                <div className='flex items-center justify-between gap-4'>
                  <div className='flex flex-col'>
                    <span className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/80'>
                      {t('rawMaterials.engineConfig.constraints.edgeTrim.label')}
                    </span>
                    <span className='text-[8px] font-mono text-muted-foreground/60 mt-0.5'>
                      {t('rawMaterials.engineConfig.constraints.edgeTrim.hint')}
                    </span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Input
                      type='text'
                      value={edgeTrim}
                      onChange={(e) => setEdgeTrim(e.target.value)}
                      className='h-10 w-24 rounded-lg bg-background text-right pr-3 text-xs font-mono border-none'
                    />
                    <span className='text-[10px] font-black text-muted-foreground/50'>
                      {t('rawMaterials.engineConfig.constraints.units.mm')}
                    </span>
                  </div>
                </div>

                <div className='flex items-center justify-between gap-4'>
                  <div className='flex flex-col'>
                    <span className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/80'>
                      {t('rawMaterials.engineConfig.constraints.timeout.label')}
                    </span>
                    <span className='text-[8px] font-mono text-muted-foreground/60 mt-0.5'>
                      {t('rawMaterials.engineConfig.constraints.timeout.hint')}
                    </span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Input
                      type='text'
                      value={timeout}
                      onChange={(e) => setTimeoutSec(e.target.value)}
                      className='h-10 w-24 rounded-lg bg-background text-right pr-3 text-xs font-mono border-none'
                    />
                    <span className='text-[10px] font-black text-muted-foreground/50'>
                      {t('rawMaterials.engineConfig.constraints.units.sec')}
                    </span>
                  </div>
                </div>
              </div>

            </section>
          </div>
        </div>

        {/* 危险提示与保存动作栏 */}
        <div className='rounded-[24px] border border-amber-500/20 bg-amber-500/5 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4'>
          <div className='flex gap-3 items-start'>
            <AlertTriangle className='size-5 text-amber-600 shrink-0 mt-0.5' />
            <div>
              <span className='text-[10px] font-black uppercase tracking-widest text-amber-700 block'>
                {t('rawMaterials.engineConfig.security.title')}
              </span>
              <p className='text-[9px] font-black uppercase tracking-widest text-amber-600/70 mt-1 leading-relaxed max-w-3xl'>
                {t('rawMaterials.engineConfig.security.description')}
              </p>
            </div>
          </div>

          <div className='flex gap-3 shrink-0 self-end md:self-auto'>
            {/* 恢复默认按钮 */}
            <Button
              variant='outline'
              onClick={handleReset}
              className='rounded-full h-11 px-6 font-black text-[10px] uppercase tracking-widest border-slate-300 hover:bg-slate-100/50 flex gap-2'
            >
              <RotateCcw className='size-3.5' />
              {t('rawMaterials.engineConfig.actions.reset')}
            </Button>
            
            {/* 保存配置按钮 */}
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className='rounded-full h-11 px-8 font-black text-[10px] uppercase tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 flex gap-2 shadow-sm'
            >
              {isSaving ? (
                <>
                  <span className='animate-spin size-3.5 border-2 border-primary-foreground border-t-transparent rounded-full' />
                  {t('rawMaterials.engineConfig.actions.saving')}
                </>
              ) : (
                <>
                  <Check className='size-3.5' />
                  {t('rawMaterials.engineConfig.actions.save')}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </ModuleTabbedLayout>
  )
}
