import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Edit2, Percent, Plus, ShieldAlert } from 'lucide-react'
import { taxService, type TaxRate } from '../services/tax-service'
import { toast } from 'sonner'
import { ForbiddenState } from '@/components/forbidden-state'
import { useLanguage } from '@/context/language-provider'
import { isForbiddenError } from '@/lib/error-status'

export function TaxationTab() {
  const { t } = useLanguage()
  const [rates, setRates] = useState<TaxRate[]>([])
  const [error, setError] = useState<unknown>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRate, setEditingRate] = useState<TaxRate | null>(null)
  const [formData, setFormData] = useState<Omit<TaxRate, 'id'>>({
    code: '',
    name: '',
    rate: 13,
    status: 'Active',
    description: '',
  })

  const loadData = async () => {
    try {
      setError(null)
      const data = await taxService.getTaxRates()
      setRates(data)
    } catch (error) {
      setError(error)
      toast.error(t('finance.taxation.toast.loadFailed'))
    }
  }

  useEffect(() => {
    let cancelled = false

    void Promise.resolve()
      .then(() => taxService.getTaxRates())
      .then((data) => {
        if (cancelled) {
          return
        }

        setError(null)
        setRates(data)
      })
      .catch((error) => {
        if (cancelled) {
          return
        }

        setError(error)
        toast.error(t('finance.taxation.toast.loadFailed'))
      })

    return () => {
      cancelled = true
    }
  }, [t])

  const handleSave = async () => {
    if (!formData.code || !formData.name) {
      toast.error(t('finance.taxation.toast.formIncomplete'))
      return
    }

    try {
      await taxService.saveTaxRate({
        ...formData,
        id: editingRate?.id ?? '',
      } as TaxRate)
      toast.success(editingRate ? t('finance.taxation.toast.saveSuccessUpdated') : t('finance.taxation.toast.saveSuccessCreated'))
      setIsDialogOpen(false)
      setEditingRate(null)
      void loadData()
    } catch (_error) {
      toast.error(t('finance.taxation.toast.saveFailed'))
    }
  }

  const openEdit = (rate: TaxRate) => {
    setEditingRate(rate)
    setFormData({
      code: rate.code,
      name: rate.name,
      rate: rate.rate,
      status: rate.status,
      description: rate.description || '',
    })
    setIsDialogOpen(true)
  }

  if (isForbiddenError(error)) {
    return <ForbiddenState />
  }

  const getCardNameKey = (code: string): Parameters<typeof t>[0] => `finance.taxation.card.names.${code}` as Parameters<typeof t>[0]
  const getCardDescriptionKey = (code: string): Parameters<typeof t>[0] => `finance.taxation.card.descriptions.${code}` as Parameters<typeof t>[0]

  return (
    <div className='space-y-6 animate-in fade-in duration-700'>
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
        <div className='flex-1 rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-6'>
          <h2 className='text-lg font-black italic tracking-tighter uppercase'>{t('finance.taxation.page.title')}</h2>
          <p className='text-[10px] text-muted-foreground font-black tracking-widest uppercase opacity-60'>{t('finance.taxation.page.subtitle')}</p>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size='sm'
                onClick={() => {
                  setEditingRate(null)
                  setFormData({ code: '', name: '', rate: 13, status: 'Active', description: '' })
                }}
                className='rounded-full h-9 font-black text-[10px] uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20'
              >
                <Plus className='size-3 mr-2' />
                {t('finance.taxation.page.add')}
              </Button>
            </DialogTrigger>
            <DialogContent className='rounded-[32px] border-none shadow-2xl'>
              <DialogHeader>
                <DialogTitle className='font-black italic tracking-tighter uppercase'>
                  {editingRate ? t('finance.taxation.dialog.editTitle') : t('finance.taxation.dialog.createTitle')}
                </DialogTitle>
              </DialogHeader>
              <div className='space-y-4 py-4'>
                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label className='text-[10px] font-black uppercase tracking-widest pl-1'>{t('finance.taxation.dialog.codeLabel')}</Label>
                    <Input
                      placeholder={t('finance.taxation.dialog.codePlaceholder')}
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      className='rounded-2xl h-11'
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label className='text-[10px] font-black uppercase tracking-widest pl-1'>{t('finance.taxation.dialog.rateLabel')}</Label>
                    <Input
                      type='number'
                      placeholder={t('finance.taxation.dialog.ratePlaceholder')}
                      value={formData.rate}
                      onChange={(e) => setFormData({ ...formData, rate: Number(e.target.value) })}
                      className='rounded-2xl h-11'
                    />
                  </div>
                </div>
                <div className='space-y-2'>
                  <Label className='text-[10px] font-black uppercase tracking-widest pl-1'>{t('finance.taxation.dialog.nameLabel')}</Label>
                  <Input
                    placeholder={t('finance.taxation.dialog.namePlaceholder')}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className='rounded-2xl h-11'
                  />
                </div>
                <div className='space-y-2'>
                  <Label className='text-[10px] font-black uppercase tracking-widest pl-1'>{t('finance.taxation.dialog.descriptionLabel')}</Label>
                  <Textarea
                    placeholder={t('finance.taxation.dialog.descriptionPlaceholder')}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className='rounded-2xl min-h-[80px]'
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleSave} className='rounded-full w-full font-black uppercase tracking-widest h-11'>
                  {t('finance.taxation.dialog.save')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'>
        {rates.map((rate) => (
          <Card key={rate.id} className='rounded-[24px] border-dashed border-emerald-500/20 bg-emerald-500/5 group hover:bg-emerald-500/10 transition-all'>
            <CardHeader className='pb-2'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <div className='size-9 rounded-2xl bg-emerald-500/10 flex items-center justify-center'>
                    <Percent className='size-4 text-emerald-600' />
                  </div>
                  <div>
                    <CardTitle className='text-sm font-black italic tracking-tighter uppercase text-emerald-800/80'>
                      {(() => {
                        const translatedName = t(getCardNameKey(rate.code))
                        return translatedName.includes('finance.taxation.card.names') ? rate.name : translatedName
                      })()}
                    </CardTitle>
                    <CardDescription className='text-[8px] font-black tracking-widest font-mono text-emerald-600/60 uppercase'>
                      {t('finance.taxation.card.codeLabel', { code: rate.code })}
                    </CardDescription>
                  </div>
                </div>
                <Button variant='ghost' size='icon' onClick={() => openEdit(rate)} className='size-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity'>
                  <Edit2 className='size-3' />
                </Button>
              </div>
            </CardHeader>
            <CardContent className='pt-2'>
              <div className='space-y-3'>
                <div className='p-3 bg-background rounded-2xl border border-dashed text-[10px] font-medium leading-relaxed min-h-[60px] text-muted-foreground/80'>
                  {(() => {
                    const translatedDesc = t(getCardDescriptionKey(rate.code))
                    return translatedDesc.includes('finance.taxation.card.descriptions') ? (rate.description || t('finance.taxation.card.emptyDescription')) : translatedDesc
                  })()}
                </div>
                <div className='flex items-center justify-between gap-2 border-t border-dashed border-muted pt-3'>
                  <span className='px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-700'>
                    {t('finance.taxation.card.ratioLabel', { rate: rate.rate })}
                  </span>
                  <span className='text-[8px] font-mono font-black text-muted-foreground/40 uppercase tracking-widest'>
                    {t('finance.taxation.card.validBadge')}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className='rounded-[32px] border-dashed border-blue-500/20 bg-blue-500/5 p-6'>
        <div className='flex gap-4 items-start text-blue-600'>
          <div className='p-3 rounded-full bg-white/50 shadow-sm'>
            <ShieldAlert className='size-5' />
          </div>
          <div className='space-y-1'>
            <h4 className='text-xs font-black italic tracking-tight uppercase'>{t('finance.taxation.guard.title')}</h4>
            <p className='text-[10px] font-medium leading-relaxed max-w-3xl opacity-80'>{t('finance.taxation.guard.content')}</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
