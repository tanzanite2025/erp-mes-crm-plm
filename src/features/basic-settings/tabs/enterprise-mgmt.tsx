import { useCallback, useEffect, useState } from 'react'
import { Save, Loader2 } from 'lucide-react'
import { ForbiddenState } from '@/components/forbidden-state'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { isForbiddenError } from '@/lib/error-status'
import { createLogger } from '@/lib/logger'
import { EnterpriseService } from '../services/enterprise-service'

const logger = createLogger('EnterpriseMgmt')

export function EnterpriseMgmt() {
    const { t } = useLanguage()
    const [name, setName] = useState('')
    const [plan, setPlan] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<unknown>(null)

    const loadConfig = useCallback(async () => {
        setLoading(true)
        try {
            setError(null)
            const config = await EnterpriseService.getConfig()
            if (config) {
                setName(config.name || '')
                setPlan(config.plan || '')
            }
        } catch (loadError) {
            setError(loadError)
            logger.error('Failed to load config', loadError)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        const timer = globalThis.setTimeout(() => {
            void loadConfig()
        }, 0)

        return () => {
            globalThis.clearTimeout(timer)
        }
    }, [loadConfig])

    if (isForbiddenError(error)) {
        return <ForbiddenState />
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            await EnterpriseService.saveConfig({ name, plan })
            toast.success(t('basicSettings.enterprisePage.toasts.success'), {
                description: t('basicSettings.enterprisePage.toasts.successDesc'),
            })
            // 触发侧边栏重新加载的自定义事件
            window.dispatchEvent(new CustomEvent('xdfc_enterprise_config_updated'))
        } catch (error) {
            // api-client 会弹出具体错误，这里做通用提示
            logger.error('Save failed', error)
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className='flex flex-col items-center justify-center h-64 gap-3 animate-in fade-in duration-500'>
                <Loader2 className='size-8 animate-spin text-primary opacity-60' />
                <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground'>
                    {t('common.actions.loading')}
                </p>
            </div>
        )
    }

    return (
        <div className='flex flex-col gap-8 animate-in fade-in duration-700 max-w-2xl'>
            <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
                <div className='flex-1 rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-6'>
                    <h2 className='text-lg font-black italic tracking-tighter uppercase'>
                        {t('basicSettings.enterprisePage.title')}
                    </h2>
                    <p className='text-[10px] text-muted-foreground font-black tracking-widest uppercase opacity-60'>
                        {t('basicSettings.enterprisePage.subtitle')}
                    </p>
                </div>
            </div>

            <div className='bg-muted/5 p-4 md:p-8 rounded-[32px] border border-dashed space-y-8'>
                <div className='grid gap-8'>
                    <div className='space-y-3'>
                        <Label htmlFor='enterprise-name' className='text-[10px] font-black uppercase tracking-widest text-muted-foreground pl-1'>
                            {t('basicSettings.enterprisePage.form.nameLabel')}
                        </Label>
                        <Input
                            id='enterprise-name'
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t('basicSettings.enterprisePage.form.namePlaceholder')}
                            className='h-12 rounded-2xl border-none bg-background px-4 font-bold text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-inner'
                        />
                    </div>
                    <div className='space-y-3'>
                        <Label htmlFor='enterprise-plan' className='text-[10px] font-black uppercase tracking-widest text-muted-foreground pl-1'>
                            {t('basicSettings.enterprisePage.form.planLabel')}
                        </Label>
                        <Input
                            id='enterprise-plan'
                            value={plan}
                            onChange={(e) => setPlan(e.target.value)}
                            placeholder={t('basicSettings.enterprisePage.form.planPlaceholder')}
                            className='h-12 rounded-2xl border-none bg-background px-4 font-bold text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-inner'
                        />
                    </div>
                </div>

                <div className='pt-6 border-t border-dashed flex justify-end'>
                    <Button 
                        onClick={handleSave} 
                        disabled={saving}
                        className='rounded-full h-11 px-10 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95'
                    >
                        {saving ? (
                            <Loader2 className='size-3.5 mr-2 animate-spin' />
                        ) : (
                            <Save className='size-3.5 mr-2' />
                        )}
                        {saving ? t('basicSettings.enterprisePage.form.saving') : t('basicSettings.enterprisePage.form.saveButton')}
                    </Button>
                </div>
            </div>
            
            <div className='p-6 bg-primary/5 rounded-[32px] border border-dashed border-primary/20'>
                <p className='text-[10px] font-black text-primary/60 italic leading-relaxed uppercase tracking-widest'>
                    {t('basicSettings.enterprisePage.syncNotice')}
                </p>
            </div>
        </div>
    )
}
