import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, FileText, MoreVertical, Hash } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Link } from '@tanstack/react-router'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { canOpenRouteEntryNonBlocking } from '@/features/authz/guards/route-entry-access'
import { useAuthStore } from '@/stores/auth-store'

export function BarcodeTemplateManager() {
    const { t } = useLanguage()
    const user = useAuthStore((state) => state.user)
    const canOpenDmNumbering = canOpenRouteEntryNonBlocking(user, '/basic-settings/dm-numbering')

    // 模拟数据
    const templates = [
        {
            id: '1',
            name: t('printMgmt.barcodeManager.templates.productDm.name'),
            type: t('printMgmt.barcodeManager.templates.productDm.type'),
            lastModified: '2026-03-21',
            hasNumberingRule: true,
        },
        {
            id: '2',
            name: t('printMgmt.barcodeManager.templates.bomA4.name'),
            type: t('printMgmt.barcodeManager.templates.bomA4.type'),
            lastModified: '2026-03-22',
            hasNumberingRule: false,
        },
    ]

    const handleAction = (action: string, name: string) => {
        toast(t('printMgmt.barcodeManager.templateActionTitle', { action }), {
            description: t('printMgmt.barcodeManager.templateActionDescription', { name })
        })
    }

    return (
        <>
            <div className='flex items-center justify-between p-4 bg-muted/5 rounded-[24px] border border-dashed'>
                <div className='flex items-center gap-2 flex-1 max-w-sm'>
                    <div className='relative w-full'>
                        <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50' />
                        <Input
                            placeholder={t('printMgmt.barcodeManager.searchPlaceholder')}
                            className='pl-9 h-10 rounded-full bg-background border-none shadow-inner text-xs font-bold'
                        />
                    </div>
                </div>
                <div className='flex items-center gap-2'>
                    <Button className='rounded-full px-6 font-black text-[10px] uppercase shadow-lg shadow-primary/20'>
                        <Plus className='mr-2 h-3.5 w-3.5' />
                        {t('printMgmt.barcodeManager.createTemplate')}
                    </Button>
                </div>
            </div>

            <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
                {templates.map((template) => (
                    <Card
                        key={template.id}
                        className='rounded-2xl border-none shadow-xl bg-linear-to-br from-background to-muted/20 overflow-hidden group hover:shadow-2xl transition-all duration-300'
                        onClick={() => handleAction(t('printMgmt.barcodeManager.actions.preview'), template.name)}
                    >
                        <CardHeader className='pb-2'>
                            <div className='flex items-center justify-between mb-4'>
                                <Badge className='text-[9px] font-black px-2 py-0 h-5 bg-primary/10 text-primary border-none uppercase'>{template.type}</Badge>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant='ghost' size='icon' className='size-8 rounded-full hover:bg-muted' onClick={(e) => e.stopPropagation()}>
                                            <MoreVertical className='h-3.5 w-3.5' />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align='end' className='w-48 rounded-xl border-dashed'>
                                        {template.hasNumberingRule && canOpenDmNumbering && (
                                            <>
                                                <DropdownMenuItem asChild className='text-xs font-bold'>
                                                    <Link to='/basic-settings/dm-numbering' className='flex w-full items-center cursor-pointer'>
                                                        <Hash className='mr-2 h-3.5 w-3.5 text-blue-500' />
                                                        {t('printMgmt.barcodeManager.actions.numberRuleConfig')}
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                            </>
                                        )}
                                        <DropdownMenuItem
                                            className='text-xs font-bold'
                                            onClick={() => handleAction(t('printMgmt.barcodeManager.actions.edit'), template.name)}
                                        >
                                            {t('printMgmt.barcodeManager.actions.edit')}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            className='text-xs font-bold'
                                            onClick={() => handleAction(t('printMgmt.barcodeManager.actions.duplicate'), template.name)}
                                        >
                                            {t('printMgmt.barcodeManager.actions.duplicate')}
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            className='text-xs font-black text-red-600'
                                            onClick={() => handleAction(t('printMgmt.barcodeManager.actions.delete'), template.name)}
                                        >
                                            {t('printMgmt.barcodeManager.actions.delete')}
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            <CardTitle className='text-sm font-black tracking-tight leading-none'>{template.name}</CardTitle>
                        </CardHeader>
                        <CardContent className='pt-2'>
                            <div className='flex items-center justify-between pt-4 border-t border-dashed'>
                                <div className='flex flex-col'>
                                    <span className='text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-60'>
                                        {t('printMgmt.barcodeManager.modifiedLabel')}
                                    </span>
                                    <span className='text-[10px] font-mono font-bold'>{template.lastModified}</span>
                                </div>
                                {template.hasNumberingRule && canOpenDmNumbering ? (
                                    <Button 
                                        variant='ghost' 
                                        size='sm' 
                                        className='h-8 rounded-full text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-black text-[10px] uppercase ml-auto'
                                        asChild
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <Link to='/basic-settings/dm-numbering'>
                                            {t('printMgmt.barcodeManager.actions.ruleManagement')}
                                        </Link>
                                    </Button>
                                ) : (
                                    <Button 
                                        variant='ghost' 
                                        size='sm' 
                                        className='h-8 rounded-full text-primary hover:bg-primary/5 font-black text-[10px] uppercase ml-auto'
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleAction(t('printMgmt.barcodeManager.actions.preview'), template.name)
                                        }}
                                    >
                                        {t('printMgmt.barcodeManager.actions.preview')}
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className='flex flex-col items-center justify-center p-20 border border-dashed rounded-[32px] bg-muted/5'>
                <div className='text-center opacity-20'>
                    <FileText className='mx-auto h-16 w-16 mb-6' />
                    <h3 className='text-xs font-black uppercase tracking-widest'>
                        {t('printMgmt.barcodeManager.visualDesignerPlaceholderTitle')}
                    </h3>
                    <p className='text-[10px] font-bold mt-2'>
                        {t('printMgmt.barcodeManager.visualDesignerPlaceholderDescription')}
                    </p>
                </div>
            </div>
        </>
    )
}
