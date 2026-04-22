import {
  Camera,
  ClipboardCheck,
  NotebookPen,
  PackagePlus,
  ScanLine,
  SearchCheck,
  Video,
} from 'lucide-react'

type QuickActionIconProps = {
  iconName?: string
  className?: string
}

export function QuickActionIcon({ iconName, className }: QuickActionIconProps) {
  switch (iconName) {
    case 'Camera':
      return <Camera className={className} />
    case 'Video':
      return <Video className={className} />
    case 'NotebookPen':
      return <NotebookPen className={className} />
    case 'PackagePlus':
      return <PackagePlus className={className} />
    case 'ScanLine':
      return <ScanLine className={className} />
    case 'ClipboardCheck':
      return <ClipboardCheck className={className} />
    case 'SearchCheck':
    default:
      return <SearchCheck className={className} />
  }
}
