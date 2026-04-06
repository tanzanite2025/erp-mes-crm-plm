import {
    Plus,
    Search,
    Settings2,
    Trash2,
    Edit2,
    Database,
    RefreshCw,
    AlertCircle,
} from 'lucide-react'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { SegmentedTabs } from '@/components/segmented-tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { DictionaryEntryActionDialog } from '../components/dictionary-entry-action-dialog'
import { useDictionaryMgmt } from '../hooks/use-dictionary-mgmt'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { DictMemoSection } from '../components/dict-memo-section'
import { useLanguage } from '@/context/language-provider'
import type { TranslationKey } from '@/locales'

export function DictionaryMgmt() {
    const { t } = useLanguage()
    // 核心自治 Hook 通道
    const {
        groups,
        activeGroupId,
        setActiveGroupId,
        searchTerm,
        setSearchTerm,
        isSyncing,
        filteredEntries,
        isEntryDialogOpen,
        setIsEntryDialogOpen,
        editingEntry,
        handleSyncSystem,
        handleAddGroup,
        handleDeleteGroup,
        handleEditGroup,
        handleAddEntry,
        handleEditEntry,
        handleConfirmEntry,
        handleDeleteEntry
    } = useDictionaryMgmt()

    return (
        <div className='flex flex-col gap-8 animate-in fade-in duration-700 w-full'>
            {/* 工业化页眉 */}
            <IndustrialHeader
                icon={Database}
                title={t('basicSettings.dictionary.page.title' as TranslationKey)}
                description={t('basicSettings.dictionary.page.description' as TranslationKey)}
                gradient
                statusBadge={
                    <div className='flex items-center gap-4 px-4 py-1.5 rounded-full bg-primary/5 border border-dashed border-primary/20 w-fit shrink-0'>
                        <span className='text-[10px] font-black text-primary/60 uppercase tracking-widest italic'>
                            {isSyncing ? 'SYNCING' : 'SYNC_READY'}
                        </span>
                        <div className={`size-1.5 rounded-full ${isSyncing ? 'bg-amber-500 animate-spin' : 'bg-emerald-500 animate-pulse'}`} />
                    </div>
                }
            />

            {/* 自包含的设计师备忘录组件 */}
            <DictMemoSection />

            {/* 分组切换与系统操作逻辑 */}
            <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 md:p-6 gap-6 bg-muted/5 rounded-[24px] border border-dashed border-muted/50'>
                <SegmentedTabs
                    tabs={groups.map(group => ({
                        value: group.id,
                        label: (
                            <div className='flex items-center gap-2'>
                                <span className='uppercase italic font-black text-[11px] tracking-tight'>{group.name}</span>
                                {group.isSystem && (
                                    <Badge className='text-[8px] bg-primary/10 text-primary border-none px-1.5 h-4 uppercase font-black italic rounded-sm'>
                                        SYS
                                    </Badge>
                                )}
                            </div>
                        )
                    }))}
                    value={activeGroupId}
                    onValueChange={setActiveGroupId}
                    className='h-12 bg-muted/20 p-1 rounded-2xl'
                />
                <div className='flex items-center gap-3 w-full sm:w-auto'>
                    <Button 
                        onClick={handleSyncSystem} 
                        disabled={isSyncing}
                        variant='outline' 
                        className='flex-1 sm:flex-none rounded-full h-11 px-6 font-black text-[10px] uppercase tracking-widest border-dashed border-primary/20 text-primary hover:bg-primary/5 transition-all gap-2 italic'
                    >
                        <RefreshCw className={`size-4 ${isSyncing ? 'animate-spin' : ''}`} />
                        {isSyncing ? t('basicSettings.dictionary.page.actions.syncing' as TranslationKey) : t('basicSettings.dictionary.page.actions.sync' as TranslationKey)}
                    </Button>
                    <Button onClick={handleAddGroup} variant='ghost' className='flex-1 sm:flex-none rounded-full h-11 px-8 font-black text-[10px] uppercase tracking-widest hover:bg-muted transition-all gap-2 italic'>
                        <Plus className='size-4' /> {t('basicSettings.dictionary.page.actions.addGroup' as TranslationKey)}
                    </Button>
                </div>
            </div>

            {/* 空数据占位符 */}
            {groups.length === 0 && !isSyncing && (
                <div className='py-40 border border-dashed border-muted/50 rounded-[32px] bg-muted/5 flex flex-col items-center justify-center gap-8 animate-in fade-in slide-in-from-bottom-4 duration-1000'>
                    <div className='size-24 rounded-[32px] bg-primary/5 border border-dashed border-primary/20 flex items-center justify-center shadow-inner'>
                        <AlertCircle className='size-10 text-primary/40' />
                    </div>
                    <div className='text-center space-y-3'>
                        <h4 className='text-xl font-black italic tracking-tighter uppercase'>{t('basicSettings.dictionary.empty.title' as TranslationKey)}</h4>
                        <p className='text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest max-w-[400px] leading-relaxed mx-auto'>
                            {t('basicSettings.dictionary.empty.description' as TranslationKey)}
                        </p>
                    </div>
                    <Button 
                        onClick={handleSyncSystem}
                        className='rounded-full h-12 px-12 font-black text-[11px] uppercase tracking-widest shadow-2xl shadow-primary/20 active:scale-95 transition-all gap-3 italic'
                    >
                        <RefreshCw className='size-4' /> {t('basicSettings.dictionary.empty.action' as TranslationKey)}
                    </Button>
                </div>
            )}

            {/* 字典详情主视图 */}
            <Tabs value={activeGroupId} className='w-full'>
                {groups.map(group => (
                    <TabsContent key={group.id} value={group.id} className='mt-0 focus-visible:outline-none'>
                        <div className='flex flex-col gap-8 animate-in fade-in duration-500'>
                            {/* 子标题与二次搜索 */}
                            <div className='p-6 border border-dashed border-muted/50 bg-muted/5 rounded-[24px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6'>
                                <div className='relative flex-1 max-w-sm group'>
                                    <Search className='absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/30 transition-colors group-focus-within:text-primary pointer-events-none' />
                                    <Input
                                        placeholder={t('basicSettings.dictionary.search.placeholder' as TranslationKey, { group: group.name })}
                                        className='pl-11 h-12 rounded-2xl border-none bg-background shadow-inner text-xs font-bold focus-visible:ring-1 focus-visible:ring-primary/20 transition-all'
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <div className='flex items-center gap-3 w-full sm:w-auto'>
                                    <Button onClick={handleAddEntry} className='flex-1 sm:flex-none rounded-full h-11 px-10 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/10 transition-all active:scale-95 gap-2 italic'>
                                        <Plus className='size-4' /> {t('basicSettings.dictionary.actions.addEntry' as TranslationKey)}
                                    </Button>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant='ghost' size='icon' className='size-11 rounded-full hover:bg-background shadow-sm border border-transparent hover:border-muted/50 active:scale-90 transition-transform'>
                                                <Settings2 className='size-4 text-muted-foreground/60' />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align='end' className='rounded-[24px] p-2 border-dashed shadow-2xl w-60 bg-background/95 backdrop-blur-sm'>
                                            <DropdownMenuLabel className='text-[9px] font-black uppercase tracking-widest opacity-40 px-3 py-3 italic'>{t('basicSettings.dictionary.group.config' as TranslationKey)}</DropdownMenuLabel>
                                            <DropdownMenuItem className='rounded-xl font-bold text-xs py-3 cursor-pointer italic gap-3 focus:bg-primary/5' onClick={() => handleEditGroup(group)}>
                                                <Edit2 className='size-4 text-primary/60' /> {t('basicSettings.dictionary.group.rename' as TranslationKey)}
                                            </DropdownMenuItem>
                                            {!group.isSystem && (
                                                <>
                                                    <DropdownMenuSeparator className='my-1 border-dashed opacity-50' />
                                                    <DropdownMenuItem
                                                        className='rounded-xl font-black text-xs py-3 text-rose-600 focus:text-rose-600 cursor-pointer italic gap-3 focus:bg-rose-500/5'
                                                        onClick={() => handleDeleteGroup(group.id)}
                                                    >
                                                        <Trash2 className='size-4' /> {t('basicSettings.dictionary.group.purge' as TranslationKey)}
                                                    </DropdownMenuItem>
                                                </>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>

                            {/* 字典项卡格网格 */}
                            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                                {filteredEntries.length > 0 ? (
                                    filteredEntries.map(entry => (
                                        <Card key={entry.id} className='border border-dashed border-muted/50 shadow-none bg-background rounded-[24px] group transition-all duration-500 hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1 overflow-hidden'>
                                            <CardContent className='p-8'>
                                                <div className='flex items-start justify-between mb-6'>
                                                    <div className='flex items-center gap-5'>
                                                        <div className='size-14 rounded-2xl bg-primary/5 flex items-center justify-center text-primary font-black text-lg border border-dashed border-primary/20 shadow-inner italic'>
                                                            {entry.label.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className='flex flex-col gap-1'>
                                                            <span className='text-md font-black tracking-tighter italic uppercase text-slate-800 dark:text-white/90'>{entry.label}</span>
                                                            <span className='text-[9px] font-mono font-bold text-muted-foreground/30 uppercase tracking-[0.2em] italic'>{entry.code || t('basicSettings.dictionary.entry.noCode' as TranslationKey)}</span>
                                                        </div>
                                                    </div>
                                                    <div className='flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300'>
                                                        <Button variant='ghost' size='icon' className='size-10 rounded-full hover:bg-primary/5 transition-colors group/edit' onClick={() => handleEditEntry(entry)}>
                                                            <Edit2 className='size-4 text-muted-foreground/40 group-hover/edit:text-primary' />
                                                        </Button>
                                                        {!entry.isSystem && (
                                                            <Button variant='ghost' size='icon' className='size-10 rounded-full text-rose-500/40 hover:text-rose-500 hover:bg-rose-500/10 transition-colors' onClick={() => handleDeleteEntry(entry.id)}>
                                                                <Trash2 className='size-4' />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className='flex flex-wrap gap-2.5 pt-6 border-t border-dashed border-muted/30'>
                                                    {(entry.options || []).length > 0 ? (
                                                        (entry.options || []).map((opt, idx) => (
                                                            <Badge
                                                                key={idx}
                                                                variant='secondary'
                                                                className='bg-muted/40 text-muted-foreground/60 border-none py-1 h-7 px-4 text-[9px] font-black uppercase italic tracking-widest rounded-lg'
                                                            >
                                                                {typeof opt === 'string' ? opt : opt.label}
                                                            </Badge>
                                                        ))
                                                    ) : (
                                                        <span className='text-[9px] font-black uppercase italic tracking-widest text-muted-foreground/20 py-2'>{t('basicSettings.dictionary.entry.noOptions' as TranslationKey)}</span>
                                                    )}
                                                    <Button
                                                        variant='ghost'
                                                        size='sm'
                                                        onClick={() => handleEditEntry(entry)}
                                                        className='h-7 px-4 rounded-full text-[9px] font-black uppercase text-primary hover:bg-primary/5 opacity-0 group-hover:opacity-100 transition-all ml-auto italic'
                                                    >
                                                        {t('basicSettings.dictionary.entry.addOption' as TranslationKey)}
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))
                                ) : (
                                    <div className='col-span-full py-32 border border-dashed border-muted/50 rounded-[32px] bg-muted/5 flex flex-col items-center justify-center text-muted-foreground/20 italic gap-4'>
                                        <div className='size-20 rounded-[32px] bg-muted/10 flex items-center justify-center border border-dashed border-muted/20'>
                                            <Database className='size-10 opacity-10' />
                                        </div>
                                        <p className='text-[10px] font-black uppercase tracking-widest italic'>{t('basicSettings.dictionary.entry.emptyList' as TranslationKey)}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </TabsContent>
                ))}
            </Tabs>

            {/* 统一操作弹窗 */}
            <DictionaryEntryActionDialog
                open={isEntryDialogOpen}
                onOpenChange={setIsEntryDialogOpen}
                onConfirm={handleConfirmEntry}
                editData={editingEntry}
                groupId={activeGroupId}
            />
        </div>
    )
}
