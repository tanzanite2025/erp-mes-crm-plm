import { Link } from '@tanstack/react-router'
import { Barcode, FileText, Hash, Printer, Settings2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useLanguage } from '@/context/language-provider'

export function LinearBarcodePrintMgmt() {
  const { t } = useLanguage()

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <div className='rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-6'>
        <div className='flex flex-col gap-5'>
          <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
            <div className='flex items-start gap-3 text-primary'>
              <div className='flex size-12 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10'>
                <Printer className='size-5' />
              </div>
              <div>
                <div className='text-lg font-black tracking-tight italic'>
                  {t('codeCenter.linearBarcode.print.page.title')}
                </div>
                <div className='text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground/60'>
                  {t('codeCenter.linearBarcode.print.page.subtitle')}
                </div>
              </div>
            </div>
            <div className='flex flex-wrap items-center gap-2'>
              <Badge className='border-none bg-primary/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-primary/70'>
                <Printer className='mr-2 size-3.5' />
                {t('codeCenter.linearBarcode.print.page.badges.placeholder')}
              </Badge>
              <Badge className='border-none bg-emerald-500/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-700'>
                <Hash className='mr-2 size-3.5' />
                {t('codeCenter.linearBarcode.print.page.badges.protocolLinked')}
              </Badge>
            </div>
          </div>
          <div className='rounded-[24px] border border-dashed border-primary/15 bg-primary/5 px-4 py-3 text-[11px] text-muted-foreground'>
            {t('codeCenter.linearBarcode.print.page.notice')}
          </div>
          <div className='flex flex-wrap items-center gap-3'>
            <Button className='rounded-full px-6 text-[10px] font-black uppercase shadow-lg shadow-primary/20' asChild>
              <Link to='/code-center/linear-barcode/protocol'>
                <Settings2 className='mr-2 size-4' />
                {t('codeCenter.linearBarcode.print.actions.gotoProtocol')}
              </Link>
            </Button>
            <Button variant='ghost' className='rounded-full px-6 text-[10px] font-black uppercase' asChild>
              <Link to='/code-center/shared-code-source/numbering-engine'>
                <Hash className='mr-2 size-4' />
                {t('codeCenter.linearBarcode.print.actions.gotoNumberingEngine')}
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className='grid gap-6 lg:grid-cols-3'>
        <Card className='rounded-[28px] border border-dashed border-muted/50 bg-muted/5 shadow-none'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-base font-black tracking-tight italic'>
              <FileText className='size-4 text-primary' />
              {t('codeCenter.linearBarcode.print.sections.templates.title')}
            </CardTitle>
            <CardDescription className='text-[11px] leading-6'>
              {t('codeCenter.linearBarcode.print.sections.templates.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='rounded-[20px] border border-dashed border-muted/50 bg-background/60 p-5 text-[11px] leading-6 text-muted-foreground'>
              {t('codeCenter.linearBarcode.print.sections.templates.placeholder')}
            </div>
          </CardContent>
        </Card>

        <Card className='rounded-[28px] border border-dashed border-muted/50 bg-muted/5 shadow-none'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-base font-black tracking-tight italic'>
              <Barcode className='size-4 text-primary' />
              {t('codeCenter.linearBarcode.print.sections.parameters.title')}
            </CardTitle>
            <CardDescription className='text-[11px] leading-6'>
              {t('codeCenter.linearBarcode.print.sections.parameters.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='rounded-[20px] border border-dashed border-muted/50 bg-background/60 p-5 text-[11px] leading-6 text-muted-foreground'>
              {t('codeCenter.linearBarcode.print.sections.parameters.placeholder')}
            </div>
          </CardContent>
        </Card>

        <Card className='rounded-[28px] border border-dashed border-muted/50 bg-muted/5 shadow-none'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-base font-black tracking-tight italic'>
              <Printer className='size-4 text-primary' />
              {t('codeCenter.linearBarcode.print.sections.preview.title')}
            </CardTitle>
            <CardDescription className='text-[11px] leading-6'>
              {t('codeCenter.linearBarcode.print.sections.preview.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='rounded-[20px] border border-dashed border-muted/50 bg-background/60 p-5 text-[11px] leading-6 text-muted-foreground'>
              {t('codeCenter.linearBarcode.print.sections.preview.placeholder')}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
