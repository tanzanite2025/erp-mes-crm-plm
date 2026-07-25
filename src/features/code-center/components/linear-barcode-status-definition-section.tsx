import { type LucideIcon } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { LinearBarcodeStatusDefinitionCard } from '@/features/code-center/components/linear-barcode-status-definition-card'
import { type LinearBarcodeStatusDefinition } from '@/features/code-center/data/linear-barcode-status-definitions'

export function LinearBarcodeStatusDefinitionSection({
  title,
  description,
  icon: Icon,
  definitions,
}: {
  title: string
  description: string
  icon: LucideIcon
  definitions: readonly LinearBarcodeStatusDefinition[]
}) {
  return (
    <Card className='rounded-[28px] border border-dashed border-muted/50 bg-muted/5 shadow-none'>
      <CardHeader className='pb-3'>
        <CardTitle className='flex items-center gap-2 text-base font-black tracking-tight italic'>
          <Icon className='size-4 text-primary' />
          {title}
        </CardTitle>
        <CardDescription className='text-[11px] leading-5'>
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className='grid gap-3 lg:grid-cols-2'>
          {definitions.map((definition) => (
            <LinearBarcodeStatusDefinitionCard
              key={definition.code}
              definition={definition}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
