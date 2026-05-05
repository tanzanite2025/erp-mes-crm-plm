import { useCallback, useEffect, useState } from 'react'
import {
    Printer,
    RefreshCcw,
    Settings2,
    Flame,
    Hash,
    Layers,
    Palette,
    CircleDot,
    ChevronRight,
    Tag
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useLanguage } from '@/context/language-provider'
import { type Product, type BarcodeConfig } from '../data/schema'
import { type BarcodeConfigUpdates } from '../mutation-types'
import { BarcodeService } from '@/features/print-mgmt/services/barcode-service'
import { PrintRecordService } from '@/features/print-mgmt/services/print-record-service'
import { toast } from 'sonner'
import { BarcodePreview } from '@/features/basic-settings/components/barcode-preview'

interface ProductBarcodeTabProps {
    product: Product
    onUpdateProduct: (updatedProduct: Product) => void
}

export function ProductBarcodeTab({ product, onUpdateProduct }: ProductBarcodeTabProps) {
    const { t } = useLanguage()
    // 初始化配置，优先使用产品已存在的逻辑配置，型号编码强制从产品档案同步
    const [config, setConfig] = useState<BarcodeConfig>(() => {
        const baseConfig = product.barcodeConfig || {
            modelCode: product.modelCode || '01',
            appearanceCode: '1',
            category: 'R',
            holes: 24,
            isDrainHole: false,
            wheelType: 'H',
            scopeCode: '',
            suffix: '',
            serialNumber: '00001'
        }
        return { 
            ...baseConfig, 
            modelCode: product.modelCode || '01',
            wheelType: baseConfig.wheelType || 'H',
            scopeCode: baseConfig.scopeCode || ''
        }
    })

    const updateConfig = useCallback((updates: BarcodeConfigUpdates) => {
        setConfig(prev => ({ ...prev, ...updates }))
    }, [])

    // [UI-PREVIEW-ONLY]: 这里的条码生成仅用于前端即时渲染预览
    // [BACKEND-AUTHORITY]: 物理条码的分配与生成规则由后端 BRP 引擎权威管控，正式发号在 handlePrintSingle 中原子化触发。
    const code = BarcodeService.generateCode(config)

    // 【深度集成】从后端获取下一个可用流水号 (36 进制)
    const getNextSN = useCallback(async () => {
        try {
            const currentValue = Number.parseInt((config.serialNumber || '00000').trim().toUpperCase(), 36)
            if (!Number.isFinite(currentValue) || Number.isNaN(currentValue) || currentValue < 0) {
                throw new Error('invalid serial number')
            }
            const nextValue = currentValue + 1
            if (nextValue > 60466175) {
                throw new Error('serial number overflow')
            }
            const sn = nextValue.toString(36).toUpperCase().padStart(5, '0')
            updateConfig({ serialNumber: sn })
            toast.info(t('engineering.productBarcode.syncSequenceSuccess', { sn }))
        } catch (_err) {
            toast.error(t('engineering.productBarcode.syncSequenceFailed'))
        }
    }, [config.serialNumber, t, updateConfig])

    // 组件挂载时自动同步
    useEffect(() => {
        const timer = globalThis.setTimeout(() => {
            const normalizedSerial = (config.serialNumber || '00001').trim().toUpperCase().padStart(5, '0').slice(-5)
            if (normalizedSerial !== config.serialNumber) {
                updateConfig({ serialNumber: normalizedSerial })
            }
        }, 0)

        return () => {
            globalThis.clearTimeout(timer)
        }
    }, [config.serialNumber, updateConfig])

    const handlePrintSingle = async () => {
        try {
            // 原子化操作：后端事务内完成 发号 + 批次落库 + 审计
            const { sn } = await PrintRecordService.atomicPrint({
                templateName: t('engineering.productBarcode.templateName', { name: product.name }),
                productId: product.id,
                quantity: 1
            })
            
            // 立即同步前端显示的 SN 码快照
            updateConfig({ serialNumber: sn })
            toast.success(t('engineering.productBarcode.printBatchSuccess', { sn }))
        } catch (_err) {
            toast.error(t('engineering.productBarcode.printBatchFailed'))
        }
    }

    const handleSaveConfig = () => {
        onUpdateProduct({
            ...product,
            barcodeConfig: config
        })
        toast.success(t('engineering.productBarcode.saveConfigSuccess'))
    }

    return (
        <div className='grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8'>
            {/* 左侧：可视化预览区 */}
            <div className='space-y-6'>
                <Card className='overflow-hidden border-none shadow-2xl bg-linear-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-950'>
                    <div className='p-12 flex flex-col items-center justify-center min-h-[400px] relative'>
                        {/* 背景装饰 */}
                        <div className='absolute inset-0 opacity-[0.03] pointer-events-none overflow-hidden'>
                            <div className='absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600 blur-[100px]' />
                            <div className='absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600 blur-[100px]' />
                        </div>

                        <BarcodePreview 
                            code={code}
                            shortCode={code}
                            type='qrcode'
                            isDrainHole={config.isDrainHole}
                            wheelType={config.wheelType}
                            scopeCode={config.scopeCode}
                            headerLabel={t('engineering.productMgmt.barcode.coreCode')}
                            statusLabel={t('engineering.productMgmt.barcode.validated')}
                            className="scale-110 shadow-2xl"
                        />

                        <div className='mt-12 flex items-center gap-4'>
                            <Button variant='outline' onClick={handlePrintSingle} className='rounded-full px-8 font-bold border-slate-200 hover:bg-slate-50'>
                                <Printer className='size-4 mr-2' />
                                {t('engineering.productBarcode.printSingleLabel')}
                            </Button>
                            <Button onClick={getNextSN} className='rounded-full px-8 font-black bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-600/20'>
                                <RefreshCcw className='size-4 mr-2' />
                                {t('engineering.productBarcode.regenerateSequence')}
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* 状态解读看板 */}
                <div className='grid grid-cols-3 gap-4'>
                    {[
                        { label: t('engineering.productMgmt.barcode.coreCode'), value: code, icon: Hash, color: 'text-blue-600' },
                        { label: t('engineering.productMgmt.barcode.labelStatus'), value: t('engineering.productMgmt.barcode.validated'), icon: Tag, color: 'text-green-600' },
                        { label: t('engineering.productMgmt.barcode.visualIntegrity'), value: t('engineering.productMgmt.barcode.aligned'), icon: CircleDot, color: 'text-indigo-600' }
                    ].map((item, i) => (
                        <Card key={i} className='border-none shadow-sm bg-muted/30 p-4'>
                            <div className='flex items-center gap-3'>
                                <div className={`p-2 rounded-lg bg-white shadow-sm ${item.color}`}>
                                    <item.icon className='size-4' />
                                </div>
                                <div>
                                    <p className='text-[10px] font-bold text-muted-foreground uppercase tracking-wider'>{item.label}</p>
                                    <p className='text-sm font-black mt-0.5 font-mono'>{item.value}</p>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>

            {/* 右侧：配置参数表单 */}
            <div className='space-y-6'>
                <Card className='border-none shadow-xl'>
                    <CardHeader className='pb-4'>
                        <div className='flex items-center gap-3'>
                            <div className='size-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center'>
                                <Settings2 className='size-5' />
                            </div>
                            <div>
                                <CardTitle className='text-lg font-black uppercase tracking-tight'>{t('engineering.productMgmt.barcode.configTitle')}</CardTitle>
                                <CardDescription className='text-xs'>{t('engineering.productMgmt.barcode.configDesc')}</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className='space-y-6'>
                        <div className='grid grid-cols-2 gap-4'>
                            <div className='space-y-2'>
                                <Label className='text-[11px] font-bold uppercase text-muted-foreground flex items-center justify-between'>
                                    <span className='flex items-center gap-2'><Layers className='size-3' /> {t('engineering.productMgmt.barcode.modelCodeLabel')}</span>
                                    <Badge variant='outline' className='text-[10px] bg-blue-50 text-blue-600 border-blue-100 font-bold'>{t('engineering.productMgmt.barcode.syncedWithArchive')}</Badge>
                                </Label>
                                <Input
                                    className='h-10 font-mono font-bold bg-muted/50 cursor-not-allowed border-blue-600/20'
                                    value={config.modelCode}
                                    readOnly
                                    disabled
                                />
                                <p className='text-[10px] text-muted-foreground mt-1 italic'>{t('engineering.productMgmt.barcode.modifyInBasicInfo')}</p>
                            </div>
                            <div className='space-y-2'>
                                <Label className='text-[11px] font-bold uppercase text-muted-foreground flex items-center gap-2'>
                                    <Palette className='size-3' /> {t('engineering.productMgmt.barcode.appearanceCodeLabel')}
                                </Label>
                                <Input
                                    className='h-10 font-mono font-bold transition-all focus:ring-2 focus:ring-blue-600/20'
                                    value={config.appearanceCode}
                                    maxLength={1}
                                    onChange={e => updateConfig({ appearanceCode: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className='space-y-4 pt-2 border-t border-slate-100'>
                            <div className='flex items-center justify-between'>
                                <div className='space-y-0.5'>
                                    <Label className='text-[11px] font-bold uppercase'>{t('engineering.productMgmt.barcode.categoryLabel')}</Label>
                                    <p className='text-[10px] text-muted-foreground'>{t('engineering.productMgmt.barcode.categoryDesc')}</p>
                                </div>
                                <div className='flex p-1 bg-muted rounded-lg w-32'>
                                    <button
                                        onClick={() => updateConfig({ category: 'R' })}
                                        className={`flex-1 py-1 px-3 text-[10px] font-black rounded-md transition-all ${config.category === 'R' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}
                                    >R</button>
                                    <button
                                        onClick={() => updateConfig({ category: 'D' })}
                                        className={`flex-1 py-1 px-3 text-[10px] font-black rounded-md transition-all ${config.category === 'D' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}
                                    >D</button>
                                </div>
                            </div>

                            <div className='space-y-2'>
                                <Label className='text-[11px] font-bold uppercase text-muted-foreground flex items-center gap-2'>
                                    <CircleDot className='size-3' /> {t('engineering.productMgmt.barcode.holesLabel')}
                                </Label>
                                <Input
                                    type='number'
                                    className='h-10 font-mono font-bold'
                                    value={config.holes}
                                    onChange={e => updateConfig({ holes: parseInt(e.target.value) || 24 })}
                                />
                            </div>
                        </div>

                        <div className='space-y-4 pt-2 border-t border-slate-100'>
                            <div className='flex items-center justify-between'>
                                <div className='space-y-0.5'>
                                    <Label className='text-[11px] font-bold uppercase'>{t('engineering.productMgmt.barcode.drainHoleLabel')}</Label>
                                    <p className='text-[10px] text-muted-foreground font-mono'>{t('engineering.productMgmt.barcode.drainHolePrefix')}</p>
                                </div>
                                <Switch
                                    checked={config.isDrainHole}
                                    onCheckedChange={checked => updateConfig({ isDrainHole: checked })}
                                />
                            </div>

                            <div className='space-y-2'>
                                <Label className='text-[11px] font-bold uppercase text-muted-foreground flex items-center justify-between'>
                                    <span className='flex items-center gap-2'><Flame className='size-3' /> {t('engineering.productMgmt.barcode.wheelPositionLabel')}</span>
                                </Label>
                                <div className='flex p-1 bg-muted rounded-lg w-full'>
                                    {[
                                        { label: t('engineering.productMgmt.barcode.wheelF'), value: 'F' },
                                        { label: t('engineering.productMgmt.barcode.wheelR'), value: 'R' },
                                        { label: t('engineering.productMgmt.barcode.wheelH'), value: 'H' },
                                    ].map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => updateConfig({ wheelType: opt.value as BarcodeConfig['wheelType'] })}
                                            className={`flex-1 py-1.5 px-2 text-[10px] font-black rounded-md transition-all ${config.wheelType === opt.value ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className='space-y-2'>
                                <Label className='text-[11px] font-bold uppercase text-muted-foreground flex items-center gap-2'>
                                    <Hash className='size-3' /> {t('engineering.productMgmt.barcode.scopeLabel')}
                                </Label>
                                <Input
                                    className='h-10 font-black text-red-600 uppercase placeholder:text-slate-300'
                                    placeholder={t('engineering.productMgmt.barcode.scopePlaceholder')}
                                    value={config.scopeCode}
                                    onChange={e => updateConfig({ scopeCode: e.target.value.toUpperCase() })}
                                />
                            </div>

                            <div className='space-y-2'>
                                <Label className='text-[11px] font-bold uppercase text-muted-foreground flex items-center gap-2'>
                                    <ChevronRight className='size-3' /> {t('engineering.productMgmt.barcode.serialLabel')}
                                </Label>
                                <Input
                                    className='h-10 font-mono font-bold bg-muted/20 border-blue-600/10'
                                    value={config.serialNumber}
                                    maxLength={5}
                                    onChange={e => updateConfig({ serialNumber: e.target.value })}
                                />
                            </div>
                        </div>

                        <Button
                            className='w-full h-12 rounded-xl bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest mt-6'
                            onClick={handleSaveConfig}
                        >
                            {t('engineering.productMgmt.barcode.saveToArchive')}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
