import { Camera, FolderClock, ShieldOff, Video } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import {
  privateSidebarTools,
  type PrivateSidebarTool,
} from '../data/private-tools'

function PrivateToolIcon({
  toolId,
  className,
}: {
  toolId: PrivateSidebarTool['id']
  className?: string
}) {
  switch (toolId) {
    case 'photo':
      return <Camera className={className} />
    case 'video':
      return <Video className={className} />
    case 'buffer':
      return <FolderClock className={className} />
  }
}

export function PrivateToolsPanel() {
  const { t } = useLanguage()

  const getToolTitle = (toolId: PrivateSidebarTool['id']) => {
    switch (toolId) {
      case 'photo':
        return t('sidebarCommandAssignment.privateTools.photo')
      case 'video':
        return t('sidebarCommandAssignment.privateTools.video')
      case 'buffer':
        return t('sidebarCommandAssignment.privateTools.buffer')
    }
  }

  return (
    <div className='rounded-[18px] border border-dashed border-muted/50 bg-muted/5 px-4 py-3 shadow-inner'>
      <div className='mb-2 flex items-center gap-3'>
        <div className='flex size-8 items-center justify-center rounded-xl bg-background'>
          <ShieldOff className='size-4 text-muted-foreground' />
        </div>
        <div>
          <h2 className='text-sm font-black tracking-tighter italic'>
            {t('sidebarCommandAssignment.privateTools.title')}
          </h2>
          <p className='mt-1 text-[9px] font-black tracking-widest text-muted-foreground/55 uppercase'>
            {t('sidebarCommandAssignment.privateTools.description')}
          </p>
        </div>
      </div>
      <div className='grid gap-2 sm:grid-cols-3'>
        {privateSidebarTools.map((tool) => {
          return (
            <div
              key={tool.id}
              className='flex items-center gap-2.5 rounded-xl bg-background/70 px-3 py-2 shadow-sm'
            >
              <span className='flex size-8 items-center justify-center rounded-xl bg-muted'>
                <PrivateToolIcon toolId={tool.id} className='size-4' />
              </span>
              <span className='text-sm font-black tracking-tight'>
                {getToolTitle(tool.id)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
