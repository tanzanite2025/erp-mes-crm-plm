import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import type { TopologyTemplate } from '../../line-mgmt/types'
import { useEffect } from 'react'
import { useLanguage } from '@/context/language-provider'
import { useHierarchyLevelLabels } from '../../hierarchy-config/hooks/use-hierarchy-level-labels'

interface TemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template?: TopologyTemplate | null
  onSave: (values: { name: string; description?: string }) => void
}

export function TemplateDialog({ open, onOpenChange, template, onSave }: TemplateDialogProps) {
  const { t } = useLanguage()
  const { level1Name, level2Name } = useHierarchyLevelLabels()

  const formSchema = z.object({
    name: z.string().min(2, t('orgPersonnel.topologyTemplateMgmt.dialog.nameRequired')),
    description: z.string().optional(),
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  })

  useEffect(() => {
    if (open) {
      if (template) {
        form.reset({
          name: template.name,
          description: template.description || '',
        })
      } else {
        form.reset({
          name: '',
          description: '',
        })
      }
    }
  }, [open, template, form])

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    onSave(values)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='rounded-[32px] border-none shadow-2xl max-w-lg overflow-hidden'>
        <DialogHeader className='space-y-4'>
          <div className='flex items-center gap-2 text-primary'>
            <DialogTitle className='text-lg font-black italic uppercase tracking-tighter'>
              {template ? t('orgPersonnel.topologyTemplateMgmt.dialog.editTitle') : t('orgPersonnel.topologyTemplateMgmt.dialog.createTitle')}
            </DialogTitle>
          </div>
          <DialogDescription className='text-[9px] font-black uppercase tracking-widest opacity-60'>
            {t('orgPersonnel.topologyTemplateMgmt.dialog.descriptionDynamic', { level1Name, level2Name })}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4 py-4'>
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 italic ml-1'>
                    {t('orgPersonnel.topologyTemplateMgmt.dialog.nameLabel')}
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder={t('orgPersonnel.topologyTemplateMgmt.dialog.namePlaceholder')} 
                      className='h-12 rounded-2xl border-none bg-muted/50 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all font-medium'
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage className='text-[10px] font-bold' />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='description'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 italic ml-1'>
                    {t('orgPersonnel.topologyTemplateMgmt.dialog.descLabel')}
                  </FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder={t('orgPersonnel.topologyTemplateMgmt.dialog.descPlaceholder')} 
                      className='min-h-[100px] rounded-2xl border-none bg-muted/50 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all font-medium resize-none'
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage className='text-[10px] font-bold' />
                </FormItem>
              )}
            />
            <DialogFooter className='pt-4'>
              <Button 
                type='submit' 
                className='rounded-full h-11 px-10 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all'
              >
                {template ? t('orgPersonnel.topologyTemplateMgmt.dialog.saveChanges') : t('orgPersonnel.topologyTemplateMgmt.dialog.initTemplate')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
