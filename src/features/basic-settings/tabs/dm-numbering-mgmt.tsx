import { QrCode } from 'lucide-react'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { useLanguage } from '@/context/language-provider'
import type { TranslationKey } from '@/locales'

import { DMRulesTable } from '../components/dm-rules-table'
import { DMSimulationSection } from '../components/dm-simulation-section'
import { DMInfoFooter } from '../components/dm-info-footer'
import { DMRuleConfigDialog } from '../components/dm-rule-config-dialog'
import { AppearanceActionDialog } from '../components/appearance-action-dialog'

import { useDMNumberingMgmt } from '../hooks/use-dm-numbering-mgmt'
import { DMNumberingStatusBar } from '../components/dm-numbering-status-bar'
import { DMNumberingResetDialog } from '../components/dm-numbering-reset-dialog'

export function DMNumberMgmt() {
    const { t } = useLanguage()
    const {
        rules,
        appearanceMapping,
        productTypes,
        products,
        mockInputs,
        setMockInputs,
        assembledCode,
        parsedResult,
        monthOptions,
        requestNextSerial,
        mockServerSerials,
        isConfigDialogOpen,
        setIsConfigDialogOpen,
        selectedSegment,
        isAppearanceDialogOpen,
        setIsAppearanceDialogOpen,
        isResetDialogOpen,
        setIsResetDialogOpen,
        confirmText,
        setConfirmText,
        handleEditLogic,
        handleSaveRule,
        handleResetRules
    } = useDMNumberingMgmt()

    return (
        <div className='flex flex-col gap-8 animate-in fade-in duration-700 w-full'>
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes scanMove {
                    0%, 100% { top: 0%; opacity: 0; }
                    20%, 80% { opacity: 1; }
                    50% { top: 100%; }
                }
            `}} />

            {/* 1. 工业化统一页眉 */}
            <IndustrialHeader
                icon={QrCode}
                title={t('basicSettings.dmNumbering.page.title')}
                description={t('basicSettings.dmNumbering.page.subtitle')}
                gradient
                statusBadge={
                    <div className='flex items-center gap-4 px-4 py-1.5 rounded-full bg-primary/5 border border-dashed border-primary/20 w-fit shrink-0'>
                        <span className='text-[10px] font-black text-primary/60 uppercase tracking-widest italic'>
                            DM_PROTOCOL_V2
                        </span>
                        <div className='size-1.5 rounded-full bg-emerald-500 animate-pulse' />
                    </div>
                }
            />

            {/* 2. 操作状态栏 (重置/发布) */}
            <DMNumberingStatusBar 
                onReset={() => setIsResetDialogOpen(true)}
                onPublish={() => {/* 逻辑由 Hook 暴露或直接定义 */}}
            />

            {/* 3. 规则定义表 */}
            <DMRulesTable
                rules={rules}
                appearanceMapping={appearanceMapping}
                onEdit={handleEditLogic}
            />

            {/* 4. 动态仿真引擎 (核心算法区) */}
            <DMSimulationSection
                mockInputs={mockInputs}
                setMockInputs={setMockInputs}
                assembledCode={assembledCode}
                scanText={parsedResult.display.fullDescription || t('basicSettings.dmNumbering.simulation.placeholder')}
                parsedResult={parsedResult}
                products={products}
                appearanceMapping={appearanceMapping}
                productTypes={productTypes}
                previewType='qrcode'
                monthOptions={monthOptions}
                onRequestNextSerial={requestNextSerial}
                currentServerCount={mockServerSerials[mockInputs.model] || 0}
                previewOutputLabel={t('basicSettings.dmNumbering.simulation.qrCodeOutput' as TranslationKey)}
            />

            {/* 5. 辅助信息与弹窗集 */}
            <DMInfoFooter />

            <DMRuleConfigDialog
                open={isConfigDialogOpen}
                onOpenChange={setIsConfigDialogOpen}
                segment={selectedSegment}
                onSave={handleSaveRule}
            />

            <AppearanceActionDialog
                open={isAppearanceDialogOpen}
                onOpenChange={setIsAppearanceDialogOpen}
            />

            <DMNumberingResetDialog 
                open={isResetDialogOpen}
                onOpenChange={setIsResetDialogOpen}
                confirmText={confirmText}
                onConfirmTextChange={setConfirmText}
                onReset={handleResetRules}
            />
        </div>
    )
}
