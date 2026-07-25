import { GitBranch, LockKeyhole, Route } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  getLinearBarcodeLocationAnchorTranslationKey,
  getLinearBarcodeWritePolicyTranslationKey,
  type LinearBarcodeProductionLocationAnchor,
  type LinearBarcodeStatusWritePolicy,
} from '@/features/code-center/data/linear-barcode-status-definitions'

function LinearBarcodeProductionLocationAnchorItem({
  anchor,
}: {
  anchor: LinearBarcodeProductionLocationAnchor
}) {
  const { t } = useLanguage()
  const labelKey = getLinearBarcodeLocationAnchorTranslationKey(anchor, 'label')
  const descriptionKey = getLinearBarcodeLocationAnchorTranslationKey(
    anchor,
    'description'
  )

  return (
    <div className='rounded-3xl border border-dashed border-muted/50 bg-background/70 p-4'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='min-w-0'>
          <div className='text-sm font-black text-foreground'>
            {t(labelKey)}
          </div>
          <div className='mt-2 font-mono text-[11px] font-bold text-primary'>
            {anchor.field}
          </div>
        </div>
        <Badge
          className={
            anchor.required
              ? 'border-none bg-orange-500/10 text-orange-700'
              : 'border-none bg-muted text-muted-foreground'
          }
        >
          {anchor.required
            ? t('codeCenter.linearBarcode.status.location.required')
            : t('codeCenter.linearBarcode.status.location.optional')}
        </Badge>
      </div>
      <p className='mt-3 text-[11px] leading-5 text-muted-foreground'>
        {t(descriptionKey)}
      </p>
      <div className='mt-3 rounded-2xl bg-muted/20 px-3 py-2'>
        <div className='text-[10px] font-black tracking-[0.18em] text-muted-foreground/60 uppercase'>
          {t('codeCenter.linearBarcode.status.fields.sourceTable')}
        </div>
        <div className='mt-1 font-mono text-[11px] font-bold text-foreground'>
          {anchor.sourceTable}
        </div>
      </div>
    </div>
  )
}

function LinearBarcodeProductionStatusWritePolicyItem({
  policy,
}: {
  policy: LinearBarcodeStatusWritePolicy
}) {
  const { t } = useLanguage()

  return (
    <li className='flex gap-2 text-[11px] leading-5 text-muted-foreground'>
      <LockKeyhole className='mt-0.5 size-3.5 shrink-0 text-primary' />
      <span>{t(getLinearBarcodeWritePolicyTranslationKey(policy))}</span>
    </li>
  )
}

export function LinearBarcodeProductionLocationAnchorContractCard({
  anchors,
  writePolicies,
}: {
  anchors: readonly LinearBarcodeProductionLocationAnchor[]
  writePolicies: readonly LinearBarcodeStatusWritePolicy[]
}) {
  const { t } = useLanguage()

  return (
    <Card className='rounded-[28px] border border-dashed border-primary/20 bg-primary/5 shadow-none'>
      <CardHeader className='pb-3'>
        <CardTitle className='flex items-center gap-2 text-base font-black tracking-tight italic'>
          <Route className='size-4 text-primary' />
          {t('codeCenter.linearBarcode.status.location.title')}
        </CardTitle>
        <CardDescription className='text-[11px] leading-5'>
          {t('codeCenter.linearBarcode.status.location.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='grid gap-3 lg:grid-cols-4'>
          {anchors.map((anchor) => (
            <LinearBarcodeProductionLocationAnchorItem
              key={anchor.code}
              anchor={anchor}
            />
          ))}
        </div>
        <div className='rounded-3xl border border-dashed border-primary/20 bg-background/70 p-4'>
          <div className='flex items-center gap-2 text-sm font-black text-foreground'>
            <GitBranch className='size-4 text-primary' />
            {t('codeCenter.linearBarcode.status.location.writePolicyTitle')}
          </div>
          <ul className='mt-3 grid gap-2 md:grid-cols-2'>
            {writePolicies.map((policy) => (
              <LinearBarcodeProductionStatusWritePolicyItem
                key={policy.code}
                policy={policy}
              />
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
