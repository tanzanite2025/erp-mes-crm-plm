'use client'

import { Card, CardContent } from '@/components/ui/card'
import type { ProcessModuleContext } from './adapter'
import { processModuleApsConfig } from './aps-process.adapter'
import { processModuleLineManagementConfig } from './config-line-management'
import { ProcessModuleCard } from './components/card'
import { ProcessModuleHeader } from './components/header'
import type { ProcessModuleConfig } from './config'

interface ProcessModuleProps {
  context?: ProcessModuleContext
  config?: ProcessModuleConfig
}

function getProcessModuleConfig(context: ProcessModuleContext) {
  return context === 'aps' ? processModuleApsConfig : processModuleLineManagementConfig
}

export function ProcessModule({ context = 'aps', config: externalConfig }: ProcessModuleProps) {
  const config = externalConfig ?? getProcessModuleConfig(context)

  return (
    <Card className='rounded-[28px] border-dashed border-muted/50 bg-muted/5'>
      <ProcessModuleHeader title={config.title} subtitle={config.subtitle} />
      <CardContent className='space-y-3 p-4'>
        {(config.cards ?? []).map((card) => (
          <ProcessModuleCard key={card.id} card={card} />
        ))}
      </CardContent>
    </Card>
  )
}
