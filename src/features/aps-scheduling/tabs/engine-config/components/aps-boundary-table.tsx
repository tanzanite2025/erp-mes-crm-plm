import { Network } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/context/language-provider'
import {
  ENGINE_BADGE_CLASS,
  ENGINE_CARD_SHELL_CLASS,
  ENGINE_CARD_TITLE_CLASS,
  ENGINE_TABLE_CELL_CLASS,
  ENGINE_TABLE_HEADER_CELL_CLASS,
  ENGINE_TABLE_ROW_CLASS,
  ENGINE_TABLE_SHELL_CLASS,
} from '../ui-classes'

type BoundaryRow = {
  id: string
  layer: string
  responsibility: string
  notResponsibility: string
  inputs: string
  outputs: string
  example: string
}

export function ApsBoundaryTable() {
  const { t } = useLanguage()

  const rows: BoundaryRow[] = [
    {
      id: 'calendar',
      layer: t('apsScheduling.engineConfig.boundaryTable.rows.calendar.layer'),
      responsibility: t('apsScheduling.engineConfig.boundaryTable.rows.calendar.responsibility'),
      notResponsibility: t('apsScheduling.engineConfig.boundaryTable.rows.calendar.notResponsibility'),
      inputs: t('apsScheduling.engineConfig.boundaryTable.rows.calendar.inputs'),
      outputs: t('apsScheduling.engineConfig.boundaryTable.rows.calendar.outputs'),
      example: t('apsScheduling.engineConfig.boundaryTable.rows.calendar.example'),
    },
    {
      id: 'resource',
      layer: t('apsScheduling.engineConfig.boundaryTable.rows.resource.layer'),
      responsibility: t('apsScheduling.engineConfig.boundaryTable.rows.resource.responsibility'),
      notResponsibility: t('apsScheduling.engineConfig.boundaryTable.rows.resource.notResponsibility'),
      inputs: t('apsScheduling.engineConfig.boundaryTable.rows.resource.inputs'),
      outputs: t('apsScheduling.engineConfig.boundaryTable.rows.resource.outputs'),
      example: t('apsScheduling.engineConfig.boundaryTable.rows.resource.example'),
    },
    {
      id: 'event',
      layer: t('apsScheduling.engineConfig.boundaryTable.rows.event.layer'),
      responsibility: t('apsScheduling.engineConfig.boundaryTable.rows.event.responsibility'),
      notResponsibility: t('apsScheduling.engineConfig.boundaryTable.rows.event.notResponsibility'),
      inputs: t('apsScheduling.engineConfig.boundaryTable.rows.event.inputs'),
      outputs: t('apsScheduling.engineConfig.boundaryTable.rows.event.outputs'),
      example: t('apsScheduling.engineConfig.boundaryTable.rows.event.example'),
    },
    {
      id: 'solver',
      layer: t('apsScheduling.engineConfig.boundaryTable.rows.solver.layer'),
      responsibility: t('apsScheduling.engineConfig.boundaryTable.rows.solver.responsibility'),
      notResponsibility: t('apsScheduling.engineConfig.boundaryTable.rows.solver.notResponsibility'),
      inputs: t('apsScheduling.engineConfig.boundaryTable.rows.solver.inputs'),
      outputs: t('apsScheduling.engineConfig.boundaryTable.rows.solver.outputs'),
      example: t('apsScheduling.engineConfig.boundaryTable.rows.solver.example'),
    },
    {
      id: 'execution',
      layer: t('apsScheduling.engineConfig.boundaryTable.rows.execution.layer'),
      responsibility: t('apsScheduling.engineConfig.boundaryTable.rows.execution.responsibility'),
      notResponsibility: t('apsScheduling.engineConfig.boundaryTable.rows.execution.notResponsibility'),
      inputs: t('apsScheduling.engineConfig.boundaryTable.rows.execution.inputs'),
      outputs: t('apsScheduling.engineConfig.boundaryTable.rows.execution.outputs'),
      example: t('apsScheduling.engineConfig.boundaryTable.rows.execution.example'),
    },
  ]

  return (
    <Card className={`${ENGINE_CARD_SHELL_CLASS} relative overflow-hidden bg-background/80`}>
      <div className='pointer-events-none absolute inset-0 bg-linear-to-br from-primary/5 via-transparent' />
      <CardHeader className='relative p-3 pb-1.5'>
        <div className='flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between'>
          <div className='flex min-w-0 items-center gap-2 text-primary'>
            <Network className='size-4 shrink-0' />
            <div className='min-w-0'>
              <CardTitle className={`${ENGINE_CARD_TITLE_CLASS} leading-none`}>
                {t('apsScheduling.engineConfig.boundaryTable.title')}
              </CardTitle>
              <CardDescription className='text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 leading-tight mt-0.5 truncate'>
                {t('apsScheduling.engineConfig.boundaryTable.description')}
              </CardDescription>
            </div>
          </div>
          <div className={`${ENGINE_BADGE_CLASS} self-start border-primary/20 bg-primary/5 text-primary h-4 px-2 text-[8px] tracking-[0.16em]`}>
            {t('apsScheduling.engineConfig.boundaryTable.badge')}
          </div>
        </div>
      </CardHeader>
      <CardContent className='relative p-3 pt-0'>
        <div className={ENGINE_TABLE_SHELL_CLASS}>
          <div className='overflow-x-auto'>
            <table className='w-full min-w-[1100px] border-separate border-spacing-0'>
              <thead>
                <tr>
                  <th className={ENGINE_TABLE_HEADER_CELL_CLASS}>{t('apsScheduling.engineConfig.boundaryTable.columns.layer')}</th>
                  <th className={ENGINE_TABLE_HEADER_CELL_CLASS}>{t('apsScheduling.engineConfig.boundaryTable.columns.responsibility')}</th>
                  <th className={ENGINE_TABLE_HEADER_CELL_CLASS}>{t('apsScheduling.engineConfig.boundaryTable.columns.notResponsibility')}</th>
                  <th className={ENGINE_TABLE_HEADER_CELL_CLASS}>{t('apsScheduling.engineConfig.boundaryTable.columns.inputs')}</th>
                  <th className={ENGINE_TABLE_HEADER_CELL_CLASS}>{t('apsScheduling.engineConfig.boundaryTable.columns.outputs')}</th>
                  <th className={ENGINE_TABLE_HEADER_CELL_CLASS}>{t('apsScheduling.engineConfig.boundaryTable.columns.example')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className={ENGINE_TABLE_ROW_CLASS}>
                    <td className={`${ENGINE_TABLE_CELL_CLASS} w-[13%] font-black text-foreground`}>{row.layer}</td>
                    <td className={`${ENGINE_TABLE_CELL_CLASS} w-[19%]`}>{row.responsibility}</td>
                    <td className={`${ENGINE_TABLE_CELL_CLASS} w-[19%] text-muted-foreground/85`}>{row.notResponsibility}</td>
                    <td className={`${ENGINE_TABLE_CELL_CLASS} w-[19%] text-muted-foreground/85`}>{row.inputs}</td>
                    <td className={`${ENGINE_TABLE_CELL_CLASS} w-[15%] font-mono text-[9px] text-foreground/80`}>{row.outputs}</td>
                    <td className={`${ENGINE_TABLE_CELL_CLASS} w-[15%] text-muted-foreground/85`}>{row.example}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
